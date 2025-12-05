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

// GET /api/admin/kakao - 카카오 알림톡 전체 현황
// 데이터 소스: notification_logs (발송 기록) + message_logs (비용/손익)
export async function GET(request: Request) {
  try {
    const adminClient = createAdminClient()
    const authCheck = await checkSuperAdmin(request)

    if (!authCheck.authorized) {
      return Response.json({ error: authCheck.error }, { status: authCheck.status })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30'
    const orgId = searchParams.get('org_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    // 일별 통계용 7일 전 날짜
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    // ========================================
    // 모든 쿼리를 병렬로 실행 (7개 루프 → 1개 쿼리 + 그룹화)
    // ========================================
    const [
      notifStatsResult,
      msgStatsResult,
      orgNotifsResult,
      orgMsgsResult,
      recentNotifsResult,
      dailyNotifsResult,
      typeNotifsResult,
    ] = await Promise.all([
      // 1. 전체 통계 - notification_logs
      (() => {
        let query = adminClient
          .from('notification_logs')
          .select('status', { count: 'exact' })
          .gte('created_at', startDate.toISOString())
        if (orgId) query = query.eq('org_id', orgId)
        return query
      })(),

      // 2. 비용 통계 - message_logs
      (() => {
        let query = adminClient
          .from('message_logs')
          .select('recipient_count, total_price, total_cost, profit')
          .eq('message_type', 'kakao_alimtalk')
          .gte('created_at', startDate.toISOString())
        if (orgId) query = query.eq('org_id', orgId)
        return query
      })(),

      // 3. 기관별 사용량 - notification_logs
      adminClient
        .from('notification_logs')
        .select('org_id')
        .gte('created_at', startDate.toISOString()),

      // 4. 기관별 비용 - message_logs
      adminClient
        .from('message_logs')
        .select('org_id, recipient_count, total_price')
        .eq('message_type', 'kakao_alimtalk')
        .gte('created_at', startDate.toISOString()),

      // 5. 최근 발송 내역
      (() => {
        let query = adminClient
          .from('notification_logs')
          .select(`
            id,
            org_id,
            student_id,
            type,
            message,
            status,
            error_message,
            created_at,
            students!inner(name)
          `)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
        if (orgId) query = query.eq('org_id', orgId)
        return query
      })(),

      // 6. 일별 통계 (7일치 한 번에 가져오기 - 7개 쿼리 → 1개)
      adminClient
        .from('notification_logs')
        .select('status, created_at')
        .gte('created_at', sevenDaysAgo.toISOString()),

      // 7. 알림 유형별 통계
      adminClient
        .from('notification_logs')
        .select('type, status')
        .gte('created_at', startDate.toISOString()),
    ])

    // ========================================
    // 결과 처리
    // ========================================

    // 1. 전체 통계
    const notifData = notifStatsResult.data || []
    const totalNotifCount = notifStatsResult.count || 0
    let successCount = 0
    let failedCount = 0
    notifData.forEach((n) => {
      if (n.status === 'sent') successCount++
      else failedCount++
    })

    // 2. 비용 통계
    const msgData = msgStatsResult.data || []
    let totalRecipients = 0
    let totalPrice = 0
    let totalCost = 0
    let totalProfit = 0
    msgData.forEach((m) => {
      totalRecipients += m.recipient_count || 0
      totalPrice += m.total_price || 0
      totalCost += m.total_cost || 0
      totalProfit += m.profit || 0
    })

    const stats = {
      total_count: totalNotifCount,
      success_count: successCount,
      failed_count: failedCount,
      total_recipients: totalRecipients,
      total_price: totalPrice,
      total_cost: totalCost,
      total_profit: totalProfit,
    }

    // 3. 기관별 사용량
    const orgNotifs = orgNotifsResult.data || []
    const orgCounts: Record<string, number> = {}
    orgNotifs.forEach((n) => {
      orgCounts[n.org_id] = (orgCounts[n.org_id] || 0) + 1
    })

    // 4. 기관별 비용
    const orgMsgs = orgMsgsResult.data || []
    const orgCosts: Record<string, { recipients: number; price: number }> = {}
    orgMsgs.forEach((m) => {
      if (!orgCosts[m.org_id]) {
        orgCosts[m.org_id] = { recipients: 0, price: 0 }
      }
      orgCosts[m.org_id].recipients += m.recipient_count || 0
      orgCosts[m.org_id].price += m.total_price || 0
    })

    // 기관 정보 가져오기 (별도 쿼리 - 필요한 경우만)
    const orgIds = [...new Set([...Object.keys(orgCounts), ...Object.keys(orgCosts)])]
    let orgDetails: Record<string, { name: string; type: string }> = {}

    if (orgIds.length > 0) {
      const { data: orgs } = await adminClient
        .from('organizations')
        .select('id, name, type')
        .in('id', orgIds)

      if (orgs) {
        orgs.forEach((org) => {
          orgDetails[org.id] = { name: org.name, type: org.type }
        })
      }
    }

    const organizationUsages = orgIds
      .map((id) => ({
        org_id: id,
        org_name: orgDetails[id]?.name || 'Unknown',
        org_type: orgDetails[id]?.type || 'unknown',
        count: orgCounts[id] || 0,
        recipients: orgCosts[id]?.recipients || 0,
        cost: orgCosts[id]?.price || 0,
      }))
      .sort((a, b) => b.count - a.count)

    // 5. 최근 발송 내역
    const recentNotifs = recentNotifsResult.data || []
    const recentWithOrg = recentNotifs.map((n: any) => ({
      id: n.id,
      org_id: n.org_id,
      org_name: orgDetails[n.org_id]?.name || 'Unknown',
      student_name: n.students?.name || '-',
      type: n.type,
      message: n.message,
      status: n.status,
      error_message: n.error_message,
      sent_at: n.created_at,
      cost: 100,
    }))

    // 6. 일별 통계 (JavaScript 그룹화 - 7개 쿼리 제거!)
    const dailyNotifs = dailyNotifsResult.data || []
    const dailyMap: Record<string, { count: number; success: number; failed: number }> = {}

    // 최근 7일 날짜 초기화
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      dailyMap[dateStr] = { count: 0, success: 0, failed: 0 }
    }

    // 데이터 그룹화
    dailyNotifs.forEach((n) => {
      const dateStr = n.created_at.split('T')[0]
      if (dailyMap[dateStr]) {
        dailyMap[dateStr].count++
        if (n.status === 'sent') dailyMap[dateStr].success++
        else dailyMap[dateStr].failed++
      }
    })

    const dailyStats = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({ date, ...data }))

    // 7. 알림 유형별 통계
    const typeNotifs = typeNotifsResult.data || []
    const typeStats: Record<string, { total: number; success: number; failed: number }> = {}
    typeNotifs.forEach((n) => {
      if (!typeStats[n.type]) {
        typeStats[n.type] = { total: 0, success: 0, failed: 0 }
      }
      typeStats[n.type].total++
      if (n.status === 'sent') typeStats[n.type].success++
      else typeStats[n.type].failed++
    })

    const typeBreakdown = Object.entries(typeStats)
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.total - a.total)

    return Response.json({
      stats,
      organization_usages: organizationUsages.slice(0, 10),
      recent_usages: recentWithOrg,
      daily_stats: dailyStats,
      type_breakdown: typeBreakdown,
      total: totalNotifCount,
      page,
      limit,
    })
  } catch (error) {
    console.error('[Kakao GET] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
