import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SleepRecord, OutingRecord } from '@/lib/types/database'

interface AllSeatsRealtimeStatus {
  sleepRecords: Map<string, SleepRecord> // studentId -> SleepRecord
  outingRecords: Map<string, OutingRecord> // studentId -> OutingRecord
  loading: boolean
}

/**
 * 모든 좌석의 Realtime 상태를 2개 채널로 관리
 * (기존: 좌석당 2채널 → 신규: 전체 테이블당 1채널)
 */
export function useAllSeatsRealtime(studentIds: string[]) {
  const [status, setStatus] = useState<AllSeatsRealtimeStatus>({
    sleepRecords: new Map(),
    outingRecords: new Map(),
    loading: true,
  })

  const supabase = useMemo(() => createClient(), [])
  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (studentIds.length === 0) {
      setStatus({ sleepRecords: new Map(), outingRecords: new Map(), loading: false })
      return
    }

    async function loadAllStatus() {
      try {
        setStatus((prev) => ({ ...prev, loading: true }))

        console.log('🔍 [AllSeatsRealtime] Loading status for studentIds:', studentIds)
        console.log('🔍 [AllSeatsRealtime] Today:', today)

        // Load all sleep records at once
        const { data: sleepData, error: sleepError } = await supabase
          .from('sleep_records')
          .select('*')
          .in('student_id', studentIds)
          .eq('date', today)
          .eq('status', 'sleeping')

        // Load all outing records at once
        const { data: outingData, error: outingError } = await supabase
          .from('outing_records')
          .select('*')
          .in('student_id', studentIds)
          .eq('date', today)
          .eq('status', 'out')

        console.log('🔍 [AllSeatsRealtime] Sleep data:', sleepData, 'Error:', sleepError)
        console.log('🔍 [AllSeatsRealtime] Outing data:', outingData, 'Error:', outingError)

        const sleepMap = new Map<string, SleepRecord>()
        sleepData?.forEach((record) => {
          sleepMap.set(record.student_id, record as SleepRecord)
        })

        const outingMap = new Map<string, OutingRecord>()
        outingData?.forEach((record) => {
          outingMap.set(record.student_id, record as OutingRecord)
        })

        console.log('🔍 [AllSeatsRealtime] Final maps - Sleep:', sleepMap.size, 'Outing:', outingMap.size)

        setStatus({
          sleepRecords: sleepMap,
          outingRecords: outingMap,
          loading: false,
        })
      } catch (error) {
        console.error('Error loading all seats status:', error)
        setStatus((prev) => ({ ...prev, loading: false }))
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
        },
        async (payload) => {
          console.log('💤 Sleep record changed:', payload)
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as SleepRecord
            // Filter client-side
            if (studentIds.includes(record.student_id) && record.date === today) {
              if (record.status === 'sleeping') {
                console.log('😴 Student is sleeping:', record.student_id)
                setStatus((prev) => {
                  const newMap = new Map(prev.sleepRecords)
                  newMap.set(record.student_id, record)
                  return { ...prev, sleepRecords: newMap }
                })
              } else if (record.status === 'awake') {
                console.log('😃 Student woke up:', record.student_id)
                setStatus((prev) => {
                  const newMap = new Map(prev.sleepRecords)
                  newMap.delete(record.student_id)
                  return { ...prev, sleepRecords: newMap }
                })
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const record = payload.old as SleepRecord
            setStatus((prev) => {
              const newMap = new Map(prev.sleepRecords)
              newMap.delete(record.student_id)
              return { ...prev, sleepRecords: newMap }
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 [All Seats] Sleep channel status:', status)
      })

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
        },
        async (payload) => {
          console.log('🚪 Outing record changed:', payload)
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as OutingRecord
            // Filter client-side
            if (studentIds.includes(record.student_id) && record.date === today) {
              if (record.status === 'out') {
                console.log('🏃 Student is out:', record.student_id)
                setStatus((prev) => {
                  const newMap = new Map(prev.outingRecords)
                  newMap.set(record.student_id, record)
                  return { ...prev, outingRecords: newMap }
                })
              } else if (record.status === 'returned') {
                console.log('🏠 Student returned:', record.student_id)
                setStatus((prev) => {
                  const newMap = new Map(prev.outingRecords)
                  newMap.delete(record.student_id)
                  return { ...prev, outingRecords: newMap }
                })
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const record = payload.old as OutingRecord
            setStatus((prev) => {
              const newMap = new Map(prev.outingRecords)
              newMap.delete(record.student_id)
              return { ...prev, outingRecords: newMap }
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 [All Seats] Outing channel status:', status)
      })

    return () => {
      supabase.removeChannel(sleepChannel)
      supabase.removeChannel(outingChannel)
    }
  }, [studentIds.join(','), today])

  return status
}
