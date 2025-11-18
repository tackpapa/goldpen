import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase 브라우저 클라이언트 생성
 * Client Component에서 사용
 */
export function createClient() {
  // 환경 변수 체크 및 fallback
  let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  // .env.example의 placeholder 값인지 체크
  if (!supabaseUrl ||
      supabaseUrl === 'your-supabase-url' ||
      supabaseUrl.includes('your-project') ||
      !supabaseUrl.startsWith('http')) {
    // 로컬 Supabase 하드코딩 (개발용)
    supabaseUrl = 'http://127.0.0.1:54321'
  }

  if (!supabaseKey ||
      supabaseKey === 'your-supabase-anon-key' ||
      supabaseKey.includes('your-anon-key')) {
    // 로컬 Supabase 키 하드코딩 (개발용) - 프레젠테이션용 더미 값
    supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
  }

  console.log('🔧 Supabase client config:', {
    url: supabaseUrl,
    keyPrefix: supabaseKey.substring(0, 30) + '...',
    isProduction: process.env.NODE_ENV === 'production',
  })

  return createBrowserClient(supabaseUrl, supabaseKey)
}
