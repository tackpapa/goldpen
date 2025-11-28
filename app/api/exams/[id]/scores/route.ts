import { ZodError, z } from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const scoreSchema = z.object({
  student_id: z.string().uuid(),
  score: z.number().int().min(0),
  notes: z.string().optional(),
})

const saveScoresSchema = z.object({
  scores: z.array(scoreSchema),
})

// GET /api/exams/[id]/scores - 시험 점수 조회
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params
    const { db, orgId } = await getSupabaseWithOrg(request)

    // 시험이 해당 org에 속하는지 확인
    const { data: exam, error: examError } = await db
      .from('exams')
      .select('id')
      .eq('id', examId)
      .eq('org_id', orgId)
      .single()

    if (examError || !exam) {
      return Response.json({ error: '시험을 찾을 수 없습니다' }, { status: 404 })
    }

    // 점수 조회
    const { data: scores, error: scoresError } = await db
      .from('exam_scores')
      .select('id, exam_id, student_id, score, notes, student:student_id(id, name)')
      .eq('exam_id', examId)

    if (scoresError) {
      console.error('[Exam Scores GET] Error:', scoresError)
      return Response.json({ error: '점수 조회 실패', details: scoresError.message }, { status: 500 })
    }

    // student 정보 정규화
    const normalizedScores = (scores || []).map((s: any) => ({
      id: s.id,
      exam_id: s.exam_id,
      student_id: s.student_id,
      student_name: s.student?.name || '',
      score: s.score,
      notes: s.notes || '',
    }))

    return Response.json({ scores: normalizedScores })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    console.error('[Exam Scores GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

// POST /api/exams/[id]/scores - 시험 점수 저장 (upsert)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: examId } = await params
    const { db, orgId } = await getSupabaseWithOrg(request)

    const body = await request.json()
    const validated = saveScoresSchema.parse(body)

    // 시험이 해당 org에 속하는지 확인
    const { data: exam, error: examError } = await db
      .from('exams')
      .select('id, total_score')
      .eq('id', examId)
      .eq('org_id', orgId)
      .single()

    if (examError || !exam) {
      return Response.json({ error: '시험을 찾을 수 없습니다' }, { status: 404 })
    }

    // 기존 점수 삭제 후 새로 삽입 (upsert 대신 간단한 방식)
    // 해당 시험의 기존 점수만 삭제 (exam은 이미 위에서 org 소속 확인됨)
    const { error: deleteError } = await db
      .from('exam_scores')
      .delete()
      .eq('exam_id', examId)

    if (deleteError) {
      console.error('[Exam Scores POST] Delete error:', deleteError)
      return Response.json({ error: '기존 점수 삭제 실패', details: deleteError.message }, { status: 500 })
    }

    // 새 점수 삽입 (exam이 이미 org 소속 확인됨, exam_scores에는 org_id 없음)
    const scoresToInsert = validated.scores.map((s) => ({
      exam_id: examId,
      student_id: s.student_id,
      score: s.score,
      notes: s.notes || null,
    }))

    console.log('[Exam Scores POST] orgId:', orgId)
    console.log('[Exam Scores POST] examId:', examId)
    console.log('[Exam Scores POST] Inserting', scoresToInsert.length, 'scores')
    console.log('[Exam Scores POST] First score sample:', JSON.stringify(scoresToInsert[0]))

    // 학생 ID들이 해당 org에 존재하는지 확인
    const studentIds = validated.scores.map(s => s.student_id)
    const { data: validStudents, error: studentCheckError } = await db
      .from('students')
      .select('id')
      .eq('org_id', orgId)
      .in('id', studentIds)

    if (studentCheckError) {
      console.error('[Exam Scores POST] Student check error:', studentCheckError)
      return Response.json({ error: '학생 확인 실패', details: studentCheckError.message }, { status: 500 })
    }

    const validStudentIds = new Set(validStudents?.map((s: any) => s.id) || [])
    const invalidStudentIds = studentIds.filter(id => !validStudentIds.has(id))

    if (invalidStudentIds.length > 0) {
      console.error('[Exam Scores POST] Invalid student IDs:', invalidStudentIds)
      return Response.json({
        error: '유효하지 않은 학생이 포함되어 있습니다',
        details: `${invalidStudentIds.length}명의 학생을 찾을 수 없습니다`
      }, { status: 400 })
    }

    const { data: insertedScores, error: insertError } = await db
      .from('exam_scores')
      .insert(scoresToInsert)
      .select('id, exam_id, student_id, score, notes')

    if (insertError) {
      console.error('[Exam Scores POST] Insert error:', insertError)
      return Response.json({ error: '점수 저장 실패', details: insertError.message }, { status: 500 })
    }

    return Response.json({
      scores: insertedScores,
      message: `${insertedScores?.length || 0}명의 점수가 저장되었습니다`,
    }, { status: 201 })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    console.error('[Exam Scores POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
