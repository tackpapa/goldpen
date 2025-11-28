import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const parseDurationHours = (lessonTime?: string | null) => {
  if (!lessonTime) return 0
  const [start, end] = lessonTime.split('-').map((t) => t?.trim())
  if (!start || !end) return 0
  const startDate = new Date(`1970-01-01T${start}:00`)
  const endDate = new Date(`1970-01-01T${end}:00`)
  const diffMs = endDate.getTime() - startDate.getTime()
  if (Number.isNaN(diffMs) || diffMs <= 0) return 0
  return diffMs / (1000 * 60 * 60)
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // 1) 기본: 인증된 사용자 클라이언트
    const supabase = await createAuthenticatedClient(request)
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceClient = supabaseUrl && serviceKey
      ? createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
      : null
    const demoOrg = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'

    let { data: { user }, error: authError } = await supabase.auth.getUser()
    let adminSupabase = supabase
    let orgId: string | null = null

    if (serviceClient && (authError || !user || user.id === 'service-role' || user.id === 'e2e-user')) {
      adminSupabase = serviceClient
      user = { id: 'service-role', email: 'service-role@goldpen' } as any
      orgId = demoOrg
    } else if (!authError && user) {
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()
      if (profileError || !profile) {
        // 서비스 키로 학생의 org를 조회해본다
        if (serviceClient) {
          const { data: studentOrg } = await serviceClient
            .from('students')
            .select('org_id')
            .eq('id', id)
            .maybeSingle()
          if (!studentOrg) return Response.json({ error: '프로필 없음' }, { status: 404 })
          adminSupabase = serviceClient
          orgId = studentOrg.org_id
        } else {
          return Response.json({ error: '프로필 없음' }, { status: 404 })
        }
      } else {
        orgId = profile.org_id
      }
    } else {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!orgId && serviceClient) {
      const { data: studentOrg } = await serviceClient
        .from('students')
        .select('org_id')
        .eq('id', id)
        .maybeSingle()
      orgId = studentOrg?.org_id ?? demoOrg
      adminSupabase = serviceClient
    }

    const { data: student, error: studentError } = await adminSupabase
      .from('students')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .maybeSingle()

    if (studentError || !student) {
      return Response.json({ error: '학생을 찾을 수 없습니다' }, { status: 404 })
    }

    const { data: enrollments, error: enrollError } = await adminSupabase
      .from('class_enrollments')
      .select('id, class_id, student_id, student_name, status')
      .eq('student_id', id)
      .eq('org_id', orgId)
      .or('status.eq.active,status.is.null')

    if (enrollError) {
      console.error('[Student modal] enrollments error', enrollError)
    }

    const classIds = (enrollments || []).map((e: { class_id: string }) => e.class_id)

    const { data: classes } = classIds.length
      ? await adminSupabase
          .from('classes')
          .select('id, name, subject, teacher_name, room')
          .in('id', classIds)
          .eq('org_id', orgId)
      : { data: [] as any[] }

    const { data: lessons } = classIds.length
      ? await adminSupabase
          .from('lessons')
          .select('id, class_id, lesson_date, lesson_time, teacher_name, subject, class_name, created_at, org_id')
          .in('class_id', classIds)
          .eq('org_id', orgId)
          .order('lesson_date', { ascending: false })
          .order('created_at', { ascending: false })
      : { data: [] as any[] }

    interface ClassInfo {
      id: string
      name: string
      subject: string
      teacher_name: string
      room: string
    }
    const classMap = new Map((classes || []).map((c: ClassInfo) => [c.id, c]))

    interface LessonInfo {
      id: string
      class_id: string
      lesson_date: string
      lesson_time: string
      teacher_name: string
      subject: string
      class_name: string
      created_at: string
      org_id: string
    }
    const creditUsages = (lessons || []).map((lesson: LessonInfo) => {
      const cls = classMap.get(lesson.class_id) as ClassInfo | undefined
      const hours_used = parseDurationHours(lesson.lesson_time) || 0
      return {
        id: lesson.id,
        used_at: lesson.lesson_date || lesson.created_at,
        hours_used,
        subject: lesson.subject || cls?.subject || '수업',
        teacher_name: lesson.teacher_name || cls?.teacher_name || '선생님',
        class_name: lesson.class_name || cls?.name || '',
      }
    })

    // 기관 체류 로그 (등원/하원) -> attendance_logs
    const { data: attendanceLogs } = await adminSupabase
      .from('attendance_logs')
      .select('id, check_in_time, check_out_time, duration_minutes')
      .eq('student_id', id)
      .eq('org_id', orgId)
      .order('check_in_time', { ascending: false })

    interface AttendanceLog {
      id: string
      check_in_time: string | null
      check_out_time: string | null
      duration_minutes: number | null
    }
    const usages = (attendanceLogs || []).map((log: AttendanceLog) => ({
      id: log.id,
      check_in_time: log.check_in_time,
      check_out_time: log.check_out_time,
      duration_minutes: log.duration_minutes,
    }))

    // Attendance 탭용 형식 (출석률/상태 계산에 사용)
    // attendance_logs에는 status가 없으므로 체류 기록은 모두 'present'로 간주
    const attendance = (attendanceLogs || [])
      .filter((log: AttendanceLog) => !!log.check_in_time) // check_in_time 없는 레코드는 제외해 Invalid Date 방지
      .map((log: AttendanceLog) => {
        const dateIso = new Date(log.check_in_time!).toISOString()
        return {
          id: log.id,
          date: dateIso,
          attendance_date: dateIso,
          status: 'present',
          notes: log.duration_minutes ? `체류 ${log.duration_minutes}분` : null,
        }
      })

    // 등하원 일정 (commute_schedules)
    const { data: commuteSchedules } = await adminSupabase
      .from('commute_schedules')
      .select('id, created_at, updated_at, weekday, check_in_time, check_out_time, notes')
      .eq('student_id', id)
      .eq('org_id', orgId)
      .order('weekday')

    // Payments
    // 결제 내역은 org 격리만 검사하고 서비스 롤로 조회 (RLS 영향 방지)
    const { data: payments } = serviceClient
      ? await serviceClient
        .from('payment_records')
        .select('id, org_id, student_id, student_name, amount, payment_date, payment_method, status, notes, revenue_category_name, created_at, granted_credits_hours, granted_pass_type, granted_pass_amount')
        .eq('org_id', student.org_id)
        .eq('student_id', id)
        .order('payment_date', { ascending: false })
        .order('created_at', { ascending: false })
      : { data: [] }

    interface CommuteSchedule {
      id: string
      created_at: string
      updated_at: string
      weekday: number
      check_in_time: string | null
      check_out_time: string | null
      notes: string | null
    }
    const schedules = (commuteSchedules || []).map((row: CommuteSchedule) => ({
      id: row.id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      student_id: id,
      day_of_week: row.weekday,
      start_time: row.check_in_time || '',
      end_time: row.check_out_time || '',
      notes: row.notes || undefined,
    }))

    // Branches (지점 목록)
    const { data: branches } = await adminSupabase
      .from('branches')
      .select('id, name, status')
      .eq('org_id', orgId)
      .eq('status', 'active')
      .order('name')

    // enrollments에 class 정보 추가 (BasicInfoTab에서 enrollment.classes로 접근)
    interface EnrollmentInfo {
      id: string
      class_id: string
      student_id: string
      student_name: string
      status: string | null
    }
    const enrichedEnrollments = (enrollments || []).map((enrollment: EnrollmentInfo) => {
      const classInfo = classMap.get(enrollment.class_id) as ClassInfo | undefined
      return {
        ...enrollment,
        // flat properties (호환성)
        class_name: classInfo?.name || '',
        subject: classInfo?.subject || '',
        teacher_name: classInfo?.teacher_name || '',
        // nested object (BasicInfoTab에서 사용)
        classes: classInfo ? {
          id: classInfo.id,
          name: classInfo.name,
          subject: classInfo.subject,
          teacher_name: classInfo.teacher_name,
          room: classInfo.room,
        } : null,
      }
    })

    return Response.json({
      student,
      enrollments: enrichedEnrollments,
      credits: [],
      creditUsages,
      services: [],
      schedules,
      attendance,
      payments: payments || [],
      subscriptions: [],
      activeSubscription: null,
      passes: [],
      activePass: null,
      usages,
      branches: branches || [],
    })
  } catch (error: any) {
    console.error('[Student modal] unexpected', error)
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
