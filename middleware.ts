import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// org_id 캐시 (메모리 - 1분 TTL)
const orgIdCache = new Map<string, { id: string; timestamp: number }>()
const CACHE_TTL = 60 * 1000 // 1분

async function getOrgIdFromSlug(slug: string, supabaseUrl: string, supabaseKey: string): Promise<string | null> {
  // 캐시 확인
  const cached = orgIdCache.get(slug)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.id
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: { get: () => undefined, set: () => undefined, remove: () => undefined },
    })

    const { data, error } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (error || !data) return null

    // 캐시 저장
    orgIdCache.set(slug, { id: data.id, timestamp: Date.now() })
    return data.id
  } catch {
    return null
  }
}

function extractOrgSlug(request: NextRequest): string | null {
  // 1. URL 쿼리 파라미터에서 orgSlug 추출
  const orgSlugParam = request.nextUrl.searchParams.get('orgSlug')
  if (orgSlugParam) return orgSlugParam

  // 2. Referer 헤더에서 기관 slug 추출 (예: /goldpen/students → goldpen)
  const referer = request.headers.get('referer')
  if (referer) {
    try {
      const refererUrl = new URL(referer)
      const pathSegments = refererUrl.pathname.split('/').filter(Boolean)
      const systemPaths = ['admin', 'login', 'signup', 'api', 'api-bypass', '_next', '404', 'favicon.ico', 'invite', 'livescreen', 'liveattendance']
      if (pathSegments.length > 0 && !systemPaths.includes(pathSegments[0])) {
        return pathSegments[0]
      }
    } catch {
      // URL 파싱 실패 시 무시
    }
  }

  return null
}

export async function middleware(request: NextRequest) {
  const pathSegments = request.nextUrl.pathname.split('/').filter(Boolean)
  const isApiRequest = request.nextUrl.pathname.startsWith('/api/')

  // Supabase 환경변수
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseKey = supabaseServiceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // ========================================
  // API 요청: org_id 주입 (핵심 로직)
  // ========================================
  if (isApiRequest && supabaseUrl && supabaseServiceKey) {
    const orgSlug = extractOrgSlug(request)

    if (orgSlug) {
      const orgId = await getOrgIdFromSlug(orgSlug, supabaseUrl, supabaseServiceKey)

      if (orgId) {
        // 새 헤더에 x-org-id 추가
        const requestHeaders = new Headers(request.headers)
        requestHeaders.set('x-org-id', orgId)
        requestHeaders.set('x-org-slug', orgSlug)

        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        })
      }
    }
  }

  // 시스템 경로는 slug 검증 제외
  const systemPaths = ['admin', 'login', 'signup', 'api', 'api-bypass', '_next', '404', 'favicon.ico', 'invite']
  const firstSegment = pathSegments[0]

  // ========================================
  // 페이지 요청: 기관 slug 검증
  // ========================================
  if (pathSegments.length >= 1 && !isApiRequest && !systemPaths.includes(firstSegment)) {
    const slug = firstSegment

    if (supabaseUrl && supabaseKey) {
      const orgId = await getOrgIdFromSlug(slug, supabaseUrl, supabaseKey)
      if (!orgId) {
        return NextResponse.rewrite(new URL('/404', request.url))
      }
    }
  }

  // E2E / 스모크 테스트 시 인증 우회 플래그
  if (process.env.E2E_NO_AUTH === '1') {
    // E2E에서는 모든 API를 실제 경로로 통과시켜 서비스 롤/데모 폴백을 활용한다.
    return NextResponse.next()
  }

  // 로컬/개발 환경에서는 인증 리다이렉트를 비활성화하여 작업 편의성을 높인다.
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Supabase 환경변수가 설정되지 않았거나 placeholder인 경우 인증 체크 건너뛰기
  // (supabaseUrl, supabaseKey는 위에서 이미 선언됨)
  if (!supabaseUrl || !supabaseKey ||
      supabaseUrl === 'your-supabase-url' ||
      supabaseKey === 'your-supabase-anon-key' ||
      !supabaseUrl.startsWith('http')) {
    // 개발 환경: Supabase 미설정 시 인증 체크 건너뛰기
    return response
  }

  // 커스텀 sb-auth-token 쿠키 또는 Supabase SSR 표준 쿠키 확인
  const customAuthToken = request.cookies.get('sb-auth-token')?.value
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  const standardAuthToken = projectRef ? request.cookies.get(`sb-${projectRef}-auth-token`)?.value : null

  let user = null

  // 1. 커스텀 sb-auth-token 쿠키가 있으면 파싱 시도
  if (customAuthToken) {
    try {
      const decoded = decodeURIComponent(customAuthToken)
      const session = JSON.parse(decoded)
      if (session.access_token) {
        const supabase = createServerClient(supabaseUrl, supabaseKey, {
          cookies: { get: () => undefined, set: () => undefined, remove: () => undefined },
        })
        const { data } = await supabase.auth.getUser(session.access_token)
        user = data.user
      }
    } catch {
      // 파싱 실패 시 무시
    }
  }

  // 2. 표준 Supabase SSR 쿠키가 있으면 파싱 시도 (Base64 인코딩)
  if (!user && standardAuthToken) {
    try {
      const decoded = atob(standardAuthToken)
      const session = JSON.parse(decoded)
      if (session.access_token) {
        const supabase = createServerClient(supabaseUrl, supabaseKey, {
          cookies: { get: () => undefined, set: () => undefined, remove: () => undefined },
        })
        const { data } = await supabase.auth.getUser(session.access_token)
        user = data.user
      }
    } catch {
      // 파싱 실패 시 무시
    }
  }

  // 3. 표준 Supabase SSR 방식 폴백
  if (!user) {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseKey,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    const { data } = await supabase.auth.getUser()
    user = data.user
  }

  // 인증이 필요한 경로 - [institutionname] 동적 라우팅 지원
  // 패턴: /[institutionname]/(dashboard)/* 형태의 경로 체크
  const protectedPaths = ['/overview', '/students', '/classes', '/consultations',
                          '/exams', '/homework', '/billing', '/settings', '/my',
                          '/attendance', '/lessons', '/teachers', '/schedule', '/rooms',
                          '/seats', '/all-schedules', '/expenses']

  // URL 패턴: /[institutionname]/[page] 형태 체크
  const isProtectedPath = !isApiRequest && pathSegments.length >= 2 &&
    protectedPaths.some(path => request.nextUrl.pathname.includes(path))

  if (isProtectedPath) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // 인증된 사용자가 로그인/회원가입 페이지 접근 시 대시보드로 리다이렉트
  if (request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/signup')) {
    if (user) {
      // 기관 slug를 추출할 수 없으므로 기본 루트로만 돌려보내고,
      // 클라이언트에서 기관 선택/경로 이동을 처리하도록 한다.
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
