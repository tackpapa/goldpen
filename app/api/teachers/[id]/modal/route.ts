import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/teachers/[id]/modal
 * 상세 모달용 데이터 (users.role='teacher', 담당 클래스/학생 집계)
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { id: teacherId } = await params

    // 1) 교사 기본 정보
    const { data: teacher, error: teacherError } = await db
      .from('teachers')
      .select('*, user:user_id(id, role)')
      .eq('id', teacherId)
      .eq('org_id', orgId)
      .single()
    if (teacherError || !teacher) {
      return Response.json({ error: '교사 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    // 2) 담당 클래스
    const { data: classes, error: classesError } = await db
      .from('classes')
      .select('id, name, subject, status, created_at')
      .eq('org_id', orgId)
      .eq('teacher_id', teacherId)

    if (classesError) {
      console.error('[Teachers modal] classes error', classesError)
    }

    // 3) 담당 학생: 우선 assigned_students, 없으면 class_students 조인으로 학생 목록 생성
    let students: any[] = []
    let studentsError: any = null
    if (teacher.assigned_students && Array.isArray(teacher.assigned_students) && teacher.assigned_students.length > 0) {
        const { data, error } = await db
          .from('students')
          .select('id, name, phone, status, grade, school')
          .eq('org_id', orgId)
          .in('id', teacher.assigned_students)
      students = data || []
      studentsError = error
    } else if (classes && classes.length > 0) {
      const classIds = classes.map((c: any) => c.id)
      const { data, error } = await db
        .from('class_students')
        .select('student_id, students(id,name,grade,school,status,phone)')
        .in('class_id', classIds)
      studentsError = error
      const mapped = (data || [])
        .map((cs: any) => cs.students)
        .filter(Boolean)
      // unique by id
      const uniqueMap = new Map<string, any>()
      mapped.forEach((s: any) => {
        if (!uniqueMap.has(s.id)) uniqueMap.set(s.id, s)
      })
      students = Array.from(uniqueMap.values())
    } 
    // 추가로 teacher_id가 설정된 학생들 포함 (중복 제거)
    const { data: teacherStudents, error: teacherStudentsErr } = await db
      .from('students')
      .select('id, name, phone, status, grade, school')
      .eq('org_id', orgId)
      .eq('teacher_id', teacherId)
    if (teacherStudentsErr) studentsError = studentsError || teacherStudentsErr
    if (teacherStudents) {
      const map = new Map(students.map((s: any) => [s.id, s]))
      teacherStudents.forEach((s: any) => {
        if (!map.has(s.id)) map.set(s.id, s)
      })
      students = Array.from(map.values())
    }
    if (studentsError) {
      console.error('[Teachers modal] students error', studentsError)
    }

    return Response.json({
      teacher,
      classes: classes || [],
      students: students || [],
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[Teachers modal] unexpected', error)
    return Response.json({ error: '서버 오류', details: error.message }, { status: 500 })
  }
}
