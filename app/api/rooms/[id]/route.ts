import { ZodError } from 'zod'
import * as z from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const updateRoomSchema = z.object({
  name: z.string().min(1, '강의실 이름은 필수입니다').optional(),
  capacity: z.number().int().positive().optional(),
  location: z.string().optional(),
  equipment: z.array(z.string()).optional(),
  status: z.enum(['available', 'in_use', 'maintenance']).optional(),
})

/**
 * PUT /api/rooms/[id]
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db, orgId, role } = await getSupabaseWithOrg(request)
    if (!['owner', 'manager', 'service_role'].includes(role || '')) {
      return Response.json({ error: '강의실 정보를 수정할 권한이 없습니다' }, { status: 403 })
    }

    const body = await request.json()
    const validated = updateRoomSchema.parse(body)

    const { data: room, error: updateError } = await db
      .from('rooms')
      .update(validated)
      .eq('id', params.id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (updateError) {
      console.error('[Rooms PUT] Error:', updateError)
      return Response.json({ error: '강의실 정보 수정 실패', details: updateError.message }, { status: 500 })
    }

    if (!room) {
      return Response.json({ error: '강의실을 찾을 수 없습니다' }, { status: 404 })
    }

    return Response.json({ room, message: '강의실 정보가 수정되었습니다' })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Rooms PUT] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/rooms/[id]
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { db, orgId, role } = await getSupabaseWithOrg(request)

    if (!['owner', 'manager', 'service_role'].includes(role || '')) {
      return Response.json({ error: '강의실을 삭제할 권한이 없습니다' }, { status: 403 })
    }

    const { error: deleteError } = await db
      .from('rooms')
      .delete()
      .eq('id', params.id)
      .eq('org_id', orgId)

    if (deleteError) {
      console.error('[Rooms DELETE] Error:', deleteError)
      return Response.json({ error: '강의실 삭제 실패', details: deleteError.message }, { status: 500 })
    }

    return Response.json({ message: '강의실이 삭제되었습니다' })
  } catch (error: any) {
    console.error('[Rooms DELETE] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
