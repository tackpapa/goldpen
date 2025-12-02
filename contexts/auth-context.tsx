'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

// Types
export interface User {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'owner' | 'manager' | 'teacher' | 'student' | 'parent'
}

export interface Organization {
  id: string
  name: string
  slug?: string
  type: 'academy' | 'learning_center' | 'study_cafe' | 'tutoring'
}

export interface AuthState {
  user: User | null
  org: Organization | null
  isLoading: boolean
  isAuthenticated: boolean
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User; org?: Organization }>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

// Context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [org, setOrg] = useState<Organization | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // 세션 확인 함수
  const refreshSession = useCallback(async () => {
    try {
      // 브라우저에 저장된 supabase 세션에서 토큰 우선 확보
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

      // 세션 에러가 있으면 (만료된 토큰 등) 로컬 스토리지 클리어
      if (sessionError) {
        console.warn('[Auth] Session error detected, clearing invalid session:', sessionError.message)
        await supabase.auth.signOut().catch(() => {})
        if (typeof window !== 'undefined') {
          const keysToRemove = Object.keys(localStorage).filter(
            key => key.startsWith('sb-') || key.includes('supabase')
          )
          keysToRemove.forEach(key => localStorage.removeItem(key))
        }
        setUser(null)
        setOrg(null)
        setAccessToken(null)
        return
      }

      const bearer = sessionData.session?.access_token || undefined

      // headers 객체를 항상 생성하고, bearer가 있으면 Authorization 추가
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (bearer) {
        headers['Authorization'] = `Bearer ${bearer}`
      }

      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include', // 쿠키 포함
        headers,
      })

      if (response.ok) {
        const data = await response.json() as { user?: User | null; org?: Organization | null }
        if (data.user) {
          setUser(data.user)
          setOrg(data.org || null)
          if (sessionData.session?.access_token) {
            setAccessToken(sessionData.session.access_token)
          }
        } else {
          setUser(null)
          setOrg(null)
          setAccessToken(null)
        }
      } else {
        console.error('[Auth] API error:', response.status)
        setUser(null)
        setOrg(null)
        setAccessToken(null)
      }
    } catch (error) {
      console.error('[Auth] Network error:', error)
      setUser(null)
      setOrg(null)
      setAccessToken(null)
    }
  }, []) // accessToken 의존성 제거 - 무한 루프 방지

  // 초기 세션 확인
  useEffect(() => {
    const initAuth = async () => {
      // 데모 로그인 토큰 확인 (URL 파라미터에서)
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search)
        const demoToken = urlParams.get('demo_token')
        const demoRefresh = urlParams.get('demo_refresh')

        if (demoToken && demoRefresh) {
          console.log('[Auth] Demo token detected, fetching user info first...')
          try {
            // 1. 먼저 데모 토큰으로 /api/auth/me 호출하여 사용자 정보 획득
            const headers: Record<string, string> = {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${demoToken}`,
            }

            console.log('[Auth] Calling /api/auth/me with demo token...')
            const response = await fetch('/api/auth/me', {
              method: 'GET',
              credentials: 'include',
              headers,
            })

            console.log('[Auth] /api/auth/me response status:', response.status)
            if (response.ok) {
              const data = await response.json() as { user?: User | null; org?: Organization | null }
              console.log('[Auth] /api/auth/me response data:', data)
              if (data.user) {
                // 2. 사용자 정보 획득 성공 시 상태 설정
                setUser(data.user)
                setOrg(data.org || null)
                setAccessToken(demoToken)
                console.log('[Auth] Demo user set:', data.user.name, data.user.role)

                // 3. Supabase 클라이언트 세션도 설정 (다른 API 호출용)
                const { createClient } = await import('@/lib/supabase/client')
                const supabase = createClient()
                await supabase.auth.setSession({
                  access_token: demoToken,
                  refresh_token: demoRefresh,
                }).catch(err => console.warn('[Auth] setSession warning:', err))
              }
            } else {
              console.error('[Auth] /api/auth/me failed:', await response.text())
            }

            // URL에서 토큰 파라미터 제거 (히스토리 정리)
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.delete('demo_token')
            newUrl.searchParams.delete('demo_refresh')
            window.history.replaceState({}, '', newUrl.toString())

            setIsLoading(false)
            return // 데모 로그인 완료, refreshSession 스킵
          } catch (err) {
            console.error('[Auth] Error setting demo session:', err)
          }
        }

        // goldpen 데모 사이트인 경우 - 세션 없거나 만료되면 하드코딩된 credentials로 로그인
        if (window.location.pathname.startsWith('/goldpen/')) {
          console.log('[Auth] Goldpen demo site detected, checking session...')

          // 먼저 기존 세션 확인
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession()

          // 세션이 없거나 에러가 있으면 (만료된 토큰 포함) 새로 로그인
          if (!sessionData.session || sessionError) {
            console.log('[Auth] No valid session found, clearing old data and logging in with demo credentials...')

            // 만료된 세션 데이터 클리어
            await supabase.auth.signOut().catch(() => {})
            const keysToRemove = Object.keys(localStorage).filter(
              key => key.startsWith('sb-') || key.includes('supabase')
            )
            keysToRemove.forEach(key => localStorage.removeItem(key))

            // 하드코딩된 데모 계정으로 실제 로그인 API 호출
            const DEMO_EMAIL = 'demo@goldpen.kr'
            const DEMO_PASSWORD = '12345678'

            const response = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
            })

            if (response.ok) {
              interface LoginResponse {
                user?: User
                org?: Organization
                session?: { access_token: string; refresh_token: string }
              }
              const data = await response.json() as LoginResponse

              // Supabase 클라이언트에 세션 설정
              if (data.session) {
                await supabase.auth.setSession({
                  access_token: data.session.access_token,
                  refresh_token: data.session.refresh_token,
                })
                setAccessToken(data.session.access_token)
              }

              // 상태 설정
              if (data.user) {
                setUser(data.user)
              }
              if (data.org) {
                setOrg(data.org)
              }

              console.log('[Auth] Demo login successful:', data.user?.name, data.user?.role)
              setIsLoading(false)
              return
            } else {
              console.error('[Auth] Demo login failed:', await response.text())
            }
          }

          // 세션이 있으면 정상 플로우 진행
        }
      }

      await refreshSession()
      setIsLoading(false)
    }

    initAuth()
  }, [refreshSession])

  // 로그인 함수
  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      })

      interface LoginResponse {
        user?: User
        org?: Organization
        session?: { access_token: string; refresh_token: string }
        error?: string
      }
      const data = await response.json() as LoginResponse

      if (response.ok) {
        // Supabase 세션을 클라이언트에 설정
        if (data.session) {
          const { createClient } = await import('@/lib/supabase/client')
          const supabase = createClient()
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          })
          setAccessToken(data.session.access_token)
        }

        // 로그인 응답에서 user, org 바로 설정 (role 포함)
        if (data.user) {
          setUser(data.user)
        }
        if (data.org) {
          setOrg(data.org)
        }

        return { success: true, user: data.user, org: data.org }
      } else {
        return { success: false, error: data.error || '로그인에 실패했습니다' }
      }
    } catch (error) {
      console.error('[Auth] Login error:', error)
      return { success: false, error: '로그인 중 오류가 발생했습니다' }
    }
  }, [])

  // 로그아웃 함수
  const logout = useCallback(async () => {
    try {
      // 1. 클라이언트 측 Supabase 세션 클리어
      const { createClient } = await import('@/lib/supabase/client')
      const supabase = createClient()
      await supabase.auth.signOut()

      // 2. 서버 측 쿠키 클리어
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })

      // 3. localStorage에서 Supabase 관련 항목 명시적 삭제
      if (typeof window !== 'undefined') {
        const keysToRemove = Object.keys(localStorage).filter(
          key => key.startsWith('sb-') || key.includes('supabase')
        )
        keysToRemove.forEach(key => localStorage.removeItem(key))
      }
    } catch (error) {
      console.error('[Auth] Logout error:', error)
    } finally {
      setUser(null)
      setOrg(null)
      setAccessToken(null)
      router.push('/login')
      router.refresh()
    }
  }, [router])

  const value: AuthContextType = {
    user,
    org,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
