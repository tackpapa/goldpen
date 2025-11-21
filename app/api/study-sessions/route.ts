import { createAuthenticatedClient } from '@/lib/supabase/client-edge'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// GET - Fetch study sessions for a student
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

    const { data: sessions, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('student_id', studentId)
      .eq('date', date)
      .order('start_time', { ascending: false })

    if (error) {
      console.error('[StudySessions GET] Error:', error)
      return Response.json({ error: '세션 조회 실패' }, { status: 500 })
    }

    return Response.json({ sessions: sessions || [] })
  } catch (error: any) {
    console.error('[StudySessions GET] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// POST - Start or update a study session
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
    const { studentId, subjectId, subjectName, action } = body

    if (!studentId || !subjectName) {
      return Response.json({ error: 'studentId와 subjectName이 필요합니다' }, { status: 400 })
    }

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const hour = now.getHours()

    // Determine time slot: 오전(00-12), 오후(12-18), 밤(18-24)
    let timeSlot = 'morning'
    if (hour >= 12 && hour < 18) {
      timeSlot = 'afternoon'
    } else if (hour >= 18) {
      timeSlot = 'night'
    }

    if (action === 'start') {
      // Start a new session
      const { data: session, error } = await supabase
        .from('study_sessions')
        .insert({
          org_id: userProfile.org_id,
          student_id: studentId,
          subject_id: subjectId,
          subject_name: subjectName,
          date: today,
          start_time: now.toISOString(),
          time_slot: timeSlot,
          status: 'active',
        })
        .select()
        .single()

      if (error) {
        console.error('[StudySessions POST start] Error:', error)
        return Response.json({ error: '세션 시작 실패' }, { status: 500 })
      }

      return Response.json({ session })
    } else if (action === 'stop') {
      const { sessionId, durationSeconds } = body

      if (!sessionId) {
        return Response.json({ error: 'sessionId가 필요합니다' }, { status: 400 })
      }

      // Update session with end time and duration
      const { data: session, error } = await supabase
        .from('study_sessions')
        .update({
          end_time: now.toISOString(),
          duration_seconds: durationSeconds || 0,
          status: 'completed',
        })
        .eq('id', sessionId)
        .select()
        .single()

      if (error) {
        console.error('[StudySessions POST stop] Error:', error)
        return Response.json({ error: '세션 종료 실패' }, { status: 500 })
      }

      // Update daily_study_stats
      await updateDailyStats(supabase, userProfile.org_id, studentId, subjectId, subjectName, today, durationSeconds, timeSlot)

      // Update study_time_records for ranking
      await updateStudyTimeRecords(supabase, userProfile.org_id, studentId, today, durationSeconds, timeSlot)

      return Response.json({ session })
    }

    return Response.json({ error: '잘못된 action입니다' }, { status: 400 })
  } catch (error: any) {
    console.error('[StudySessions POST] Error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// Helper: Update daily study stats
async function updateDailyStats(
  supabase: any,
  orgId: string,
  studentId: string,
  subjectId: string | null,
  subjectName: string,
  date: string,
  durationSeconds: number,
  timeSlot: string
) {
  // Check if record exists
  const { data: existing } = await supabase
    .from('daily_study_stats')
    .select('*')
    .eq('student_id', studentId)
    .eq('subject_name', subjectName)
    .eq('date', date)
    .single()

  const morningAdd = timeSlot === 'morning' ? durationSeconds : 0
  const afternoonAdd = timeSlot === 'afternoon' ? durationSeconds : 0
  const nightAdd = timeSlot === 'night' ? durationSeconds : 0

  if (existing) {
    await supabase
      .from('daily_study_stats')
      .update({
        total_seconds: existing.total_seconds + durationSeconds,
        session_count: existing.session_count + 1,
        morning_seconds: existing.morning_seconds + morningAdd,
        afternoon_seconds: existing.afternoon_seconds + afternoonAdd,
        night_seconds: existing.night_seconds + nightAdd,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('daily_study_stats')
      .insert({
        org_id: orgId,
        student_id: studentId,
        subject_id: subjectId,
        subject_name: subjectName,
        subject_color: '#4A90E2',
        date,
        total_seconds: durationSeconds,
        session_count: 1,
        morning_seconds: morningAdd,
        afternoon_seconds: afternoonAdd,
        night_seconds: nightAdd,
      })
  }
}

// Helper: Update study time records for ranking
async function updateStudyTimeRecords(
  supabase: any,
  orgId: string,
  studentId: string,
  date: string,
  durationSeconds: number,
  timeSlot: string
) {
  // Get student name
  const { data: student } = await supabase
    .from('students')
    .select('name')
    .eq('id', studentId)
    .single()

  const studentName = student?.name || '학생'
  const durationMinutes = Math.floor(durationSeconds / 60)

  const morningAdd = timeSlot === 'morning' ? durationMinutes : 0
  const afternoonAdd = timeSlot === 'afternoon' ? durationMinutes : 0
  const nightAdd = timeSlot === 'night' ? durationMinutes : 0

  // Check if record exists
  const { data: existing } = await supabase
    .from('study_time_records')
    .select('*')
    .eq('student_id', studentId)
    .eq('date', date)
    .single()

  if (existing) {
    await supabase
      .from('study_time_records')
      .update({
        total_minutes: existing.total_minutes + durationMinutes,
        morning_minutes: existing.morning_minutes + morningAdd,
        afternoon_minutes: existing.afternoon_minutes + afternoonAdd,
        night_minutes: existing.night_minutes + nightAdd,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('study_time_records')
      .insert({
        org_id: orgId,
        student_id: studentId,
        student_name: studentName,
        date,
        total_minutes: durationMinutes,
        morning_minutes: morningAdd,
        afternoon_minutes: afternoonAdd,
        night_minutes: nightAdd,
      })
  }
}
