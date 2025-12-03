import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SleepRecord, OutingRecord } from '@/lib/types/database'

interface AllSeatsRealtimeResult {
  sleepRecords: Map<string, SleepRecord> // studentId -> SleepRecord
  outingRecords: Map<string, OutingRecord> // studentId -> OutingRecord
  loading: boolean
  clearOutingRecord: (studentId: string) => void // 하원 시 즉시 UI 업데이트용
  clearSleepRecord: (studentId: string) => void // 잠자기 종료 시 즉시 UI 업데이트용
}

/**
 * 모든 좌석의 Realtime 상태를 2개 채널로 관리
 * (기존: 좌석당 2채널 → 신규: 전체 테이블당 1채널)
 * @param studentIds - 학생 ID 목록
 * @param orgId - 조직 ID (필수, 상위 컴포넌트에서 전달)
 */
export function useAllSeatsRealtime(studentIds: string[], orgId: string | null = null): AllSeatsRealtimeResult {
  const [sleepRecords, setSleepRecords] = useState<Map<string, SleepRecord>>(new Map())
  const [outingRecords, setOutingRecords] = useState<Map<string, OutingRecord>>(new Map())
  const [loading, setLoading] = useState(true)

  const supabase = useMemo(() => createClient(), [])
  // 🔴 KST 기준으로 오늘 날짜 계산 (UTC+9)
  const today = useMemo(() => {
    const now = new Date()
    const kstOffset = 9 * 60 * 60 * 1000
    const kstDate = new Date(now.getTime() + kstOffset)
    return kstDate.toISOString().split('T')[0]
  }, [])

  // Handle empty state
  useEffect(() => {
    if (studentIds.length === 0 || !orgId) {
      setSleepRecords(new Map())
      setOutingRecords(new Map())
      setLoading(false)
    }
  }, [studentIds.length, orgId])

  // 🔴 수동으로 외출 기록 삭제 (하원 시 즉시 UI 업데이트용)
  const clearOutingRecord = (studentId: string) => {
    setOutingRecords((prev) => {
      const newMap = new Map(prev)
      newMap.delete(studentId)
      return newMap
    })
  }

  // 🔴 수동으로 잠자기 기록 삭제 (잠자기 종료 시 즉시 UI 업데이트용)
  const clearSleepRecord = (studentId: string) => {
    setSleepRecords((prev) => {
      const newMap = new Map(prev)
      newMap.delete(studentId)
      return newMap
    })
  }

  useEffect(() => {
    if (studentIds.length === 0) return
    if (!orgId) return

    async function loadAllStatus() {
      try {
        setLoading(true)

        // Load all sleep records at once
        const { data: sleepData } = await supabase
          .from('sleep_records')
          .select('*')
          .in('student_id', studentIds)
          .eq('org_id', orgId)
          .eq('date', today)
          .eq('status', 'sleeping')

        // Load all outing records at once
        const { data: outingData } = await supabase
          .from('outing_records')
          .select('*')
          .in('student_id', studentIds)
          .eq('org_id', orgId)
          .eq('date', today)
          .eq('status', 'out')

        const sleepMap = new Map<string, SleepRecord>()
        sleepData?.forEach((record) => {
          sleepMap.set(record.student_id, record as SleepRecord)
        })

        const outingMap = new Map<string, OutingRecord>()
        outingData?.forEach((record) => {
          outingMap.set(record.student_id, record as OutingRecord)
        })

        setSleepRecords(sleepMap)
        setOutingRecords(outingMap)
        setLoading(false)
      } catch (error) {
        console.error('Error loading all seats status:', error)
        setLoading(false)
      }
    }

    loadAllStatus()

    // Subscribe to ALL sleep_records changes (single channel)
    const sleepChannel = supabase
      .channel('all-sleep-records', {
        config: {
          broadcast: { self: true },
          presence: { key: '' },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sleep_records',
          filter: `org_id=eq.${orgId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as SleepRecord
            // Filter client-side
            if (studentIds.includes(record.student_id) && record.date === today) {
              if (record.status === 'sleeping') {
                setSleepRecords((prev) => {
                  const newMap = new Map(prev)
                  newMap.set(record.student_id, record)
                  return newMap
                })
              } else if (record.status === 'awake') {
                setSleepRecords((prev) => {
                  const newMap = new Map(prev)
                  newMap.delete(record.student_id)
                  return newMap
                })
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const record = payload.old as SleepRecord
            setSleepRecords((prev) => {
              const newMap = new Map(prev)
              newMap.delete(record.student_id)
              return newMap
            })
          }
        }
      )
      .subscribe()

    // Subscribe to ALL outing_records changes (single channel)
    const outingChannel = supabase
      .channel('all-outing-records', {
        config: {
          broadcast: { self: true },
          presence: { key: '' },
        },
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'outing_records',
          filter: `org_id=eq.${orgId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as OutingRecord
            // Filter client-side
            if (studentIds.includes(record.student_id) && record.date === today) {
              if (record.status === 'out') {
                setOutingRecords((prev) => {
                  const newMap = new Map(prev)
                  newMap.set(record.student_id, record)
                  return newMap
                })
              } else if (record.status === 'returned') {
                setOutingRecords((prev) => {
                  const newMap = new Map(prev)
                  newMap.delete(record.student_id)
                  return newMap
                })
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const record = payload.old as OutingRecord
            setOutingRecords((prev) => {
              const newMap = new Map(prev)
              newMap.delete(record.student_id)
              return newMap
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(sleepChannel)
      supabase.removeChannel(outingChannel)
    }
  }, [studentIds.join(','), today, orgId])

  return {
    sleepRecords,
    outingRecords,
    loading,
    clearOutingRecord,
    clearSleepRecord,
  }
}
