import { e2eBypass } from '@/app/api/_utils/e2e-bypass'
export const runtime = 'edge'

import { createClient, createAdminClient } from '@/lib/supabase/server'
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
async function checkAdminAuth(supabase: any, adminClient: any) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { authorized: false, error: 'Unauthorized', status: 401 }
  }

  // Admin 클라이언트로 권한 확인 (RLS 우회)
  const { data: userData, error: userError } = await adminClient
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
    const adminClient = createAdminClient()
    const authCheck = await checkAdminAuth(supabase, adminClient)

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

    // Build query (Admin 클라이언트로 RLS 우회)
    let query = adminClient
      .from('organizations')
      .select('*', { count: 'exact' })

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

    // Get additional data for each organization (Admin 클라이언트로 RLS 우회)
    const orgsWithDetails = await Promise.all(
      (organizations || []).map(async (org) => {
        // User count
        const { count: userCount } = await adminClient
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org.id)

        // Student count
        const { count: studentCount } = await adminClient
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', org.id)

        // Owner info (from owner_id in organization)
        let ownerData = null
        if (org.owner_id) {
          const { data } = await adminClient
            .from('users')
            .select('id, name, email')
            .eq('id', org.owner_id)
            .maybeSingle()
          ownerData = data
        }

        // Monthly revenue (billing_transactions this month)
        const startOfMonth = new Date()
        startOfMonth.setDate(1)
        startOfMonth.setHours(0, 0, 0, 0)

        const { data: revenueData } = await adminClient
          .from('billing_transactions')
          .select('amount')
          .eq('org_id', org.id)
          .gte('created_at', startOfMonth.toISOString())

        const monthlyRevenue = (revenueData || []).reduce(
          (sum, tx) => sum + (Number(tx.amount) || 0),
          0
        )

        // Org settings
        const { data: settingsData } = await adminClient
          .from('org_settings')
          .select('*')
          .eq('org_id', org.id)
          .maybeSingle()

        return {
          ...org,
          user_count: userCount || 0,
          student_count: studentCount || 0,
          owner: ownerData || null,
          monthly_revenue: monthlyRevenue,
          credit_balance: org.credit_balance || 0,
          org_settings: settingsData || null,
        }
      })
    )

    return Response.json({
      organizations: orgsWithDetails,
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
    const adminClient = createAdminClient()
    const authCheck = await checkAdminAuth(supabase, adminClient)

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

    const { data: organization, error } = await adminClient
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
    await adminClient.from('audit_logs').insert({
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
