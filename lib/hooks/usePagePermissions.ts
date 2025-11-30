'use client'

import { useState, useEffect, useCallback } from 'react'
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

export function usePagePermissions(options: UsePagePermissionsOptions = {}) {
  const [permissions, setPermissions] = useState<PagePermissions>(DEFAULT_PERMISSIONS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

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
      setPermissions(merged)
    } catch (err: any) {
      setError(err.message)
      console.error('[usePagePermissions] Error:', err)
      // 에러 시 기본 권한 사용
      setPermissions(DEFAULT_PERMISSIONS)
    } finally {
      setLoading(false)
    }
  }, [options.orgSlug])

  useEffect(() => {
    fetchPermissions()
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
