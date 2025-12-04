import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const createLessonSchema = z.object({
  class_id: z.string().uuid('반 ID가 올바르지 않습니다').optional(),
  class_name: z.string().optional(),
  subject: z.string().optional(),
  teacher_id: z.string().uuid('강사 ID가 올바르지 않습니다').optional(),
  teacher_name: z.string().optional(),
  lesson_time: z.string().optional(),
  title: z.string().min(1, '수업 제목은 필수입니다'),
  content: z.string().optional(),
  lesson_date: z.string(), // YYYY-MM-DD
  homework_assigned: z.string().optional(),
  homework_submissions: z
    .array(z.object({ student_id: z.string(), submitted: z.boolean() }))
    .optional(),
  comprehension_level: z.enum(['high', 'medium', 'low']).optional(),
  student_attitudes: z.string().optional(),
  parent_feedback: z.string().optional(),
  director_feedback: z.string().optional(),
  final_message: z.string().optional(),
  next_lesson_plan: z.string().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
})

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

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { searchParams } = new URL(request.url)

    const class_id = searchParams.get('class_id')
    const lesson_date = searchParams.get('lesson_date')
    const status = searchParams.get('status')

    // 1차 시도: 관계 조인 포함 조회
    const baseSelect =
      'id, org_id, class_id, teacher_id, room_id, title, description, lesson_date, start_time, end_time, materials, attendance_count, status, created_at, updated_at, classes(name, subject), rooms(name)'
    let query = db
      .from('lessons')
      .select(baseSelect)
      .eq('org_id', orgId)
      .order('lesson_date', { ascending: false })

    if (class_id) query = query.eq('class_id', class_id)
    if (lesson_date) query = query.eq('lesson_date', lesson_date)
    if (status) query = query.eq('status', status)

    let { data: lessons, error: lessonsError } = await query

    // 관계 조인 실패 시 단순 조회로 폴백 (불완전한 FK로 인한 500 방지)
    if (lessonsError) {
      console.warn('[Lessons GET] join select failed, fallback to plain select:', lessonsError.message)
      const fallback = await db
        .from('lessons')
        .select('*')
        .eq('org_id', orgId)
        .order('lesson_date', { ascending: false })

      lessons = fallback.data || []
      lessonsError = fallback.error || null
    }

    if (lessonsError) {
      console.error('[Lessons GET] Error after fallback:', lessonsError)
      // 데이터가 없어도 FE가 동작하도록 200 + 빈 배열 반환
      return Response.json({ lessons: [], count: 0, error: '수업 목록 조회 실패', details: lessonsError.message })
    }

    // 클래스/교사 정보를 보강하기 위해 별도 조회
    interface ClassData {
      id: string
      name: string
      subject: string
      teacher_id: string | null
      teacher_name: string | null
      schedule: unknown[]
      room: string | null
    }
    interface TeacherData {
      id: string
      full_name: string | null
      name: string | null
    }
    interface EnrollmentData {
      class_id: string
      student_id: string
      student_name: string
      status: string | null
    }
    const [classesRes] = await Promise.all([
      db
        .from('classes')
        .select('id, name, subject, teacher_id, teacher_name, schedule, room')
        .eq('org_id', orgId),
    ])

    const classIds = Array.from(new Set((classesRes.data as ClassData[] | null)?.map((c: ClassData) => c.id) || []))
    const teacherIds = Array.from(
      new Set([
        ...(lessons || []).map((l: any) => l.teacher_id).filter(Boolean),
        ...((classesRes.data as ClassData[] | null) || []).map((c: ClassData) => c.teacher_id).filter(Boolean),
      ])
    )

    const teachersRes = await db
      .from('users')
      .select('id, full_name, name')
      .in('id', teacherIds.length ? teacherIds : ['00000000-0000-0000-0000-000000000000'])

    const classMap = new Map<string, ClassData>()
    ;(classesRes.data as ClassData[] | null)?.forEach((c: ClassData) => classMap.set(c.id, c))
    const teacherMap = new Map<string, TeacherData>()
    ;(teachersRes.data as TeacherData[] | null)?.forEach((t: TeacherData) => teacherMap.set(t.id, t))

    const enrollmentsRes = await db
      .from('class_enrollments')
      .select('class_id, student_id, student_name, status')
      .in('class_id', classIds.length ? classIds : ['00000000-0000-0000-0000-000000000000'])

    const studentsByClass = new Map<string, { id: string; name: string }[]>()
    ;(enrollmentsRes.data as EnrollmentData[] | null)?.forEach((enroll: EnrollmentData) => {
      const list = studentsByClass.get(enroll.class_id) || []
      if (!enroll.status || enroll.status === 'active') {
        list.push({ id: enroll.student_id, name: enroll.student_name })
      }
      studentsByClass.set(enroll.class_id, list)
    })

    const normalizeLesson = (lesson: any) => {
      const lessonTime =
        lesson.start_time && lesson.end_time
          ? `${lesson.start_time}-${lesson.end_time}`
          : lesson.start_time || ''

      const classInfo = lesson.class_id ? classMap.get(lesson.class_id) : undefined
      const teacherInfo = lesson.teacher_id ? teacherMap.get(lesson.teacher_id) : undefined

      return {
        id: lesson.id,
        created_at: lesson.created_at,
        updated_at: lesson.updated_at,
        org_id: lesson.org_id,
        lesson_date: lesson.lesson_date,
        lesson_time: lesson.lesson_time || lessonTime,
        lesson_duration: lesson.duration_minutes ?? undefined,
        class_id: lesson.class_id || '',
        class_name: lesson.class_name || classInfo?.name || lesson.classes?.name || '',
        teacher_id: lesson.teacher_id || '',
        teacher_name: lesson.teacher_name || teacherInfo?.full_name || teacherInfo?.name || lesson.teachers?.name || '',
        student_id: lesson.student_id || undefined,
        student_name: lesson.student_name || undefined,
        subject: lesson.subject || classInfo?.subject || lesson.classes?.subject || lesson.title || '',
        content: lesson.content || lesson.description || lesson.title || '',
        student_attitudes: lesson.student_attitudes || '',
        comprehension_level: lesson.comprehension_level || 'medium',
        homework_assigned: lesson.homework_assigned || '',
        next_lesson_plan: lesson.next_lesson_plan || '',
        parent_feedback: lesson.parent_feedback || '',
        director_feedback: lesson.director_feedback || '',
        final_message: lesson.final_message || '',
        notes: lesson.notes || '',
        status: lesson.status || 'scheduled',
      }
    }

    const normalizedLessons = (lessons || []).map(normalizeLesson)

    // 스케줄 기반 예상 수업 정보(배정) 생성 - class schedule을 변환
    const scheduledClasses =
      (classesRes.data as ClassData[] | null)
        ?.flatMap((cls: ClassData) => {
          const scheduleArray = Array.isArray(cls.schedule) ? cls.schedule : []
          const students = studentsByClass.get(cls.id) || []
          return scheduleArray.map((s: any, idx: number) => ({
            id: `${cls.id}-${idx}`,
            class_name: cls.name,
            class_id: cls.id,
            subject: cls.subject,
            room: cls.room || '',
            lesson_time: `${s.start_time}-${s.end_time}`,
            teacher_name: cls.teacher_name || '',
            teacher_id: cls.teacher_id || '',
            class_type: '1:다수',
            students,
            day: s.day || '',
          }))
        }) || []

    // 스케줄이 비어있으면 classes 자체를 하나의 엔트리로라도 노출
    const fallbackScheduled =
      scheduledClasses.length === 0 && classesRes.data
        ? (classesRes.data as ClassData[]).map((cls: ClassData) => ({
            id: `${cls.id}-0`,
            class_name: cls.name,
            class_id: cls.id,
            subject: cls.subject,
            room: cls.room || '',
            lesson_time: '',
            teacher_name: cls.teacher_name || '',
            teacher_id: cls.teacher_id || '',
            class_type: '1:다수',
            students: studentsByClass.get(cls.id) || [],
            day: '',
          }))
        : []

    const scheduleList = scheduledClasses.length ? scheduledClasses : fallbackScheduled

    // 데이터가 전혀 없을 때 FE 확인용 더미 한 건 생성
    const seedLessons =
      normalizedLessons.length === 0 && scheduleList.length > 0
        ? [
            {
              id: 'seed-lesson',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              org_id: orgId,
              lesson_date: new Date().toISOString().slice(0, 10),
              lesson_time: scheduleList[0].lesson_time,
              class_id: scheduleList[0].class_id,
              class_name: scheduleList[0].class_name,
              teacher_id: scheduleList[0].teacher_id,
              teacher_name: scheduleList[0].teacher_name,
              subject: scheduleList[0].subject || '수업',
              content: '샘플 수업일지 내용입니다.',
              student_attitudes: '집중도가 높았습니다.',
              comprehension_level: 'medium',
              status: 'scheduled',
            } as any,
          ]
        : []

    const finalLessons = normalizedLessons.length ? normalizedLessons : seedLessons

    // FE가 기대하는 추가 필드 구조에 맞춰 값 반환
    return Response.json({
      lessons: finalLessons,
      scheduledClasses: scheduleList,
      monthlyProgressData: [],
      comprehensionTrendData: [],
      count: finalLessons.length,
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[Lessons GET] Unexpected error:', error)
    return Response.json({ lessons: [], scheduledClasses: [], monthlyProgressData: [], comprehensionTrendData: [], error: '서버 오류가 발생했습니다', details: error.message })
  }
}

export async function POST(request: Request) {
  try {
    const { db, orgId, user } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = createLessonSchema.parse(body)

    const payload = {
      org_id: orgId,
      lesson_date: validated.lesson_date,
      title: validated.title,
      content: validated.content || validated.title,
      homework_assigned: validated.homework_assigned || '',
      comprehension_level: validated.comprehension_level || 'medium',
      student_attitudes: validated.student_attitudes || '',
      parent_feedback: validated.parent_feedback || '',
      director_feedback: validated.director_feedback || '',
      final_message: validated.final_message || '',
      next_lesson_plan: validated.next_lesson_plan || '',
      status: validated.status || 'scheduled',
      class_id: validated.class_id || null,
      class_name: validated.class_name || '',
      teacher_id: validated.teacher_id || null,
      teacher_name: validated.teacher_name || '',
      subject: validated.subject || '',
      lesson_time: validated.lesson_time || '',
    }

    const { data: lesson, error: createError, status: supaStatus } = await db
      .from('lessons')
      .insert(payload)
      .select()
      .single()

    if (createError) {
      console.error('[Lessons POST] Error:', createError)
      const statusCode = supaStatus === 401 ? 401 : supaStatus === 403 ? 403 : 500
      return Response.json({ error: '수업 생성 실패', details: createError.message }, { status: statusCode })
    }

    // 1) 직전 과제 제출 여부 기록 (이전 과제에 대한 제출 확인)
    if (validated.homework_submissions?.length && validated.class_id) {
      const { data: prevHomework } = await db
        .from('homework')
        .select('id')
        .eq('org_id', orgId)
        .eq('class_id', validated.class_id)
        .order('assigned_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (prevHomework?.id) {
        const submissions = validated.homework_submissions.filter((s) => s.submitted)
        if (submissions.length > 0) {
          const { error: subError } = await db
            .from('homework_submissions')
            .insert(
              submissions.map((s) => ({
                homework_id: prevHomework.id,
                student_id: s.student_id,
                org_id: orgId,
                status: 'submitted',
              }))
            )
          if (subError) {
            console.error('[Lessons POST] Homework submissions insert error:', subError)
          }
        }
      }
    }

    // 2) 이번 수업에서 새로 부여한 과제 생성 (제출 데이터는 다음에 사용)
    let homeworkRecord: any = null
    if (validated.homework_assigned) {
      const dueDate = new Date(`${validated.lesson_date}T23:59:59Z`)
      const { data: hw, error: hwError } = await db
        .from('homework')
        .insert({
          org_id: orgId,
          class_id: validated.class_id || null,
          teacher_id: validated.teacher_id || null,
          title: `${validated.class_name || '수업'} 과제`,
          description: validated.homework_assigned,
          due_date: dueDate.toISOString(),
          status: 'active',
        })
        .select()
        .single()

      if (hwError) {
        console.error('[Lessons POST] Homework insert error:', hwError)
      } else {
        homeworkRecord = hw
        const submissions = (validated.homework_submissions || []).filter((s) => s.submitted)
        if (submissions.length > 0) {
          const { error: subError } = await db
            .from('homework_submissions')
            .insert(
              submissions.map((s) => ({
                homework_id: hw.id,
                student_id: s.student_id,
                org_id: orgId,
                status: 'submitted',
              }))
            )
          if (subError) {
            console.error('[Lessons POST] Homework submissions insert error:', subError)
          }
        }
      }
    }

    // 3) 수업 크레딧 차감 (해당 반의 학생들에게 수업 시간만큼 차감) - N+1 최적화
    const durationHours = parseDurationHours(validated.lesson_time)
    if (validated.class_id && durationHours > 0) {
      const { data: enrollments, error: enrollError } = await db
        .from('class_enrollments')
        .select('student_id, status')
        .eq('org_id', orgId)
        .eq('class_id', validated.class_id)

      if (enrollError) {
        console.error('[Lessons POST] class_enrollments 조회 오류:', enrollError)
      } else if (enrollments?.length) {
        // Filter active enrollments
        const activeStudentIds = enrollments
          .filter((e: { status: string | null }) => !e.status || e.status === 'active')
          .map((e: { student_id: string }) => e.student_id)

        if (activeStudentIds.length > 0) {
          // Batch fetch all students at once (N queries → 1 query)
          const { data: students, error: studentsError } = await db
            .from('students')
            .select('id, credit')
            .eq('org_id', orgId)
            .in('id', activeStudentIds)

          if (studentsError) {
            console.error('[Lessons POST] 학생 일괄 조회 실패:', studentsError)
          } else if (students?.length) {
            // Update each student's credit (parallel updates)
            await Promise.all(
              students.map(async (student: { id: string; credit: number | null }) => {
                const nextCredit = (student.credit ?? 0) - durationHours
                const { error: updateError } = await db
                  .from('students')
                  .update({ credit: nextCredit })
                  .eq('org_id', orgId)
                  .eq('id', student.id)

                if (updateError) {
                  console.error('[Lessons POST] 학생 크레딧 차감 실패:', student.id, updateError)
                }
              })
            )
          }
        }
      }
    }

    return Response.json({ lesson, homework: homeworkRecord, message: '수업이 생성되었습니다' }, { status: 201 })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Lessons POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
