import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/teachers/[id]
 * 교사 상세 조회
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { id: teacherId } = await params

    const { data: teacher, error } = await db
      .from('teachers')
      .select(`
        *,
        assigned_students:teacher_students(
          student:students(id, name, grade)
        ),
        classes(id, name)
      `)
      .eq('id', teacherId)
      .eq('org_id', orgId)
      .single()

    if (error) {
      console.error('[Teachers GET] Error:', error)
      return Response.json({ error: '교사 조회 실패', details: error.message }, { status: 500 })
    }

    if (!teacher) {
      return Response.json({ error: '교사를 찾을 수 없습니다' }, { status: 404 })
    }

    return Response.json({ teacher })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[Teachers GET] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

const updateTeacherSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다').optional(),
  email: z.string().email('올바른 이메일을 입력해주세요').optional(),
  phone: z.string().min(1, '전화번호는 필수입니다').optional(),
  subjects: z.array(z.string()).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  employment_type: z.enum(['full_time', 'part_time', 'contract']).optional(),
  salary_type: z.enum(['monthly', 'hourly']).optional(),
  salary_amount: z.coerce.number().nonnegative().optional(),
  hire_date: z.string().optional(),
  payment_day: z.number().int().min(1).max(31).optional(),
  notes: z.string().optional(),
})

/**
 * PUT /api/teachers/[id]
 * 교사 정보 수정
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { db, orgId, role } = await getSupabaseWithOrg(request)
    const { id: teacherId } = await params

    // 권한 확인 (owner, manager만 수정 가능)
    if (!['owner', 'manager'].includes(role || '')) {
      return Response.json(
        { error: '교사 정보를 수정할 권한이 없습니다' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = updateTeacherSchema.parse(body)

    const { data: teacher, error: updateError } = await db
      .from('teachers')
      .update(validated)
      .eq('id', teacherId)
      .eq('org_id', orgId)
      .select()
      .single()

    if (updateError) {
      console.error('[Teachers PUT] Error:', updateError)
      if (updateError.code === '23505' && updateError.message.includes('teachers_org_id_email_key')) {
        return Response.json({ error: '이미 사용 중인 이메일입니다' }, { status: 400 })
      }
      return Response.json({ error: '교사 정보 수정 실패', details: updateError.message }, { status: 500 })
    }

    if (!teacher) {
      return Response.json({ error: '교사를 찾을 수 없습니다' }, { status: 404 })
    }

    return Response.json({ teacher, message: '교사 정보가 수정되었습니다' })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json({ error: '입력 데이터가 유효하지 않습니다', details: error.errors }, { status: 400 })
    }
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[Teachers PUT] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}

/**
 * DELETE /api/teachers/[id]
 * 교사 삭제
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { db, orgId, role } = await getSupabaseWithOrg(request)
    const { id: teacherId } = await params

    // 권한 확인 (owner만 삭제 가능)
    if (role !== 'owner') {
      return Response.json({ error: '교사를 삭제할 권한이 없습니다 (오너만 가능)' }, { status: 403 })
    }

    const { error: deleteError } = await db
      .from('teachers')
      .delete()
      .eq('id', teacherId)
      .eq('org_id', orgId)

    if (deleteError) {
      console.error('[Teachers DELETE] Error:', deleteError)
      return Response.json({ error: '교사 삭제 실패', details: deleteError.message }, { status: 500 })
    }

    return Response.json({ message: '교사가 삭제되었습니다' })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[Teachers DELETE] Unexpected error:', error)
    return Response.json({ error: '서버 오류가 발생했습니다', details: error.message }, { status: 500 })
  }
}
