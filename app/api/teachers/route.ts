import { getSupabaseWithOrg } from '@/app/api/_utils/org'
import { ZodError } from 'zod'
import * as z from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
    const { db, orgId } = await getSupabaseWithOrg(request)
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

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

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data: teacherData, error: teachersError } = await query

    if (teachersError) {
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
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
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
    const { db, orgId, user, role } = await getSupabaseWithOrg(request)

    // 권한 확인 (owner만 교사 추가 가능)
    if (role !== 'owner') {
      return Response.json(
        { error: '교사를 추가할 권한이 없습니다 (owner만 가능)' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validated = createTeacherSchema.parse(body)

    // 이메일 중복 확인 (org 내부)
    const { data: existingTeacher } = await db
      .from('teachers')
      .select('id')
      .eq('org_id', orgId)
      .eq('email', validated.email)
      .limit(1)
      .maybeSingle()

    if (existingTeacher) {
      return Response.json(
        { error: '이미 동일한 이메일의 교사가 존재합니다' },
        { status: 409 }
      )
    }

    const { data: teacher, error: createError } = await db
      .from('teachers')
      .insert({
        ...validated,
        org_id: orgId,
        user_id: user?.id,
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
    if (error instanceof ZodError) {
      return Response.json(
        { error: '입력 데이터가 유효하지 않습니다', details: error.errors },
        { status: 400 }
      )
    }
    if (error?.message === 'AUTH_REQUIRED') {
      return Response.json({ error: '인증이 필요합니다' }, { status: 401 })
    }
    if (error?.message === 'PROFILE_NOT_FOUND') {
      return Response.json({ error: '프로필을 찾을 수 없습니다' }, { status: 404 })
    }
    console.error('[Teachers POST] Unexpected error:', error)
    return Response.json(
      { error: '서버 오류가 발생했습니다', details: error.message },
      { status: 500 }
    )
  }
}
