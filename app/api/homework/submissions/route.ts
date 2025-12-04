import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

// 개별 제출 스키마
const singleSubmissionSchema = z.object({
  homework_id: z.string().uuid(),
  student_id: z.string().uuid(),
  student_name: z.string().optional(),
  status: z.enum(['submitted', 'late', 'not_submitted']).default('submitted'),
})

// 전체 제출 스키마 (여러 학생 한번에)
const bulkSubmissionSchema = z.object({
  homework_id: z.string().uuid(),
  student_ids: z.array(z.string().uuid()).min(1),
  status: z.enum(['submitted', 'late', 'not_submitted']).default('submitted'),
})

// POST: 제출 기록 생성/업데이트
export async function POST(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const body = await request.json() as Record<string, unknown>

    // 전체 제출인지 개별 제출인지 확인
    if ('student_ids' in body) {
      // 전체 제출 (bulk)
      const validated = bulkSubmissionSchema.parse(body)

      // 학생 정보 가져오기
      const { data: students, error: studentsError } = await db
        .from('students')
        .select('id, name')
        .in('id', validated.student_ids)
        .eq('org_id', orgId)

      if (studentsError) {
        console.error('[Submissions POST] Students error:', studentsError)
        return Response.json({ error: '학생 정보 조회 실패' }, { status: 500 })
      }

      const studentMap = new Map(students?.map((s: { id: string; name: string }) => [s.id, s.name]) || [])

      // 제출 기록 생성/업데이트
      const submissions = validated.student_ids.map(studentId => ({
        homework_id: validated.homework_id,
        student_id: studentId,
        student_name: studentMap.get(studentId) || '',
        status: validated.status,
        submitted_at: validated.status === 'submitted' || validated.status === 'late' ? new Date().toISOString() : null,
      }))

      // upsert: homework_id + student_id 기준으로 기존 데이터 업데이트 또는 새로 생성
      const { data, error } = await db
        .from('homework_submissions')
        .upsert(submissions, {
          onConflict: 'homework_id,student_id',
          ignoreDuplicates: false
        })
        .select()

      if (error) {
        console.error('[Submissions POST] Bulk upsert error:', error)
        return Response.json({ error: '제출 기록 저장 실패', details: error.message }, { status: 500 })
      }

      // homework 테이블의 submitted_count 업데이트
      const { count: submittedCount } = await db
        .from('homework_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('homework_id', validated.homework_id)
        .in('status', ['submitted', 'late'])

      await db
        .from('homework')
        .update({ submitted_count: submittedCount || 0 })
        .eq('id', validated.homework_id)

      return Response.json({
        success: true,
        message: `${validated.student_ids.length}명의 제출이 기록되었습니다`,
        submitted_count: submittedCount || 0,
        data
      })
    } else {
      // 개별 제출
      const validated = singleSubmissionSchema.parse(body)

      // 학생 이름 가져오기 (없는 경우)
      let studentName = validated.student_name
      if (!studentName) {
        const { data: student } = await db
          .from('students')
          .select('name')
          .eq('id', validated.student_id)
          .eq('org_id', orgId)
          .single()
        studentName = student?.name || ''
      }

      const { data, error } = await db
        .from('homework_submissions')
        .upsert({
          homework_id: validated.homework_id,
          student_id: validated.student_id,
          student_name: studentName,
          status: validated.status,
          submitted_at: validated.status === 'submitted' || validated.status === 'late' ? new Date().toISOString() : null,
        }, {
          onConflict: 'homework_id,student_id',
          ignoreDuplicates: false
        })
        .select()
        .single()

      if (error) {
        console.error('[Submissions POST] Single upsert error:', error)
        return Response.json({ error: '제출 기록 저장 실패', details: error.message }, { status: 500 })
      }

      // homework 테이블의 submitted_count 업데이트
      const { count: submittedCount } = await db
        .from('homework_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('homework_id', validated.homework_id)
        .in('status', ['submitted', 'late'])

      await db
        .from('homework')
        .update({ submitted_count: submittedCount || 0 })
        .eq('id', validated.homework_id)

      return Response.json({
        success: true,
        message: '제출이 기록되었습니다',
        submitted_count: submittedCount || 0,
        data
      })
    }
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }

    console.error('[Submissions POST] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

// GET: 특정 과제의 제출 현황 조회
export async function GET(request: Request) {
  try {
    const { db } = await getSupabaseWithOrg(request)

    const url = new URL(request.url)
    const homeworkId = url.searchParams.get('homework_id')

    if (!homeworkId) {
      return Response.json({ error: 'homework_id가 필요합니다' }, { status: 400 })
    }

    const { data: submissions, error } = await db
      .from('homework_submissions')
      .select('*')
      .eq('homework_id', homeworkId)
      .order('student_name', { ascending: true })

    if (error) {
      console.error('[Submissions GET] Error:', error)
      return Response.json({ error: '제출 현황 조회 실패' }, { status: 500 })
    }

    return Response.json({ submissions })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[Submissions GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
