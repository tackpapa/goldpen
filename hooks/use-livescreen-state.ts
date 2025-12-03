import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LiveScreenState, SleepRecord, OutingRecord } from '@/lib/types/database'

export function useLivescreenState(studentId: string, seatNumber: number, orgId: string | null) {
  const [state, setState] = useState<LiveScreenState>({
    student_id: studentId,
    seat_number: seatNumber,
    date: new Date().toISOString().split('T')[0],
    sleep_count: 0,
    is_out: false,
    timer_running: false,
  })
  const [currentSleep, setCurrentSleep] = useState<SleepRecord | null>(null)
  const [currentOuting, setCurrentOuting] = useState<OutingRecord | null>(null)
  const [loading, setLoading] = useState(true)

  // Memoize supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), [])
  const today = new Date().toISOString().split('T')[0]

  // Load initial state
  useEffect(() => {
    if (!studentId || !orgId) return // Skip if no studentId
    loadState()
  }, [studentId, orgId, seatNumber])

  // Subscribe to realtime changes
  useEffect(() => {
    if (!studentId || !orgId) return // Skip if no studentId

    // Subscribe to livescreen_state changes (org 스코프)
    const stateChannel = supabase
      .channel(`livescreen-state-${studentId}-${seatNumber}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'livescreen_state',
          filter: `student_id=eq.${studentId},org_id=eq.${orgId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            setState(payload.new as LiveScreenState)
          }
        }
      )
      .subscribe()

    // Subscribe to sleep_records changes (org 스코프)
    const sleepChannel = supabase
      .channel(`sleep-${studentId}-${seatNumber}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sleep_records',
          filter: `student_id=eq.${studentId},org_id=eq.${orgId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as SleepRecord
            if (record.status === 'sleeping' && record.date === today) {
              setCurrentSleep(record)
            } else if (record.status === 'awake') {
              setCurrentSleep(null)
            }
          }
        }
      )
      .subscribe()

    // Subscribe to outing_records changes (org 스코프)
    const outingChannel = supabase
      .channel(`outing-${studentId}-${seatNumber}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'outing_records',
          filter: `student_id=eq.${studentId},org_id=eq.${orgId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as OutingRecord
            if (record.status === 'out' && record.date === today) {
              setCurrentOuting(record)
            } else if (record.status === 'returned') {
              setCurrentOuting(null)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(stateChannel)
      supabase.removeChannel(sleepChannel)
      supabase.removeChannel(outingChannel)
    }
  }, [studentId, orgId, seatNumber, today])

  async function loadState() {
    try {
      setLoading(true)
      if (!studentId || !orgId) {
        setLoading(false)
        return
      }

      // Load livescreen state
      const { data: stateData, error: stateError } = await supabase
        .from('livescreen_state')
        .select('*')
        .eq('student_id', studentId)
        .eq('org_id', orgId)
        .eq('seat_number', seatNumber)
        .eq('date', today)
        .maybeSingle()

      if (stateError) throw stateError

      if (stateData) {
        setState(stateData as LiveScreenState)
      } else {
        // Create initial state
        const { data: newState, error: insertError } = await supabase
          .from('livescreen_state')
          .insert({
            student_id: studentId,
            org_id: orgId,
            seat_number: seatNumber,
            date: today,
            sleep_count: 0,
            is_out: false,
            timer_running: false,
          })
          .select()
          .single()

        if (insertError) throw insertError
        if (newState) setState(newState as LiveScreenState)
      }

      // Load current sleep record
      const { data: sleepData } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('org_id', orgId)
        .eq('date', today)
        .eq('status', 'sleeping')
        .maybeSingle()

      if (sleepData) setCurrentSleep(sleepData as SleepRecord)

      // Load current outing record
      const { data: outingData } = await supabase
        .from('outing_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('org_id', orgId)
        .eq('date', today)
        .eq('status', 'out')
        .maybeSingle()

      if (outingData) setCurrentOuting(outingData as OutingRecord)
    } catch (error) {
      console.error('Error loading livescreen state:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateState(updates: Partial<LiveScreenState>) {
    try {
      const { error } = await supabase
        .from('livescreen_state')
        .update(updates)
        .eq('student_id', studentId)
        .eq('org_id', orgId)
        .eq('seat_number', seatNumber)
        .eq('date', today)

      if (error) throw error

      setState((prev) => ({ ...prev, ...updates }))
    } catch (error) {
      console.error('Error updating livescreen state:', error)
      throw error
    }
  }

  async function startSleep() {
    if (!studentId || !orgId) {
      console.error('❌ [SLEEP] Cannot start sleep: studentId is empty')
      throw new Error('studentId is required')
    }
    try {
      // 🔴 등원 상태인지 확인 (attendance_logs에 오늘 체크인이 있고 체크아웃이 없는 경우)
      const { data: checkinRecord } = await supabase
        .from('attendance_logs')
        .select('id')
        .eq('student_id', studentId)
        .eq('org_id', orgId)
        .gte('check_in_time', today)
        .is('check_out_time', null)
        .limit(1)
        .single()

      if (!checkinRecord) {
        console.error('❌ [SLEEP] Cannot start sleep: not checked in')
        throw new Error('등원 상태에서만 잠자기를 시작할 수 있습니다')
      }

      // Insert sleep record
      const { data: sleepRecord, error: sleepError } = await supabase
        .from('sleep_records')
        .insert({
          student_id: studentId,
          org_id: orgId,
          seat_number: seatNumber,
          date: today,
          sleep_time: new Date().toISOString(),
          status: 'sleeping',
        })
        .select()
        .single()

      if (sleepError) {
        console.error('❌ [SLEEP] Insert error:', sleepError)
        throw sleepError
      }


      // Update state
      await updateState({
        sleep_count: state.sleep_count + 1,
        current_sleep_id: sleepRecord.id,
      })

      setCurrentSleep(sleepRecord as SleepRecord)
    } catch (error) {
      console.error('Error starting sleep:', error)
      throw error
    }
  }

  async function endSleep() {
    try {
      if (!currentSleep) return

      const now = new Date()
      const sleepStart = new Date(currentSleep.sleep_time)
      const durationMinutes = Math.floor((now.getTime() - sleepStart.getTime()) / (1000 * 60))

      // Update sleep record
      const { error: updateError } = await supabase
        .from('sleep_records')
        .update({
          wake_time: now.toISOString(),
          duration_minutes: durationMinutes,
          status: 'awake',
        })
        .eq('id', currentSleep.id)
        .eq('org_id', orgId)

      if (updateError) throw updateError

      // Update state
      await updateState({
        current_sleep_id: undefined,
      })

      setCurrentSleep(null)
    } catch (error) {
      console.error('Error ending sleep:', error)
      throw error
    }
  }

  async function startOuting(reason: string) {
    if (!studentId || !orgId) {
      console.error('❌ [OUTING] Cannot start outing: studentId is empty')
      throw new Error('studentId is required')
    }
    try {
      // 🔴 등원 상태인지 확인 (attendance_logs에 오늘 체크인이 있고 체크아웃이 없는 경우)
      const { data: checkinRecord } = await supabase
        .from('attendance_logs')
        .select('id')
        .eq('student_id', studentId)
        .eq('org_id', orgId)
        .gte('check_in_time', today)
        .is('check_out_time', null)
        .limit(1)
        .single()

      if (!checkinRecord) {
        console.error('❌ [OUTING] Cannot start outing: not checked in')
        throw new Error('등원 상태에서만 외출할 수 있습니다')
      }

      // Insert outing record
      const { data: outingRecord, error: outingError } = await supabase
        .from('outing_records')
        .insert({
          student_id: studentId,
          org_id: orgId,
          seat_number: seatNumber,
          date: today,
          outing_time: new Date().toISOString(),
          reason,
          status: 'out',
        })
        .select()
        .single()

      if (outingError) throw outingError

      // Update state
      await updateState({
        is_out: true,
        current_outing_id: outingRecord.id,
      })

      setCurrentOuting(outingRecord as OutingRecord)

      // 알림 큐에 추가 (비동기 처리 - 100% 전달 보장)
      await supabase.from('notification_queue').insert({
        org_id: orgId,
        type: 'out',
        payload: { student_id: studentId, seat_number: seatNumber },
        status: 'pending'
      })
      console.log('[OUTING] Notification queued')
    } catch (error) {
      console.error('Error starting outing:', error)
      throw error
    }
  }

  async function endOuting() {
    try {
      if (!currentOuting) return

      const now = new Date()
      const outingStart = new Date(currentOuting.outing_time)
      const durationMinutes = Math.floor((now.getTime() - outingStart.getTime()) / (1000 * 60))

      // Update outing record
      const { error: updateError } = await supabase
        .from('outing_records')
        .update({
          return_time: now.toISOString(),
          duration_minutes: durationMinutes,
          status: 'returned',
        })
        .eq('id', currentOuting.id)
        .eq('org_id', orgId)

      if (updateError) throw updateError

      // Update state
      await updateState({
        is_out: false,
        current_outing_id: undefined,
      })

      setCurrentOuting(null)

      // 알림 큐에 추가 (비동기 처리 - 100% 전달 보장)
      await supabase.from('notification_queue').insert({
        org_id: orgId,
        type: 'return',
        payload: { student_id: studentId, seat_number: seatNumber },
        status: 'pending'
      })
      console.log('[RETURN] Notification queued')
    } catch (error) {
      console.error('Error ending outing:', error)
      throw error
    }
  }

  return {
    state,
    currentSleep,
    currentOuting,
    loading,
    updateState,
    startSleep,
    endSleep,
    startOuting,
    endOuting,
  }
}
