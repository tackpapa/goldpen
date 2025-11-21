import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface SeatAssignment {
  id: string
  org_id: string
  seat_number: number
  student_id: string
  student_name: string | null
  student_grade: string | null
  status: 'checked_in' | 'checked_out' | 'vacant'
  check_in_time: string | null
  session_start_time: string | null
  remaining_minutes: number | null
}

interface SeatAssignmentsRealtimeState {
  assignments: Map<number, SeatAssignment> // seat_number -> SeatAssignment
  loading: boolean
}

/**
 * seat_assignments 테이블의 Realtime 구독
 * Live Attendance 페이지에서 등원 처리 시 실시간 반영
 */
export function useSeatAssignmentsRealtime(orgId: string | null) {
  const [state, setState] = useState<SeatAssignmentsRealtimeState>({
    assignments: new Map(),
    loading: true,
  })

  const supabase = useMemo(() => createClient(), [])

  // 초기 데이터 로드
  const loadAssignments = useCallback(async () => {
    if (!orgId) {
      setState({ assignments: new Map(), loading: false })
      return
    }

    try {
      setState((prev) => ({ ...prev, loading: true }))

      const { data, error } = await supabase
        .from('seat_assignments')
        .select('*, students(id, name, grade, remaining_minutes)')
        .eq('org_id', orgId)
        .order('seat_number', { ascending: true })

      if (error) {
        console.error('[SeatAssignments Realtime] Load error:', error)
        setState((prev) => ({ ...prev, loading: false }))
        return
      }

      const assignmentsMap = new Map<number, SeatAssignment>()
      data?.forEach((record: any) => {
        assignmentsMap.set(record.seat_number, {
          id: record.id,
          org_id: record.org_id,
          seat_number: record.seat_number,
          student_id: record.student_id,
          student_name: record.students?.name || null,
          student_grade: record.students?.grade || null,
          status: record.status,
          check_in_time: record.check_in_time,
          session_start_time: record.session_start_time || null,
          remaining_minutes: record.students?.remaining_minutes ?? null,
        })
      })

      setState({
        assignments: assignmentsMap,
        loading: false,
      })
    } catch (error) {
      console.error('[SeatAssignments Realtime] Unexpected error:', error)
      setState((prev) => ({ ...prev, loading: false }))
    }
  }, [orgId, supabase])

  useEffect(() => {
    console.log('🔍 [SeatAssignments] useEffect triggered, orgId:', orgId)

    if (!orgId) {
      console.log('⚠️ [SeatAssignments] No orgId, skipping subscription')
      setState({ assignments: new Map(), loading: false })
      return
    }

    // 초기 로드
    console.log('📥 [SeatAssignments] Loading initial assignments...')
    loadAssignments()

    // Realtime 구독
    const channel = supabase
      .channel('seat-assignments-realtime', {
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
          table: 'seat_assignments',
          filter: `org_id=eq.${orgId}`,
        },
        async (payload) => {
          console.log('🪑 Seat assignment changed:', payload)

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as any

            // 학생 정보 가져오기
            let studentName = null
            let studentGrade = null

            let studentRemainingMinutes: number | null = null

            if (record.student_id) {
              const { data: student } = await supabase
                .from('students')
                .select('name, grade, remaining_minutes')
                .eq('id', record.student_id)
                .single()

              if (student) {
                studentName = student.name
                studentGrade = student.grade
                studentRemainingMinutes = student.remaining_minutes
              }
            }

            const assignment: SeatAssignment = {
              id: record.id,
              org_id: record.org_id,
              seat_number: record.seat_number,
              student_id: record.student_id,
              student_name: studentName,
              student_grade: studentGrade,
              status: record.status,
              check_in_time: record.check_in_time,
              session_start_time: record.session_start_time,
              remaining_minutes: studentRemainingMinutes,
            }

            console.log('✅ Seat assignment updated:', assignment)

            setState((prev) => {
              const newMap = new Map(prev.assignments)
              newMap.set(record.seat_number, assignment)
              return { ...prev, assignments: newMap }
            })
          } else if (payload.eventType === 'DELETE') {
            const record = payload.old as any
            console.log('🗑️ Seat assignment deleted:', record.seat_number)

            setState((prev) => {
              const newMap = new Map(prev.assignments)
              newMap.delete(record.seat_number)
              return { ...prev, assignments: newMap }
            })
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 [SeatAssignments] Realtime channel status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [orgId, supabase, loadAssignments])

  return {
    ...state,
    reload: loadAssignments,
  }
}
