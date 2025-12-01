import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Edge Runtime 호환 Supabase 클라이언트
 *
 * - cookies() 사용 안 함 (Edge Runtime 미지원)
 * - Bearer Token 방식 인증 사용
 * - 환경변수 Runtime 주입 지원 (wrangler.jsonc vars)
 *
 * @see CLOUDFLARE_MIGRATION_PLAN.md Phase 1
 */
export function createClient() {
  // 환경변수 Fallback (빌드타임 주입 + Runtime 주입)
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL

  const supabaseKey =
    // E2E_NO_AUTH=1 이면 서비스 롤 키를 우선 사용해 인증 우회
    (process.env.E2E_NO_AUTH === '1' && process.env.SUPABASE_SERVICE_ROLE_KEY) ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY

  // 환경변수 검증 (하드코딩 제거)
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      '[Supabase Edge] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set'
    )
  }

  // 잘못된 placeholder 값 체크
  if (
    supabaseUrl.includes('your-') ||
    supabaseKey.includes('your-')
  ) {
    throw new Error(
      '[Supabase Edge] Invalid environment variables detected. Please set proper values in .env files.'
    )
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,  // Edge에서는 세션 미저장
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  })
}

/**
 * Request에서 인증 토큰 추출
 */
export function getAuthToken(request: Request): string | null {
  // Authorization 헤더 확인
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Cookie에서 세션 토큰 추출 (Supabase SSR 호환)
  const cookieHeader = request.headers.get('Cookie')

  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader)

    // Supabase 세션 쿠키명 (다양한 패턴 지원)
    const sessionTokenRaw =
      cookies['sb-auth-token'] || // access+refresh JSON 패키지 우선
      cookies['sb-access-token'] ||
      cookies['supabase-auth-token']

    if (sessionTokenRaw) {
      // URL 인코딩 되었을 수 있으므로 우선 decode
      const decoded = decodeURIComponent(sessionTokenRaw)
      return decoded
    }

    // Supabase SSR cookie 패턴 (sb-<project-ref>-auth-token)
    for (const [key, value] of Object.entries(cookies)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        try {
          // Supabase SSR prefixes base64-encoded values with "base64-"
          let decodedValue = value
          if (value.startsWith('base64-')) {
            const base64String = value.substring(7) // Remove "base64-" prefix
            decodedValue = Buffer.from(base64String, 'base64').toString('utf-8')
          }

          // Try to parse as JSON
          const decoded = JSON.parse(decodeURIComponent(decodedValue))
          if (decoded && typeof decoded === 'object') {
            // Handle object format - return the whole decoded object for setSession
            if (decoded.access_token) {
              return JSON.stringify(decoded)  // Return JSON string containing both tokens
            }
            // Handle array format (Supabase SSR stores as [access_token, refresh_token])
            if (Array.isArray(decoded) && decoded.length > 0) {
              return decoded[0] // access_token is first element
            }
          }
          // If not JSON, return as-is
          return value
        } catch (e) {
          // Not JSON, return as-is (might be raw JWT)
          return value
        }
      }
    }
  }

  return null
}

/**
 * Cookie 헤더 파싱 유틸리티
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}

  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=')
    if (name) {
      cookies[name] = rest.join('=')
    }
  })

  return cookies
}

/**
 * Supabase 청크 쿠키 조합 함수
 * Supabase SSR은 큰 토큰을 여러 쿠키로 분할 저장: sb-xxx-auth-token.0, sb-xxx-auth-token.1, ...
 */
function combineChunkedCookies(cookies: Record<string, string>, baseName: string): string | null {
  // 청크가 없으면 기본값 반환
  if (cookies[baseName]) {
    return cookies[baseName]
  }

  // 청크 쿠키 찾기 (baseName.0, baseName.1, ...)
  const chunks: string[] = []
  let chunkIndex = 0

  while (true) {
    const chunkKey = `${baseName}.${chunkIndex}`
    if (cookies[chunkKey]) {
      chunks.push(cookies[chunkKey])
      chunkIndex++
    } else {
      break
    }
  }

  if (chunks.length > 0) {
    return chunks.join('')
  }

  return null
}

// 빌드 타임에 결정되는 프로덕션 여부 (Cloudflare Workers 런타임 호환)
const IS_PRODUCTION = process.env.NEXT_PUBLIC_VERCEL_ENV === 'production' ||
  process.env.CF_PAGES === '1' ||
  process.env.NEXT_PUBLIC_APP_URL?.includes('goldpen.kr')

/**
 * 인증된 Supabase 클라이언트 생성
 *
 * Request에서 토큰을 추출하고 세션 설정
 */
export async function createAuthenticatedClient(request: Request) {
  const supabase = createClient()

  // 개발 편의: 토큰이 없고 서비스 롤 키가 있으면 서비스 클라이언트로 교체 + 가짜 유저 반환
  // 주의: 프로덕션에서는 절대 활성화되지 않음 (IS_PRODUCTION 사용)
  if (!getAuthToken(request) && process.env.SUPABASE_SERVICE_ROLE_KEY && !IS_PRODUCTION) {
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    ) as any

    adminClient.auth.getUser = async () => ({
      data: {
        user: {
          id: 'service-role',
          email: '시스템@goldpen.local',
          role: 'service_role',
        }
      },
      error: null,
    })

    adminClient.auth.getSession = async () => ({
      data: {
        session: {
          access_token: process.env.SUPABASE_SERVICE_ROLE_KEY,
          refresh_token: process.env.SUPABASE_SERVICE_ROLE_KEY,
          user: {
            id: 'service-role',
            email: '시스템@goldpen.local',
            role: 'service_role',
          },
        },
      },
      error: null,
    })

    return adminClient
  }

  // E2E/Test 모드: 서비스 롤 토큰으로 세션을 강제 주입해 인증을 우회
  if (process.env.E2E_NO_AUTH === '1' && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    await supabase.auth.setSession({
      access_token: process.env.SUPABASE_SERVICE_ROLE_KEY,
      refresh_token: process.env.SUPABASE_SERVICE_ROLE_KEY,
    }).catch(() => {})

    // getUser: 항상 가짜 유저 반환
    ;(supabase as any).auth.getUser = async () => ({
      data: {
        user: {
          id: "e2e-user",
          email: "e2e@goldpen.local",
          role: "service_role",
          app_metadata: { provider: "service_role" },
        },
      },
      error: null,
    })

    // getSession: 서비스 키 기반 세션 반환
    ;(supabase as any).auth.getSession = async () => ({
      data: {
        session: {
          access_token: process.env.SUPABASE_SERVICE_ROLE_KEY,
          refresh_token: process.env.SUPABASE_SERVICE_ROLE_KEY,
          user: {
            id: "e2e-user",
            email: "e2e@goldpen.local",
            role: "service_role",
          },
        },
      },
      error: null,
    })

    return supabase
  }

  const token = getAuthToken(request)

  if (token) {
    try {
      // Try to parse as JSON (contains both access_token and refresh_token)
      const tokenData = JSON.parse(token)
      if (tokenData.access_token && tokenData.refresh_token) {
        await supabase.auth.setSession({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token
        })
      } else if (Array.isArray(tokenData) && tokenData.length >= 2) {
        await supabase.auth.setSession({
          access_token: tokenData[0],
          refresh_token: tokenData[1]
        })
      } else {
        throw new Error('[Supabase Edge] Invalid token format')
      }
    } catch (e) {
      // If not JSON, assume it's a raw access_token
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: ''
      })
    }
  }

  return supabase
}
