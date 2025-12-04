import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { createAttendanceSchema } from '@/lib/validations/attendance'
import { ZodError } from 'zod'
import { logActivity, actionDescriptions } from '@/app/api/_utils/activity-log'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    // getSupabaseWithOrg로 인증 + org_id 처리 통합
    const { db: supabase, orgId, user } = await getSupabaseWithOrg(request)

    const { searchParams } = new URL(request.url)

    const student_id = searchParams.get('student_id')
    const class_id = searchParams.get('class_id')
    const date = searchParams.get('date')
    const targetDateParam = searchParams.get('target_date')
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)
    const todayStr = new Date().toISOString().slice(0, 10)

    // 기준 날짜: target_date > date > 오늘 순으로 선택
    const selectedDateStr = (() => {
      const raw = targetDateParam || date || todayStr
      const d = new Date(raw)
      // 유효하지 않은 날짜면 오늘로 폴백
      if (Number.isNaN(d.getTime())) return todayStr
      return d.toISOString().slice(0, 10)
    })()

    // 통계 기간 계산 (기준일 포함 뒤로 6일, 29일)
    const selectedDate = new Date(selectedDateStr)
    const weekStart = new Date(selectedDate)
    weekStart.setUTCDate(weekStart.getUTCDate() - 6)
    const weekStartStr = weekStart.toISOString().slice(0, 10)
    const monthStart = new Date(selectedDate)
    monthStart.setUTCDate(monthStart.getUTCDate() - 29)
    const monthStartStr = monthStart.toISOString().slice(0, 10)

    // 자동 결석 보정 (중복 예외로 500 발생 가능해 일시 비활성화)
    // const targetDate = date || new Date().toISOString().slice(0, 10)
    // await ensureAbsencesForDate(supabase, userProfile.org_id, targetDate)

    // 공통 필터를 함수로 묶어 count/데이터 양쪽에 동일 적용
    const withFilters = (qb: any) => {
      let q = qb.eq('org_id', orgId)
      if (student_id) q = q.eq('student_id', student_id)
      if (class_id) q = q.eq('class_id', class_id)
      if (date) q = q.eq('date', date)
      if (status) q = q.eq('status', status)
      return q
    }

    // 총 건수 (무한스크롤 hasMore 정확도 향상)
    const { count: totalCount } = await withFilters(
      supabase.from('attendance').select('id', { count: 'exact', head: true })
    )

    let query = withFilters(
      supabase
        .from('attendance')
        .select('*, student:student_id(id, name), class:class_id(id, name, teacher_name, schedule)')
        .order('date', { ascending: false })
    )
    query = query.range(offset, offset + limit - 1)

    let { data: attendance, error } = await query

    if (error) {
      console.error('[Attendance GET] Error:', error)
      return Response.json({ error: '출결 목록 조회 실패' }, { status: 500 })
    }

    // 학생 이름이 비어있는 레코드는 한 번에 학생 테이블로 보강 (이름 대신 id가 표시되는 문제 방지)
    const missingStudentIds = Array.from(
      new Set(
        (attendance || [])
          .filter((a: any) => !a.student?.name && a.student_id)
          .map((a: any) => a.student_id)
      )
    )
    if (missingStudentIds.length > 0) {
      const { data: studentRows } = await supabase
        .from('students')
        .select('id, name')
        .in('id', missingStudentIds)
        .eq('org_id', orgId)

      const map = new Map((studentRows || []).map((s: any) => [s.id, s.name]))
      attendance = (attendance || []).map((a: any) => {
        if (!a.student?.name) {
          const name = map.get(a.student_id)
          if (name) {
            a.student = a.student || {}
            a.student.name = name
          }
        }
        return a
      })
    }

    // 선택 날짜 요일에 맞는 수업 스케줄 조회해 선생님/시간 매핑
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
    const todayDay = dayMap[new Date(selectedDateStr).getDay()]

    // 병렬 쿼리 실행 (N+1 최적화)
    const [todayRowsRes, enrollmentsRes, weeklyStatsData, studentRatesData] = await Promise.all([
      // 선택 날짜 출결 기록 (실제 체크된 것)
      supabase
        .from('attendance')
        .select('*, student:student_id(id, name), class:class_id(id, name, teacher_name, schedule)')
        .eq('org_id', orgId)
        .eq('date', selectedDateStr)
        .order('updated_at', { ascending: false }),

      // 오늘 요일에 해당하는 수업들 (등록 + 스케줄)
      supabase
        .from('class_enrollments')
        .select('class_id, student_id, students!inner(id, name), classes!inner(id, name, teacher_name, schedule, org_id)')
        .eq('status', 'active')
        .eq('org_id', orgId)
        .eq('classes.org_id', orgId),

      // 주간 통계 (병렬 실행)
      buildWeeklyStats(supabase, orgId, weekStartStr, selectedDateStr),

      // 학생별 출결률 (병렬 실행)
      buildStudentRates(supabase, orgId, monthStartStr, selectedDateStr)
    ])

    const todayRows = todayRowsRes.data
    const enrollments = enrollmentsRes.data

    const scheduleMap: Record<string, { start_time: string | null; end_time: string | null; teacher_name: string | null }> = {}
    const korDayMap: Record<string, string> = {
      sunday: '일',
      monday: '월',
      tuesday: '화',
      wednesday: '수',
      thursday: '목',
      friday: '금',
      saturday: '토',
    }
    // 해당 요일에 스케줄이 있는 경우에만 반환, 없으면 null (폴백 제거)
    const pickSchedule = (schedArr: any[]) => {
      // 영문 요일명으로 검색
      let found = schedArr.find((s) => s.day === todayDay)
      if (!found) {
        // 한글 요일명으로 검색
        const kor = korDayMap[todayDay]
        found = schedArr.find((s) => s.day === kor)
      }
      // 폴백 제거: 해당 요일에 스케줄이 없으면 null 반환
      return found || null
    }

    // attendance map (key: student-class)
    const attendanceMap = new Map<string, any>()
    ;(todayRows || []).forEach((a: any) => {
      const key = `${a.student_id}-${a.class_id || ''}`
      attendanceMap.set(key, a)
    })

    const todayStudents = (enrollments || [])
      .map((en: any) => {
        const cls = en.classes
        if (!cls) return null
        const schedArr = Array.isArray(cls.schedule) ? cls.schedule : []
        if (schedArr.length === 0) return null
        const picked = pickSchedule(schedArr)
        // 해당 요일에 스케줄이 없으면 제외
        if (!picked) return null
        const key = `${en.student_id}-${en.class_id || ''}`
        const att = attendanceMap.get(key)
        const status = att?.status || 'scheduled'
        const studentName = att?.student?.name || en.students?.name || en.student_id
        return {
          id: att?.id || null,
          student_id: en.student_id,
          student_name: studentName,
          class_id: en.class_id,
          class_name: cls.name || en.class_id,
          teacher_id: null,
          teacher_name: cls.teacher_name || '',
          status,
          is_one_on_one: false,
          scheduled_time: picked?.start_time && picked?.end_time ? `${picked.start_time} - ${picked.end_time}` : '',
        }
      })
      .filter(Boolean)
      .reduce((acc: any[], cur: any) => {
        const found = acc.find((s) => s.student_id === cur.student_id)
        if (found) {
          found.classes.push({
            id: cur.id,
            class_id: cur.class_id,
            class_name: cur.class_name,
            teacher_name: cur.teacher_name,
            scheduled_time: cur.scheduled_time,
            status: cur.status,
          })
          return acc
        }
        acc.push({
          student_id: cur.student_id,
          student_name: cur.student_name,
          classes: [{
            id: cur.id,
            class_id: cur.class_id,
            class_name: cur.class_name,
            teacher_name: cur.teacher_name,
            scheduled_time: cur.scheduled_time,
            status: cur.status,
          }],
          status: cur.status,
        })
        return acc
      }, [])
      .map((s: any) => {
        // aggregate status (worst first)
        const priority: Record<string, number> = { absent: 0, late: 1, present: 2, excused: 3, scheduled: 4 }
        const aggStatus = s.classes.reduce((min: {status: string, p: number}, c: any) => {
          const p = priority[c.status] ?? 99
          return p < min.p ? { status: c.status, p } : min
        }, { status: 'present', p: 99 }).status
        return { ...s, status: aggStatus }
      })

    const fetched = attendance?.length || 0
    const hasMore = totalCount !== null && totalCount !== undefined
      ? offset + fetched < totalCount
      : fetched === limit

    return Response.json({
      attendance,
      count: attendance?.length || 0,
      total: totalCount ?? null,
      hasMore,
      todayStudents,
      weeklyStats: weeklyStatsData, // 병렬 쿼리로 미리 계산됨
      studentRates: studentRatesData, // 병렬 쿼리로 미리 계산됨
      nextOffset: offset + (attendance?.length || 0),
      selectedDate: selectedDateStr,
    }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' }
    })
  } catch (error: any) {
    console.error('[Attendance GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error?.message }, { status: 500 })
  }
}

// 최근 7일 상태 합계
async function buildWeeklyStats(supabase: any, orgId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('attendance')
    .select('date,status')
    .eq('org_id', orgId)
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error || !data) return []

  const days: Record<string, { present: number; late: number; absent: number; excused: number }> = {}
  for (const row of data) {
    if (!days[row.date]) days[row.date] = { present: 0, late: 0, absent: 0, excused: 0 }
    if (row.status === 'present') days[row.date].present++
    else if (row.status === 'late') days[row.date].late++
    else if (row.status === 'absent') days[row.date].absent++
    else if (row.status === 'excused') days[row.date].excused++
  }

  return Object.keys(days)
    .sort()
    .map((date) => ({ date, ...days[date] }))
}

// 최근 30일 학생별 출결률 Top 20
async function buildStudentRates(supabase: any, orgId: string, startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from('attendance')
    .select('student_id, status, student:student_id(name)')
    .eq('org_id', orgId)
    .gte('date', startDate)
    .lte('date', endDate)

  if (error || !data) return []

  const agg: Record<string, { name: string; present: number; late: number; absent: number; excused: number }> = {}
  for (const row of data) {
    const key = row.student_id
    if (!agg[key]) agg[key] = { name: row.student?.name || key, present: 0, late: 0, absent: 0, excused: 0 }
    if (row.status === 'present') agg[key].present++
    else if (row.status === 'late') agg[key].late++
    else if (row.status === 'absent') agg[key].absent++
    else if (row.status === 'excused') agg[key].excused++
  }

  return Object.entries(agg)
    .map(([id, v]) => {
      const total = v.present + v.late + v.absent + v.excused
      const rate = total === 0 ? 0 : Math.round((v.present / total) * 100)
      return { id, ...v, rate }
    })
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 20)
}

// 과거 날짜 출결 자동 보정: 스케줄은 있는데 출결 레코드가 없는 경우 absent로 채움
async function ensureAbsencesForDate(
  supabase: any,
  orgId: string,
  dateStr: string
) {
  try {
    const todayStr = new Date().toISOString().slice(0, 10)
    if (dateStr >= todayStr) return // 오늘/미래는 보정하지 않음

    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
    const targetDay = dayMap[new Date(dateStr).getDay()]

    // 1) 해당 요일 스케줄 조회
    const { data: schedules, error: scheduleError } = await supabase
      .from('schedules')
      .select('class_id')
      .eq('org_id', orgId)
      .eq('day_of_week', targetDay)

    if (scheduleError || !schedules?.length) return

    const classIds = schedules.map((s: any) => s.class_id).filter(Boolean)
    if (!classIds.length) return

    // 2) 수강 학생 조회
    const { data: enrollments, error: enrollError } = await supabase
      .from('class_enrollments')
      .select('class_id, student_id')
      .in('class_id', classIds)
      .eq('status', 'active')

    if (enrollError || !enrollments?.length) return

    const enrollmentKeys = enrollments
      .filter((e: any) => e.class_id && e.student_id)
      .map((e: any) => `${e.class_id}:${e.student_id}`)

    if (!enrollmentKeys.length) return

    // 3) 이미 존재하는 출결 조회
    const { data: existing, error: existingError } = await supabase
      .from('attendance')
      .select('class_id, student_id')
      .eq('org_id', orgId)
      .eq('date', dateStr)
      .in('class_id', classIds)

    if (existingError) return

    const existingSet = new Set((existing || []).map((a: any) => `${a.class_id}:${a.student_id}`))

    const missingRows = enrollments
      .filter((e: any) => e.class_id && e.student_id)
      .filter((e: any) => !existingSet.has(`${e.class_id}:${e.student_id}`))
      .map((e: any) => ({
        org_id: orgId,
        class_id: e.class_id,
        student_id: e.student_id,
        date: dateStr,
        status: 'absent',
      }))

    if (!missingRows.length) return

    const { error } = await supabase
      .from('attendance')
      // insert only; if unique constraint exists it will prevent dupes, otherwise succeed
      .insert(missingRows)

    if (error) {
      console.error('[Attendance GET] auto-absent insert error:', error)
    }
  } catch (err) {
    console.error('[Attendance GET] auto-absent unexpected error:', err)
  }
}

export async function POST(request: Request) {
  try {
    // getSupabaseWithOrg로 인증 + org_id 처리 통합
    const { db: supabase, orgId, user } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = createAttendanceSchema.parse(body)

    const { data: attendanceData, error: createError } = await supabase
      .from('attendance')
      .insert({ ...validated, org_id: orgId })
      .select()
      .single()

    if (createError) {
      console.error('[Attendance POST] Error:', createError)
      if (createError.code === '23505') {
        return Response.json({ error: '이미 해당 날짜에 출결 기록이 존재합니다' }, { status: 409 })
      }
      return Response.json({ error: '출결 생성 실패' }, { status: 500 })
    }

    // 활동 로그 기록 (await 필요 - Edge Runtime에서 fire-and-forget이 작동하지 않음)
    await logActivity({
      orgId,
      userId: user?.id || 'anonymous',
      userName: user?.email?.split('@')[0] || '사용자',
      userRole: null,
      actionType: 'create',
      entityType: 'attendance',
      entityId: attendanceData.id,
      entityName: `${validated.date} 출결`,
      description: actionDescriptions.attendance.create(`${validated.date}`),
      request,
    })

    return Response.json({ attendance: attendanceData, message: '출결이 기록되었습니다' }, { status: 201 })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[Attendance POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
