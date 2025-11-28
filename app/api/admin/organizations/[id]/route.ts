import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const runtime = 'edge'

const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['academy', 'learning_center', 'study_cafe', 'tutoring']).optional(),
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
  subscription_plan: z.enum(['free', 'basic', 'pro', 'enterprise']).optional(),
  max_users: z.number().int().positive().optional(),
  max_students: z.number().int().positive().optional(),
  settings: z.record(z.any()).optional(),
})

async function checkSuperAdmin(supabase: ReturnType<typeof createClient>) {
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()
    const authCheck = await checkSuperAdmin(supabase)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    // Get organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (orgError || !org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get org settings
    const { data: orgSettings } = await supabase
      .from('org_settings')
      .select('*')
      .eq('org_id', id)
      .maybeSingle()

    // Get owner (role = 'owner')
    const { data: owner } = await supabase
      .from('users')
      .select('id, name, email, phone, created_at')
      .eq('org_id', id)
      .eq('role', 'owner')
      .maybeSingle()

    // Get all users in org
    const { data: users, count: userCount } = await supabase
      .from('users')
      .select('id, name, email, role, created_at', { count: 'exact' })
      .eq('org_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get student count
    const { count: studentCount } = await supabase
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', id)

    // Get class count
    const { count: classCount } = await supabase
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', id)

    // Get room count
    const { count: roomCount } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', id)

    // Get monthly revenue (current month)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)

    const { data: revenueData } = await supabase
      .from('billing_transactions')
      .select('amount, category, created_at')
      .eq('org_id', id)
      .gte('created_at', startOfMonth.toISOString())

    const monthlyRevenue = (revenueData || []).reduce(
      (sum, tx) => sum + (Number(tx.amount) || 0),
      0
    )

    // Get Kakao usage stats
    const { data: kakaoUsage } = await supabase
      .from('kakao_talk_usages')
      .select('cost, status')
      .eq('org_id', id)
      .gte('sent_at', startOfMonth.toISOString())

    const kakaoStats = {
      total_count: kakaoUsage?.length || 0,
      total_cost: (kakaoUsage || []).reduce((sum, u) => sum + (Number(u.cost) || 0), 0),
      success_count: (kakaoUsage || []).filter(u => u.status === 'success').length,
    }

    // Get recent billing transactions
    const { data: recentTransactions } = await supabase
      .from('billing_transactions')
      .select('id, amount, category, description, created_at')
      .eq('org_id', id)
      .order('created_at', { ascending: false })
      .limit(10)

    return Response.json({
      organization: {
        ...org,
        org_settings: orgSettings,
        owner,
        users: users || [],
        user_count: userCount || 0,
        student_count: studentCount || 0,
        class_count: classCount || 0,
        room_count: roomCount || 0,
        monthly_revenue: monthlyRevenue,
        kakao_stats: kakaoStats,
        recent_transactions: recentTransactions || [],
      },
    })
  } catch (error) {
    console.error('[Organization GET] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/organizations/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()
    const authCheck = await checkSuperAdmin(supabase)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const body = await request.json()
    const validation = UpdateOrganizationSchema.safeParse(body)

    if (!validation.success) {
      return Response.json(
        { error: 'Validation failed', details: validation.error.errors },
        { status: 400 }
      )
    }

    // Get current org for audit log
    const { data: currentOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (!currentOrg) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Update organization
    const { data: updatedOrg, error } = await supabase
      .from('organizations')
      .update({
        ...validation.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[Organization PUT] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      admin_id: authCheck.user!.id,
      action: 'update',
      target_type: 'organization',
      target_id: id,
      changes: { before: currentOrg, after: updatedOrg },
      metadata: {
        user_agent: request.headers.get('user-agent'),
      },
    })

    return Response.json(updatedOrg)
  } catch (error) {
    console.error('[Organization PUT] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/organizations/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = createClient()
    const authCheck = await checkSuperAdmin(supabase)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    // Get current org for audit log
    const { data: currentOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (!currentOrg) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Soft delete - set status to 'deleted'
    const { error } = await supabase
      .from('organizations')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      console.error('[Organization DELETE] Error:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // Log audit
    await supabase.from('audit_logs').insert({
      admin_id: authCheck.user!.id,
      action: 'delete',
      target_type: 'organization',
      target_id: id,
      changes: { before: currentOrg, after: { status: 'deleted' } },
      metadata: {
        user_agent: request.headers.get('user-agent'),
      },
    })

    return Response.json({ success: true })
  } catch (error) {
    console.error('[Organization DELETE] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
