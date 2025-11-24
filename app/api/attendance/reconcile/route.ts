import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

function parseTimeToMinutes(time: string | null) {
  if (!time) return null
  const [h, m, s] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0) + (s ? s / 60 : 0)
}

export async function POST(request: Request) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'Supabase credentials missing' }, { status: 500 })
    }

    const supabase = await createAuthenticatedClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    // 기본: 어제 날짜를 결석 처리 (자정 이후에 호출될 것을 가정)
    const today = new Date()
    const defaultDate = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const dateStr = searchParams.get('date') || defaultDate.toISOString().slice(0, 10)
    const targetDate = new Date(dateStr)
    const todayStr = today.toISOString().slice(0, 10)

    // 아직 지나지 않은 날짜는 처리하지 않음
    if (dateStr >= todayStr) {
      return Response.json({ inserted: 0, skipped: 0, reason: 'future_or_today' })
    }

    const targetDay = dayMap[targetDate.getDay()]

    const service = createClient(supabaseUrl, supabaseServiceKey)

    // 1) 오늘 해당 요일 수업 스케줄 조회
    const { data: schedules, error: scheduleError } = await service
      .from('schedules')
      .select('id, class_id, day_of_week, end_time')
      .eq('org_id', profile.org_id)
      .eq('day_of_week', targetDay)

    if (scheduleError) {
      return Response.json({ error: '스케줄 조회 실패', details: scheduleError.message }, { status: 500 })
    }

    if (!schedules?.length) {
      return Response.json({ inserted: 0, skipped: 0, reason: 'no schedules' })
    }

    const classIds = schedules.map((s) => s.class_id).filter(Boolean)
    if (!classIds.length) {
      return Response.json({ inserted: 0, skipped: 0, reason: 'no class ids' })
    }

    // 2) 수업 등록 학생 목록
  const { data: enrollments, error: enrollError } = await service
    .from('class_enrollments')
    .select('class_id, student_id')
    .in('class_id', classIds)
    .eq('org_id', profile.org_id)
    .eq('status', 'active')

    if (enrollError) {
      return Response.json({ error: '수강 학생 조회 실패', details: enrollError.message }, { status: 500 })
    }

    if (!enrollments?.length) {
      return Response.json({ inserted: 0, skipped: 0, reason: 'no enrollments' })
    }

    let inserted = 0
    let skipped = 0

    for (const enrollment of enrollments) {
      const classId = enrollment.class_id
      const studentId = enrollment.student_id
      if (!classId || !studentId) {
        skipped++
        continue
      }

      const { data: existing, error: existingError } = await service
        .from('attendance')
        .select('id, status')
        .eq('org_id', profile.org_id)
        .eq('class_id', classId)
        .eq('student_id', studentId)
        .eq('date', dateStr)
        .maybeSingle()

      if (existingError) {
        skipped++
        continue
      }

      if (existing) {
        // 이미 기록 있음 (present/late/absent/excused) -> 건너뜀
        skipped++
        continue
      }

      const { error: insertError } = await service
        .from('attendance')
        .insert({
          org_id: profile.org_id,
          class_id: classId,
          student_id: studentId,
          date: dateStr,
          status: 'absent',
        })

      if (insertError) {
        skipped++
        continue
      }

      inserted++
    }

    return Response.json({ inserted, skipped, date: dateStr })
  } catch (error: any) {
    console.error('[Attendance Reconcile] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
