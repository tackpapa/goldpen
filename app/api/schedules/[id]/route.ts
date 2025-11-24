import { ZodError } from 'zod'
import * as z from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const updateScheduleSchema = z.object({
  class_id: z.string().uuid().optional(),
  teacher_id: z.string().uuid().optional(),
  room_id: z.string().uuid().optional(),
  day_of_week: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']).optional(),
  start_time: z.string().optional(),
  end_time: z.string().optional(),
  status: z.enum(['active', 'cancelled', 'completed']).optional(),
  notes: z.string().optional(),
})

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db, orgId, role } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = updateScheduleSchema.parse(body)

    const { data: schedule, error: updateError } = await db
      .from('schedules')
      .update(validated)
      .eq('id', params.id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (updateError) {
      console.error('[Schedules PUT] Error:', updateError)
      return Response.json({ error: '스케줄 수정 실패', details: updateError.message }, { status: 500 })
    }

    if (!schedule) {
      return Response.json({ error: '스케줄을 찾을 수 없습니다' }, { status: 404 })
    }

    return Response.json({ schedule, message: '스케줄이 수정되었습니다' })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Schedules PUT] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db, orgId, role } = await getSupabaseWithOrg(request)

    if (!['owner', 'manager', 'service_role'].includes(role || '')) {
      return Response.json({ error: '스케줄을 삭제할 권한이 없습니다' }, { status: 403 })
    }

    const { error: deleteError } = await db
      .from('schedules')
      .delete()
      .eq('id', params.id)
      .eq('org_id', orgId)

    if (deleteError) {
      console.error('[Schedules DELETE] Error:', deleteError)
      return Response.json({ error: '스케줄 삭제 실패', details: deleteError.message }, { status: 500 })
    }

    return Response.json({ message: '스케줄이 삭제되었습니다' })
  } catch (error: any) {
    console.error('[Schedules DELETE] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
