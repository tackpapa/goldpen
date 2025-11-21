import { createBrowserClient } from '@supabase/ssr'

/**
 * Supabase 브라우저 클라이언트 생성
 * Client Component에서 사용
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    throw new Error('[Supabase Client] Missing NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!supabaseKey || supabaseKey.startsWith('your-')) {
    throw new Error('[Supabase Client] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createBrowserClient(supabaseUrl, supabaseKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'x-client-info': 'supabase-js-web',
      },
    },
  })
}
