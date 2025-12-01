import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * JWT 토큰에서 사용자 ID(sub) 추출
 */
function getUserIdFromJWT(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    // Base64 URL 디코딩
    const payload = parts[1]
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )

    const decoded = JSON.parse(jsonPayload)
    return decoded.sub || null
  } catch (e) {
    console.error('[Auth Me] JWT decode error:', e)
    return null
  }
}

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
/**
 * 쿠키에서 Supabase 세션 토큰 추출
 */
function getTokenFromCookie(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie')
  if (!cookieHeader) return null

  // Supabase SSR 쿠키 패턴: sb-<project-ref>-auth-token
  const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
    const [name, ...rest] = cookie.trim().split('=')
    if (name) acc[name] = rest.join('=')
    return acc
  }, {} as Record<string, string>)

  // sb-auth-token 또는 sb-<ref>-auth-token 찾기
  for (const [key, value] of Object.entries(cookies)) {
    if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
      try {
        let decodedValue = value
        // Supabase SSR "base64-" 접두사 처리
        if (value.startsWith('base64-')) {
          const base64String = value.substring(7)
          decodedValue = atob(base64String)
        }

        const sessionData = JSON.parse(decodeURIComponent(decodedValue))
        if (sessionData.access_token) {
          return sessionData.access_token
        }
      } catch (e) {
        console.error('[Auth Me] Cookie parse error:', e)
      }
    }
  }

  // sb-auth-token (간단한 형식)
  if (cookies['sb-auth-token']) {
    try {
      const decoded = JSON.parse(decodeURIComponent(cookies['sb-auth-token']))
      if (decoded.access_token) return decoded.access_token
    } catch (e) {
      // 무시
    }
  }

  return null
}

export async function GET(request: Request) {
  try {
    // 1. Authorization 헤더에서 JWT 토큰 추출
    const authHeader = request.headers.get('Authorization')
    console.log('[Auth Me] Authorization header present:', !!authHeader, authHeader ? `(${authHeader.substring(0, 20)}...)` : '')
    let userId: string | null = null
    let token: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7)
      userId = getUserIdFromJWT(token)
      console.log('[Auth Me] JWT userId from header:', userId)
    }

    // 2. 헤더에 토큰이 없으면 쿠키에서 추출
    if (!userId) {
      token = getTokenFromCookie(request)
      if (token) {
        userId = getUserIdFromJWT(token)
        console.log('[Auth Me] JWT userId from cookie:', userId)
      }
    }

    // 3. 토큰이 없거나 유효하지 않으면 인증 실패
    if (!userId) {
      console.log('[Auth Me] No valid token, returning unauthenticated')
      return Response.json(
        { user: null, org: null, authenticated: false },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
          },
        }
      )
    }

    // 3. Service Role 클라이언트로 users 테이블 조회 (RLS 우회)
    // RLS 정책의 순환 참조 문제 해결: 자기 자신을 조회하려면 org_id가 필요하지만,
    // org_id를 알려면 자기 자신을 조회해야 하는 문제
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, org_id, name, email, role, phone, created_at')
      .eq('id', userId)
      .single()

    if (userError || !userProfile) {
      return Response.json(
        { error: '사용자 정보를 가져오는데 실패했습니다' },
        { status: 500 }
      )
    }

    // 4. organizations 테이블에서 기관 정보 조회
    if (!userProfile.org_id) {
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

    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, slug, type, created_at')
      .eq('id', userProfile.org_id)
      .single()

    if (orgError || !org) {
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
