import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
  notes: z.string().optional(),
})

/**
 * PUT /api/teachers/[id]
 * 교사 정보 수정
 */
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const teacherId = params.id

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // 2. 사용자 프로필 조회 (org_id 확인)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return Response.json(
        { error: '사용자 프로필을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 3. 권한 확인 (owner, manager만 수정 가능)
    if (!['owner', 'manager'].includes(userProfile.role)) {
      return Response.json(
        { error: '교사 정보를 수정할 권한이 없습니다' },
        { status: 403 }
      )
    }

    // 4. 요청 데이터 파싱 및 검증
    const body = await request.json()
    const validated = updateTeacherSchema.parse(body)

    // 5. 교사 정보 수정 (같은 org_id 확인) + legacy fallback
    const { data: teacher, error: updateError } = await supabase
      .from('teachers')
      .update(validated)
      .eq('id', teacherId)
      .eq('org_id', userProfile.org_id)
      .select()
      .single()

    if (updateError) {
      console.error('[Teachers PUT] Error:', updateError)
      return Response.json(
        { error: '교사 정보 수정 실패', details: updateError.message },
        { status: 500 }
      )
    }

    if (!teacher) {
      return Response.json(
        { error: '교사를 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    return Response.json({
      teacher,
      message: '교사 정보가 수정되었습니다'
    })
  } catch (error: any) {
    if (error instanceof ZodError) {
      return Response.json(
        { error: '입력 데이터가 유효하지 않습니다', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[Teachers PUT] Unexpected error:', error)
    return Response.json(
      { error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/teachers/[id]
 * 교사 삭제
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createAuthenticatedClient(request)
    const teacherId = params.id

    // 1. 인증 확인
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return Response.json(
        { error: '인증이 필요합니다' },
        { status: 401 }
      )
    }

    // 2. 사용자 프로필 조회 (org_id 확인)
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('org_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !userProfile) {
      return Response.json(
        { error: '사용자 프로필을 찾을 수 없습니다' },
        { status: 404 }
      )
    }

    // 3. 권한 확인 (owner만 삭제 가능)
    if (userProfile.role !== 'owner') {
      return Response.json(
        { error: '교사를 삭제할 권한이 없습니다 (오너만 가능)' },
        { status: 403 }
      )
    }

    // 4. 교사 삭제 (같은 org_id 확인) + legacy fallback
    const { error: deleteError } = await supabase
      .from('teachers')
      .delete()
      .eq('id', teacherId)
      .eq('org_id', userProfile.org_id)

    if (deleteError) {
      console.error('[Teachers DELETE] Error:', deleteError)
      return Response.json(
        { error: '교사 삭제 실패', details: deleteError.message },
        { status: 500 }
      )
    }

    return Response.json({
      message: '교사가 삭제되었습니다'
    })
  } catch (error: any) {
    console.error('[Teachers DELETE] Unexpected error:', error)
    return Response.json(
      { error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    )
  }
}
