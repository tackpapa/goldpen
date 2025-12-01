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
      const { data: sessionData } = await supabase.auth.getSession()
      const bearer = sessionData.session?.access_token || undefined

      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include', // 쿠키 포함
        headers: bearer ? { Authorization: `Bearer ${bearer}` } : undefined,
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
          try {
            const { createClient } = await import('@/lib/supabase/client')
            const supabase = createClient()
            const { error } = await supabase.auth.setSession({
              access_token: demoToken,
              refresh_token: demoRefresh,
            })

            if (error) {
              console.error('[Auth] Failed to set demo session:', error)
            } else {
              setAccessToken(demoToken)
            }

            // URL에서 토큰 파라미터 제거 (히스토리 정리)
            const newUrl = new URL(window.location.href)
            newUrl.searchParams.delete('demo_token')
            newUrl.searchParams.delete('demo_refresh')
            window.history.replaceState({}, '', newUrl.toString())
          } catch (err) {
            console.error('[Auth] Error setting demo session:', err)
          }
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

        setUser(data.user || null)
        setOrg(data.org || null)
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
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('[Auth] Logout error:', error)
    } finally {
      setUser(null)
      setOrg(null)
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
