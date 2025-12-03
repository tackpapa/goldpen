import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { registerSchema } from '@/lib/validations/auth'
import { ZodError } from 'zod'

export const runtime = 'edge'

/**
 * Supabase Auth 에러 메시지 한국어 번역
 */
function translateAuthError(message: string): string {
  const lowerMessage = message.toLowerCase()

  // Rate limiting
  if (lowerMessage.includes('security purposes') && lowerMessage.includes('after')) {
    const seconds = message.match(/after (\d+) seconds?/i)?.[1] || '30'
    return `보안을 위해 ${seconds}초 후에 다시 시도해주세요.`
  }

  // 이메일 관련
  if (lowerMessage.includes('already registered') || lowerMessage.includes('already been registered')) {
    return '이미 가입된 이메일입니다.'
  }
  // "Email address ... is invalid" 또는 "invalid email" 형태
  if (lowerMessage.includes('is invalid') || (lowerMessage.includes('invalid') && lowerMessage.includes('email'))) {
    return '올바른 이메일 주소를 입력해주세요. (test.com 등 가짜 도메인은 사용할 수 없습니다)'
  }
  if (lowerMessage.includes('email not confirmed')) {
    return '이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.'
  }

  // 비밀번호 관련
  if (lowerMessage.includes('password should be at least') || lowerMessage.includes('password is too short')) {
    return '비밀번호는 최소 8자 이상이어야 합니다.'
  }
  if (lowerMessage.includes('weak password')) {
    return '비밀번호가 너무 약합니다. 더 복잡한 비밀번호를 사용해주세요.'
  }

  // 기타
  if (lowerMessage.includes('signups not allowed')) {
    return '현재 회원가입이 제한되어 있습니다.'
  }
  if (lowerMessage.includes('unable to validate email')) {
    return '이메일을 확인할 수 없습니다. 올바른 이메일을 입력해주세요.'
  }

  // 기본 메시지
  return '회원가입 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
}

/**
 * Supabase Auth 에러에 맞는 HTTP 상태 코드 반환
 */
function getAuthErrorStatus(message: string): number {
  const lowerMessage = message.toLowerCase()
  if (lowerMessage.includes('already registered') || lowerMessage.includes('already been registered')) {
    return 409 // Conflict
  }
  if (lowerMessage.includes('security purposes')) {
    return 429 // Too Many Requests
  }
  return 400 // Bad Request
}
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/auth/register
 * 회원가입 API
 *
 * @body email - 이메일 (필수)
 * @body password - 비밀번호 (필수, 최소 8자)
 * @body name - 사용자 이름 (필수)
 * @body org_name - 기관명 (필수)
 * @body org_slug - 기관 아이디 (필수, 영문 소문자/숫자/하이픈)
 * @body phone - 전화번호 (필수)
 *
 * @returns 201 - 회원가입 성공 { user, session }
 * @returns 400 - 입력 검증 실패
 * @returns 409 - 이미 존재하는 이메일
 * @returns 500 - 서버 에러
 */
export async function POST(request: Request) {
  try {
    // 1. 요청 body 파싱
    const body = await request.json()

    // 2. Zod 검증
    const validated = registerSchema.parse(body)

    // 3. Supabase 클라이언트 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey || !serviceRoleKey) {
      return Response.json(
        { error: '서버 설정 오류입니다' },
        { status: 500 }
      )
    }

    // anon key로 회원가입 (이메일 확인 메일 발송)
    const supabaseAuth = createSupabaseClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // service role key로 DB 작업 (RLS 우회)
    const supabaseAdmin = createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 4. Supabase Auth로 회원가입 (이메일 확인 메일 자동 발송)
    const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: {
          name: validated.name,
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://goldpen.kr'}/login?verified=true`,
      },
    })

    if (authError) {
      console.error('[Auth Register] Supabase auth error:', authError)

      // Supabase 에러 메시지 한국어 번역
      const errorMessage = translateAuthError(authError.message)
      const statusCode = getAuthErrorStatus(authError.message)

      return Response.json(
        { error: errorMessage },
        { status: statusCode }
      )
    }

    if (!authData.user) {
      return Response.json(
        { error: '회원가입에 실패했습니다' },
        { status: 500 }
      )
    }

    // 5. organizations 테이블에 기관 생성 (service role로 RLS 우회)
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: validated.org_name,
        slug: validated.org_slug, // 기관 아이디 (URL 경로용)
        type: 'academy', // 기본값
        owner_id: authData.user.id,
        // 설정 페이지 기관정보 탭에 표시될 정보도 함께 저장
        owner_name: validated.name, // 원장 이름
        phone: validated.phone, // 기관 전화번호
        email: validated.email, // 기관 이메일
      })
      .select()
      .single()

    if (orgError) {
      console.error('[Auth Register] Organization creation error:', orgError)

      // 중복 slug 에러 처리
      if (orgError.code === '23505' || orgError.message.includes('duplicate key') || orgError.message.includes('unique')) {
        return Response.json(
          { error: '이미 사용 중인 기관 아이디입니다. 다른 아이디를 입력해주세요.' },
          { status: 409 }
        )
      }

      return Response.json(
        {
          error: '기관 생성에 실패했습니다',
          details: orgError.message,
          cleanup_required: true,
          user_id: authData.user.id
        },
        { status: 500 }
      )
    }

    // 6. users 테이블에 사용자 프로필 생성 (service role로 RLS 우회)
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        org_id: org.id,
        email: validated.email,
        name: validated.name,
        phone: validated.phone, // 전화번호
        role: 'owner', // 기관 소유자
      })

    if (userError) {
      console.error('[Auth Register] User profile creation error:', userError)
      // 프로필 생성 실패 시 organizations 삭제 (CASCADE로 인해 관련 데이터 자동 삭제)
      await supabaseAdmin.from('organizations').delete().eq('id', org.id)
      return Response.json(
        {
          error: '사용자 프로필 생성에 실패했습니다',
          details: userError.message,
          cleanup_required: true,
          user_id: authData.user.id
        },
        { status: 500 }
      )
    }

    // 7. 성공 응답 (이메일 확인 필요)
    return Response.json(
      {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: validated.name,
        },
        org: {
          id: org.id,
          name: org.name,
          slug: org.slug,
        },
        emailConfirmationRequired: true,
        message: '회원가입이 완료되었습니다. 이메일을 확인하여 계정을 활성화해주세요.',
      },
      {
        status: 201,
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
    console.error('[Auth Register] Unexpected error:', error)
    return Response.json(
      { error: '회원가입 중 오류가 발생했습니다' },
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
