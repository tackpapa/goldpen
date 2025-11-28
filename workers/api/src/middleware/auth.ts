import { Context } from 'hono'
import type { Env } from '../env'
import { getAuthToken } from '../lib/supabase'

// Define Variables type for Hono context
type Variables = {
  authToken: string
}

/**
 * 인증 미들웨어 (선택적)
 * 인증이 필요한 route에만 적용
 */
export function requireAuth() {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: () => Promise<void>) => {
    const token = getAuthToken(c.req.raw)

    if (!token) {
      return c.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        401
      )
    }

    // 토큰을 context에 저장 (optional)
    c.set('authToken', token)

    await next()
  }
}

/**
 * Optional 인증 미들웨어
 * 인증 토큰이 있으면 검증하지만 없어도 통과
 */
export function optionalAuth() {
  return async (c: Context<{ Bindings: Env; Variables: Variables }>, next: () => Promise<void>) => {
    const token = getAuthToken(c.req.raw)

    if (token) {
      c.set('authToken', token)
    }

    await next()
  }
}
