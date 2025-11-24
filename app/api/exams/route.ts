import { ZodError } from 'zod'
import * as z from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const preferredRegion = 'auto'

const createExamSchema = z.object({
  title: z.string().min(1, '시험 제목은 필수입니다'),
  description: z.string().optional(),
  exam_date: z.string(), // YYYY-MM-DD
  max_score: z.number().int().positive().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
})

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { searchParams } = new URL(request.url)
    const exam_date = searchParams.get('exam_date')

    let query = db
      .from('exams')
      .select('*')
      .eq('org_id', orgId)
      .order('exam_date', { ascending: false })

    if (exam_date) query = query.eq('exam_date', exam_date)

    const { data: exams, error: examsError } = await query

    if (examsError) {
      console.error('[Exams GET] Error:', examsError)
      if ((examsError as any).code === '42P01') {
        return Response.json({ exams: [], count: 0 })
      }
      return Response.json({ error: '시험 목록 조회 실패', details: examsError.message }, { status: 500 })
    }

    return Response.json({ exams, count: exams?.length || 0 })
  } catch (error: any) {
    console.error('[Exams GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { db, orgId, role } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = createExamSchema.parse(body)

    const payload = {
      org_id: orgId,
      title: validated.title,
      description: validated.description ?? null,
      exam_date: validated.exam_date,
      subject: body.subject ?? null,
      max_score: validated.max_score ?? 100,
      status: validated.status ?? 'scheduled',
    }

    const { data: exam, error: createError } = await db
      .from('exams')
      .insert(payload)
      .select()
      .single()

    if (createError) {
      console.error('[Exams POST] Error:', createError)
      return Response.json({ error: '시험 생성 실패', details: createError.message }, { status: 500 })
    }

    return Response.json({ exam, message: '시험이 생성되었습니다' }, { status: 201 })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Exams POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
