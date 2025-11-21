import { createClient } from '@/lib/supabase/client-edge'
import { loginSchema } from '@/lib/validations/auth'
import { ZodError } from 'zod'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/auth/login
 * 로그인 API
 *
 * @body email - 이메일 (필수)
 * @body password - 비밀번호 (필수)
 *
 * @returns 200 - 로그인 성공 { user, session }
 * @returns 400 - 입력 검증 실패
 * @returns 401 - 인증 실패 (이메일 또는 비밀번호 오류)
 * @returns 500 - 서버 에러
 */
export async function POST(request: Request) {
  try {
    // DEBUG: 환경 변수 확인
    console.log('[Auth Login] SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('[Auth Login] SUPABASE_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30) + '...')

    // 1. 요청 body 파싱
    const body = await request.json()

    // 2. Zod 검증
    const validated = loginSchema.parse(body)

    // 3. Supabase 클라이언트 생성 (로그인 시에는 토큰 없음)
    const supabase = createClient()

    // 4. Supabase Auth로 로그인
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    })

    if (authError) {
      console.error('[Auth Login] Supabase auth error:', authError)
      return Response.json(
        { error: '이메일 또는 비밀번호가 올바르지 않습니다' },
        { status: 401 }
      )
    }

    if (!authData.user || !authData.session) {
      return Response.json(
        { error: '로그인에 실패했습니다' },
        { status: 500 }
      )
    }

    // 5. users 테이블에서 사용자 프로필 조회
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, org_id, name, email, role')
      .eq('id', authData.user.id)
      .single()

    if (userError || !userProfile) {
      console.error('[Auth Login] User profile fetch error:', userError)
      return Response.json(
        { error: '사용자 정보를 가져오는데 실패했습니다' },
        { status: 500 }
      )
    }

    // 6. organizations 테이블에서 기관 정보 조회
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, type')
      .eq('id', userProfile.org_id)
      .single()

    if (orgError || !org) {
      console.error('[Auth Login] Organization fetch error:', orgError)
      return Response.json(
        { error: '기관 정보를 가져오는데 실패했습니다' },
        { status: 500 }
      )
    }

    // 7. 성공 응답
    return Response.json(
      {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: userProfile.name,
          role: userProfile.role,
        },
        session: authData.session,
        org: {
          id: org.id,
          name: org.name,
          type: org.type,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error) {
    // Zod 검증 에러
    if (error instanceof ZodError) {
      return Response.json(
        {
          error: '입력값이 올바르지 않습니다',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
        { status: 400 }
      )
    }

    // 기타 에러
    console.error('[Auth Login] Unexpected error:', error)
    return Response.json(
      { error: '로그인 중 오류가 발생했습니다' },
      { status: 500 }
    )
  }
}

// CORS 및 OPTIONS 요청 처리
export async function OPTIONS() {
  return Response.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
