'use client'

import { useState, useEffect, useCallback } from 'react'

export interface TeacherModalData {
  teacher: any
  classes: any[]
  students: any[]
}

interface UseTeacherModalDataReturn {
  data: TeacherModalData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useTeacherModalData(teacherId: string | null): UseTeacherModalDataReturn {
  const [data, setData] = useState<TeacherModalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!teacherId) {
      setData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/teachers/${teacherId}/modal`, { credentials: 'include' })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const result = await response.json()
      if (result.error) throw new Error(result.error)
      setData(result)
    } catch (err) {
      console.error('Failed to fetch teacher modal data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [teacherId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
