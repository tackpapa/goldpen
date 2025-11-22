import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const createExamSchema = z.object({
  title: z.string().min(1, '시험 제목은 필수입니다'),
  description: z.string().optional(),
  exam_date: z.string(), // YYYY-MM-DD
  max_score: z.number().int().positive().optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']).optional(),
})

export async function GET(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const exam_date = searchParams.get('exam_date')

    let query = supabase
      .from('exams')
      .select('*')
      .eq('org_id', userProfile.org_id)
      .order('exam_date', { ascending: false })

    if (exam_date) query = query.eq('exam_date', exam_date)

    const { data: exams, error: examsError } = await query

    if (examsError) {
      console.error('[Exams GET] Error:', examsError)
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
    const supabase = await createAuthenticatedClient(request)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
    }

    const body = await request.json()
    const validated = createExamSchema.parse(body)

    const payload = {
      org_id: userProfile.org_id,
      title: validated.title,
      description: validated.description ?? null,
      exam_date: validated.exam_date,
      subject: body.subject ?? null,
      max_score: validated.max_score ?? 100,
      status: validated.status ?? 'scheduled',
    }

    const { data: exam, error: createError } = await supabase
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
