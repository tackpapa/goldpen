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

    // 무료 먼저 사용 가정
    // 무료 잔액 = max(0, 무료충전 - 사용)
    // 유료 잔액 = 유료충전 - max(0, 사용 - 무료충전)
    const usedFromFree = Math.min(totalUsed, totalFreeCharged)
    const usedFromPaid = Math.max(0, totalUsed - totalFreeCharged)
    const freeBalance = Math.max(0, totalFreeCharged - usedFromFree)
    const paidBalance = Math.max(0, totalPaidCharged - usedFromPaid)

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

    // 7. 메시지 발송 건수로 실제 원가 계산
    // notification_logs에서 발송 건수 집계
    const { count: msgCount } = await adminClient
      .from('notification_logs')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sent')
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())

    // message_pricing에서 알림톡 원가 조회
    const { data: alimtalkPricing } = await adminClient
      .from('message_pricing')
      .select('cost')
      .eq('message_type', 'kakao_alimtalk')
      .single()

    const alimtalkCost = alimtalkPricing?.cost ?? 13
    const monthMessageCount = msgCount ?? 0
    const monthActualCost = monthMessageCount * alimtalkCost

    // 무료/유료 사용 비율 계산 (무료 먼저 사용 가정)
    const freeUsedAmount = Math.min(monthUsed, totalFreeCharged)
    const paidUsedAmount = Math.max(0, monthUsed - totalFreeCharged)
    const freeUsedRatio = monthUsed > 0 ? freeUsedAmount / monthUsed : 0
    const paidUsedRatio = monthUsed > 0 ? paidUsedAmount / monthUsed : 0

    // 실제 원가 배분
    const freeActualCost = Math.round(monthActualCost * freeUsedRatio)  // 무료 사용 원가 (마케팅 비용)
    const paidActualCost = Math.round(monthActualCost * paidUsedRatio)  // 유료 사용 원가

    return Response.json({
      totalBalance,
      paidBalance,      // 유료 충전금 잔액
      freeBalance,      // 무료 제공금 잔액
      orgsWithBalance,
      today: {
        used: todayUsed,
        charged: todayCharged,
        paidCharged: todayPaidCharged,
        freeCharged: todayFreeCharged,
      },
      month: {
        used: monthUsed,              // 사용 액면가
        charged: monthCharged,
        paidCharged: monthPaidCharged,
        freeCharged: monthFreeCharged,
        year: selectedMonth.year,
        month: selectedMonth.month,
        // 실제 원가 기반 통계 (NEW)
        messageCount: monthMessageCount,
        actualCost: monthActualCost,      // 전체 실제 원가
        freeActualCost: freeActualCost,   // 무료 사용 실제 원가 (마케팅 비용)
        paidActualCost: paidActualCost,   // 유료 사용 실제 원가
        paidRevenue: monthPaidCharged,    // 유료 충전 매출
        paidProfit: monthPaidCharged - paidActualCost, // 유료 순이익
        netProfit: monthPaidCharged - monthActualCost, // 전체 순이익 (매출 - 전체원가)
      },
      monthlyUsage,
    })
  } catch (error) {
    console.error('[Credit Stats] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
