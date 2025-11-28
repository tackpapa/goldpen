import { z } from 'zod'
import { ZodError } from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'

const updateWaitlistSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['active', 'archived']).optional(),
})

// GET /api/waitlists/[id] - Get waitlist with consultations
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { data: waitlist, error } = await db
      .from('waitlists')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json({ error: '대기리스트를 찾을 수 없습니다' }, { status: 404 })
      }
      console.error('[Waitlist GET] Error:', error)
      return Response.json({ error: '대기리스트 조회 실패' }, { status: 500 })
    }

    // Get consultations in this waitlist
    const { data: junctions } = await db
      .from('waitlist_consultations')
      .select('consultation_id, position')
      .eq('waitlist_id', id)
      .order('position', { ascending: true })

    const consultationIds = (junctions || []).map((j: any) => j.consultation_id)

    // Get consultation details
    let consultations: any[] = []
    if (consultationIds.length > 0) {
      const { data: consultationData } = await db
        .from('consultations')
        .select('*')
        .in('id', consultationIds)

      consultations = consultationData || []
    }

    return Response.json({
      waitlist: {
        ...waitlist,
        consultationIds,
        consultations,
      },
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    console.error('[Waitlist GET] Unexpected:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// PATCH /api/waitlists/[id] - Update waitlist
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db, orgId } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = updateWaitlistSchema.parse(body)

    const updateData: Record<string, any> = {}
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.status !== undefined) updateData.status = validated.status

    const { data: waitlist, error } = await db
      .from('waitlists')
      .update(updateData)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json({ error: '대기리스트를 찾을 수 없습니다' }, { status: 404 })
      }
      console.error('[Waitlist PATCH] Error:', error)
      return Response.json({ error: '대기리스트 업데이트 실패' }, { status: 500 })
    }

    return Response.json({ waitlist, message: '대기리스트가 업데이트되었습니다' })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    console.error('[Waitlist PATCH] Unexpected:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// DELETE /api/waitlists/[id] - Delete waitlist
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { error } = await db
      .from('waitlists')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) {
      console.error('[Waitlist DELETE] Error:', error)
      return Response.json({ error: '대기리스트 삭제 실패' }, { status: 500 })
    }

    return Response.json({ success: true, message: '대기리스트가 삭제되었습니다' })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    console.error('[Waitlist DELETE] Unexpected:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
