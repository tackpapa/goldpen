import { ZodError } from 'zod'
import * as z from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { logActivityWithContext, actionDescriptions } from '@/app/api/_utils/activity-log'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const preferredRegion = 'auto'

const createExamSchema = z.object({
  title: z.string().min(1, '시험 제목은 필수입니다'),
  subject: z.string().min(1, '과목은 필수입니다'),
  description: z.string().optional(),
  exam_date: z.string(), // YYYY-MM-DD
  duration_minutes: z.number().int().positive().optional(),
  total_score: z.number().int().positive().optional(),
  class_id: z.string().uuid(), // NOT NULL in DB
})

export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { searchParams } = new URL(request.url)
    const exam_date = searchParams.get('exam_date')

    let query = db
      .from('exams')
      .select('*, class:class_id(id, name, teacher_id, teacher_name)')
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

    // class 정보에서 teacher_name 가져오기
    const normalizedExams = exams?.map((exam: any) => ({
      ...exam,
      class_name: exam.class?.name || '',
      teacher_name: exam.class?.teacher_name || '',
      teacher_id: exam.class?.teacher_id || null,
    })) || []

    // 각 시험별 점수 조회
    const examIds = normalizedExams.map((e: any) => e.id)
    const scores: Record<string, any[]> = {}

    if (examIds.length > 0) {
      // exam_scores에는 org_id 없음 - examIds가 이미 org 필터링됨
      const { data: allScores, error: scoresError } = await db
        .from('exam_scores')
        .select('id, exam_id, student_id, score, notes, student:student_id(name)')
        .in('exam_id', examIds)


      if (!scoresError && allScores) {
        for (const score of allScores) {
          if (!scores[score.exam_id]) {
            scores[score.exam_id] = []
          }
          scores[score.exam_id].push({
            id: score.id,
            exam_id: score.exam_id,
            student_id: score.student_id,
            student_name: (score.student as any)?.name || '',
            score: score.score,
            notes: score.notes || '',
          })
        }
      } else if (scoresError) {
        console.error('[Exams GET] Scores error:', scoresError)
      }
    }

    return Response.json({ exams: normalizedExams, scores, count: normalizedExams.length }, {
      headers: { 'Cache-Control': 'private, max-age=30, stale-while-revalidate=60' }
    })
  } catch (error: any) {
    console.error('[Exams GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { db, orgId, user, role } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = createExamSchema.parse(body)

    const payload = {
      org_id: orgId,
      title: validated.title,
      subject: validated.subject,
      description: validated.description ?? null,
      exam_date: validated.exam_date,
      duration_minutes: validated.duration_minutes ?? null,
      total_score: validated.total_score ?? 100,
      class_id: validated.class_id,
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

    // 활동 로그 기록
    await logActivityWithContext(
      { orgId, user, role },
      {
        type: 'create',
        entityType: 'exam',
        entityId: exam.id,
        entityName: exam.title,
        description: actionDescriptions.exam.create(exam.title || '이름 없음'),
      },
      request
    )

    return Response.json({ exam, message: '시험이 생성되었습니다' }, { status: 201 })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Exams POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
