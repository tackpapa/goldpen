import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { ZodError } from 'zod'
import * as z from 'zod'
import { logActivity, actionDescriptions } from '@/app/api/_utils/activity-log'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/exams/[id]
 * 시험 상세 조회
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { id: examId } = await params

    const { data: exam, error } = await db
      .from('exams')
      .select(`
        *,
        class:classes(id, name),
        teacher:teachers(id, name),
        room:rooms(id, name),
        scores:exam_scores(
          id, score, student_id,
          student:students(id, name)
        )
      `)
      .eq('id', examId)
      .eq('org_id', orgId)
      .single()

    if (error) {
      console.error('[Exams GET] Error:', error)
      return Response.json({ error: '시험 조회 실패', details: error.message }, { status: 500 })
    }

    if (!exam) {
      return Response.json({ error: '시험을 찾을 수 없습니다' }, { status: 404 })
    }

    return Response.json({ exam })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[Exams GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

const updateExamSchema = z.object({
  class_id: z.string().uuid().optional(),
  teacher_id: z.string().uuid().optional(),
  room_id: z.string().uuid().optional(),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  exam_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  total_score: z.number().int().positive().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db, orgId, user } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = updateExamSchema.parse(body)

    const { data: exam, error: updateError } = await db
      .from('exams')
      .update(validated)
      .eq('id', params.id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (updateError) {
      console.error('[Exams PUT] Error:', updateError)
      return Response.json({ error: '시험 수정 실패', details: updateError.message }, { status: 500 })
    }

    if (!exam) {
      return Response.json({ error: '시험을 찾을 수 없습니다' }, { status: 404 })
    }

    // 활동 로그 기록
    if (user) {
      await logActivity({
        orgId,
        userId: user.id,
        userName: user.email?.split('@')[0] || '사용자',
        userRole: null,
        actionType: 'update',
        entityType: 'exam',
        entityId: exam.id,
        entityName: exam.title,
        description: actionDescriptions.exam.update(exam.title || '이름 없음'),
        request,
      })
    }

    return Response.json({ exam, message: '시험이 수정되었습니다' })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[Exams PUT] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db, orgId, user, role } = await getSupabaseWithOrg(request)

    if (!['owner', 'manager', 'teacher'].includes(role || '')) {
      return Response.json({ error: '시험을 삭제할 권한이 없습니다' }, { status: 403 })
    }

    // 삭제 전 시험 정보 조회 (로그용)
    const { data: examToDelete } = await db
      .from('exams')
      .select('id, title')
      .eq('id', params.id)
      .eq('org_id', orgId)
      .single()

    const { error: deleteError } = await db
      .from('exams')
      .delete()
      .eq('id', params.id)
      .eq('org_id', orgId)

    if (deleteError) {
      console.error('[Exams DELETE] Error:', deleteError)
      return Response.json({ error: '시험 삭제 실패', details: deleteError.message }, { status: 500 })
    }

    // 활동 로그 기록
    if (examToDelete && user) {
      await logActivity({
        orgId,
        userId: user.id,
        userName: user.email?.split('@')[0] || '사용자',
        userRole: role,
        actionType: 'delete',
        entityType: 'exam',
        entityId: params.id,
        entityName: examToDelete.title,
        description: actionDescriptions.exam.delete(examToDelete.title || '이름 없음'),
        request,
      })
    }

    return Response.json({ message: '시험이 삭제되었습니다' })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    console.error('[Exams DELETE] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
