import { Context } from 'hono'
import type { Env } from '../env'

/**
 * CORS 미들웨어
 * Cloudflare Pages 프론트엔드에서 API 호출 허용
 */
export function cors() {
  return async (c: Context<{ Bindings: Env }>, next: () => Promise<void>) => {
    // Allowed origins
    const allowedOrigins = [
      'http://localhost:8000',
      'http://localhost:3000',
      'https://goldpen.pages.dev',
      c.env.NEXT_PUBLIC_APP_URL
    ].filter(Boolean)

    const origin = c.req.header('Origin')
    const isAllowed = origin && allowedOrigins.some(allowed => origin.startsWith(allowed as string))

    // Set CORS headers
    if (isAllowed) {
      c.header('Access-Control-Allow-Origin', origin)
      c.header('Access-Control-Allow-Credentials', 'true')
    }

    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie')
    c.header('Access-Control-Max-Age', '86400') // 24 hours

    // Handle preflight
    if (c.req.method === 'OPTIONS') {
      return c.body(null, 204)
    }

    await next()
  }
}
