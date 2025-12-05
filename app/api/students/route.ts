import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { logActivity, actionDescriptions } from '@/app/api/_utils/activity-log'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET /api/students - 학생 목록 조회 (org 필터)
export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { searchParams } = new URL(request.url)
    const attendanceCode = searchParams.get('attendance_code') || searchParams.get('student_code') || undefined
    const checkDuplicate = searchParams.get('check_duplicate') === '1'
    const classId = searchParams.get('class_id') || undefined

    // 중복 체크 모드: 빠른 응답을 위해 id만 조회
    if (checkDuplicate && attendanceCode) {
      const { data: existing, error: checkError } = await db
        .from('students')
        .select('id')
        .eq('org_id', orgId)
        .eq('student_code', attendanceCode)
        .limit(1)

      if (checkError) {
        console.error('Error checking duplicate:', checkError)
        return Response.json({ error: checkError.message }, { status: 500 })
      }

      return Response.json({
        exists: existing && existing.length > 0,
        student_code: attendanceCode
      })
    }

    // class_id가 있으면 해당 반에 등록된 학생만 조회
    if (classId) {
      const { data: enrollments, error: enrollError } = await db
        .from('class_enrollments')
        .select('student_id, students(id, name, parent_phone, student_code)')
        .eq('class_id', classId)
        .or('status.is.null,status.eq.active')

      if (enrollError) {
        console.error('Error fetching class enrollments:', enrollError)
        return Response.json({ error: enrollError.message }, { status: 500 })
      }

      const students = (enrollments || [])
        .map((e: any) => e.students)
        .filter((s: any) => s !== null)

      return Response.json({ students, count: students.length }, {
        headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' }
      })
    }

    let query = db
      .from('students')
      .select('*', { count: 'exact' })
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (attendanceCode) {
      query = query.eq('student_code', attendanceCode)
    }

    const { data: students, error, count } = await query

    if (error) {
      console.error('Error fetching students:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json({ students, count }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' }
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('Unexpected error:', error)
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}

// POST /api/students - 학생 생성 (org 필터)
export async function POST(request: Request) {
  try {
    const { db, orgId, user } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const { campuses, branch_name, branch, attendance_code, student_code, ...rest } = (body || {}) as any

    const insertPayload = {
      ...rest,
      student_code: attendance_code || student_code || null,
      branch_name: branch_name || branch || null,
      campuses: Array.isArray(campuses) ? campuses : null,
      org_id: orgId,
    }

    const { data: student, error } = await db
      .from('students')
      .insert(insertPayload)
      .select()
      .single()

    if (error) {
      console.error('Error creating student:', error)
      return Response.json({ error: error.message }, { status: 500 })
    }

    // 활동 로그 기록 (await 필요 - Edge Runtime에서 fire-and-forget이 작동하지 않음)
    await logActivity({
      orgId: orgId!,
      userId: user?.id || null,
      userName: user?.email?.split('@')[0] || '시스템',
      userRole: null,
      actionType: 'create',
      entityType: 'student',
      entityId: student.id,
      entityName: student.name,
      description: actionDescriptions.student.create(student.name || '이름 없음'),
      request,
    })

    return Response.json({ student }, { status: 201 })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('Unexpected error:', error)
    return Response.json({ error: 'Internal server error', details: error.message }, { status: 500 })
  }
}
