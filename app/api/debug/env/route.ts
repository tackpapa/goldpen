export const runtime = 'edge'

/**
 * GET /api/debug/env
 * 환경 변수 디버깅용 API
 */
export async function GET() {
  return Response.json({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...',
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY?.substring(0, 20) + '...',
    NODE_ENV: process.env.NODE_ENV,
    envFiles: {
      hasEnvLocal: '체크 불가',
      hasEnvDevelopment: '체크 불가',
      hasEnvProduction: '체크 불가',
    }
  })
}
