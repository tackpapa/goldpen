import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { createClient } from '@supabase/supabase-js'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const createHomeworkSchema = z.object({
  class_id: z.string().uuid(),
  title: z.string().min(1, '제목은 필수입니다'),
  description: z.string().optional(),
  due_date: z.string(), // ISO 8601 날짜 형식
  status: z.enum(['active', 'completed', 'overdue']).optional(),
})

type HomeworkRow = {
  id: string
  title: string
  description?: string | null
  class_id?: string | null
  class_name?: string | null
  due_date?: string | null
  created_at?: string | null
  status?: string | null
  total_students?: number | null
  submitted_count?: number | null
  teacher_id?: string | null
}

type HomeworkSubmissionRow = {
  id: string
  homework_id: string
  student_id?: string | null
  student_name?: string | null
  submitted_at?: string | null
  status?: string | null
  score?: number | null
  feedback?: string | null
}

type StudentRow = {
  id: string
  name: string
  class_id?: string | null
  teacher_id?: string | null
}

type StudentHomeworkStatus = {
  student_id: string
  student_name: string
  class_name: string
  teacher_names: string[]
  last_homework: string | null
  last_homework_text: string | null
  submitted: boolean | null
  submission_rate: number
}

type ClassHomeworkStats = {
  class_id: string
  class_name: string
  total_students: number
  submitted_count: number
  submission_rate: number
  last_homework: string | null
}

type TeacherEntry = { id: string; name: string }

function groupSubmissionsByHomework(submissions: HomeworkSubmissionRow[]) {
  return submissions.reduce<Record<string, HomeworkSubmissionRow[]>>((acc, sub) => {
    if (!acc[sub.homework_id]) acc[sub.homework_id] = []
    acc[sub.homework_id].push(sub)
    return acc
  }, {})
}

function buildStudentStatus(
  homework: HomeworkRow[],
  submissions: HomeworkSubmissionRow[],
  students: (StudentRow & { class_name: string; teacher_names: string[] })[],
) {
  const homeworkByClass = new Map<string, HomeworkRow[]>()
  homework.forEach((hw) => {
    if (!hw.class_id) return
    const list = homeworkByClass.get(hw.class_id) ?? []
    list.push(hw)
    homeworkByClass.set(hw.class_id, list)
  })
  homeworkByClass.forEach((list, key) =>
    homeworkByClass.set(
      key,
      [...list].sort(
        (a, b) =>
          new Date(b.due_date || b.created_at || '').getTime() -
          new Date(a.due_date || a.created_at || '').getTime(),
      ),
    ),
  )

  const submissionsByStudent = new Map<string, HomeworkSubmissionRow[]>()
  submissions.forEach((sub) => {
    if (!sub.student_id) return
    const list = submissionsByStudent.get(sub.student_id) ?? []
    list.push(sub)
    submissionsByStudent.set(sub.student_id, list)
  })

  return students.map<StudentHomeworkStatus>((student) => {
    const classHomeworks = student.class_id
      ? homeworkByClass.get(student.class_id) ?? []
      : []
    const totalHomeworks = classHomeworks.length
    const submittedCnt =
      submissionsByStudent
        .get(student.id)
        ?.filter((s) => s.status && s.status !== 'not_submitted').length ?? 0
    const latestHw = classHomeworks[0]
    const latestSubmission = latestHw
      ? submissions.find(
          (s) =>
            s.homework_id === latestHw.id && s.student_id === student.id,
        )
      : null

    return {
      student_id: student.id,
      student_name: student.name,
      class_name: student.class_name,
      teacher_names: student.teacher_names,
      last_homework: latestHw?.title ?? null,
      last_homework_text: latestHw?.description ?? null,
      submitted: latestHw
        ? latestSubmission
          ? latestSubmission.status !== 'not_submitted'
          : false
        : null,
      submission_rate: totalHomeworks
        ? Math.round((submittedCnt / totalHomeworks) * 100)
        : 0,
    }
  })
}

function buildClassStats(
  homework: HomeworkRow[],
  students: (StudentRow & { class_name: string })[],
  enrollmentsByClass: Map<string, string[]>,
  classNameMap: Map<string, string>,
): ClassHomeworkStats[] {
  const studentsByClass = new Map<string, (StudentRow & { class_name: string })[]>()
  students.forEach((s) => {
    if (!s.class_id) return
    const list = studentsByClass.get(s.class_id) ?? []
    list.push(s)
    studentsByClass.set(s.class_id, list)
  })

  const homeworkByClass = new Map<string, HomeworkRow[]>()
  homework.forEach((hw) => {
    if (!hw.class_id) return
    const list = homeworkByClass.get(hw.class_id) ?? []
    list.push(hw)
    homeworkByClass.set(hw.class_id, list)
  })
  homeworkByClass.forEach((list, key) =>
    homeworkByClass.set(
      key,
      [...list].sort(
        (a, b) =>
          new Date(b.due_date || b.created_at || '').getTime() -
          new Date(a.due_date || a.created_at || '').getTime(),
      ),
    ),
  )

  const classIds = new Set([
    ...Array.from(studentsByClass.keys()),
    ...Array.from(homeworkByClass.keys()),
    ...Array.from(classNameMap.keys()),
  ])

  return Array.from(classIds).map((classId) => {
    const classStudents = studentsByClass.get(classId) ?? []
    const latestHw = homeworkByClass.get(classId)?.[0]
    const totalStudents = enrollmentsByClass.get(classId)?.length ?? classStudents.length
    const submittedCount = latestHw?.submitted_count ?? 0
    const clampedSubmitted =
      totalStudents > 0 ? Math.min(submittedCount, totalStudents) : submittedCount

    return {
      class_id: classId,
      class_name:
        latestHw?.class_name ||
        classStudents[0]?.class_name ||
        classNameMap.get(classId) ||
        '반 미지정',
      total_students: totalStudents,
      submitted_count: clampedSubmitted,
      submission_rate:
        totalStudents > 0
          ? Math.round((clampedSubmitted / totalStudents) * 100)
          : 0,
      last_homework: latestHw?.title ?? null,
    }
  })
}

export async function GET(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const service = getServiceClient()
    const demoOrg = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    let orgId: string | null = null

    if (service && (authError || !user || user.id === 'service-role' || user.id === 'e2e-user')) {
      orgId = demoOrg
    } else if (!authError && user) {
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()
      if (profileError || !userProfile) {
        return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = userProfile.org_id
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const db = service || supabase

    const { searchParams } = new URL(request.url)
    const class_id = searchParams.get('class_id')
    const status = searchParams.get('status')

    let homeworkQuery = db
      .from('homework')
      // 스키마 차이를 흡수하기 위해 전체 컬럼 조회 후 매핑
      .select('*')
      .eq('org_id', orgId)
      .order('due_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (class_id) homeworkQuery = homeworkQuery.eq('class_id', class_id)
    if (status) homeworkQuery = homeworkQuery.eq('status', status)

    const { data: homework, error: homeworkError } = await homeworkQuery

    if (homeworkError) {
      console.error('[Homework GET] Error:', homeworkError)
      return Response.json(
        { error: '숙제 목록 조회 실패', details: homeworkError.message },
        { status: 500 },
      )
    }

    const homeworkIds = (homework ?? []).map((hw) => hw.id)

    let submissions: HomeworkSubmissionRow[] = []
    if (homeworkIds.length) {
      const { data: submissionRows, error: submissionError } = await db
        .from('homework_submissions')
        .select('*')
        .in('homework_id', homeworkIds)

      if (submissionError) {
        console.warn('[Homework GET] submissions error (무시하고 빈 배열 사용):', submissionError)
      } else {
        submissions = submissionRows || []
      }
    }

    let studentsRows: StudentRow[] = []
    {
      const { data, error } = await db
        .from('students')
        .select('id, name, class_id, teacher_id')
        .eq('org_id', orgId)

      if (error) {
        console.warn('[Homework GET] students error (무시하고 빈 배열 사용):', error)
      } else {
        studentsRows = data || []
      }
    }

    let classesRows: { id: string; name: string; teacher_id?: string | null }[] = []
    {
      const { data, error } = await db
        .from('classes')
        .select('id, name, teacher_id')
        .eq('org_id', orgId)
      if (error) {
        console.warn('[Homework GET] classes error (무시하고 빈 배열 사용):', error)
      } else {
        classesRows = data || []
      }
    }

    let teachersRows: TeacherEntry[] = []
    {
      const { data, error } = await db
        .from('teachers')
        .select('id, user_id, name')
        .eq('org_id', orgId)
      if (error) {
        console.warn('[Homework GET] teachers error (무시하고 빈 배열 사용):', error)
      } else {
        teachersRows = (data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          user_id: t.user_id,
        }))
      }
    }

    let enrollmentsRows: { student_id: string; class_id: string; teacher_id?: string | null }[] = []
    {
      const { data, error } = await db
        .from('enrollments')
        .select('student_id, class_id, teacher_id')
        .eq('org_id', orgId)
      if (error) {
        console.warn('[Homework GET] enrollments error (무시하고 빈 배열 사용):', error)
      } else {
        enrollmentsRows = data || []
      }
    }

    const classNameMap = new Map((classesRows || []).map((c) => [c.id, c.name]))
    const classTeacherMap = new Map((classesRows || []).map((c) => [c.id, c.teacher_id]))
    const teacherNameMap = new Map((teachersRows || []).map((t) => [t.id, t.name]))
    const teacherUserNameMap = new Map(
      (teachersRows || [])
        .filter((t) => t.user_id)
        .map((t) => [t.user_id as string, t.name]),
    )

    const enrollmentsByStudent = new Map<string, { class_id: string; teacher_id?: string | null }[]>()
    enrollmentsRows.forEach((en) => {
      const list = enrollmentsByStudent.get(en.student_id) ?? []
      list.push(en)
      enrollmentsByStudent.set(en.student_id, list)
    })

    const enrollmentsByClass = new Map<string, string[]>()
    enrollmentsRows.forEach((en) => {
      const list = enrollmentsByClass.get(en.class_id) ?? []
      if (!list.includes(en.student_id)) list.push(en.student_id)
      enrollmentsByClass.set(en.class_id, list)
    })

    const normalizedHomework: HomeworkRow[] = (homework || []).map((hw) => ({
      id: hw.id,
      title: hw.title,
      description: hw.description ?? null,
      class_id: hw.class_id ?? null,
      class_name: hw.class_name ?? classNameMap.get(hw.class_id) ?? '미지정',
      due_date: hw.due_date ?? null,
      created_at: hw.created_at ?? null,
      status: (hw.status as string) ?? 'active',
      total_students:
        hw.total_students ??
        hw.totalStudents ??
        (hw.class_id
          ? enrollmentsByClass.get(hw.class_id)?.length ??
            (studentsRows || []).filter((s) => s.class_id === hw.class_id).length
          : 0),
      submitted_count:
        hw.submitted_count ??
        hw.submittedCount ??
        submissions.filter((s) => s.homework_id === hw.id && s.status && s.status !== 'not_submitted').length,
      teacher_id: hw.teacher_id ?? null,
    }))

    const students = (studentsRows || []).map((s) => {
      const enrolls = enrollmentsByStudent.get(s.id) || []
      const classIds = enrolls.map((e) => e.class_id).filter(Boolean)
      const primaryClassId = classIds[0] || s.class_id || null
      const className =
        (primaryClassId && classNameMap.get(primaryClassId)) ||
        (s.class_id && classNameMap.get(s.class_id)) ||
        '미배정'

      const teacherIdSet = new Set<string>()
      enrolls.forEach((e) => {
        if (e.teacher_id) teacherIdSet.add(e.teacher_id)
        const classTeacher = classTeacherMap.get(e.class_id)
        if (classTeacher) teacherIdSet.add(classTeacher)
      })
      if (s.teacher_id) teacherIdSet.add(s.teacher_id)
      if (primaryClassId) {
        const classTeacher = classTeacherMap.get(primaryClassId)
        if (classTeacher) teacherIdSet.add(classTeacher)
      }

      const teacherNames = Array.from(teacherIdSet)
        .map((id) => teacherNameMap.get(id) || teacherUserNameMap.get(id))
        .filter(Boolean) as string[]

      return {
        ...s,
        class_id: primaryClassId,
        class_name: className,
        teacher_names: teacherNames.length ? teacherNames : ['미배정'],
      }
    })

    const submissionsByHomework = groupSubmissionsByHomework(submissions)
    const studentHomeworkStatus = buildStudentStatus(
      normalizedHomework,
      submissions,
      students,
    )
    const classHomeworkStats = buildClassStats(normalizedHomework, students, enrollmentsByClass, classNameMap)

    return Response.json({
      homework: normalizedHomework,
      submissions: submissionsByHomework,
      studentHomeworkStatus,
      classHomeworkStats,
      teachers: teachersRows,
      count: normalizedHomework.length,
    })
  } catch (error: any) {
    console.error('[Homework GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const service = getServiceClient()
    const demoOrg = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    let orgId: string | null = null
    if (service && (authError || !user || user.id === 'service-role' || user.id === 'e2e-user')) {
      orgId = demoOrg
    } else if (!authError && user) {
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('org_id, role')
        .eq('id', user.id)
        .single()

      if (profileError || !userProfile) {
        return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
      }
      orgId = userProfile.org_id
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const db = service || supabase

    const body = await request.json()
    const validated = createHomeworkSchema.parse(body)

    // 반 이름/학생 수를 DB에서 계산해 과제에 반영
    const { data: classRow, error: classError } = await db
      .from('classes')
      .select('id, name')
      .eq('id', validated.class_id)
      .eq('org_id', orgId)
      .single()

    if (classError || !classRow) {
      return Response.json({ error: '반 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    const { count: totalStudents, error: studentCountError } = await db
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('class_id', validated.class_id)

    if (studentCountError) {
      console.error('[Homework POST] student count error:', studentCountError)
      return Response.json(
        { error: '학생 수 계산 실패', details: studentCountError.message },
        { status: 500 },
      )
    }

    const { data: homework, error: createError } = await db
      .from('homework')
      .insert({
        ...validated,
        org_id: orgId,
        class_name: classRow.name,
        total_students: totalStudents ?? 0,
        submitted_count: 0,
      })
      .select()
      .single()

    if (createError) {
      console.error('[Homework POST] Error:', createError)
      return Response.json({ error: '숙제 생성 실패', details: createError.message }, { status: 500 })
    }

    return Response.json({ homework, message: '숙제가 생성되었습니다' }, { status: 201 })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Homework POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
