import { createAuthenticatedClient } from '@/lib/supabase/client-edge'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/teachers/[id]/modal
 * 상세 모달용 데이터 (users.role='teacher', 담당 클래스/학생 집계)
 */
export async function GET(request: Request, { params }: { params: { id: string } }) {

  try {
    const supabase = await createAuthenticatedClient(request)
    const teacherId = params.id

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return Response.json({ error: '인증 필요' }, { status: 401 })

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('id', user.id)
      .single()
    if (profileError || !profile) return Response.json({ error: '프로필 없음' }, { status: 404 })

    // 1) 교사 기본 정보
    const { data: teacher, error: teacherError } = await supabase
      .from('users')
      .select('id, created_at, updated_at, org_id, name, email, phone, status, role')
      .eq('id', teacherId)
      .eq('org_id', profile.org_id)
      .eq('role', 'teacher')
      .single()
    if (teacherError || !teacher) {
      return Response.json({ error: '교사 정보를 찾을 수 없습니다' }, { status: 404 })
    }

    // 2) 담당 클래스
    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, name, subject, status, student_count, created_at, day_of_week, start_time, end_time')
      .eq('org_id', profile.org_id)
      .eq('teacher_id', teacherId)

    if (classesError) {
      console.error('[Teachers modal] classes error', classesError)
    }

    // 3) 담당 학생: 우선 assigned_students, 없으면 class_students 조인으로 학생 목록 생성
    let students: any[] = []
    let studentsError: any = null
    if (teacher.assigned_students && Array.isArray(teacher.assigned_students) && teacher.assigned_students.length > 0) {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, phone, status, grade, school')
        .eq('org_id', profile.org_id)
        .in('id', teacher.assigned_students)
      students = data || []
      studentsError = error
    } else if (classes && classes.length > 0) {
      const classIds = classes.map((c) => c.id)
      const { data, error } = await supabase
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
    const { data: teacherStudents, error: teacherStudentsErr } = await supabase
      .from('students')
      .select('id, name, phone, status, grade, school')
      .eq('org_id', profile.org_id)
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
    console.error('[Teachers modal] unexpected', error)
    return Response.json({ error: '서버 오류', details: error.message }, { status: 500 })
  }
}
