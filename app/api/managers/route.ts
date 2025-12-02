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

// managers 스키마 (강사와 유사하지만 subjects 제외)
const baseManagerSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다'),
  email: z.string().email('올바른 이메일을 입력해주세요'),
  phone: z.string().min(1, '전화번호는 필수입니다'),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  employment_type: z.enum(['full_time', 'part_time', 'contract']).optional().default('full_time'),
  salary_type: z.enum(['monthly', 'hourly']).optional().default('monthly'),
  salary_amount: z.coerce.number().nonnegative().optional().default(0),
  hire_date: z.string().optional().default(() => new Date().toISOString().split('T')[0]),
  notes: z.string().optional(),
})

const createManagerSchema = baseManagerSchema

/**
 * GET /api/managers
 * 매니저 목록 조회 (users 테이블 role='manager')
 */
export async function GET(request: Request) {
  try {
    const { db, orgId } = await getSupabaseWithOrg(request)

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    // 매니저 목록 조회 (users 테이블 role='manager', 확장 필드 포함)
    let query = db
      .from('users')
      .select('id, org_id, name, email, phone, role, status, employment_type, salary_type, salary_amount, payment_day, hire_date, notes, created_at, updated_at')
      .eq('org_id', orgId)
      .eq('role', 'manager')
      .order('created_at', { ascending: false })

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: managers, error } = await query

    if (error) {
      console.error('[Managers GET] Error:', error)
      return Response.json({ error: '매니저 목록 조회 실패', details: error.message }, { status: 500 })
    }

    // 매니저 데이터 포맷팅 (실제 DB 값 사용, null이면 기본값)
    const formattedManagers = (managers || []).map((m: any) => ({
      id: m.id,
      org_id: m.org_id,
      user_id: m.id,
      name: m.name,
      email: m.email,
      phone: m.phone || '',
      status: m.status || 'active',
      employment_type: m.employment_type || 'full_time',
      salary_type: m.salary_type || 'monthly',
      salary_amount: m.salary_amount || 0,
      payment_day: m.payment_day || 25,
      hire_date: m.hire_date || '',
      notes: m.notes || null,
      created_at: m.created_at,
      updated_at: m.updated_at,
    }))

    return Response.json({
      managers: formattedManagers,
      count: formattedManagers.length
    })
  } catch (error: any) {
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[Managers GET] Unexpected error:', error)
    return Response.json(
      { error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/managers
 * 매니저 생성 (users 테이블 role='manager')
 * owner만 생성 가능
 */
export async function POST(request: Request) {
  try {
    const { db, orgId, role } = await getSupabaseWithOrg(request)

    // 권한 확인 (owner만 매니저 추가 가능)
    if (role !== 'owner') {
      return Response.json({ error: '매니저를 추가할 권한이 없습니다 (owner만 가능)' }, { status: 403 })
    }

    const body = await request.json()
    const validated = createManagerSchema.parse(body)

    // 이메일 중복 확인 (org 내부)
    const { data: existingUser } = await db
      .from('users')
      .select('id')
      .eq('org_id', orgId)
      .eq('email', validated.email)
      .limit(1)
      .maybeSingle()

    if (existingUser) {
      return Response.json({ error: '이미 동일한 이메일의 사용자가 존재합니다' }, { status: 409 })
    }

    // 서비스 클라이언트로 사용자 생성 (Auth + users 테이블)
    const service = getServiceClient()
    if (!service) {
      return Response.json({ error: '서버 설정 오류' }, { status: 500 })
    }

    // 임시 비밀번호 생성
    const tempPassword = Math.random().toString(36).slice(-8) + '!1'

    // Auth 사용자 생성
    const { data: authData, error: authCreateError } = await service.auth.admin.createUser({
      email: validated.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        name: validated.name,
        org_id: orgId,
        role: 'manager'
      }
    })

    if (authCreateError) {
      if (authCreateError.message.includes('already been registered')) {
        return Response.json({ error: '이미 등록된 이메일입니다' }, { status: 409 })
      }
      console.error('[Managers POST] Auth Error:', authCreateError)
      return Response.json({ error: '매니저 계정 생성 실패', details: authCreateError.message }, { status: 500 })
    }

    if (!authData.user) {
      return Response.json({ error: '사용자 생성 실패' }, { status: 500 })
    }

    // users 테이블에 사용자 정보 추가
    const { data: manager, error: userInsertError } = await service
      .from('users')
      .insert({
        id: authData.user.id,
        email: validated.email,
        name: validated.name,
        phone: validated.phone,
        org_id: orgId,
        role: 'manager',
        status: validated.status || 'active'
      })
      .select()
      .single()

    if (userInsertError) {
      console.error('[Managers POST] User Insert Error:', userInsertError)
      // 롤백: Auth 사용자 삭제
      await service.auth.admin.deleteUser(authData.user.id)
      return Response.json({ error: '매니저 정보 저장 실패', details: userInsertError.message }, { status: 500 })
    }

    return Response.json(
      {
        manager: {
          ...manager,
          user_id: manager.id,
          employment_type: validated.employment_type,
          salary_type: validated.salary_type,
          salary_amount: validated.salary_amount,
          hire_date: validated.hire_date,
          notes: validated.notes,
        },
        tempPassword, // 임시 비밀번호 반환 (초대 이메일에 포함)
        message: '매니저가 생성되었습니다'
      },
      { status: 201 }
    )
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

    console.error('[Managers POST] Unexpected error:', error)
    return Response.json(
      { error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    )
  }
}
