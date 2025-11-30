'use client'

import { useState, useEffect, useCallback } from 'react'
import { availableWidgets, type Widget } from '@/lib/config/widgets'

interface WidgetSetting {
  widgetId: string
  isEnabled: boolean
  displayOrder: number
}

interface UseWidgetSettingsOptions {
  orgSlug?: string
}

// API Response types
interface WidgetSettingsResponse {
  settings?: Array<{
    widget_id: string
    is_enabled: boolean
    display_order: number
  }>
  success?: boolean
  error?: string
}

export function useWidgetSettings(options: UseWidgetSettingsOptions = {}) {
  const [settings, setSettings] = useState<WidgetSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (options.orgSlug) params.set('orgSlug', options.orgSlug)

      const res = await fetch(`/api/settings/widget-settings?${params}`, {
        credentials: 'include'
      })

      if (!res.ok) {
        const data = await res.json() as WidgetSettingsResponse
        throw new Error(data.error || '위젯 설정 조회 실패')
      }

      const data = await res.json() as WidgetSettingsResponse
      const mapped = (data.settings || []).map((s) => ({
        widgetId: s.widget_id,
        isEnabled: s.is_enabled,
        displayOrder: s.display_order
      }))
      setSettings(mapped)
    } catch (err: any) {
      setError(err.message)
      console.error('[useWidgetSettings] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [options.orgSlug])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const saveSettings = async (widgets: Widget[]): Promise<boolean> => {
    try {
      const res = await fetch('/api/settings/widget-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ widgets })
      })

      if (!res.ok) {
        const result = await res.json() as WidgetSettingsResponse
        throw new Error(result.error || '위젯 설정 저장 실패')
      }

      await fetchSettings()
      return true
    } catch (err: any) {
      setError(err.message)
      return false
    }
  }

  // DB 설정과 availableWidgets 병합
  const getWidgetsConfig = useCallback((): Widget[] => {
    if (settings.length === 0) {
      return availableWidgets
    }

    return availableWidgets.map(widget => {
      const saved = settings.find(s => s.widgetId === widget.id)
      if (saved) {
        return {
          ...widget,
          enabled: saved.isEnabled,
          order: saved.displayOrder
        }
      }
      return widget
    }).sort((a, b) => a.order - b.order)
  }, [settings])

  // 활성화된 위젯만
  const getEnabledWidgets = useCallback((): Widget[] => {
    return getWidgetsConfig()
      .filter(w => w.enabled)
      .sort((a, b) => a.order - b.order)
  }, [getWidgetsConfig])

  return {
    settings,
    loading,
    error,
    refetch: fetchSettings,
    saveSettings,
    getWidgetsConfig,
    getEnabledWidgets
  }
}
