import { createAuthenticatedClient } from '@/lib/supabase/client-edge'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/auth/me
 * 현재 로그인한 사용자 정보 조회 API
 *
 * @header Authorization - Bearer 토큰 (Supabase session)
 *
 * @returns 200 - 사용자 정보 { user, org }
 * @returns 401 - 인증되지 않음 (토큰 없음 또는 만료됨)
 * @returns 500 - 서버 에러
 */
export async function GET(request: Request) {
  try {
    // 1. Supabase 클라이언트 생성
    const supabase = await createAuthenticatedClient(request)

    // 2. 현재 인증된 사용자 가져오기
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      // 로그인 안된 상태: 데모 org 폴백 없이 인증 필요 응답 반환
      return Response.json(
        { user: null, org: null, authenticated: false },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      )
    }

    // 3. users 테이블에서 사용자 프로필 조회
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, org_id, name, email, role, phone, created_at')
      .eq('id', user.id)
      .single()

    if (userError || !userProfile) {
      console.error('[Auth Me] User profile fetch error:', userError)
      return Response.json(
        { error: '사용자 정보를 가져오는데 실패했습니다' },
        { status: 500 }
      )
    }

    // 4. organizations 테이블에서 기관 정보 조회
    if (!userProfile.org_id) {
      console.warn('[Auth Me] User has no org_id:', user.id)
      return Response.json(
        {
          user: {
            id: userProfile.id,
            email: userProfile.email,
            name: userProfile.name,
            role: userProfile.role,
            phone: userProfile.phone,
            created_at: userProfile.created_at,
          },
          org: null,
          authenticated: true,
        },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      )
    }

    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, type, created_at')
      .eq('id', userProfile.org_id)
      .single()

    if (orgError || !org) {
      console.warn('[Auth Me] Organization fetch error, 반환은 계속 진행:', orgError)
      return Response.json(
        {
          user: {
            id: userProfile.id,
            email: userProfile.email,
            name: userProfile.name,
            role: userProfile.role,
            phone: userProfile.phone,
            created_at: userProfile.created_at,
          },
          org: null,
          authenticated: true,
        },
        { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
      )
    }

    // 5. 성공 응답
    return Response.json(
      {
        user: {
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          role: userProfile.role,
          phone: userProfile.phone,
          created_at: userProfile.created_at,
        },
        org: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          type: org.type,
          created_at: org.created_at,
        },
        authenticated: true,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    )
  } catch (error) {
    console.error('[Auth Me] Unexpected error:', error)
    return Response.json(
      { error: '사용자 정보 조회 중 오류가 발생했습니다' },
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
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  )
}
