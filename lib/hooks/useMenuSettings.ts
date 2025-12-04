'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { navigationItems, type NavigationItem } from '@/lib/config/navigation'

interface MenuSetting {
  menuId: string
  isEnabled: boolean
  displayOrder: number
}

interface UseMenuSettingsOptions {
  orgSlug?: string
}

// API Response types
interface MenuSettingsResponse {
  settings?: Array<{
    menu_id: string
    is_enabled: boolean
    display_order: number
  }>
  success?: boolean
  error?: string
}

// 글로벌 캐시: 동일 slug에 대한 중복 요청 방지
const globalCache: Map<string, {
  data: MenuSetting[]
  timestamp: number
  promise?: Promise<MenuSetting[]>
}> = new Map()

const CACHE_TTL = 30000 // 30초 캐시

export function useMenuSettings(options: UseMenuSettingsOptions = {}) {
  const [settings, setSettings] = useState<MenuSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)

  const cacheKey = options.orgSlug || '__default__'

  const fetchSettings = useCallback(async (forceRefresh = false) => {
    const now = Date.now()
    const cached = globalCache.get(cacheKey)

    // 캐시가 유효하면 캐시 데이터 사용
    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_TTL) {
      if (mountedRef.current) {
        setSettings(cached.data)
        setLoading(false)
      }
      return cached.data
    }

    // 이미 진행 중인 요청이 있으면 해당 Promise 재사용
    if (cached?.promise) {
      try {
        const data = await cached.promise
        if (mountedRef.current) {
          setSettings(data)
          setLoading(false)
        }
        return data
      } catch {
        // 실패 시 새로운 요청 시도
      }
    }

    // 새로운 요청 시작
    const fetchPromise = (async (): Promise<MenuSetting[]> => {
      const params = new URLSearchParams()
      if (options.orgSlug) params.set('orgSlug', options.orgSlug)

      const res = await fetch(`/api/settings/menu-settings?${params}`, {
        credentials: 'include'
      })

      if (!res.ok) {
        const data = await res.json() as MenuSettingsResponse
        throw new Error(data.error || '메뉴 설정 조회 실패')
      }

      const data = await res.json() as MenuSettingsResponse
      return (data.settings || []).map((s) => ({
        menuId: s.menu_id,
        isEnabled: s.is_enabled,
        displayOrder: s.display_order
      }))
    })()

    // 캐시에 Promise 저장 (다른 컴포넌트가 재사용할 수 있도록)
    globalCache.set(cacheKey, { data: [], timestamp: 0, promise: fetchPromise })

    try {
      if (mountedRef.current) {
        setLoading(true)
        setError(null)
      }

      const mapped = await fetchPromise

      // 캐시 업데이트
      globalCache.set(cacheKey, { data: mapped, timestamp: Date.now(), promise: undefined })

      if (mountedRef.current) {
        setSettings(mapped)
      }
      return mapped
    } catch (err: any) {
      globalCache.delete(cacheKey)
      if (mountedRef.current) {
        setError(err.message)
      }
      console.error('[useMenuSettings] Error:', err)
      return []
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [options.orgSlug, cacheKey])

  useEffect(() => {
    mountedRef.current = true
    fetchSettings()
    return () => { mountedRef.current = false }
  }, [fetchSettings])

  const saveSettings = async (
    enabledMenus: string[],
    menuOrder: string[]
  ): Promise<boolean> => {
    try {
      const params = new URLSearchParams()
      if (options.orgSlug) params.set('orgSlug', options.orgSlug)

      const res = await fetch(`/api/settings/menu-settings?${params}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabledMenus, menuOrder })
      })

      if (!res.ok) {
        const result = await res.json() as MenuSettingsResponse
        throw new Error(result.error || '메뉴 설정 저장 실패')
      }

      // 캐시 무효화 후 새로 로드
      globalCache.delete(cacheKey)
      await fetchSettings(true)
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    }
  }

  // 활성화된 메뉴 ID 목록
  const getEnabledMenuIds = (): string[] => {
    if (settings.length === 0) {
      return navigationItems.map(item => item.id)
    }
    return settings.filter(s => s.isEnabled).map(s => s.menuId)
  }

  // 메뉴 순서
  const getMenuOrder = (): string[] => {
    if (settings.length === 0) {
      return navigationItems.map(item => item.id)
    }
    return [...settings]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(s => s.menuId)
  }

  // 정렬된 네비게이션 아이템
  const getFilteredNavigation = useCallback((institutionName?: string): NavigationItem[] => {
    const enabledIds = settings.length === 0
      ? navigationItems.map(item => item.id)
      : settings.filter(s => s.isEnabled).map(s => s.menuId)

    const menuOrder = settings.length === 0
      ? navigationItems.map(item => item.id)
      : [...settings].sort((a, b) => a.displayOrder - b.displayOrder).map(s => s.menuId)

    // 순서대로 정렬
    const orderedItems = menuOrder
      .map(id => navigationItems.find(item => item.id === id))
      .filter((item): item is NavigationItem => item !== undefined)

    // 순서에 없는 새 항목 추가
    const orderedIds = new Set(menuOrder)
    const newItems = navigationItems.filter(item => !orderedIds.has(item.id))

    const allItems = [...orderedItems, ...newItems]
    const filteredItems = allItems.filter(item => enabledIds.includes(item.id))

    // institution prefix 추가
    const institution = institutionName || 'goldpen'
    return filteredItems.map(item => ({
      ...item,
      href: `/${institution}${item.href}`
    }))
  }, [settings])

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    saveSettings,
    getEnabledMenuIds,
    getMenuOrder,
    getFilteredNavigation
  }
}
