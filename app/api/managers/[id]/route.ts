import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { createClient } from '@supabase/supabase-js'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

const getServiceClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

const updateManagerSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다').optional(),
  email: z.string().email('올바른 이메일을 입력해주세요').optional(),
  phone: z.string().min(1, '전화번호는 필수입니다').optional(),
  status: z.enum(['active', 'inactive']).optional(),
  employment_type: z.enum(['full_time', 'part_time', 'contract']).optional(),
  salary_type: z.enum(['monthly', 'hourly']).optional(),
  salary_amount: z.coerce.number().nonnegative().optional(),
  hire_date: z.string().optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/managers/[id]
 * 매니저 상세 조회
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { id: managerId } = await params

    // 매니저 조회
    const { data: manager, error } = await db
      .from('users')
      .select('id, org_id, name, email, phone, role, status, created_at, updated_at')
      .eq('id', managerId)
      .eq('org_id', orgId)
      .eq('role', 'manager')
      .single()

    if (error || !manager) {
      return Response.json({ error: '매니저를 찾을 수 없습니다' }, { status: 404 })
    }

    return Response.json({
      manager: {
        ...manager,
        user_id: manager.id,
        employment_type: 'full_time',
        salary_type: 'monthly',
        salary_amount: 0,
        hire_date: '',
        notes: null,
      }
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[Managers GET/:id] Unexpected error:', error)
    return Response.json(
      { error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/managers/[id]
 * 매니저 정보 수정
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { db, orgId, role } = await getSupabaseWithOrg(request)
    const { id: managerId } = await params

    // 권한 확인 (owner만 수정 가능)
    if (role !== 'owner') {
      return Response.json({ error: '매니저 정보를 수정할 권한이 없습니다' }, { status: 403 })
    }

    const body = await request.json()
    const validated = updateManagerSchema.parse(body)

    // users 테이블에서 수정 가능한 필드만 추출
    const userUpdateData: any = {}
    if (validated.name !== undefined) userUpdateData.name = validated.name
    if (validated.email !== undefined) userUpdateData.email = validated.email
    if (validated.phone !== undefined) userUpdateData.phone = validated.phone
    if (validated.status !== undefined) userUpdateData.status = validated.status

    // 매니저 정보 수정
    const { data: manager, error: updateError } = await db
      .from('users')
      .update(userUpdateData)
      .eq('id', managerId)
      .eq('org_id', orgId)
      .eq('role', 'manager')
      .select()
      .single()

    if (updateError) {
      console.error('[Managers PUT] Error:', updateError)

      // 이메일 중복 에러 처리
      if (updateError.code === '23505') {
        return Response.json({ error: '이미 사용 중인 이메일입니다' }, { status: 400 })
      }

      return Response.json(
        { error: '매니저 정보 수정 실패', details: updateError.message },
        { status: 500 }
      )
    }

    if (!manager) {
      return Response.json({ error: '매니저를 찾을 수 없습니다' }, { status: 404 })
    }

    return Response.json({
      manager: {
        ...manager,
        user_id: manager.id,
        employment_type: validated.employment_type || 'full_time',
        salary_type: validated.salary_type || 'monthly',
        salary_amount: validated.salary_amount || 0,
        hire_date: validated.hire_date || '',
        notes: validated.notes || null,
      },
      message: '매니저 정보가 수정되었습니다'
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    if (error instanceof ZodError) {
      return Response.json(
        { error: '입력 데이터가 유효하지 않습니다', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[Managers PUT] Unexpected error:', error)
    return Response.json(
      { error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/managers/[id]
 * 매니저 삭제
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { db, orgId, role } = await getSupabaseWithOrg(request)
    const { id: managerId } = await params

    // 권한 확인 (owner만 삭제 가능)
    if (role !== 'owner') {
      return Response.json({ error: '매니저를 삭제할 권한이 없습니다 (오너만 가능)' }, { status: 403 })
    }

    // 먼저 매니저 확인
    const { data: managerToDelete } = await db
      .from('users')
      .select('id, email')
      .eq('id', managerId)
      .eq('org_id', orgId)
      .eq('role', 'manager')
      .single()

    if (!managerToDelete) {
      return Response.json({ error: '매니저를 찾을 수 없습니다' }, { status: 404 })
    }

    // users 테이블에서 삭제
    const { error: deleteError } = await db
      .from('users')
      .delete()
      .eq('id', managerId)
      .eq('org_id', orgId)
      .eq('role', 'manager')

    if (deleteError) {
      console.error('[Managers DELETE] Error:', deleteError)
      return Response.json(
        { error: '매니저 삭제 실패', details: deleteError.message },
        { status: 500 }
      )
    }

    // Auth 사용자도 삭제 (서비스 클라이언트 필요)
    const service = getServiceClient()
    if (service) {
      await service.auth.admin.deleteUser(managerId)
    }

    return Response.json({
      message: '매니저가 삭제되었습니다'
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[Managers DELETE] Unexpected error:', error)
    return Response.json(
      { error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    )
  }
}
