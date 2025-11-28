import { z } from 'zod'
import { ZodError } from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'

const addConsultationSchema = z.object({
  consultation_id: z.string().uuid(),
  notes: z.string().optional().nullable(),
})

const removeConsultationSchema = z.object({
  consultation_id: z.string().uuid(),
})

// POST /api/waitlists/[id]/consultations - Add consultation to waitlist
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: waitlistId } = await params
    const { db, orgId } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = addConsultationSchema.parse(body)

    // Verify waitlist exists and belongs to org
    const { data: waitlist, error: waitlistError } = await db
      .from('waitlists')
      .select('id')
      .eq('id', waitlistId)
      .eq('org_id', orgId)
      .single()

    if (waitlistError || !waitlist) {
      return Response.json({ error: '대기리스트를 찾을 수 없습니다' }, { status: 404 })
    }

    // Get current max position
    const { data: maxPosData } = await db
      .from('waitlist_consultations')
      .select('position')
      .eq('waitlist_id', waitlistId)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = (maxPosData?.[0]?.position || 0) + 1

    // Add to waitlist_consultations
    const { data: junction, error: junctionError } = await db
      .from('waitlist_consultations')
      .insert({
        waitlist_id: waitlistId,
        consultation_id: validated.consultation_id,
        position: nextPosition,
        notes: validated.notes || null,
        org_id: orgId,
      })
      .select()
      .single()

    if (junctionError) {
      if (junctionError.code === '23505') {
        return Response.json({ error: '이미 대기리스트에 추가되어 있습니다' }, { status: 400 })
      }
      console.error('[Waitlist Add Consultation] Error:', junctionError)
      return Response.json({ error: '대기리스트 추가 실패' }, { status: 500 })
    }

    // 상담 상태는 수동으로만 변경 (자동 변경 안 함)

    return Response.json({ junction, message: '대기리스트에 추가되었습니다' }, { status: 201 })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    console.error('[Waitlist Add Consultation] Unexpected:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// DELETE /api/waitlists/[id]/consultations - Remove consultation from waitlist
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: waitlistId } = await params
    const { db, orgId } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = removeConsultationSchema.parse(body)

    // Remove from waitlist_consultations
    const { error } = await db
      .from('waitlist_consultations')
      .delete()
      .eq('waitlist_id', waitlistId)
      .eq('consultation_id', validated.consultation_id)

    if (error) {
      console.error('[Waitlist Remove Consultation] Error:', error)
      return Response.json({ error: '대기리스트에서 제거 실패' }, { status: 500 })
    }

    // 상담 상태는 수동으로만 변경 (자동 변경 안 함)

    return Response.json({ success: true, message: '대기리스트에서 제거되었습니다' })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    console.error('[Waitlist Remove Consultation] Unexpected:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
