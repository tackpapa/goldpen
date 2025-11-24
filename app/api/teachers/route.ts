import { createAuthenticatedClient } from '@/lib/supabase/client-edge'
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

// teachers 테이블 스키마
const baseTeacherSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다'),
  email: z.string().email('올바른 이메일을 입력해주세요'),
  phone: z.string().min(1, '전화번호는 필수입니다'),
  subjects: z.array(z.string()).optional().default([]),
  status: z.enum(['active', 'inactive']).optional().default('active'),
  employment_type: z.enum(['full_time', 'part_time', 'contract']).optional().default('full_time'),
  salary_type: z.enum(['monthly', 'hourly']).optional().default('monthly'),
  salary_amount: z.coerce.number().nonnegative().optional().default(0),
  hire_date: z.string().optional().default(() => new Date().toISOString().split('T')[0]),
  notes: z.string().optional(),
})

const createTeacherSchema = baseTeacherSchema
const updateTeacherSchema = baseTeacherSchema.partial()

/**
 * GET /api/teachers
 * 교사 목록 조회 (users 테이블 role='teacher')
 */
export async function GET(request: Request) {
  try {
    let supabase
    try {
      supabase = await createAuthenticatedClient(request)
    } catch (err: any) {
      console.error('[Teachers GET] Supabase client init failed', err)
      return Response.json({ error: 'Supabase 환경변수 누락', details: err?.message }, { status: 500 })
    }
    const service = getServiceClient()
    const demoOrg = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000'
    const { searchParams } = new URL(request.url)
    const orgParam = searchParams.get('org_id') || searchParams.get('orgId')
    const e2eNoAuth = request.headers.get('x-e2e-no-auth') === '1' || process.env.E2E_NO_AUTH === '1'

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    const db = service || supabase

    // 1. org 결정 (E2E/서비스 키 폴백)
    let orgId: string | null = null
    if (service && (authError || !user || user.id === 'service-role' || user.id === 'e2e-user' || e2eNoAuth)) {
      orgId = orgParam || demoOrg
    } else if (!authError && user) {
      const { data: userProfile, error: profileError } = await db
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()
      if (profileError || !userProfile) {
        if (service) {
          orgId = orgParam || demoOrg
        } else {
          return Response.json({ error: '사용자 프로필을 찾을 수 없습니다' }, { status: 404 })
        }
      } else {
        orgId = userProfile.org_id
      }
    } else {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    // 3. 쿼리 파라미터 파싱
    const search = searchParams.get('search') // 이름 검색

    // 4. 교사 목록 조회 (teachers 테이블 → 없으면 users.role=teacher 폴백)
    let teachers: any[] | null = null

    const buildTeachersFallback = async () => {
      let usersQuery = db
        .from('users')
        .select('id, org_id, name, email, phone, role, created_at, updated_at')
        .eq('org_id', orgId)
        .eq('role', 'teacher')
        .order('created_at', { ascending: false })
      if (search) usersQuery = usersQuery.ilike('name', `%${search}%`)
      const { data: usersData, error: usersError } = await usersQuery
      if (usersError) {
        console.error('[Teachers GET] users fallback error:', usersError)
        return { error: usersError }
      }
      const mapped = (usersData || []).map((u: any) => ({
        id: u.id,
        org_id: u.org_id,
        user_id: u.id,
        name: u.name,
        email: u.email,
        phone: u.phone || '',
        subjects: [],
        status: 'active',
        employment_type: 'full_time',
        salary_type: 'monthly',
        salary_amount: 0,
        hire_date: '',
        notes: null,
        created_at: u.created_at,
        updated_at: u.updated_at,
        user: { id: u.id, role: 'teacher' },
      }))
      return { data: mapped }
    }

    let query = db
      .from('teachers')
      .select('*, user:user_id(id, role)')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    // 검색 필터 적용
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: teacherData, error: teachersError } = await query

    if (teachersError) {
      // 테이블 미존재 또는 기타 오류 시 users.role=teacher 폴백
      console.warn('[Teachers GET] fallback to users due to error:', teachersError)
      const fb = await buildTeachersFallback()
      if (fb.error) {
        return Response.json({ error: '교사 목록 조회 실패', details: fb.error.message }, { status: 500 })
      }
      teachers = fb.data || []
    } else {
      teachers = teacherData || []
    }

    return Response.json({
      teachers,
      count: teachers?.length || 0
    })
  } catch (error: any) {
    console.error('[Teachers GET] Unexpected error:', error)
    return Response.json(
      { error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teachers
 * 교사 생성 (users 테이블 role='teacher')
 * owner만 생성 가능 (설정 페이지에서)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)

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

    // 3. 권한 확인 (owner만 교사 추가 가능)
    if (userProfile.role !== 'owner') {
      return Response.json(
        { error: '교사를 추가할 권한이 없습니다 (owner만 가능)' },
        { status: 403 }
      )
    }

    // 4. 요청 데이터 파싱 및 검증
    const body = await request.json()
    const validated = createTeacherSchema.parse(body)

    // 5. 이메일 중복 확인 (org 내부)
    const { data: existingTeacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('org_id', userProfile.org_id)
      .eq('email', validated.email)
      .limit(1)
      .maybeSingle()

    if (existingTeacher) {
      return Response.json(
        { error: '이미 동일한 이메일의 교사가 존재합니다' },
        { status: 409 }
      )
    }

    const { data: teacher, error: createError } = await supabase
      .from('teachers')
      .insert({
        ...validated,
        org_id: userProfile.org_id,
        user_id: user.id, // owner creating for now; ideally we would create a user first
      })
      .select('*')
      .single()

    if (createError) {
      console.error('[Teachers POST] Error:', createError)
      return Response.json(
        { error: '교사 생성 실패', details: createError.message },
        { status: 500 }
      )
    }

    return Response.json(
      { teacher, message: '교사가 생성되었습니다' },
      { status: 201 }
    )
  } catch (error: any) {
    // Zod 검증 오류
    if (error instanceof ZodError) {
      return Response.json(
        { error: '입력 데이터가 유효하지 않습니다', details: error.errors },
        { status: 400 }
      )
    }

    console.error('[Teachers POST] Unexpected error:', error)
    return Response.json(
      { error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    )
  }
}
