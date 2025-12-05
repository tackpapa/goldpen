import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('[Supabase Admin] Missing env')
  return createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

const UpdateOrganizationSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['academy', 'learning_center', 'study_cafe', 'tutoring']).optional(),
  status: z.enum(['active', 'suspended', 'deleted']).optional(),
  subscription_plan: z.enum(['free', 'basic', 'pro', 'enterprise']).optional(),
  max_users: z.number().int().positive().optional(),
  max_students: z.number().int().positive().optional(),
  settings: z.record(z.any()).optional(),
  credit_balance: z.number().int().min(0).optional(),
})

async function checkSuperAdmin(request: Request) {
  const supabase = await createAuthenticatedClient(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { authorized: false, error: 'Unauthorized', status: 401 }

  const adminClient = createAdminClient()
  const { data: userData, error: userError } = await adminClient.from('users').select('role').eq('id', user.id).single()
  if (userError || !userData || userData.role !== 'super_admin') return { authorized: false, error: 'Forbidden', status: 403 }

  return { authorized: true, user }
}

// GET /api/admin/organizations/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const adminClient = createAdminClient()
    const authCheck = await checkSuperAdmin(request)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    // Get organization first (required for 404 check)
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (orgError || !org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Parse month parameter
    const url = new URL(request.url)
    const selectedMonth = url.searchParams.get('month')
    const now = new Date()
    let targetMonth: { year: number; month: number }

    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number)
      targetMonth = { year, month }
    } else {
      targetMonth = { year: now.getFullYear(), month: now.getMonth() + 1 }
    }

    const startOfMonth = new Date(targetMonth.year, targetMonth.month - 1, 1)
    const endOfMonth = new Date(targetMonth.year, targetMonth.month, 0)
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0]
    const endOfMonthStr = endOfMonth.toISOString().split('T')[0]

    // Parallel fetch all data (11 queries → 1 Promise.all)
    const [
      orgSettingsResult,
      ownerResult,
      usersResult,
      studentCountResult,
      classCountResult,
      roomCountResult,
      revenueDataResult,
      totalRevenueDataResult,
      allPaymentsResult,
      notificationLogsResult,
      recentTransactionsResult,
    ] = await Promise.all([
      // 1. Org settings
      adminClient
        .from('org_settings')
        .select('*')
        .eq('org_id', id)
        .maybeSingle(),

      // 2. Owner
      adminClient
        .from('users')
        .select('id, name, email, phone, created_at')
        .eq('org_id', id)
        .eq('role', 'owner')
        .maybeSingle(),

      // 3. Users with count
      adminClient
        .from('users')
        .select('id, name, email, role, created_at', { count: 'exact' })
        .eq('org_id', id)
        .neq('role', 'super_admin')
        .order('created_at', { ascending: false })
        .limit(10),

      // 4. Student count
      adminClient
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', id),

      // 5. Class count
      adminClient
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', id),

      // 6. Room count
      adminClient
        .from('rooms')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', id),

      // 7. Monthly revenue
      adminClient
        .from('payment_records')
        .select('amount, payment_date, student_name, revenue_category_name')
        .eq('org_id', id)
        .eq('status', 'completed')
        .gte('payment_date', startOfMonthStr)
        .lte('payment_date', endOfMonthStr),

      // 8. Total revenue
      adminClient
        .from('payment_records')
        .select('amount')
        .eq('org_id', id)
        .eq('status', 'completed'),

      // 9. All payments for month list
      adminClient
        .from('payment_records')
        .select('payment_date')
        .eq('org_id', id)
        .eq('status', 'completed')
        .order('payment_date', { ascending: false }),

      // 10. Notification logs for Kakao stats
      adminClient
        .from('notification_logs')
        .select('type, status')
        .eq('org_id', id)
        .gte('created_at', startOfMonth.toISOString()),

      // 11. Recent transactions
      adminClient
        .from('payment_records')
        .select('id, amount, student_name, revenue_category_name, payment_date, status')
        .eq('org_id', id)
        .eq('status', 'completed')
        .order('payment_date', { ascending: false })
        .limit(10),
    ])

    // Process results
    const orgSettings = orgSettingsResult.data
    const owner = ownerResult.data
    const users = usersResult.data || []
    const userCount = usersResult.count || 0
    const studentCount = studentCountResult.count || 0
    const classCount = classCountResult.count || 0
    const roomCount = roomCountResult.count || 0

    const monthlyRevenue = (revenueDataResult.data || []).reduce(
      (sum, tx) => sum + (Number(tx.amount) || 0),
      0
    )

    const totalRevenue = (totalRevenueDataResult.data || []).reduce(
      (sum, tx) => sum + (Number(tx.amount) || 0),
      0
    )

    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthsFromData = (allPaymentsResult.data || [])
      .map(p => p.payment_date?.substring(0, 7))
      .filter(Boolean)
    const availableMonths = [...new Set([currentMonth, ...monthsFromData])].sort().reverse()

    const ALIMTALK_PRICE = 100
    const notificationLogs = notificationLogsResult.data || []
    const successCount = notificationLogs.filter(n => n.status === 'sent').length
    const kakaoStats = {
      total_count: notificationLogs.length,
      total_cost: successCount * ALIMTALK_PRICE,
      success_count: successCount,
    }

    return Response.json({
      organization: {
        ...org,
        org_settings: orgSettings,
        owner,
        users,
        user_count: userCount,
        student_count: studentCount,
        class_count: classCount,
        room_count: roomCount,
        monthly_revenue: monthlyRevenue,
        total_revenue: totalRevenue,
        available_months: availableMonths,
        selected_month: `${targetMonth.year}-${String(targetMonth.month).padStart(2, '0')}`,
        kakao_stats: kakaoStats,
        recent_transactions: recentTransactionsResult.data || [],
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
    const adminClient = createAdminClient()
    const authCheck = await checkSuperAdmin(request)

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
    const { data: currentOrg } = await adminClient
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (!currentOrg) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Update organization
    const { data: updatedOrg, error } = await adminClient
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
    await adminClient.from('audit_logs').insert({
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
    const adminClient = createAdminClient()
    const authCheck = await checkSuperAdmin(request)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    // Get current org for audit log
    const { data: currentOrg } = await adminClient
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (!currentOrg) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Soft delete - set status to 'deleted'
    const { error } = await adminClient
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
    await adminClient.from('audit_logs').insert({
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
