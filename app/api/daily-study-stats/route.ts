import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { searchParams } = new URL(request.url)

    const studentId = searchParams.get('studentId')
    const date = searchParams.get('date')
    // 날짜 범위 조회 지원 (주간/월간 통계용)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!studentId) {
      return Response.json({ error: 'studentId가 필요합니다' }, { status: 400 })
    }

    let query = db
      .from('daily_study_stats')
      .select('*')
      .eq('student_id', studentId)
      .eq('org_id', orgId)

    // 날짜 범위 조회 (startDate, endDate 둘 다 있을 때)
    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate)
    } else if (date) {
      // 단일 날짜 조회
      query = query.eq('date', date)
    } else {
      // 기본값: 오늘 날짜
      query = query.eq('date', new Date().toISOString().split('T')[0])
    }

    // 날짜순 정렬
    query = query.order('date', { ascending: true })

    const { data: stats, error } = await query

    if (error) {
      console.error('[DailyStudyStats GET] Error:', error)
      return Response.json({ error: '통계 조회 실패' }, { status: 500 })
    }

    return Response.json({ stats: stats || [] })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[DailyStudyStats GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    interface DailyStudyStatsBody {
      studentId: string
      subjectId: string
      subjectName: string
      subjectColor?: string
      date: string
      totalSeconds: number
      sessionCount: number
      morningSeconds?: number
      afternoonSeconds?: number
      nightSeconds?: number
    }
    const body = await request.json() as DailyStudyStatsBody
    const { studentId, subjectId, subjectName, subjectColor, date, totalSeconds, sessionCount, morningSeconds, afternoonSeconds, nightSeconds } = body

    // Upsert - update if exists, insert if not
    const { data: existing } = await db
      .from('daily_study_stats')
      .select('id')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .eq('date', date)
      .single()

    if (existing) {
      const { data: stat, error } = await db
        .from('daily_study_stats')
        .update({
          total_seconds: totalSeconds,
          session_count: sessionCount,
          morning_seconds: morningSeconds || 0,
          afternoon_seconds: afternoonSeconds || 0,
          night_seconds: nightSeconds || 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('org_id', orgId)
        .select()
        .single()

      if (error) {
        console.error('[DailyStudyStats POST] Update Error:', error)
        return Response.json({ error: '통계 업데이트 실패' }, { status: 500 })
      }
      return Response.json({ stat })
    } else {
      const { data: stat, error } = await db
        .from('daily_study_stats')
        .insert({
          org_id: orgId,
          student_id: studentId,
          subject_id: subjectId,
          subject_name: subjectName,
          subject_color: subjectColor || '#4A90E2',
          date,
          total_seconds: totalSeconds,
          session_count: sessionCount,
          morning_seconds: morningSeconds || 0,
          afternoon_seconds: afternoonSeconds || 0,
          night_seconds: nightSeconds || 0,
        })
        .select()
        .single()

      if (error) {
        console.error('[DailyStudyStats POST] Insert Error:', error)
        return Response.json({ error: '통계 생성 실패' }, { status: 500 })
      }
      return Response.json({ stat })
    }
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[DailyStudyStats POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
