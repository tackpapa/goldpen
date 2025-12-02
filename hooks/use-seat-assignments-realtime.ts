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
  seatsremainingtime: number | null
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
        .select('*, students(id, name, grade, seatsremainingtime)')
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
          seatsremainingtime: record.students?.seatsremainingtime ?? null,
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

    if (!orgId) {
      setState({ assignments: new Map(), loading: false })
      return
    }

    // 초기 로드
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

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as any

            // 학생 정보 가져오기 (RLS로 인해 실패할 수 있음)
            let studentName: string | null = null
            let studentGrade: string | null = null
            let studentRemainingMinutes: number | null = null
            let studentFetched = false

            if (record.student_id) {
              const { data: student } = await supabase
                .from('students')
                .select('name, grade, seatsremainingtime')
                .eq('id', record.student_id)
                .maybeSingle()  // RLS 차단 시에도 null 반환 (406 방지)

              if (student) {
                studentName = student.name
                studentGrade = student.grade
                studentRemainingMinutes = (student as any).seatsremainingtime ?? null
                studentFetched = true
              }
            }

            // state 업데이트: student 정보를 못 가져오면 기존 값 유지
            setState((prev) => {
              const existing = prev.assignments.get(record.seat_number)

              const assignment: SeatAssignment = {
                id: record.id,
                org_id: record.org_id,
                seat_number: record.seat_number,
                student_id: record.student_id,
                // student 정보: 새로 가져왔으면 사용, 아니면 기존 값 유지
                student_name: studentFetched ? studentName : (existing?.student_name || null),
                student_grade: studentFetched ? studentGrade : (existing?.student_grade || null),
                status: record.status,
                check_in_time: record.check_in_time,
                session_start_time: record.session_start_time,
                seatsremainingtime: studentFetched ? studentRemainingMinutes : (existing?.seatsremainingtime ?? null),
              }

              const newMap = new Map(prev.assignments)
              newMap.set(record.seat_number, assignment)
              return { ...prev, assignments: newMap }
            })
          } else if (payload.eventType === 'DELETE') {
            const record = payload.old as any

            setState((prev) => {
              const newMap = new Map(prev.assignments)
              newMap.delete(record.seat_number)
              return { ...prev, assignments: newMap }
            })
          }
        }
      )
      .subscribe((status) => {
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
