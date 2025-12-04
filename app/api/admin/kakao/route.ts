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
    const period = searchParams.get('period') || '30' // days
    const orgId = searchParams.get('org_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - parseInt(period))

    // ========================================
    // 1. 전체 통계 - notification_logs 기준 (발송 건수)
    // ========================================
    let notifStatsQuery = adminClient
      .from('notification_logs')
      .select('status', { count: 'exact' })
      .gte('created_at', startDate.toISOString())

    if (orgId) {
      notifStatsQuery = notifStatsQuery.eq('org_id', orgId)
    }

    const { data: notifData, count: totalNotifCount } = await notifStatsQuery

    // 성공/실패 카운트
    let successCount = 0
    let failedCount = 0
    if (notifData) {
      notifData.forEach((n) => {
        if (n.status === 'sent') successCount++
        else failedCount++
      })
    }

    // ========================================
    // 2. 비용 통계 - message_logs 기준 (kakao_alimtalk만)
    // ========================================
    let msgStatsQuery = adminClient
      .from('message_logs')
      .select('recipient_count, total_price, total_cost, profit')
      .eq('message_type', 'kakao_alimtalk')
      .gte('created_at', startDate.toISOString())

    if (orgId) {
      msgStatsQuery = msgStatsQuery.eq('org_id', orgId)
    }

    const { data: msgData } = await msgStatsQuery

    let totalRecipients = 0
    let totalPrice = 0
    let totalCost = 0
    let totalProfit = 0

    if (msgData) {
      msgData.forEach((m) => {
        totalRecipients += m.recipient_count || 0
        totalPrice += m.total_price || 0
        totalCost += m.total_cost || 0
        totalProfit += m.profit || 0
      })
    }

    const stats = {
      total_count: totalNotifCount || 0,
      success_count: successCount,
      failed_count: failedCount,
      total_recipients: totalRecipients,
      total_price: totalPrice,    // 총 판매가 (기관에 청구된 금액)
      total_cost: totalCost,      // 총 원가 (실제 발송 비용)
      total_profit: totalProfit,  // 순이익
    }

    // ========================================
    // 3. 기관별 사용량 - notification_logs 기준
    // ========================================
    const { data: orgNotifs } = await adminClient
      .from('notification_logs')
      .select('org_id')
      .gte('created_at', startDate.toISOString())

    const orgCounts: Record<string, number> = {}
    if (orgNotifs) {
      orgNotifs.forEach((n) => {
        orgCounts[n.org_id] = (orgCounts[n.org_id] || 0) + 1
      })
    }

    // 기관별 비용 정보 (message_logs)
    const { data: orgMsgs } = await adminClient
      .from('message_logs')
      .select('org_id, recipient_count, total_price')
      .eq('message_type', 'kakao_alimtalk')
      .gte('created_at', startDate.toISOString())

    const orgCosts: Record<string, { recipients: number; price: number }> = {}
    if (orgMsgs) {
      orgMsgs.forEach((m) => {
        if (!orgCosts[m.org_id]) {
          orgCosts[m.org_id] = { recipients: 0, price: 0 }
        }
        orgCosts[m.org_id].recipients += m.recipient_count || 0
        orgCosts[m.org_id].price += m.total_price || 0
      })
    }

    // 기관 정보 가져오기
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
      .map((orgId) => ({
        org_id: orgId,
        org_name: orgDetails[orgId]?.name || 'Unknown',
        org_type: orgDetails[orgId]?.type || 'unknown',
        count: orgCounts[orgId] || 0,
        recipients: orgCosts[orgId]?.recipients || 0,
        cost: orgCosts[orgId]?.price || 0,
      }))
      .sort((a, b) => b.count - a.count)

    // ========================================
    // 4. 최근 발송 내역 - notification_logs + students JOIN
    // ========================================
    let recentQuery = adminClient
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

    if (orgId) {
      recentQuery = recentQuery.eq('org_id', orgId)
    }

    const { data: recentNotifs } = await recentQuery

    // 기관 이름 매핑
    const recentWithOrg = (recentNotifs || []).map((n: any) => ({
      id: n.id,
      org_id: n.org_id,
      org_name: orgDetails[n.org_id]?.name || 'Unknown',
      student_name: n.students?.name || '-',
      type: n.type,
      message: n.message,
      status: n.status,
      error_message: n.error_message,
      sent_at: n.created_at,
      cost: 100, // 기본 건당 비용 (message_pricing에서 조회 가능)
    }))

    // ========================================
    // 5. 일별 통계 (최근 7일) - notification_logs 기준
    // ========================================
    const dailyStats: { date: string; count: number; success: number; failed: number }[] = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayStart = new Date(dateStr)
      const dayEnd = new Date(dateStr)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const { data: dayNotifs } = await adminClient
        .from('notification_logs')
        .select('status')
        .gte('created_at', dayStart.toISOString())
        .lt('created_at', dayEnd.toISOString())

      let daySuccess = 0
      let dayFailed = 0
      if (dayNotifs) {
        dayNotifs.forEach((n) => {
          if (n.status === 'sent') daySuccess++
          else dayFailed++
        })
      }

      dailyStats.push({
        date: dateStr,
        count: (dayNotifs?.length || 0),
        success: daySuccess,
        failed: dayFailed,
      })
    }

    // ========================================
    // 6. 알림 유형별 통계
    // ========================================
    const { data: typeNotifs } = await adminClient
      .from('notification_logs')
      .select('type, status')
      .gte('created_at', startDate.toISOString())

    const typeStats: Record<string, { total: number; success: number; failed: number }> = {}
    if (typeNotifs) {
      typeNotifs.forEach((n) => {
        if (!typeStats[n.type]) {
          typeStats[n.type] = { total: 0, success: 0, failed: 0 }
        }
        typeStats[n.type].total++
        if (n.status === 'sent') typeStats[n.type].success++
        else typeStats[n.type].failed++
      })
    }

    const typeBreakdown = Object.entries(typeStats)
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.total - a.total)

    return Response.json({
      stats,
      organization_usages: organizationUsages.slice(0, 10),
      recent_usages: recentWithOrg,
      daily_stats: dailyStats,
      type_breakdown: typeBreakdown,
      total: totalNotifCount || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('[Kakao GET] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
