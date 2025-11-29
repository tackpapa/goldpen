import { createClient } from '@/lib/supabase/client-edge'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// 데모 계정 정보 (환경 변수로 이동 가능)
const DEMO_EMAIL = 'demo@goldpen.kr'
const DEMO_PASSWORD = '12345678'

/**
 * GET /api/auth/demo
 * 데모 계정으로 자동 로그인 후 대시보드로 리다이렉트
 */
export async function GET(request: Request) {
  try {
    const supabase = createClient()

    // 1. 데모 계정으로 로그인
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    })

    if (authError || !authData.user || !authData.session) {
      console.error('[Demo Login] Auth error:', authError)
      // 로그인 실패 시 로그인 페이지로 리다이렉트
      return Response.redirect(new URL('/login?error=demo_failed', request.url))
    }

    // 2. 사용자 프로필 조회
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, org_id, name, email, role')
      .eq('id', authData.user.id)
      .single()

    if (userError || !userProfile) {
      console.error('[Demo Login] User profile error:', userError)
      return Response.redirect(new URL('/login?error=user_not_found', request.url))
    }

    // 3. 기관 정보 조회 (slug 확인용)
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('id', userProfile.org_id)
      .single()

    if (orgError || !org) {
      console.error('[Demo Login] Org error:', orgError)
      return Response.redirect(new URL('/login?error=org_not_found', request.url))
    }

    // 4. 세션 쿠키 생성
    const sessionPayload = JSON.stringify({
      access_token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
    })

    const THIRTY_DAYS = 60 * 60 * 24 * 30
    const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : ''
    const cookie = `sb-auth-token=${encodeURIComponent(sessionPayload)}; Path=/; Max-Age=${THIRTY_DAYS}; HttpOnly; SameSite=Lax${secureFlag}`

    // 5. 대시보드로 리다이렉트 (org.slug 사용)
    const dashboardUrl = new URL(`/${org.slug}/overview`, request.url)

    return new Response(null, {
      status: 302,
      headers: {
        'Location': dashboardUrl.toString(),
        'Set-Cookie': cookie,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    console.error('[Demo Login] Unexpected error:', error)
    return Response.redirect(new URL('/login?error=unexpected', request.url))
  }
}
