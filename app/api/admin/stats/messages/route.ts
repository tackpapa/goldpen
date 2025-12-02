import { createClient, createAdminClient } from '@/lib/supabase/server'

export const runtime = 'edge'

async function checkSuperAdmin(supabase: ReturnType<typeof createClient>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { authorized: false, error: 'Unauthorized', status: 401 }
  }

  const adminClient = createAdminClient()
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

// GET /api/admin/stats/messages - 메시지 발송 통계 조회
export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const adminClient = createAdminClient()
    const authCheck = await checkSuperAdmin(supabase)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const url = new URL(request.url)
    const period = url.searchParams.get('period') || 'month' // day, week, month, year, all
    const month = url.searchParams.get('month') // YYYY-MM format

    // 기간 계산
    let startDate: Date
    let endDate: Date | null = null
    const now = new Date()

    // month 파라미터가 있으면 해당 월로 필터링
    if (month) {
      const [year, monthNum] = month.split('-').map(Number)
      startDate = new Date(year, monthNum - 1, 1)
      endDate = new Date(year, monthNum, 0, 23, 59, 59, 999) // 해당 월의 마지막 날
    } else {
      switch (period) {
        case 'day':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = new Date(0) // all time
      }
    }

    // 메시지 타입별 통계
    let query = adminClient
      .from('message_logs')
      .select('message_type, recipient_count, total_price, total_cost, profit')
      .gte('created_at', startDate.toISOString())

    // endDate가 있으면 해당 범위까지만 필터링
    if (endDate) {
      query = query.lte('created_at', endDate.toISOString())
    }

    const { data: stats, error: statsError } = await query

    if (statsError) {
      console.error('[Message Stats] Error:', statsError)
      // 테이블이 없거나 데이터가 없을 경우 빈 통계 반환
      return Response.json({
        sms: { count: 0, totalPrice: 0, totalCost: 0, profit: 0 },
        kakao_alimtalk: { count: 0, totalPrice: 0, totalCost: 0, profit: 0 },
        total: { count: 0, totalPrice: 0, totalCost: 0, profit: 0 },
        period,
      })
    }

    // 통계 계산
    const result = {
      sms: { count: 0, totalPrice: 0, totalCost: 0, profit: 0 },
      kakao_alimtalk: { count: 0, totalPrice: 0, totalCost: 0, profit: 0 },
      total: { count: 0, totalPrice: 0, totalCost: 0, profit: 0 },
      period,
    }

    for (const row of stats || []) {
      const type = row.message_type as 'sms' | 'kakao_alimtalk'
      if (type === 'sms' || type === 'kakao_alimtalk') {
        result[type].count += row.recipient_count || 0
        result[type].totalPrice += row.total_price || 0
        result[type].totalCost += row.total_cost || 0
        result[type].profit += row.profit || 0
      }
      result.total.count += row.recipient_count || 0
      result.total.totalPrice += row.total_price || 0
      result.total.totalCost += row.total_cost || 0
      result.total.profit += row.profit || 0
    }

    return Response.json(result)
  } catch (error) {
    console.error('[Message Stats] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
