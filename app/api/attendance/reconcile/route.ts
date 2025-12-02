import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const

export async function POST(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

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

    // 1) 오늘 해당 요일 수업 스케줄 조회
    const { data: schedules, error: scheduleError } = await db
      .from('schedules')
      .select('id, class_id, day_of_week, end_time')
      .eq('org_id', orgId)
      .eq('day_of_week', targetDay)

    if (scheduleError) {
      return Response.json({ error: '스케줄 조회 실패', details: scheduleError.message }, { status: 500 })
    }

    if (!schedules?.length) {
      return Response.json({ inserted: 0, skipped: 0, reason: 'no schedules' })
    }

    const classIds = schedules.map((s: { class_id?: string }) => s.class_id).filter(Boolean)
    if (!classIds.length) {
      return Response.json({ inserted: 0, skipped: 0, reason: 'no class ids' })
    }

    // 2) 수업 등록 학생 목록
    const { data: enrollments, error: enrollError } = await db
      .from('class_enrollments')
      .select('class_id, student_id')
      .in('class_id', classIds)
      .eq('org_id', orgId)
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

      const { data: existing, error: existingError } = await db
        .from('attendance')
        .select('id, status')
        .eq('org_id', orgId)
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

      const { error: insertError } = await db
        .from('attendance')
        .insert({
          org_id: orgId,
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
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[Attendance Reconcile] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
