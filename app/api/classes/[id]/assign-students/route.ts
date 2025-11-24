import { ZodError, z } from 'zod'
import { getSupabaseWithOrg } from '@/app/api/_utils/org'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const schema = z.object({
  student_ids: z.array(z.string().uuid()).default([]),
})

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const classId = params.id

    // 1) class_enrollments 기준으로 조회
    const { data: enrollments, error: enrollErr } = await db
      .from('class_enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .eq('org_id', orgId)

    let studentIds: string[] = []
    if (!enrollErr && enrollments) {
      studentIds = enrollments.map((e) => e.student_id).filter(Boolean) as string[]
    }

    // 2) fallback: students.class_id 기준 (만약 enrollments 비어 있을 때)
    if (studentIds.length === 0) {
      const { data: studentRows, error: studentErr } = await db
        .from('students')
        .select('id')
        .eq('class_id', classId)
        .eq('org_id', orgId)
      if (!studentErr && studentRows) {
        studentIds = studentRows.map((s) => s.id)
      }
    }

    return Response.json({ student_ids: studentIds })
  } catch (error: any) {
    return Response.json({ error: '서버 오류', details: error.message }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const classId = params.id
    const body = await request.json()
    const { student_ids } = schema.parse(body)

    // 학생 이름 로드
    const { data: studentRows, error: studentErr } = await db
      .from('students')
      .select('id, name')
      .in('id', student_ids)
    if (studentErr) return Response.json({ error: '학생 조회 실패', details: studentErr.message }, { status: 500 })

    // 기존 배정 삭제 (해당 반)
    await db.from('class_enrollments').delete().eq('class_id', classId).eq('org_id', orgId)

    // 새 배정 삽입
    if (student_ids.length) {
      const enrollPayload = studentRows.map((s) => ({
        org_id: orgId,
        class_id: classId,
        student_id: s.id,
        student_name: s.name,
        status: 'active',
      }))
      const { error: insertErr } = await db.from('class_enrollments').insert(enrollPayload)
      if (insertErr) {
        return Response.json({ error: '배정 저장 실패', details: insertErr.message }, { status: 500 })
      }
    }

    // students.class_id 업데이트
    // 선택된 학생들: class_id 설정, 그 외 이 반에 있던 학생은 null
    if (student_ids.length) {
      await db
        .from('students')
        .update({ class_id: classId })
        .in('id', student_ids)
        .eq('org_id', orgId)
      await db
        .from('students')
        .update({ class_id: null })
        .eq('class_id', classId)
        .not('id', 'in', student_ids)
    } else {
      await db
        .from('students')
        .update({ class_id: null })
        .eq('class_id', classId)
    }

    // current_students 업데이트
    const { error: countErr } = await db
      .from('classes')
      .update({ current_students: student_ids.length })
      .eq('id', classId)
    if (countErr) {
      return Response.json({ error: '정원 업데이트 실패', details: countErr.message }, { status: 500 })
    }

    return Response.json({ ok: true, assigned: student_ids.length })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    return Response.json({ error: '서버 오류', details: error.message }, { status: 500 })
  }
}
