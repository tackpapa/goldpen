export const runtime = 'edge'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['academy', 'learning_center', 'study_cafe', 'tutoring']).optional(),
  owner_id: z.string().uuid().optional(),
  settings: z.record(z.any()).optional(),
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
  subscription_plan: z.enum(['free', 'basic', 'pro', 'enterprise']).optional(),
  max_users: z.number().int().positive().optional(),
  max_students: z.number().int().positive().optional(),
})

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

// GET /api/admin/organizations/[id]
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const authCheck = await checkAdminAuth(supabase)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { data: organization, error } = await supabase
      .from('organizations')
      .select('*, users!owner_id(id, name, email)')
      .eq('id', params.id)
      .single()

    if (error || !organization) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get users in this organization
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .eq('org_id', params.id)
      .order('created_at', { ascending: false })

    return Response.json({
      organization,
      users: users || [],
    })
  } catch (error) {
    console.error('[Organizations GET by ID] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/organizations/[id]
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const authCheck = await checkAdminAuth(supabase)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    // Get current organization data
    const { data: currentOrg, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !currentOrg) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const validation = UpdateOrganizationSchema.safeParse(body)

    if (!validation.success) {
      return Response.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { data: updatedOrganization, error } = await supabase
      .from('organizations')
      .update(validation.data)
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('[Organizations PATCH] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      admin_id: authCheck.user.id,
      action: 'update',
      target_type: 'organization',
      target_id: params.id,
      changes: { before: currentOrg, after: updatedOrganization },
      metadata: {
        user_agent: request.headers.get('user-agent'),
      },
    })

    return Response.json(updatedOrganization)
  } catch (error) {
    console.error('[Organizations PATCH] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/organizations/[id]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createClient()
    const authCheck = await checkAdminAuth(supabase)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    // Get current organization data
    const { data: currentOrg, error: fetchError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', params.id)
      .single()

    if (fetchError || !currentOrg) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Soft delete (set status to 'deleted')
    const { error } = await supabase
      .from('organizations')
      .update({ status: 'deleted' })
      .eq('id', params.id)

    if (error) {
      console.error('[Organizations DELETE] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      admin_id: authCheck.user.id,
      action: 'delete',
      target_type: 'organization',
      target_id: params.id,
      changes: { before: currentOrg },
      metadata: {
        user_agent: request.headers.get('user-agent'),
      },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('[Organizations DELETE] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
