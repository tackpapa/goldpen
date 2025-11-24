import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

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

// GET /api/admin/kakao - 카카오 알림톡 전체 현황
export async function GET(request: Request) {
  try {
    const supabase = createClient()
    const authCheck = await checkSuperAdmin(supabase)

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

    // 전체 통계
    let statsQuery = supabase
      .from('kakao_talk_usages')
      .select('cost, status', { count: 'exact' })
      .gte('sent_at', startDate.toISOString())

    if (orgId) {
      statsQuery = statsQuery.eq('org_id', orgId)
    }

    const { data: allUsages, count: totalCount } = await statsQuery

    // 통계 계산
    const stats = {
      total_count: totalCount || 0,
      total_cost: 0,
      success_count: 0,
      failed_count: 0,
    }

    if (allUsages) {
      allUsages.forEach((usage) => {
        stats.total_cost += Number(usage.cost) || 0
        if (usage.status === 'success') {
          stats.success_count++
        } else {
          stats.failed_count++
        }
      })
    }

    // 기관별 사용량
    const { data: orgUsages } = await supabase
      .from('kakao_talk_usages')
      .select('org_id, cost')
      .gte('sent_at', startDate.toISOString())

    const orgStats: Record<string, { count: number; cost: number }> = {}
    if (orgUsages) {
      orgUsages.forEach((usage) => {
        if (!orgStats[usage.org_id]) {
          orgStats[usage.org_id] = { count: 0, cost: 0 }
        }
        orgStats[usage.org_id].count++
        orgStats[usage.org_id].cost += Number(usage.cost) || 0
      })
    }

    // 기관 정보 가져오기
    const orgIds = Object.keys(orgStats)
    let orgDetails: Record<string, { name: string; type: string }> = {}

    if (orgIds.length > 0) {
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, name, type')
        .in('id', orgIds)

      if (orgs) {
        orgs.forEach((org) => {
          orgDetails[org.id] = { name: org.name, type: org.type }
        })
      }
    }

    const organizationUsages = Object.entries(orgStats)
      .map(([orgId, data]) => ({
        org_id: orgId,
        org_name: orgDetails[orgId]?.name || 'Unknown',
        org_type: orgDetails[orgId]?.type || 'unknown',
        count: data.count,
        cost: data.cost,
      }))
      .sort((a, b) => b.count - a.count)

    // 최근 발송 내역
    let recentQuery = supabase
      .from('kakao_talk_usages')
      .select(`
        id,
        org_id,
        student_name,
        type,
        message,
        cost,
        status,
        sent_at
      `)
      .order('sent_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (orgId) {
      recentQuery = recentQuery.eq('org_id', orgId)
    }

    const { data: recentUsages } = await recentQuery

    // 기관 정보 추가
    const recentWithOrg = (recentUsages || []).map((usage) => ({
      ...usage,
      org_name: orgDetails[usage.org_id]?.name || 'Unknown',
    }))

    // 일별 통계 (최근 7일)
    const dailyStats: { date: string; count: number; cost: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayStart = new Date(dateStr)
      const dayEnd = new Date(dateStr)
      dayEnd.setDate(dayEnd.getDate() + 1)

      const { data: dayUsages } = await supabase
        .from('kakao_talk_usages')
        .select('cost')
        .gte('sent_at', dayStart.toISOString())
        .lt('sent_at', dayEnd.toISOString())

      let dayCount = 0
      let dayCost = 0
      if (dayUsages) {
        dayCount = dayUsages.length
        dayCost = dayUsages.reduce((sum, u) => sum + (Number(u.cost) || 0), 0)
      }

      dailyStats.push({
        date: dateStr,
        count: dayCount,
        cost: dayCost,
      })
    }

    return Response.json({
      stats,
      organization_usages: organizationUsages.slice(0, 10),
      recent_usages: recentWithOrg,
      daily_stats: dailyStats,
      total: totalCount || 0,
      page,
      limit,
    })
  } catch (error) {
    console.error('[Kakao GET] Error:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
