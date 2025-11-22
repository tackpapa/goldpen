import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createAttendanceSchema } from '@/lib/validations/attendance'
import { ZodError } from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return Response.json({ error: '인증이 필요합니다' }, { status: 401 })

    const { data: userProfile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
    if (!userProfile) return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })

    const { searchParams } = new URL(request.url)
    const student_id = searchParams.get('student_id')
    const class_id = searchParams.get('class_id')
    const date = searchParams.get('date')
    const status = searchParams.get('status')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10), 0)
    const todayStr = new Date().toISOString().slice(0, 10)
    const weekStart = new Date()
    weekStart.setUTCDate(weekStart.getUTCDate() - 6)
    const weekStartStr = weekStart.toISOString().slice(0, 10)
    const monthStart = new Date()
    monthStart.setUTCDate(monthStart.getUTCDate() - 29)
    const monthStartStr = monthStart.toISOString().slice(0, 10)

    // 자동 결석 보정 (중복 예외로 500 발생 가능해 일시 비활성화)
    // const targetDate = date || new Date().toISOString().slice(0, 10)
    // await ensureAbsencesForDate(supabase, userProfile.org_id, targetDate)

    let query = supabase
      .from('attendance')
      .select('*, student:student_id(id, name), class:class_id(id, name, teacher_name, schedule)')
      .eq('org_id', userProfile.org_id)
      .order('date', { ascending: false })

    if (student_id) query = query.eq('student_id', student_id)
    if (class_id) query = query.eq('class_id', class_id)
    if (date) query = query.eq('date', date)
    if (status) query = query.eq('status', status)
    query = query.range(offset, offset + limit - 1)

    const { data: attendance, error } = await query

    if (error) {
      console.error('[Attendance GET] Error:', error)
      return Response.json({ error: '출결 목록 조회 실패' }, { status: 500 })
    }

    // 오늘 출결 기록 (실제 체크된 것)
    const { data: todayRows } = await supabase
      .from('attendance')
      .select('*, student:student_id(id, name), class:class_id(id, name, teacher_name, schedule)')
      .eq('org_id', userProfile.org_id)
      .eq('date', todayStr)
      .order('updated_at', { ascending: false })

    console.log('[Attendance GET] todayRows count', todayRows?.length || 0)

    // 오늘 요일에 맞는 수업 스케줄 조회해 선생님/시간 매핑
    const dayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const
    const todayDay = dayMap[new Date(todayStr).getDay()]
    // 오늘 요일에 해당하는 수업들 (등록 + 스케줄) -> 모든 수업행 구성 후 출결 매핑
    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('class_id, student_id, classes!inner(id, name, teacher_name, schedule, org_id)')
      .eq('status', 'active')
      .eq('classes.org_id', userProfile.org_id)

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
    const pickSchedule = (schedArr: any[]) => {
      let found = schedArr.find((s) => s.day === todayDay)
      if (!found) {
        const kor = korDayMap[todayDay]
        found = schedArr.find((s) => s.day === kor)
      }
      if (!found) found = schedArr[0]
      return found
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
        const key = `${en.student_id}-${en.class_id || ''}`
        const att = attendanceMap.get(key)
        const status = att?.status || 'scheduled'
        return {
          id: att?.id || null,
          student_id: en.student_id,
          student_name: att?.student?.name || en.student_id,
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

    return Response.json({
      attendance,
      count: attendance?.length || 0,
      todayStudents,
      weeklyStats: await buildWeeklyStats(supabase, userProfile.org_id, weekStartStr, todayStr), // 이번 주
      studentRates: await buildStudentRates(supabase, userProfile.org_id, monthStartStr, todayStr), // 이번 달
      nextOffset: offset + (attendance?.length || 0),
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
      return { id, name: v.name, ...v, rate }
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
    const supabase = await createAuthenticatedClient(request)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return Response.json({ error: '인증이 필요합니다' }, { status: 401 })

    const { data: userProfile } = await supabase.from('users').select('org_id').eq('id', user.id).single()
    if (!userProfile) return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })

    const body = await request.json()
    const validated = createAttendanceSchema.parse(body)

    const { data: attendanceData, error: createError } = await supabase
      .from('attendance')
      .insert({ ...validated, org_id: userProfile.org_id })
      .select()
      .single()

    if (createError) {
      console.error('[Attendance POST] Error:', createError)
      if (createError.code === '23505') {
        return Response.json({ error: '이미 해당 날짜에 출결 기록이 존재합니다' }, { status: 409 })
      }
      return Response.json({ error: '출결 생성 실패' }, { status: 500 })
    }

    return Response.json({ attendance: attendanceData, message: '출결이 기록되었습니다' }, { status: 201 })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    console.error('[Attendance POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
