export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateOrganizationSchema = z.object({
  name: z.string().min(1, 'Organization name is required'),
  type: z.enum(['academy', 'learning_center', 'study_cafe', 'tutoring']),
  owner_id: z.string().uuid().optional(),
  settings: z.record(z.any()).optional(),
  subscription_plan: z.enum(['free', 'basic', 'pro', 'enterprise']).optional(),
  max_users: z.number().int().positive().optional(),
  max_students: z.number().int().positive().optional(),
})

// Check super_admin authorization
async function checkAdminAuth(supabase: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { authorized: false, error: 'Unauthorized', status: 401 }
  }

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userError || !userData || userData.role !== 'super_admin') {
    return { authorized: false, error: 'Forbidden', status: 403 }
  }

  return { authorized: true, user }
}

// GET /api/admin/organizations
export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const authCheck = await checkAdminAuth(supabase)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const type = searchParams.get('type') || ''
    const status = searchParams.get('status') || ''

    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('organizations')
      .select('*, users!owner_id(id, name, email)', { count: 'exact' })

    // Apply filters
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (type) {
      query = query.eq('type', type)
    }

    if (status) {
      query = query.eq('status', status)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1).order('created_at', { ascending: false })

    const { data: organizations, error, count } = await query

    if (error) {
      console.error('[Organizations GET] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Get user count for each organization
    const orgsWithUserCount = await Promise.all(
      (organizations || []).map(async (org) => {
        const { count: userCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org.id)

        return {
          ...org,
          user_count: userCount || 0,
        }
      })
    )

    return Response.json({
      organizations: orgsWithUserCount,
      total: count || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('[Organizations GET] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/organizations
export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const authCheck = await checkAdminAuth(supabase)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const body = await request.json()

    // Validate request body
    const validation = CreateOrganizationSchema.safeParse(body)

    if (!validation.success) {
      return Response.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { data: organization, error } = await supabase
      .from('organizations')
      .insert({
        name: validation.data.name,
        type: validation.data.type,
        owner_id: validation.data.owner_id,
        settings: validation.data.settings || {},
        status: 'active',
        subscription_plan: validation.data.subscription_plan || 'free',
        max_users: validation.data.max_users || 10,
        max_students: validation.data.max_students || 50,
      })
      .select()
      .single()

    if (error) {
      console.error('[Organizations POST] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      admin_id: authCheck.user.id,
      action: 'create',
      target_type: 'organization',
      target_id: organization.id,
      changes: { after: organization },
      metadata: {
        user_agent: request.headers.get('user-agent'),
      },
    })

    return Response.json(organization, { status: 201 })
  } catch (error) {
    console.error('[Organizations POST] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
