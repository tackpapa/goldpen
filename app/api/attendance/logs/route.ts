import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const demoOrgId = process.env.DEMO_ORG_ID || process.env.NEXT_PUBLIC_DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || new Date().toISOString().slice(0, 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '500', 10), 2000)
    const serviceParam = searchParams.get('service')
    // orgSlug 파라미터 지원 (프로덕션 대시보드용)
    const orgSlug = searchParams.get('orgSlug')
    // service=1 또는 orgSlug가 있으면 서비스 모드 사용 (프로덕션에서도 허용)
    const allowService = serviceParam === '1' || !!orgSlug

    let supabase: any = await createAuthenticatedClient(request)
    let { data: { user }, error: authError } = await supabase.auth.getUser()

    let orgId: string | null = null
    if ((!user || authError) && allowService) {
      if (!supabaseUrl || !supabaseServiceKey) {
        return Response.json({ logs: [], note: 'service role missing' })
      }
      supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { autoRefreshToken: false, persistSession: false } }) as any

      // orgSlug로 org_id 조회 (프로덕션 지원)
      if (orgSlug) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', orgSlug)
          .single()

        if (orgError || !org) {
          console.error('[AttendanceLogs GET] Organization not found for slug:', orgSlug)
          return Response.json({ logs: [], error: '기관을 찾을 수 없습니다' })
        }
        orgId = org.id
      } else {
        orgId = searchParams.get('org_id') || demoOrgId
      }
    } else {
      if (authError || !user) {
        // 인증 실패 시 빈 배열 반환 (새로 가입한 사용자도 페이지 로드 가능)
        return Response.json({ logs: [], note: '인증이 필요합니다. 로그인 후 출결 데이터를 확인할 수 있습니다.' })
      }
      const { data: profile } = await supabase.from('users').select('org_id').eq('id', user.id).maybeSingle()
      orgId = profile?.org_id || null
    }

    // org_id가 없으면 빈 배열 반환
    if (!orgId) return Response.json({ logs: [], note: '기관 정보가 없습니다.' })

    // 날짜 필터 적용 (check_in_time이 해당 날짜에 포함되는 로그만 조회)
    // 한국 시간 기준으로 변환 (UTC+9)
    const startOfDay = `${date}T00:00:00+09:00`
    const endOfDay = `${date}T23:59:59.999+09:00`

    const { data, error } = await supabase
      .from('attendance_logs')
      .select('id, student_id, org_id, check_in_time, check_out_time, duration_minutes')
      .eq('org_id', orgId)
      .gte('check_in_time', startOfDay)
      .lte('check_in_time', endOfDay)
      .order('check_in_time', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[AttendanceLogs GET] error', error)
      return Response.json({ logs: [], error: '로그 조회 실패', details: error.message })
    }

    return Response.json({ logs: data || [] })
  } catch (error: any) {
    console.error('[AttendanceLogs GET] Unexpected error', error)
    return Response.json({ logs: [], error: '서버 오류', details: error?.message })
  }
}

// POST: 학생 코드로 등/하원 처리 (liveattendance 페이지용)
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const orgSlug = searchParams.get('orgSlug')

    if (!orgSlug) {
      return Response.json({ error: 'orgSlug가 필요합니다' }, { status: 400 })
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return Response.json({ error: 'service role missing' }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // orgSlug로 org_id 조회
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', orgSlug)
      .single()

    if (orgError || !org) {
      console.error('[AttendanceLogs POST] Organization not found for slug:', orgSlug)
      return Response.json({ error: '기관을 찾을 수 없습니다' }, { status: 404 })
    }

    const orgId = org.id
    const body = await request.json()
    const { code, action } = body as { code: string; action: 'check_in' | 'check_out' }

    if (!code || !action) {
      return Response.json({ error: 'code와 action이 필요합니다' }, { status: 400 })
    }

    // 학생 코드로 학생 조회
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, name, student_code')
      .eq('org_id', orgId)
      .eq('student_code', code)
      .single()

    if (studentError || !student) {
      console.error('[AttendanceLogs POST] Student not found for code:', code)
      return Response.json({ error: '학생을 찾을 수 없습니다' }, { status: 404 })
    }

    const now = new Date()

    if (action === 'check_in') {
      // 이미 열린 세션이 있는지 확인
      const { data: openSession } = await supabase
        .from('attendance_logs')
        .select('id')
        .eq('org_id', orgId)
        .eq('student_id', student.id)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .single()

      if (openSession) {
        // 이미 체크인 상태면 무시
        return Response.json({
          message: '이미 등원 상태입니다',
          student: { name: student.name }
        })
      }

      // 새 체크인 기록 생성
      const { error: insertError } = await supabase
        .from('attendance_logs')
        .insert({
          org_id: orgId,
          student_id: student.id,
          check_in_time: now.toISOString(),
          source: 'liveattendance',
        })

      if (insertError) {
        console.error('[AttendanceLogs POST] Insert error:', insertError)
        return Response.json({ error: '등원 처리 실패', details: insertError.message }, { status: 500 })
      }

      // 🎯 강의 출결 자동 처리: 학생의 오늘 수업을 찾아서 출석/지각 처리
      await processClassAttendanceOnCheckIn(supabase, orgId, student.id, now)

      // 🎯 독서실 출결 자동 처리: 학생의 commute 일정 기준 출석/지각 처리
      await processCommuteAttendanceOnCheckIn(supabase, orgId, student.id, now)

      // 🎯 seat_assignments 동기화: 학생의 좌석 상태를 checked_in으로 업데이트
      await syncSeatAssignmentStatus(supabase, orgId, student.id, 'checked_in', now)

      return Response.json({
        message: '등원 처리 완료',
        student: { name: student.name }
      })

    } else {
      // check_out
      // 열린 세션 찾기
      const { data: openSession, error: openError } = await supabase
        .from('attendance_logs')
        .select('id, check_in_time')
        .eq('org_id', orgId)
        .eq('student_id', student.id)
        .is('check_out_time', null)
        .order('check_in_time', { ascending: false })
        .limit(1)
        .single()

      if (openError || !openSession) {
        // 열린 세션이 없으면 그냥 성공 반환 (이미 하원 상태)
        return Response.json({
          message: '이미 하원 상태입니다',
          student: { name: student.name }
        })
      }

      // 체류 시간 계산
      const durationMinutes = Math.max(
        1,
        Math.ceil((now.getTime() - new Date(openSession.check_in_time).getTime()) / (1000 * 60))
      )

      // 체크아웃 처리
      const { error: updateError } = await supabase
        .from('attendance_logs')
        .update({
          check_out_time: now.toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq('id', openSession.id)

      if (updateError) {
        console.error('[AttendanceLogs POST] Update error:', updateError)
        return Response.json({ error: '하원 처리 실패', details: updateError.message }, { status: 500 })
      }

      // 🎯 seat_assignments 동기화: 학생의 좌석 상태를 checked_out으로 업데이트
      await syncSeatAssignmentStatus(supabase, orgId, student.id, 'checked_out', now)

      return Response.json({
        message: '하원 처리 완료',
        student: { name: student.name },
        durationMinutes
      })
    }
  } catch (error: any) {
    console.error('[AttendanceLogs POST] Unexpected error', error)
    return Response.json({ error: '서버 오류', details: error?.message }, { status: 500 })
  }
}

/**
 * 학생 등원 시 강의 출결 자동 처리
 * - 수업 전 등원 → 출석 (present)
 * - 수업 중 등원 → 지각 (late)
 * - 수업 후 등원 → 처리 안 함 (크론이 결석 처리)
 */
async function processClassAttendanceOnCheckIn(
  supabase: any,
  orgId: string,
  studentId: string,
  checkInTime: Date
): Promise<void> {
  try {
    // 현재 KST 시간 계산
    const kstOffset = 9 * 60 // KST는 UTC+9
    const utcMinutes = checkInTime.getUTCHours() * 60 + checkInTime.getUTCMinutes()
    const kstMinutes = utcMinutes + kstOffset
    const nowMinutes = kstMinutes % (24 * 60) // 하루를 넘어가는 경우 대비

    // 오늘 요일 (KST 기준)
    const kstDate = new Date(checkInTime.getTime() + kstOffset * 60 * 1000)
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const todayWeekday = weekdays[kstDate.getUTCDay()]
    const todayDate = kstDate.toISOString().split('T')[0]

    console.log(`[ClassAttendance] Processing for student ${studentId}, weekday: ${todayWeekday}, nowMinutes: ${nowMinutes}`)

    // 학생이 등록된 수업들 조회
    const { data: enrollments, error: enrollError } = await supabase
      .from('class_enrollments')
      .select(`
        class_id,
        classes!inner(id, name, schedule, org_id)
      `)
      .eq('student_id', studentId)
      .eq('status', 'active')
      .eq('org_id', orgId)

    if (enrollError || !enrollments?.length) {
      console.log(`[ClassAttendance] No enrollments found for student ${studentId}`)
      return
    }

    console.log(`[ClassAttendance] Found ${enrollments.length} enrollments`)

    for (const enrollment of enrollments as any[]) {
      const cls = enrollment.classes
      if (!cls?.schedule) continue

      const scheduleArr = Array.isArray(cls.schedule) ? cls.schedule : []

      // 오늘 요일에 해당하는 스케줄 찾기
      const todaySchedule = scheduleArr.find(
        (s: any) => s.day?.toLowerCase() === todayWeekday
      )

      if (!todaySchedule?.start_time || !todaySchedule?.end_time) continue

      // 시간 파싱
      const [startHour, startMin] = todaySchedule.start_time.split(':').map(Number)
      const [endHour, endMin] = todaySchedule.end_time.split(':').map(Number)
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin

      // 수업 종료 후면 스킵 (크론이 결석 처리)
      if (nowMinutes > endMinutes) {
        console.log(`[ClassAttendance] Class ${cls.name} already ended, skipping`)
        continue
      }

      // 이미 출결 기록이 있는지 확인
      const { data: existingAttendance } = await supabase
        .from('attendance')
        .select('id, status')
        .eq('org_id', orgId)
        .eq('class_id', cls.id)
        .eq('student_id', studentId)
        .eq('date', todayDate)
        .maybeSingle()

      if (existingAttendance) {
        console.log(`[ClassAttendance] Already has attendance for ${cls.name}: ${(existingAttendance as any).status}`)
        continue
      }

      // 출결 상태 결정
      // 수업 시작 전 또는 시작 시간과 같으면 → 출석
      // 수업 시작 후 ~ 수업 종료 전 → 지각
      const status = nowMinutes <= startMinutes ? 'present' : 'late'

      // 출결 기록 삽입
      const { error: insertError } = await supabase
        .from('attendance')
        .insert({
          org_id: orgId,
          class_id: cls.id,
          student_id: studentId,
          date: todayDate,
          status,
        })

      if (insertError) {
        console.error(`[ClassAttendance] Insert error for ${cls.name}:`, insertError)
      } else {
        console.log(`[ClassAttendance] Marked ${status} for ${cls.name} (start: ${todaySchedule.start_time}, now: ${Math.floor(nowMinutes/60)}:${nowMinutes%60})`)
      }
    }
  } catch (error) {
    console.error('[ClassAttendance] Unexpected error:', error)
  }
}

/**
 * 독서실 출결 자동 처리 (commute_schedules 기반)
 * - commute 일정 있음 + 예정시간 전 등원 → 출석 (present)
 * - commute 일정 있음 + 예정시간 후 등원 → 지각 (late)
 * - commute 일정 없음 → 출석 (present) - 일정 없이 등원하면 무조건 출석
 * - 결석 처리는 크론에서 밤 12시 전에 처리
 */
async function processCommuteAttendanceOnCheckIn(
  supabase: any,
  orgId: string,
  studentId: string,
  checkInTime: Date
): Promise<void> {
  try {
    // 현재 KST 시간 계산
    const kstOffset = 9 * 60 // KST는 UTC+9
    const utcMinutes = checkInTime.getUTCHours() * 60 + checkInTime.getUTCMinutes()
    const kstMinutes = utcMinutes + kstOffset
    const nowMinutes = kstMinutes % (24 * 60) // 하루를 넘어가는 경우 대비

    // 오늘 요일 (KST 기준)
    const kstDate = new Date(checkInTime.getTime() + kstOffset * 60 * 1000)
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    const todayWeekday = weekdays[kstDate.getUTCDay()]
    const todayDate = kstDate.toISOString().split('T')[0]

    console.log(`[CommuteAttendance] Processing for student ${studentId}, weekday: ${todayWeekday}, nowMinutes: ${nowMinutes}`)

    // 학생의 오늘 commute 일정 조회
    const { data: commuteSchedule, error: commuteError } = await supabase
      .from('commute_schedules')
      .select('id, check_in_time')
      .eq('org_id', orgId)
      .eq('student_id', studentId)
      .eq('weekday', todayWeekday)
      .maybeSingle()

    if (commuteError) {
      console.error('[CommuteAttendance] Error fetching commute schedule:', commuteError)
      return
    }

    // 이미 오늘 독서실 출결 기록이 있는지 확인 (class_id IS NULL인 것)
    const { data: existingAttendance } = await supabase
      .from('attendance')
      .select('id, status')
      .eq('org_id', orgId)
      .eq('student_id', studentId)
      .eq('date', todayDate)
      .is('class_id', null)
      .maybeSingle()

    if (existingAttendance) {
      console.log(`[CommuteAttendance] Already has attendance for today: ${existingAttendance.status}`)
      return
    }

    let status: 'present' | 'late' = 'present'

    if (commuteSchedule?.check_in_time) {
      // commute 일정이 있는 경우: 예정 시간과 비교
      const [schH, schM] = commuteSchedule.check_in_time.split(':').map(Number)
      const scheduledMinutes = schH * 60 + schM

      if (nowMinutes > scheduledMinutes) {
        status = 'late'
      }
      console.log(`[CommuteAttendance] Schedule found: ${commuteSchedule.check_in_time}, status: ${status}`)
    } else {
      // commute 일정이 없는 경우: 등원하면 무조건 출석
      console.log(`[CommuteAttendance] No schedule found, marking as present`)
    }

    // 독서실 출결 기록 삽입 (class_id = NULL)
    // Note: attendance 테이블에는 student_name, class_name 컬럼이 없음
    const { error: insertError } = await supabase
      .from('attendance')
      .insert({
        org_id: orgId,
        student_id: studentId,
        date: todayDate,
        status,
        class_id: null,
      })

    if (insertError) {
      console.error(`[CommuteAttendance] Insert error:`, insertError)
    } else {
      console.log(`[CommuteAttendance] Marked ${status} for student ${studentId}`)
    }
  } catch (error) {
    console.error('[CommuteAttendance] Unexpected error:', error)
  }
}

/**
 * seat_assignments 테이블 동기화
 * - liveattendance에서 등/하원 시 seat_assignments의 status도 함께 업데이트
 * - 학생에게 배정된 좌석이 있을 때만 업데이트
 */
async function syncSeatAssignmentStatus(
  supabase: any,
  orgId: string,
  studentId: string,
  status: 'checked_in' | 'checked_out',
  now: Date
): Promise<void> {
  try {
    // 학생에게 배정된 좌석 조회
    const { data: assignment, error: fetchError } = await supabase
      .from('seat_assignments')
      .select('id, seat_number, session_start_time')
      .eq('org_id', orgId)
      .eq('student_id', studentId)
      .maybeSingle()

    if (fetchError) {
      console.error('[syncSeatAssignment] Fetch error:', fetchError)
      return
    }

    if (!assignment) {
      // 좌석 배정이 없으면 스킵 (좌석 없이 등원하는 경우)
      console.log(`[syncSeatAssignment] No seat assignment for student ${studentId}`)
      return
    }

    const nowIso = now.toISOString()
    const updateData: any = {
      status,
      updated_at: nowIso,
    }

    if (status === 'checked_in') {
      // 등원: check_in_time, session_start_time 설정
      updateData.check_in_time = nowIso
      updateData.session_start_time = nowIso
    } else {
      // 하원: session_start_time 초기화 (check_in_time은 유지)
      updateData.session_start_time = null
    }

    const { error: updateError } = await supabase
      .from('seat_assignments')
      .update(updateData)
      .eq('id', assignment.id)

    if (updateError) {
      console.error('[syncSeatAssignment] Update error:', updateError)
    } else {
      console.log(`[syncSeatAssignment] Updated seat ${assignment.seat_number} to ${status}`)
    }
  } catch (error) {
    console.error('[syncSeatAssignment] Unexpected error:', error)
  }
}
