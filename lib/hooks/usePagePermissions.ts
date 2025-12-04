'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import type { PagePermissions, PageId, UserRole } from '@/lib/types/permissions'
import { DEFAULT_PERMISSIONS } from '@/lib/types/permissions'

interface UsePagePermissionsOptions {
  orgSlug?: string
}

// API Response types
interface PermissionsResponse {
  permissions?: Record<string, { manager: boolean; teacher: boolean }>
  success?: boolean
  error?: string
}

// 글로벌 캐시: 동일 slug에 대한 중복 요청 방지
const globalCache: Map<string, {
  data: PagePermissions
  timestamp: number
  promise?: Promise<PagePermissions>
}> = new Map()

const CACHE_TTL = 30000 // 30초 캐시

export function usePagePermissions(options: UsePagePermissionsOptions = {}) {
  const [permissions, setPermissions] = useState<PagePermissions>(DEFAULT_PERMISSIONS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const cacheKey = options.orgSlug || '__default__'

  const fetchPermissions = useCallback(async (forceRefresh = false) => {
    const now = Date.now()
    const cached = globalCache.get(cacheKey)

    // 캐시가 유효하면 캐시 데이터 사용
    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_TTL) {
      if (mountedRef.current) {
        setPermissions(cached.data)
        setLoading(false)
      }
      return cached.data
    }

    // 이미 진행 중인 요청이 있으면 해당 Promise 재사용
    if (cached?.promise) {
      try {
        const data = await cached.promise
        if (mountedRef.current) {
          setPermissions(data)
          setLoading(false)
        }
        return data
      } catch {
        // 실패 시 새로운 요청 시도
      }
    }

    // 새로운 요청 시작
    const fetchPromise = (async (): Promise<PagePermissions> => {
      const params = new URLSearchParams()
      if (options.orgSlug) params.set('orgSlug', options.orgSlug)

      const res = await fetch(`/api/settings/page-permissions?${params}`, {
        credentials: 'include'
      })

      if (!res.ok) {
        const data = await res.json() as PermissionsResponse
        throw new Error(data.error || '권한 조회 실패')
      }

      const data = await res.json() as PermissionsResponse
      // DB 데이터와 기본 권한 병합
      const merged = { ...DEFAULT_PERMISSIONS }
      if (data.permissions) {
        for (const [pageId, perm] of Object.entries(data.permissions)) {
          if (merged[pageId as PageId]) {
            merged[pageId as PageId] = perm as { manager: boolean; teacher: boolean }
          }
        }
      }
      return merged
    })()

    // 캐시에 Promise 저장 (다른 컴포넌트가 재사용할 수 있도록)
    globalCache.set(cacheKey, { data: DEFAULT_PERMISSIONS, timestamp: 0, promise: fetchPromise })

    try {
      if (mountedRef.current) {
        setLoading(true)
        setError(null)
      }

      const merged = await fetchPromise

      // 캐시 업데이트
      globalCache.set(cacheKey, { data: merged, timestamp: Date.now(), promise: undefined })

      if (mountedRef.current) {
        setPermissions(merged)
      }
      return merged
    } catch (err: any) {
      globalCache.delete(cacheKey)
      if (mountedRef.current) {
        setError(err.message)
        setPermissions(DEFAULT_PERMISSIONS)
      }
      console.error('[usePagePermissions] Error:', err)
      return DEFAULT_PERMISSIONS
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [options.orgSlug, cacheKey])

  useEffect(() => {
    mountedRef.current = true
    fetchPermissions()
    return () => { mountedRef.current = false }
  }, [fetchPermissions])

  const updatePermission = async (
    pageId: PageId,
    role: 'manager' | 'teacher',
    hasAccess: boolean
  ): Promise<boolean> => {
    try {
      const updatedPermissions = {
        ...permissions,
        [pageId]: {
          ...permissions[pageId],
          [role]: hasAccess
        }
      }

      const res = await fetch('/api/settings/page-permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ permissions: { [pageId]: updatedPermissions[pageId] } })
      })

      if (!res.ok) {
        const result = await res.json() as PermissionsResponse
        throw new Error(result.error || '권한 수정 실패')
      }

      // 캐시 업데이트
      globalCache.set(cacheKey, { data: updatedPermissions, timestamp: Date.now(), promise: undefined })
      setPermissions(updatedPermissions)
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    }
  }

  const saveAllPermissions = async (newPermissions: PagePermissions): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings/page-permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ permissions: newPermissions })
      })

      if (!res.ok) {
        const result = await res.json() as PermissionsResponse
        throw new Error(result.error || '권한 저장 실패')
      }

      // 캐시 업데이트
      globalCache.set(cacheKey, { data: newPermissions, timestamp: Date.now(), promise: undefined })
      setPermissions(newPermissions)
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    }
  }

  const canAccessPage = (pageId: PageId, userRole: UserRole): boolean => {
    if (userRole === 'owner') return true

    const pagePermission = permissions[pageId]
    if (!pagePermission) return false

    if (userRole === 'manager') return pagePermission.manager
    if (userRole === 'teacher') return pagePermission.teacher

    return false
  }

  const resetPermissions = async (): Promise<boolean> => {
    return saveAllPermissions(DEFAULT_PERMISSIONS)
  }

  return {
    permissions,
    loading,
    error,
    refetch: fetchPermissions,
    updatePermission,
    saveAllPermissions,
    canAccessPage,
    resetPermissions
  }
}
