import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Env } from '../env'

/**
 * Cloudflare Workers용 Supabase 클라이언트
 * 기존 lib/supabase/client-edge.ts와 동일한 로직
 */
export function createClient(env: Env) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      '[Supabase Workers] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set'
    )
  }

  if (supabaseUrl.includes('your-') || supabaseKey.includes('your-')) {
    throw new Error(
      '[Supabase Workers] Invalid environment variables detected. Please set proper values.'
    )
  }

  return createSupabaseClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
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

  // Cookie에서 세션 토큰 추출
  const cookieHeader = request.headers.get('Cookie')
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader)

    const sessionToken =
      cookies['sb-access-token'] ||
      cookies['sb-auth-token'] ||
      cookies['supabase-auth-token']

    if (sessionToken) {
      return sessionToken
    }

    // Supabase SSR cookie 패턴
    for (const [key, value] of Object.entries(cookies)) {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        return value
      }
    }
  }

  return null
}

/**
 * Cookie 헤더 파싱
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
 */
export async function createAuthenticatedClient(request: Request, env: Env) {
  const supabase = createClient(env)
  const token = getAuthToken(request)

  if (token) {
    const { error } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: ''
    })

    if (error) {
      throw new Error(`[Supabase Workers] Auth error: ${error.message}`)
    }
  }

  return supabase
}

// DEMO_ORG 폴백 제거됨 - 인증 필수

/**
 * JWT 토큰에서 payload 디코딩 (서명 검증 없이 - Supabase에서 이미 검증됨)
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = parts[1]
    // Base64URL to Base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    // Padding
    const padded = base64 + '=='.substring(0, (4 - base64.length % 4) % 4)

    const decoded = atob(padded)
    return JSON.parse(decoded)
  } catch {
    return null
  }
}

/**
 * Request에서 org_id 추출
 * 1. JWT 토큰의 user_metadata에서 org_id 확인
 * 2. 없으면 DB에서 user의 org_id 조회 (Supabase)
 * 3. 데모 모드면 DEMO_ORG 반환
 */
export async function getOrgIdFromRequest(request: Request, env: Env): Promise<string | null> {
  const token = getAuthToken(request)

  // 토큰이 없으면 null 반환 (인증 필수)
  if (!token) {
    return null
  }

  // JWT payload에서 org_id 추출 시도
  const payload = decodeJwtPayload(token)
  if (payload) {
    // user_metadata에 org_id가 있는 경우
    if (payload.user_metadata?.org_id) {
      return payload.user_metadata.org_id
    }
    // app_metadata에 org_id가 있는 경우
    if (payload.app_metadata?.org_id) {
      return payload.app_metadata.org_id
    }
  }

  // Supabase에서 user 정보 조회하여 org_id 가져오기
  try {
    const supabase = createClient(env)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.error('[getOrgId] Auth error:', error?.message)
      return null // 인증 실패 시 null 반환
    }

    // user_metadata에서 org_id 확인
    const orgId = user.user_metadata?.org_id || user.app_metadata?.org_id
    if (orgId) {
      return orgId
    }

    // DB의 org_members 테이블에서 조회
    const { data: membership } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (membership?.org_id) {
      return membership.org_id
    }
  } catch (err) {
    console.error('[getOrgId] Error:', err)
  }

  // org_id를 찾지 못한 경우 null 반환
  return null
}

/**
 * Request에서 user_id 추출
 */
export async function getUserIdFromRequest(request: Request, env: Env): Promise<string | null> {
  const token = getAuthToken(request)

  if (!token) {
    return null
  }

  // JWT payload에서 sub (user_id) 추출
  const payload = decodeJwtPayload(token)
  if (payload?.sub) {
    return payload.sub
  }

  // Supabase에서 user 정보 조회
  try {
    const supabase = createClient(env)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (!error && user) {
      return user.id
    }
  } catch (err) {
    console.error('[getUserId] Error:', err)
  }

  return null
}
