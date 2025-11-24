import { createConsultationSchema } from '@/lib/validations/consultation'
import { ZodError } from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const preferredRegion = 'auto'

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { searchParams } = new URL(request.url)
    const student_id = searchParams.get('student_id')
    const teacher_id = searchParams.get('teacher_id')
    const status = searchParams.get('status')

    let query = db
      .from('consultations')
      .select('*, student:student_id(id, name), teacher:teacher_id(id, name)')
      .eq('org_id', orgId)
      .order('date', { ascending: false })

    if (student_id) query = query.eq('student_id', student_id)
    if (teacher_id) query = query.eq('teacher_id', teacher_id)
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

    return Response.json({ consultations, count: consultations?.length || 0 })
  } catch (error: any) {
    console.error('[Consultations GET] Unexpected', error)
    // 어떤 오류든 FE 깨지지 않도록 빈 배열 반환
    return Response.json({ consultations: [], count: 0 })
  }
}

export async function POST(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = createConsultationSchema.parse(body)

    const { data: consultationData, error: createError } = await db
      .from('consultations')
      .insert({ ...validated, org_id: orgId })
      .select()
      .single()

    if (createError) {
      console.error('[Consultations POST] Error:', createError)
      return Response.json({ error: '상담 생성 실패' }, { status: 500 })
    }

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
    return Response.json({ error: '서버 오류가 발생했습니다', details: error?.message }, { status: 500 })
  }
}
