import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) throw new Error('[Supabase Admin] Missing env')
  return createSupabaseClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function checkSuperAdmin(request: Request) {
  const supabase = await createAuthenticatedClient(request)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { authorized: false, error: 'Unauthorized', status: 401 }

  const adminClient = createAdminClient()
  const { data: userData, error: userError } = await adminClient.from('users').select('role').eq('id', user.id).single()
  if (userError || !userData || userData.role !== 'super_admin') return { authorized: false, error: 'Forbidden', status: 403 }

  return { authorized: true, user }
}

// GET /api/admin/stats/credits - 충전금 통계 조회
export async function GET(request: Request) {
  try {
    const authCheck = await checkSuperAdmin(request)
    const adminClient = createAdminClient()

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const url = new URL(request.url)
    const month = url.searchParams.get('month') // YYYY-MM format

    // 기간 계산
    const now = new Date()
    let selectedMonth: { year: number; month: number }

    if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      selectedMonth = { year, month: monthNum }
    } else {
      selectedMonth = { year: now.getFullYear(), month: now.getMonth() + 1 }
    }

    // 해당 월의 시작/종료 날짜
    const monthStart = new Date(selectedMonth.year, selectedMonth.month - 1, 1)
    const monthEnd = new Date(selectedMonth.year, selectedMonth.month, 0, 23, 59, 59, 999)

    // 오늘 시작/종료
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    // 1. 전체 조직의 총 충전금 잔액
    const { data: orgsData, error: orgsError } = await adminClient
      .from('organizations')
      .select('credit_balance')

    let totalBalance = 0
    let orgsWithBalance = 0
    if (!orgsError && orgsData) {
      for (const org of orgsData) {
        const balance = org.credit_balance || 0
        totalBalance += balance
        if (balance > 0) orgsWithBalance++
      }
    }

    // 1-1. 전체 충전/사용 내역으로 유료/무료 잔액 계산
    const { data: allTransactions } = await adminClient
      .from('credit_transactions')
      .select('amount, type')

    let totalPaidCharged = 0  // 전체 유료 충전 총액
    let totalFreeCharged = 0  // 전체 무료 충전 총액
    let totalUsed = 0         // 전체 사용 총액

    if (allTransactions) {
      for (const t of allTransactions) {
        if (t.amount > 0) {
          if (t.type === 'paid') {
            totalPaidCharged += t.amount
          } else {
            totalFreeCharged += t.amount
          }
        } else {
          totalUsed += Math.abs(t.amount)
        }
      }
    }

    // 무료 먼저 사용 가정: 무료 잔액 = max(0, 무료 충전 - 사용)
    // 유료 잔액 = 총 잔액 - 무료 잔액
    const freeBalance = Math.max(0, totalFreeCharged - totalUsed)
    const paidBalance = totalBalance - freeBalance

    // 2. 오늘 사용된 충전금 (음수 amount의 합)
    const { data: todayUsage, error: todayError } = await adminClient
      .from('credit_transactions')
      .select('amount')
      .lt('amount', 0)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())

    let todayUsed = 0
    if (!todayError && todayUsage) {
      todayUsed = todayUsage.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    }

    // 3. 오늘 충전된 금액 (양수 amount의 합)
    const { data: todayCharge, error: todayChargeError } = await adminClient
      .from('credit_transactions')
      .select('amount, type')
      .gt('amount', 0)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())

    let todayCharged = 0
    let todayFreeCharged = 0
    let todayPaidCharged = 0
    if (!todayChargeError && todayCharge) {
      for (const t of todayCharge) {
        todayCharged += t.amount
        if (t.type === 'paid') {
          todayPaidCharged += t.amount
        } else {
          todayFreeCharged += t.amount
        }
      }
    }

    // 4. 이번 달 사용된 충전금
    const { data: monthUsage, error: monthError } = await adminClient
      .from('credit_transactions')
      .select('amount')
      .lt('amount', 0)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())

    let monthUsed = 0
    if (!monthError && monthUsage) {
      monthUsed = monthUsage.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    }

    // 5. 이번 달 충전된 금액
    const { data: monthCharge, error: monthChargeError } = await adminClient
      .from('credit_transactions')
      .select('amount, type')
      .gt('amount', 0)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())

    let monthCharged = 0
    let monthFreeCharged = 0
    let monthPaidCharged = 0
    if (!monthChargeError && monthCharge) {
      for (const t of monthCharge) {
        monthCharged += t.amount
        if (t.type === 'paid') {
          monthPaidCharged += t.amount
        } else {
          monthFreeCharged += t.amount
        }
      }
    }

    // 6. 최근 6개월 월별 사용량
    const monthlyUsage = []
    for (let i = 0; i < 6; i++) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999)

      const { data: mData } = await adminClient
        .from('credit_transactions')
        .select('amount, type')
        .gte('created_at', mStart.toISOString())
        .lte('created_at', mEnd.toISOString())

      let used = 0
      let charged = 0
      let paidCharged = 0
      let freeCharged = 0

      if (mData) {
        for (const t of mData) {
          if (t.amount < 0) {
            used += Math.abs(t.amount)
          } else {
            charged += t.amount
            if (t.type === 'paid') {
              paidCharged += t.amount
            } else {
              freeCharged += t.amount
            }
          }
        }
      }

      monthlyUsage.push({
        month: `${mStart.getFullYear()}-${String(mStart.getMonth() + 1).padStart(2, '0')}`,
        label: `${mStart.getFullYear()}년 ${mStart.getMonth() + 1}월`,
        used,
        charged,
        paidCharged,
        freeCharged,
      })
    }

    return Response.json({
      totalBalance,
      paidBalance,      // 유료 충전금 잔액 (실제 수익)
      freeBalance,      // 무료 제공금 잔액 (부채)
      orgsWithBalance,
      today: {
        used: todayUsed,
        charged: todayCharged,
        paidCharged: todayPaidCharged,
        freeCharged: todayFreeCharged,
      },
      month: {
        used: monthUsed,
        charged: monthCharged,
        paidCharged: monthPaidCharged,
        freeCharged: monthFreeCharged,
        year: selectedMonth.year,
        month: selectedMonth.month,
      },
      monthlyUsage,
    })
  } catch (error) {
    console.error('[Credit Stats] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
