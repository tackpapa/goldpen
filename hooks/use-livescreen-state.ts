import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { LiveScreenState, SleepRecord, OutingRecord } from '@/lib/types/database'

export function useLivescreenState(studentId: string, seatNumber: number) {
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

  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]

  // Debug: 환경 변수 확인
  console.log('🔍 Environment variables:', {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...'
  })

  // Load initial state
  useEffect(() => {
    loadState()
  }, [studentId, seatNumber])

  // Subscribe to realtime changes
  useEffect(() => {
    // Subscribe to livescreen_state changes
    const stateChannel = supabase
      .channel(`livescreen-state-${studentId}-${seatNumber}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'livescreen_state',
          filter: `student_id=eq.${studentId}`,
        },
        (payload) => {
          if (payload.new && typeof payload.new === 'object') {
            setState(payload.new as LiveScreenState)
          }
        }
      )
      .subscribe()

    // Subscribe to sleep_records changes
    const sleepChannel = supabase
      .channel(`sleep-${studentId}-${seatNumber}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sleep_records',
          filter: `student_id=eq.${studentId}`,
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

    // Subscribe to outing_records changes
    const outingChannel = supabase
      .channel(`outing-${studentId}-${seatNumber}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'outing_records',
          filter: `student_id=eq.${studentId}`,
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
  }, [studentId, seatNumber, supabase, today])

  async function loadState() {
    try {
      setLoading(true)

      // Load livescreen state
      const { data: stateData, error: stateError } = await supabase
        .from('livescreen_state')
        .select('*')
        .eq('student_id', studentId)
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
        .eq('date', today)
        .eq('status', 'sleeping')
        .maybeSingle()

      if (sleepData) setCurrentSleep(sleepData as SleepRecord)

      // Load current outing record
      const { data: outingData } = await supabase
        .from('outing_records')
        .select('*')
        .eq('student_id', studentId)
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
    console.log('🛏️ startSleep called')
    try {
      // 임시로 2회 제한 제거
      // if (state.sleep_count >= 2) {
      //   throw new Error('오늘은 더 잘 수 없습니다')
      // }

      console.log('📝 Inserting sleep record...', { studentId, seatNumber, today })

      // Insert sleep record
      const { data: sleepRecord, error: sleepError } = await supabase
        .from('sleep_records')
        .insert({
          student_id: studentId,
          seat_number: seatNumber,
          date: today,
          sleep_time: new Date().toISOString(),
          status: 'sleeping',
        })
        .select()
        .single()

      if (sleepError) {
        console.error('❌ Sleep insert error:', sleepError)
        throw sleepError
      }

      console.log('✅ Sleep record inserted:', sleepRecord)

      // Update state
      await updateState({
        sleep_count: state.sleep_count + 1,
        current_sleep_id: sleepRecord.id,
      })

      console.log('✅ State updated')
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
    try {
      // Insert outing record
      const { data: outingRecord, error: outingError } = await supabase
        .from('outing_records')
        .insert({
          student_id: studentId,
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

      if (updateError) throw updateError

      // Update state
      await updateState({
        is_out: false,
        current_outing_id: undefined,
      })

      setCurrentOuting(null)
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
