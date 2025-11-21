import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Supabase 서버 클라이언트 생성
 * Server Component 및 Server Actions에서 사용
 */
export function createClient() {
  const cookieStore = cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseUrl.startsWith('http')) {
    throw new Error('[Supabase Server] Missing NEXT_PUBLIC_SUPABASE_URL')
  }

  if (!supabaseKey || supabaseKey.startsWith('your-')) {
    throw new Error('[Supabase Server] Missing NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // 서버 컴포넌트에서는 쿠키 설정 불가 (무시)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // 서버 컴포넌트에서는 쿠키 삭제 불가 (무시)
          }
        },
      },
    }
  )
}
