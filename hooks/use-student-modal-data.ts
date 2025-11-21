'use client'

import { useState, useEffect, useCallback } from 'react'

export interface StudentModalData {
  student: any
  subscriptions: any[]
  activeSubscription: any | null
  services: any[]
  enrollments: any[]
  schedules: any[]
  attendance: any[]
  payments: any[]
  credits: any[]
  creditUsages: any[]
  passes: any[]
  activePass: any | null
  usages: any[]
}

interface UseStudentModalDataReturn {
  data: StudentModalData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useStudentModalData(
  studentId: string | null
): UseStudentModalDataReturn {
  const [data, setData] = useState<StudentModalData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!studentId) {
      setData(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/students/${studentId}/modal`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(result.error)
      }

      setData(result)
    } catch (err) {
      console.error('Failed to fetch student modal data:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [studentId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
  }
}
