import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

/**
 * GET /api/settings/billing-summary
 *
 * 이번 달 알림톡 유형별 집계 + 잔액만 반환 (경량 API)
 * - 빠른 응답 (단일 쿼리)
 * - 대시보드 요약 표시용
 */
export async function GET(request: Request) {
  try {
    const service = getServiceClient()
    if (!service) {
      return Response.json({ error: 'Service unavailable' }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const slug = searchParams.get('orgSlug') || searchParams.get('slug')

    if (!slug) {
      return Response.json({ error: 'orgSlug is required' }, { status: 400 })
    }

    // org_id 조회
    const { data: org, error: orgError } = await service
      .from('organizations')
      .select('id, credit_balance')
      .eq('slug', slug)
      .maybeSingle()

    if (orgError || !org) {
      return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
    }

    const orgId = org.id
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString()

    // 이번 달 알림톡 집계만 조회 (단일 쿼리)
    const { data: thisMonthLogs, error: logsError } = await service
      .from('message_logs')
      .select('description, total_price')
      .eq('org_id', orgId)
      .eq('message_type', 'kakao_alimtalk')
      .gte('created_at', monthStart)
      .lte('created_at', monthEnd)

    if (logsError) {
      console.error('[Billing Summary] Query error:', logsError)
      return Response.json({ error: '조회 실패' }, { status: 500 })
    }

    // 유형별 집계
    const summaryMap: Record<string, { count: number; cost: number }> = {}
    let totalCount = 0
    let totalCost = 0

    for (const log of (thisMonthLogs || [])) {
      const desc = log.description || ''
      let notificationType: string | null = null
      if (desc.startsWith('late:') || desc.includes('_late:')) notificationType = '지각 알림'
      else if (desc.startsWith('absent:') || desc.includes('_absent:')) notificationType = '결석 알림'
      else if (desc.startsWith('checkin:')) notificationType = '입실/등원 알림'
      else if (desc.startsWith('checkout:')) notificationType = '퇴실/하원 알림'
      else if (desc.startsWith('out:') || desc.startsWith('study_out:')) notificationType = '외출 알림'
      else if (desc.startsWith('return:') || desc.startsWith('study_return:')) notificationType = '복귀 알림'
      else if (desc.startsWith('daily_report:') || desc.startsWith('study_report:')) notificationType = '당일 학습 진행 결과'
      else if (desc.startsWith('lesson_report:')) notificationType = '수업일지 전송'
      else if (desc.startsWith('exam_result:')) notificationType = '시험 결과'
      else if (desc.startsWith('assignment_new:') || desc.startsWith('assignment:')) notificationType = '과제 알림'
      if (!notificationType) continue

      if (!summaryMap[notificationType]) {
        summaryMap[notificationType] = { count: 0, cost: 0 }
      }
      summaryMap[notificationType].count += 1
      summaryMap[notificationType].cost += log.total_price || 0
      totalCount += 1
      totalCost += log.total_price || 0
    }

    const usageSummary = Object.entries(summaryMap).map(([type, data]) => ({
      type,
      count: data.count,
      cost: data.cost,
    })).sort((a, b) => b.count - a.count)

    return Response.json({
      creditBalance: org.credit_balance || 0,
      totalCount,
      totalCost,
      usageSummary,
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    })
  } catch (error: any) {
    console.error('[Billing Summary] Error:', error)
    return Response.json({ error: '서버 오류' }, { status: 500 })
  }
}
