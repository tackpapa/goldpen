'use client'

import { useState, useEffect, useCallback } from 'react'
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

export function useMenuSettings(options: UseMenuSettingsOptions = {}) {
  const [settings, setSettings] = useState<MenuSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

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
      const mapped = (data.settings || []).map((s) => ({
        menuId: s.menu_id,
        isEnabled: s.is_enabled,
        displayOrder: s.display_order
      }))
      setSettings(mapped)
    } catch (err: any) {
      setError(err.message)
      console.error('[useMenuSettings] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [options.orgSlug])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const saveSettings = async (
    enabledMenus: string[],
    menuOrder: string[]
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings/menu-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabledMenus, menuOrder })
      })

      if (!res.ok) {
        const result = await res.json() as MenuSettingsResponse
        throw new Error(result.error || '메뉴 설정 저장 실패')
      }

      await fetchSettings()
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
