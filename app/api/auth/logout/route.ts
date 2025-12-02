import { createAuthenticatedClient } from '@/lib/supabase/client-edge'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * POST /api/auth/logout
 * 로그아웃 API
 *
 * @returns 200 - 로그아웃 성공
 * @returns 500 - 서버 에러
 */
export async function POST(request: Request) {
  try {
    const supabase = await createAuthenticatedClient(request)

    // Supabase Auth 로그아웃
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('[Auth Logout] Supabase auth error:', error)
      return Response.json(
        { error: '로그아웃 중 오류가 발생했습니다' },
        { status: 500 }
      )
    }

    const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    // Supabase project ref 추출 (URL에서)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] || ''

    const expired = [
      `sb-auth-token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`,
      `sb-access-token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`, // 호환용
      // Supabase SSR 표준 쿠키 패턴 삭제
      ...(projectRef ? [
        `sb-${projectRef}-auth-token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`,
        `sb-${projectRef}-auth-token-code-verifier=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secureFlag}`,
      ] : []),
    ]

    return Response.json(
      { message: '로그아웃되었습니다' },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Set-Cookie': expired.join(', '),
        },
      }
    )
  } catch (error) {
    console.error('[Auth Logout] Unexpected error:', error)
    return Response.json(
      { error: '로그아웃 중 오류가 발생했습니다' },
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
