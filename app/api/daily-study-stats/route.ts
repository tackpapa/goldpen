import { createAuthenticatedClient } from '@/lib/supabase/client-edge'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    if (!studentId) {
      return Response.json({ error: 'studentId가 필요합니다' }, { status: 400 })
    }

    const { data: stats, error } = await supabase
      .from('daily_study_stats')
      .select('*')
      .eq('student_id', studentId)
      .eq('date', date)

    if (error) {
      console.error('[DailyStudyStats GET] Error:', error)
      return Response.json({ error: '통계 조회 실패' }, { status: 500 })
    }

    return Response.json({ stats: stats || [] })
  } catch (error: any) {
    console.error('[DailyStudyStats GET] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    const body = await request.json()
    const { studentId, subjectId, subjectName, subjectColor, date, totalSeconds, sessionCount, morningSeconds, afternoonSeconds, nightSeconds } = body

    // Upsert - update if exists, insert if not
    const { data: existing } = await supabase
      .from('daily_study_stats')
      .select('id')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .eq('date', date)
      .single()

    if (existing) {
      const { data: stat, error } = await supabase
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
        .select()
        .single()

      if (error) {
        console.error('[DailyStudyStats POST] Update Error:', error)
        return Response.json({ error: '통계 업데이트 실패' }, { status: 500 })
      }
      return Response.json({ stat })
    } else {
      const { data: stat, error } = await supabase
        .from('daily_study_stats')
        .insert({
          org_id: userProfile.org_id,
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
    console.error('[DailyStudyStats POST] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
