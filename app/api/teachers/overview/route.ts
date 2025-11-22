import { createAuthenticatedClient } from '@/lib/supabase/client-edge'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/teachers/overview
 * 반환: teachers + assigned_students_count + assigned_classes_count
 */
export async function GET(request: Request) {

  try {
    const supabase = await createAuthenticatedClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return Response.json({ error: '인증이 필요합니다' }, { status: 401 })

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()
    if (profileError || !profile) return Response.json({ error: '프로필 없음' }, { status: 404 })

    const orgId = profile.org_id

    // 1) teachers (집계는 JS에서)
    const { data: teachers, error: teacherError } = await supabase
      .from('teachers')
      .select('id, org_id, user_id, name, email, phone, subjects, status, employment_type, salary_type, salary_amount, hire_date, notes, created_at, updated_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })
    if (teacherError) {
      console.error('[teachers/overview] teachers error', teacherError)
      return Response.json({ error: '강사 조회 실패', details: teacherError.message }, { status: 500 })
    }

    // 2) 학생 목록 후 JS 집계
    const { data: students, error: studentError } = await supabase
      .from('students')
      .select('id, teacher_id')
      .eq('org_id', orgId)
    if (studentError) {
      console.error('[teachers/overview] students error', studentError)
      return Response.json({ error: '학생 조회 실패', details: studentError.message }, { status: 500 })
    }

    // 3) 클래스 목록 후 JS 집계
    const { data: classes, error: classError } = await supabase
      .from('classes')
      .select('id, teacher_id')
      .eq('org_id', orgId)
    if (classError) {
      console.error('[teachers/overview] classes error', classError)
      return Response.json({ error: '반 조회 실패', details: classError.message }, { status: 500 })
    }

    const studentMap = new Map<string, number>()
    ;(students || []).forEach((s) => {
      if (s.teacher_id) studentMap.set(s.teacher_id, (studentMap.get(s.teacher_id) || 0) + 1)
    })

    const classMap = new Map<string, number>()
    ;(classes || []).forEach((c) => {
      if (c.teacher_id) classMap.set(c.teacher_id, (classMap.get(c.teacher_id) || 0) + 1)
    })

    const result = (teachers || []).map((t: any) => ({
      id: t.id,
      org_id: t.org_id,
      user_id: t.user_id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      subjects: t.subjects,
      status: t.status,
      employment_type: t.employment_type,
      salary_type: t.salary_type,
      salary_amount: t.salary_amount,
      hire_date: t.hire_date,
      notes: t.notes,
      created_at: t.created_at,
      updated_at: t.updated_at,
      assigned_students_count: studentMap.get(t.id) || 0,
      assigned_classes_count: classMap.get(t.id) || 0,
    }))

    return Response.json({ teachers: result })
  } catch (error: any) {
    console.error('[teachers/overview] Unexpected', error)
    return Response.json({ error: '서버 오류', details: error.message }, { status: 500 })
  }
}
