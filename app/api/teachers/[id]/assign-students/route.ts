import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/teachers/[id]/assign-students
 * Body: { studentIds: string[] }
 * 기능: 특정 교사에게 학생들을 배정. 전달된 배열에 없는 기존 배정 학생은 해제.
 * 데이터 저장: students.teacher_id 컬럼 사용.
 */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const teacherId = params.id
    const { studentIds } = await request.json() as { studentIds: string[] }

    if (!Array.isArray(studentIds)) {
      return Response.json({ error: 'studentIds 배열이 필요합니다' }, { status: 400 })
    }

    // 교사 존재/동일 org 확인 (teachers 테이블 기준)
    const { data: teacher, error: teacherError } = await db
      .from('teachers')
      .select('id')
      .eq('id', teacherId)
      .eq('org_id', orgId)
      .single()
    if (teacherError || !teacher) return Response.json({ error: '교사를 찾을 수 없습니다' }, { status: 404 })

    // 1) 기존 이 교사 배정을 모두 해제
    const { error: clearError } = await db
      .from('students')
      .update({ teacher_id: null })
      .eq('org_id', orgId)
      .eq('teacher_id', teacherId)
    if (clearError) {
      console.error('[assign-students] clearError', clearError)
      return Response.json({ error: '배정 해제 실패', details: clearError.message }, { status: 500 })
    }

    // 2) 선택된 학생들에 teacher_id 설정 (없으면 건너뜀)
    if (studentIds.length > 0) {
      const { error: assignError } = await db
        .from('students')
        .update({ teacher_id: teacherId })
        .eq('org_id', orgId)
        .in('id', studentIds)
      if (assignError) {
        console.error('[assign-students] assignError', assignError)
        return Response.json({ error: '배정 저장 실패', details: assignError.message }, { status: 500 })
      }
    }

    return Response.json({ ok: true, studentIds })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[assign-students] unexpected', error)
    return Response.json({ error: '서버 오류', details: error.message }, { status: 500 })
  }
}
