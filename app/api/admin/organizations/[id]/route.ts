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

    // Get organization
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single()

    if (orgError || !org) {
      return Response.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get org settings
    const { data: orgSettings } = await adminClient
      .from('org_settings')
      .select('*')
      .eq('org_id', id)
      .maybeSingle()

    // Get owner (role = 'owner')
    const { data: owner } = await adminClient
      .from('users')
      .select('id, name, email, phone, created_at')
      .eq('org_id', id)
      .eq('role', 'owner')
      .maybeSingle()

    // Get all users in org (super_admin 제외 - 전체 서비스 관리자는 조직 소속이 아님)
    const { data: users, count: userCount } = await adminClient
      .from('users')
      .select('id, name, email, role, created_at', { count: 'exact' })
      .eq('org_id', id)
      .neq('role', 'super_admin')
      .order('created_at', { ascending: false })
      .limit(10)

    // Get student count
    const { count: studentCount } = await adminClient
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', id)

    // Get class count
    const { count: classCount } = await adminClient
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', id)

    // Get room count
    const { count: roomCount } = await adminClient
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', id)

    // Get revenue data - payment_records 테이블에서 completed 상태의 금액 합계
    // 매출정산 페이지와 동일한 데이터 소스 사용
    const url = new URL(request.url)
    const selectedMonth = url.searchParams.get('month') // YYYY-MM format

    const now = new Date()
    let targetMonth: { year: number; month: number }

    if (selectedMonth) {
      const [year, month] = selectedMonth.split('-').map(Number)
      targetMonth = { year, month }
    } else {
      targetMonth = { year: now.getFullYear(), month: now.getMonth() + 1 }
    }

    const startOfMonth = new Date(targetMonth.year, targetMonth.month - 1, 1)
    const endOfMonth = new Date(targetMonth.year, targetMonth.month, 0) // 해당 월의 마지막 날
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0]
    const endOfMonthStr = endOfMonth.toISOString().split('T')[0]

    // 선택된 월의 매출
    const { data: revenueData } = await adminClient
      .from('payment_records')
      .select('amount, payment_date, student_name, revenue_category_name')
      .eq('org_id', id)
      .eq('status', 'completed')
      .gte('payment_date', startOfMonthStr)
      .lte('payment_date', endOfMonthStr)

    const monthlyRevenue = (revenueData || []).reduce(
      (sum, tx) => sum + (Number(tx.amount) || 0),
      0
    )

    // 누적 매출 (전체)
    const { data: totalRevenueData } = await adminClient
      .from('payment_records')
      .select('amount')
      .eq('org_id', id)
      .eq('status', 'completed')

    const totalRevenue = (totalRevenueData || []).reduce(
      (sum, tx) => sum + (Number(tx.amount) || 0),
      0
    )

    // 월별 데이터가 있는 월 목록 (드롭다운용)
    const { data: allPayments } = await adminClient
      .from('payment_records')
      .select('payment_date')
      .eq('org_id', id)
      .eq('status', 'completed')
      .order('payment_date', { ascending: false })

    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const monthsFromData = (allPayments || [])
      .map(p => p.payment_date?.substring(0, 7))
      .filter(Boolean)

    // 현재 달을 항상 포함 + 데이터가 있는 월들
    const availableMonths = [...new Set([currentMonth, ...monthsFromData])].sort().reverse()

    // Get Kakao usage stats from notification_logs (Solapi 알림톡)
    const { data: notificationLogs } = await adminClient
      .from('notification_logs')
      .select('type, status')
      .eq('org_id', id)
      .gte('created_at', startOfMonth.toISOString())

    const ALIMTALK_PRICE = 100 // 알림톡 판매가 100원
    const successCount = (notificationLogs || []).filter(n => n.status === 'sent').length
    const kakaoStats = {
      total_count: notificationLogs?.length || 0,
      total_cost: successCount * ALIMTALK_PRICE,
      success_count: successCount,
    }

    // Get recent payment records (최근 결제 내역) - 매출정산 페이지와 동일
    const { data: recentTransactions } = await adminClient
      .from('payment_records')
      .select('id, amount, student_name, revenue_category_name, payment_date, status')
      .eq('org_id', id)
      .eq('status', 'completed')
      .order('payment_date', { ascending: false })
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
        total_revenue: totalRevenue,
        available_months: availableMonths,
        selected_month: `${targetMonth.year}-${String(targetMonth.month).padStart(2, '0')}`,
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
