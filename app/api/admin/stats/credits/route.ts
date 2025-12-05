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

// GET /api/admin/stats/credits - 충전금 통계 조회 (최적화 버전)
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

    // 6개월 전 날짜 계산
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

    // ========== 병렬 쿼리 실행 (핵심 최적화!) ==========
    const [
      orgsResult,
      allTransactionsResult,
      todayTransactionsResult,
      monthTransactionsResult,
      sixMonthsTransactionsResult,
      msgCountResult,
      pricingResult,
    ] = await Promise.all([
      // 1. 조직 잔액 합계 (SUM 사용)
      adminClient
        .from('organizations')
        .select('credit_balance'),

      // 2. 전체 트랜잭션 (잔액 계산용)
      adminClient
        .from('credit_transactions')
        .select('amount, type'),

      // 3. 오늘 트랜잭션
      adminClient
        .from('credit_transactions')
        .select('amount, type')
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString()),

      // 4. 이번 달 트랜잭션
      adminClient
        .from('credit_transactions')
        .select('amount, type')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString()),

      // 5. 6개월 트랜잭션 (월별 집계용) - 한 번에 가져오기!
      adminClient
        .from('credit_transactions')
        .select('amount, type, created_at')
        .gte('created_at', sixMonthsAgo.toISOString()),

      // 6. 메시지 발송 건수
      adminClient
        .from('notification_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'sent')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString()),

      // 7. 알림톡 원가
      adminClient
        .from('message_pricing')
        .select('cost')
        .eq('message_type', 'kakao_alimtalk')
        .single(),
    ])

    // ========== 결과 처리 ==========

    // 1. 조직 잔액 계산
    let totalBalance = 0
    let orgsWithBalance = 0
    if (!orgsResult.error && orgsResult.data) {
      for (const org of orgsResult.data) {
        const balance = org.credit_balance || 0
        totalBalance += balance
        if (balance > 0) orgsWithBalance++
      }
    }

    // 2. 전체 유료/무료 잔액 계산
    let totalPaidCharged = 0
    let totalFreeCharged = 0
    let totalUsed = 0

    if (!allTransactionsResult.error && allTransactionsResult.data) {
      for (const t of allTransactionsResult.data) {
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
    const usedFromFree = Math.min(totalUsed, totalFreeCharged)
    const usedFromPaid = Math.max(0, totalUsed - totalFreeCharged)
    const freeBalance = Math.max(0, totalFreeCharged - usedFromFree)
    const paidBalance = Math.max(0, totalPaidCharged - usedFromPaid)

    // 3. 오늘 통계
    let todayUsed = 0
    let todayCharged = 0
    let todayFreeCharged = 0
    let todayPaidCharged = 0

    if (!todayTransactionsResult.error && todayTransactionsResult.data) {
      for (const t of todayTransactionsResult.data) {
        if (t.amount < 0) {
          todayUsed += Math.abs(t.amount)
        } else {
          todayCharged += t.amount
          if (t.type === 'paid') {
            todayPaidCharged += t.amount
          } else {
            todayFreeCharged += t.amount
          }
        }
      }
    }

    // 4. 이번 달 통계
    let monthUsed = 0
    let monthCharged = 0
    let monthFreeCharged = 0
    let monthPaidCharged = 0

    if (!monthTransactionsResult.error && monthTransactionsResult.data) {
      for (const t of monthTransactionsResult.data) {
        if (t.amount < 0) {
          monthUsed += Math.abs(t.amount)
        } else {
          monthCharged += t.amount
          if (t.type === 'paid') {
            monthPaidCharged += t.amount
          } else {
            monthFreeCharged += t.amount
          }
        }
      }
    }

    // 5. 6개월 월별 통계 (JS에서 그룹핑 - 쿼리 6개 → 1개로 줄임!)
    const monthlyMap = new Map<string, { used: number; charged: number; paidCharged: number; freeCharged: number }>()

    // 최근 6개월 키 초기화
    for (let i = 0; i < 6; i++) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${mStart.getFullYear()}-${String(mStart.getMonth() + 1).padStart(2, '0')}`
      monthlyMap.set(key, { used: 0, charged: 0, paidCharged: 0, freeCharged: 0 })
    }

    if (!sixMonthsTransactionsResult.error && sixMonthsTransactionsResult.data) {
      for (const t of sixMonthsTransactionsResult.data) {
        const date = new Date(t.created_at)
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        const monthData = monthlyMap.get(key)
        if (monthData) {
          if (t.amount < 0) {
            monthData.used += Math.abs(t.amount)
          } else {
            monthData.charged += t.amount
            if (t.type === 'paid') {
              monthData.paidCharged += t.amount
            } else {
              monthData.freeCharged += t.amount
            }
          }
        }
      }
    }

    // monthlyUsage 배열 생성
    const monthlyUsage = []
    for (let i = 0; i < 6; i++) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${mStart.getFullYear()}-${String(mStart.getMonth() + 1).padStart(2, '0')}`
      const data = monthlyMap.get(key) || { used: 0, charged: 0, paidCharged: 0, freeCharged: 0 }

      monthlyUsage.push({
        month: key,
        label: `${mStart.getFullYear()}년 ${mStart.getMonth() + 1}월`,
        ...data,
      })
    }

    // 6. 메시지 원가 계산
    const alimtalkCost = pricingResult.data?.cost ?? 13
    const monthMessageCount = msgCountResult.count ?? 0
    const monthActualCost = monthMessageCount * alimtalkCost

    // 무료/유료 사용 비율 계산
    const freeUsedAmount = Math.min(monthUsed, totalFreeCharged)
    const paidUsedAmount = Math.max(0, monthUsed - totalFreeCharged)
    const freeUsedRatio = monthUsed > 0 ? freeUsedAmount / monthUsed : 0
    const paidUsedRatio = monthUsed > 0 ? paidUsedAmount / monthUsed : 0

    // 실제 원가 배분
    const freeActualCost = Math.round(monthActualCost * freeUsedRatio)
    const paidActualCost = Math.round(monthActualCost * paidUsedRatio)

    return Response.json({
      totalBalance,
      paidBalance,
      freeBalance,
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
        messageCount: monthMessageCount,
        actualCost: monthActualCost,
        freeActualCost: freeActualCost,
        paidActualCost: paidActualCost,
        paidRevenue: monthPaidCharged,
        paidProfit: monthPaidCharged - paidActualCost,
        netProfit: monthPaidCharged - monthActualCost,
      },
      monthlyUsage,
    })
  } catch (error) {
    console.error('[Credit Stats] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
