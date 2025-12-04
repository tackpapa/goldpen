import { createConsultationSchema } from '@/lib/validations/consultation'
import { ZodError } from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { logActivityWithContext, actionDescriptions } from '@/app/api/_utils/activity-log'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const preferredRegion = 'auto'

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = db
      .from('consultations')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)

    const { data: consultations, error } = await query

    if (error) {
      // 테이블 미존재 등 치명적 오류 시에도 FE가 비지 않도록 빈 배열 반환
      if ((error as any).code === '42P01') {
        return Response.json({ consultations: [], count: 0 })
      }
      console.error('[Consultations GET] Error:', error)
      return Response.json({ error: '상담 목록 조회 실패', details: error.message }, { status: 500 })
    }

    return Response.json({ consultations, count: consultations?.length || 0 }, {
      headers: { 'Cache-Control': 'private, max-age=60, stale-while-revalidate=120' }
    })
  } catch (error: any) {
    console.error('[Consultations GET] Unexpected', error)
    // 어떤 오류든 FE 깨지지 않도록 빈 배열 반환
    return Response.json({ consultations: [], count: 0 })
  }
}

export async function POST(request: Request) {
  try {
    const { db, orgId, user, role } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = createConsultationSchema.parse(body)

    const { data: consultationData, error: createError } = await db
      .from('consultations')
      .insert({
        org_id: orgId,
        student_name: validated.student_name,
        student_grade: validated.student_grade,
        parent_name: validated.parent_name,
        parent_phone: validated.parent_phone,
        parent_email: validated.parent_email || null,
        goals: validated.goals || null,
        preferred_times: validated.preferred_times || null,
        scheduled_date: validated.scheduled_date || null,
        status: validated.status,
        notes: validated.notes || null,
        result: validated.result || null,
        images: validated.images || [],
      })
      .select()
      .single()

    if (createError) {
      console.error('[Consultations POST] Error:', createError)
      return Response.json({ error: '상담 생성 실패', details: createError.message }, { status: 500 })
    }

    // 활동 로그 기록
    await logActivityWithContext(
      { orgId, user, role },
      {
        type: 'create',
        entityType: 'consultation',
        entityId: consultationData.id,
        entityName: consultationData.student_name,
        description: actionDescriptions.consultation.create(consultationData.student_name || '이름 없음'),
      },
      request
    )

    return Response.json({ consultation: consultationData, message: '상담이 생성되었습니다' }, { status: 201 })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[Consultations POST] Unexpected:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error?.message }, { status: 500 })
  }
}
