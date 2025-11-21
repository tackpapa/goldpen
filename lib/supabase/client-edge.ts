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
    const sessionToken =
      cookies['sb-access-token'] ||
      cookies['sb-auth-token'] ||
      cookies['supabase-auth-token']

    if (sessionToken) {
      return sessionToken
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
          const decoded = JSON.parse(decodedValue)
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
 * 인증된 Supabase 클라이언트 생성
 *
 * Request에서 토큰을 추출하고 세션 설정
 */
export async function createAuthenticatedClient(request: Request) {
  const supabase = createClient()
  const token = getAuthToken(request)

  if (token) {
    try {
      // Try to parse as JSON (contains both access_token and refresh_token)
      const tokenData = JSON.parse(token)
      if (tokenData.access_token && tokenData.refresh_token) {
        const { error } = await supabase.auth.setSession({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token
        })

        if (error) {
          throw new Error(`[Supabase Edge] Auth error: ${error.message}`)
        }
      } else {
        throw new Error('[Supabase Edge] Invalid token format')
      }
    } catch (e) {
      // If not JSON, assume it's a raw access_token
      const { error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: ''
      })

      if (error) {
        throw new Error(`[Supabase Edge] Auth error: ${error.message}`)
      }
    }
  }

  return supabase
}
