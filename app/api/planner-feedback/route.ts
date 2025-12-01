import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - 학생의 피드백 조회
export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return Response.json({ error: 'studentId가 필요합니다' }, { status: 400 })
    }

    const { data: feedback, error } = await db
      .from('planner_feedback')
      .select('*')
      .eq('student_id', studentId)
      .eq('org_id', orgId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('[PlannerFeedback GET] Error:', error)
      return Response.json({ error: '피드백 조회 실패' }, { status: 500 })
    }

    return Response.json({ feedback: feedback || null })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[PlannerFeedback GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

// POST - 피드백 생성/업데이트 (upsert)
export async function POST(request: Request) {
  try {
    const { db, orgId, user } = await getSupabaseWithOrg(request)

    // 사용자 이름 조회
    let teacherId: string | null = null
    let teacherName: string | null = '선생님'

    if (user) {
      const { data: userProfile } = await db
        .from('users')
        .select('name')
        .eq('id', user.id)
        .single()

      teacherId = user.id
      teacherName = userProfile?.name || '선생님'
    }

    const body = await request.json() as { studentId: string; feedback: string }
    const { studentId, feedback } = body

    if (!studentId) {
      return Response.json({ error: 'studentId가 필요합니다' }, { status: 400 })
    }

    if (!feedback || !feedback.trim()) {
      return Response.json({ error: '피드백 내용이 필요합니다' }, { status: 400 })
    }

    // Upsert - 기존 피드백이 있으면 업데이트, 없으면 생성
    const { data: result, error } = await db
      .from('planner_feedback')
      .upsert({
        org_id: orgId,
        student_id: studentId,
        feedback: feedback.trim(),
        teacher_id: teacherId,
        teacher_name: teacherName,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'org_id,student_id'
      })
      .select()
      .single()

    if (error) {
      console.error('[PlannerFeedback POST] Error:', error)
      return Response.json({ error: '피드백 저장 실패' }, { status: 500 })
    }

    return Response.json({ feedback: result })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[PlannerFeedback POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

// DELETE - 피드백 삭제
export async function DELETE(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    if (!studentId) {
      return Response.json({ error: 'studentId가 필요합니다' }, { status: 400 })
    }

    const { error } = await db
      .from('planner_feedback')
      .delete()
      .eq('student_id', studentId)
      .eq('org_id', orgId)

    if (error) {
      console.error('[PlannerFeedback DELETE] Error:', error)
      return Response.json({ error: '피드백 삭제 실패' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[PlannerFeedback DELETE] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
