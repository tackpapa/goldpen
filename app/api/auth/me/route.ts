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
      // 로그인 안된 상태: 개발/데모용 fallback 사용자 반환
      const demoOrg = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID
      if (demoOrg) {
        return Response.json(
          {
            user: {
              id: 'demo-user',
              email: 'demo@goldpen.local',
              name: '데모 사용자',
              role: 'owner',  // 개발/데모 모드에서는 owner 권한 부여
              phone: null,
              created_at: null,
            },
            org: {
              id: demoOrg,
              name: 'Demo Org',
              type: 'demo',
              created_at: null,
            },
            authenticated: false,
          },
          {
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
          }
        )
      }

      return Response.json(
        { user: null, org: null, authenticated: false },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      )
    }

    // 서비스/데모 모드: 사용자 프로필이 없는 경우 기본값 반환
    const isServiceUser = user.id === 'service-role' || user.id === 'e2e-user'
    const demoOrg = process.env.NEXT_PUBLIC_DEMO_ORG_ID || process.env.DEMO_ORG_ID || null

    let userProfile:
      | { id: string; org_id: string | null; name: string; email: string; role: string; phone: string | null; created_at: string | null }
      | null = null
    let userError: any = null

    if (isServiceUser) {
      userProfile = {
        id: user.id,
        org_id: demoOrg,
        name: user.email || '서비스 사용자',
        email: user.email || 'service@goldpen.local',
        role: 'owner',  // 개발/서비스 모드에서는 owner 권한 부여
        phone: null,
        created_at: null,
      }
    } else {
      const result = await supabase
        .from('users')
        .select('id, org_id, name, email, role, phone, created_at')
        .eq('id', user.id)
        .single()
      userProfile = result.data
      userError = result.error
    }

    if (userError || !userProfile) {
      console.error('[Auth Me] User profile fetch error:', userError)
      return Response.json(
        { error: '사용자 정보를 가져오는데 실패했습니다' },
        { status: 500 }
      )
    }

    // 4. organizations 테이블에서 기관 정보 조회
    const { data: org, error: orgError } = userProfile.org_id
      ? await supabase
          .from('organizations')
          .select('id, name, slug, type, created_at')
          .eq('id', userProfile.org_id)
          .single()
      : { data: demoOrg ? { id: demoOrg, name: 'Demo Org', slug: 'goldpen', type: 'demo', created_at: null } : null, error: null }

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
