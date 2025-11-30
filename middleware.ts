import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1) 기관 slug 검증: 첫 세그먼트가 org slug여야 하고, DB organizations.slug에 존재해야 함
  const pathSegments = request.nextUrl.pathname.split('/').filter(Boolean)
  const isApiRequest = request.nextUrl.pathname.startsWith('/api/')

  // 시스템 경로는 slug 검증 제외
  const systemPaths = ['admin', 'login', 'signup', 'api', 'api-bypass', '_next', '404', 'favicon.ico', 'invite']
  const firstSegment = pathSegments[0]

  if (pathSegments.length >= 1 && !isApiRequest && !systemPaths.includes(firstSegment)) {
    const slug = firstSegment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseKey) {
      try {
        const supabase = createServerClient(supabaseUrl, supabaseKey, {
          cookies: {
            get: () => undefined,
            set: () => undefined,
            remove: () => undefined,
          },
        })

        const { data, error } = await supabase
          .from('organizations')
          .select('id')
          .eq('slug', slug)
          .maybeSingle()

        if (error || !data) {
          return NextResponse.rewrite(new URL('/404', request.url))
        }
      } catch {
        // DB 확인 실패 시 404로 막아 안전 우선
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
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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
