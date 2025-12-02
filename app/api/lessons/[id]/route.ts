import { ZodError } from 'zod'
import * as z from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const updateLessonSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  lesson_date: z.string().optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  materials: z.array(z.any()).optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
  attendance_count: z.number().int().optional(),
  notification_sent: z.boolean().optional(),
  notification_sent_at: z.string().optional(),
  // AI 생성 피드백 필드
  parent_feedback: z.string().optional(),
  director_feedback: z.string().optional(),
  final_message: z.string().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db, orgId, role } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = updateLessonSchema.parse(body)

    const { data: lesson, error: updateError } = await db
      .from('lessons')
      .update(validated)
      .eq('id', params.id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (updateError) {
      console.error('[Lessons PUT] Error:', updateError)
      return Response.json({ error: '수업 수정 실패', details: updateError.message }, { status: 500 })
    }

    if (!lesson) {
      return Response.json({ error: '수업을 찾을 수 없습니다' }, { status: 404 })
    }

    return Response.json({ lesson, message: '수업이 수정되었습니다' })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Lessons PUT] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db, orgId, role } = await getSupabaseWithOrg(request)

    if (!['owner', 'manager', 'teacher', 'service_role'].includes(role || '')) {
      return Response.json({ error: '수업을 삭제할 권한이 없습니다' }, { status: 403 })
    }

    const { error: deleteError } = await db
      .from('lessons')
      .delete()
      .eq('id', params.id)
      .eq('org_id', orgId)

    if (deleteError) {
      console.error('[Lessons DELETE] Error:', deleteError)
      return Response.json({ error: '수업 삭제 실패', details: deleteError.message }, { status: 500 })
    }

    return Response.json({ message: '수업이 삭제되었습니다' })
  } catch (error: any) {
    console.error('[Lessons DELETE] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
