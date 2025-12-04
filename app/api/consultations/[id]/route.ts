import { updateConsultationSchema } from '@/lib/validations/consultation'
import { ZodError } from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { logActivityWithContext, actionDescriptions } from '@/app/api/_utils/activity-log'

export const runtime = 'edge'

// GET /api/consultations/[id] - Get single consultation
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { data: consultation, error } = await db
      .from('consultations')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json({ error: '상담을 찾을 수 없습니다' }, { status: 404 })
      }
      console.error('[Consultations GET by ID] Error:', error)
      return Response.json({ error: '상담 조회 실패' }, { status: 500 })
    }

    return Response.json({ consultation })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    console.error('[Consultations GET by ID] Unexpected:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// PATCH /api/consultations/[id] - Update consultation
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db, orgId, user, role } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = updateConsultationSchema.parse(body)

    // Build update object - only include fields that are present in the request
    const updateData: Record<string, any> = {}

    if (validated.student_name !== undefined) updateData.student_name = validated.student_name
    if (validated.student_grade !== undefined) updateData.student_grade = validated.student_grade
    if (validated.parent_name !== undefined) updateData.parent_name = validated.parent_name
    if (validated.parent_phone !== undefined) updateData.parent_phone = validated.parent_phone
    if (validated.parent_email !== undefined) updateData.parent_email = validated.parent_email
    if (validated.goals !== undefined) updateData.goals = validated.goals
    if (validated.preferred_times !== undefined) updateData.preferred_times = validated.preferred_times
    if (validated.scheduled_date !== undefined) updateData.scheduled_date = validated.scheduled_date
    if (validated.status !== undefined) updateData.status = validated.status
    if (validated.notes !== undefined) updateData.notes = validated.notes
    if (validated.result !== undefined) updateData.result = validated.result
    if (validated.enrolled_date !== undefined) updateData.enrolled_date = validated.enrolled_date
    if (validated.images !== undefined) updateData.images = validated.images

    const { data: consultation, error } = await db
      .from('consultations')
      .update(updateData)
      .eq('id', id)
      .eq('org_id', orgId)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return Response.json({ error: '상담을 찾을 수 없습니다' }, { status: 404 })
      }
      console.error('[Consultations PATCH] Error:', error)
      return Response.json({ error: '상담 업데이트 실패', details: error.message }, { status: 500 })
    }

    // 상태가 'waitlist'가 아닌 다른 상태로 변경되면 대기리스트에서 자동 제거
    if (validated.status && validated.status !== 'waitlist') {
      const { error: waitlistDeleteError } = await db
        .from('waitlist_consultations')
        .delete()
        .eq('consultation_id', id)
        .eq('org_id', orgId)

      if (waitlistDeleteError) {
        console.warn('[Consultations PATCH] Waitlist cleanup warning:', waitlistDeleteError)
        // 대기리스트 삭제 실패해도 상담 업데이트는 성공으로 처리
      }

      // waitlists의 consultation_count 업데이트 (트리거가 없다면)
      await db.rpc('update_waitlist_counts', { p_org_id: orgId }).catch(() => {
        // RPC가 없어도 무시 (수동으로 count 업데이트 안 함)
      })
    }

    // 활동 로그 기록
    await logActivityWithContext(
      { orgId, user, role },
      {
        type: 'update',
        entityType: 'consultation',
        entityId: consultation.id,
        entityName: consultation.student_name,
        description: actionDescriptions.consultation.update(consultation.student_name || '이름 없음'),
      },
      request
    )

    return Response.json({ consultation, message: '상담이 업데이트되었습니다' })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    console.error('[Consultations PATCH] Unexpected:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

// DELETE /api/consultations/[id] - Delete consultation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { db, orgId, user, role } = await getSupabaseWithOrg(request)

    // 삭제 전 상담 정보 조회 (로그용)
    const { data: consultationToDelete } = await db
      .from('consultations')
      .select('id, student_name')
      .eq('id', id)
      .eq('org_id', orgId)
      .single()

    const { error } = await db
      .from('consultations')
      .delete()
      .eq('id', id)
      .eq('org_id', orgId)

    if (error) {
      console.error('[Consultations DELETE] Error:', error)
      return Response.json({ error: '상담 삭제 실패', details: error.message }, { status: 500 })
    }

    // 활동 로그 기록
    if (consultationToDelete) {
      await logActivityWithContext(
        { orgId, user, role },
        {
          type: 'delete',
          entityType: 'consultation',
          entityId: id,
          entityName: consultationToDelete.student_name,
          description: actionDescriptions.consultation.delete(consultationToDelete.student_name || '이름 없음'),
        },
        request
      )
    }

    return Response.json({ success: true, message: '상담이 삭제되었습니다' })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    console.error('[Consultations DELETE] Unexpected:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
