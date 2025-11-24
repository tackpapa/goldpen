'use client'

export const runtime = 'edge'


import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { usePageAccess } from '@/hooks/use-page-access'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle, XCircle, Clock, User, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Attendance } from '@/lib/types/database'
import { addDays, format } from 'date-fns'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'


// Type definitions
type AttendanceStatus = 'scheduled' | 'present' | 'late' | 'absent' | 'excused'

interface SeatInfo {
  seatNumber: number | null
  checkInTime: string | null
  sessionStartTime: string | null
  status: string | null
  updatedAt: string | null
  grade: string | number | null
}

interface TodayStudentClass {
  id: string | null              // attendance record id (null or pending if 아직 없음)
  class_id: string
  class_name: string
  teacher_name: string
  scheduled_time: string
  status: AttendanceStatus
}

interface TodayStudent {
  student_id: string
  student_name: string
  classes: TodayStudentClass[]
  // 집계용 상태(가장 높은 우선순위)
  status: AttendanceStatus
}

interface WeeklyStatItem {
  date: string
  present: number
  late: number
  absent: number
  excused: number
}

interface MonthlyTrendItem {
  date: string
  present: number
  late: number
  absent: number
  excused: number
}

export default function AttendancePage() {
  usePageAccess('seatsattendance')

  const { toast } = useToast()
  const params = useParams()
  const institutionName = params.institutionname as string
  const [todayAttendance, setTodayAttendance] = useState<TodayStudent[]>([])
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([])
  const [seatMap, setSeatMap] = useState<Record<string, SeatInfo>>({})
  const [seatNameMap, setSeatNameMap] = useState<Record<string, SeatInfo>>({})
  const [rawAssignments, setRawAssignments] = useState<any[]>([])
  const [dailyLogs, setDailyLogs] = useState<Array<{ student_id: string; check_in_time: string | null; check_out_time: string | null }>>([])

  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [historySentinel, setHistorySentinel] = useState<HTMLDivElement | null>(null)
  const HISTORY_PAGE_SIZE = 20
  const TODAY_PAGE_SIZE = 15
  const [todayPage, setTodayPage] = useState(1)
  const todayLoadMoreRef = useRef<HTMLDivElement | null>(null)
  const [isLoadingMoreToday, setIsLoadingMoreToday] = useState(false)
  const statusPriority: Record<AttendanceStatus, number> = {
    absent: 0,
    late: 1,
    present: 2,
    excused: 3,
    scheduled: 4,
  }

  const formatSelectedDateLabel = useCallback((dateStr: string) => {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return ''
    return format(d, 'yyyy년 MM월 dd일 (eee)')
  }, [])

  // 등하원 일정 모달 상태
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [scheduleTarget, setScheduleTarget] = useState<{ id: string; name: string } | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [commuteSchedules, setCommuteSchedules] = useState<
    Array<{ id?: string; weekday: string; check_in_time: string | null; check_out_time: string | null; notes?: string | null }>
  >([])

  const shiftDate = useCallback((delta: number) => {
    const next = addDays(new Date(selectedDate), delta)
    const nextStr = format(next, 'yyyy-MM-dd')
    setSelectedDate(nextStr)
    setHasMore(true)
    setIsLoadingMore(false)
    setPage(0)
    setTodayPage(1)
    setAttendanceHistory([])
    setTodayAttendance([])
  }, [selectedDate])

  const resetToToday = useCallback(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd')
    if (todayStr === selectedDate) return
    setSelectedDate(todayStr)
    setHasMore(true)
    setIsLoadingMore(false)
    setPage(0)
    setTodayPage(1)
    setAttendanceHistory([])
    setTodayAttendance([])
  }, [selectedDate])

  const weekdayKo = {
    monday: '월요일',
    tuesday: '화요일',
    wednesday: '수요일',
    thursday: '목요일',
    friday: '금요일',
    saturday: '토요일',
    sunday: '일요일',
  } as const

  const fetchCommuteSchedules = useCallback(async (studentId: string, studentName: string) => {
    setScheduleTarget({ id: studentId, name: studentName })
    setScheduleModalOpen(true)
    setScheduleLoading(true)
    setScheduleError(null)
    try {
      // dev 환경에서는 service=1 + demo org로 강제 조회 (RLS 우회)
      const devQs = process.env.NODE_ENV !== 'production'
        ? `?service=1&org_id=dddd0000-0000-0000-0000-000000000000`
        : ''
      const res = await fetch(`/api/students/${studentId}/commute-schedules${devQs}`, { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) {
        setScheduleError(data?.error || '일정 불러오기 실패')
        setCommuteSchedules([])
        return
      }
      const schedules = data.schedules || data || []
      if (!schedules || schedules.length === 0) {
        // 더미 일정 생성 (월~금 16:00~21:00, 토 10:00~14:00)
        const dummy = [
          'monday','tuesday','wednesday','thursday','friday'
        ].map((w) => ({ weekday: weekdayKo[w], check_in_time: '16:00', check_out_time: '21:00', notes: '더미 일정' }))
        dummy.push({ weekday: weekdayKo.saturday, check_in_time: '10:00', check_out_time: '14:00', notes: '더미 일정' })
        setCommuteSchedules(dummy)
      } else {
        const localized = (schedules as any[]).map((s) => ({
          ...s,
          weekday: weekdayKo[(s.weekday as keyof typeof weekdayKo)] || s.weekday,
        }))
        setCommuteSchedules(localized)
      }
    } catch (e: any) {
      setScheduleError(e?.message || '네트워크 오류')
      setCommuteSchedules([
        { weekday: weekdayKo.monday, check_in_time: '16:00', check_out_time: '21:00', notes: '더미 일정 (오프라인)' },
        { weekday: weekdayKo.tuesday, check_in_time: '16:00', check_out_time: '21:00', notes: '더미 일정 (오프라인)' },
        { weekday: weekdayKo.wednesday, check_in_time: '16:00', check_out_time: '21:00', notes: '더미 일정 (오프라인)' },
        { weekday: weekdayKo.thursday, check_in_time: '16:00', check_out_time: '21:00', notes: '더미 일정 (오프라인)' },
        { weekday: weekdayKo.friday, check_in_time: '16:00', check_out_time: '21:00', notes: '더미 일정 (오프라인)' },
        { weekday: weekdayKo.saturday, check_in_time: '10:00', check_out_time: '14:00', notes: '더미 일정 (오프라인)' },
      ])
    } finally {
      setScheduleLoading(false)
    }
  }, [])

  // 통계 fallback 계산 (데이터 없을 때 로컬 계산)
  const computeWeeklyFromHistory = useCallback((source: Attendance[] = []) => {
    const map: Record<string, { date: string; present: number; late: number; absent: number; excused: number }> = {}
    source.forEach((r) => {
      if (!map[r.date]) map[r.date] = { date: r.date, present: 0, late: 0, absent: 0, excused: 0 }
      if (r.status === 'present') map[r.date].present++
      else if (r.status === 'late') map[r.date].late++
      else if (r.status === 'absent') map[r.date].absent++
      else if (r.status === 'excused') map[r.date].excused++
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }, [])

  const buildMonthlyTrend = useCallback((source: Attendance[] = []) => {
    const map: Record<string, MonthlyTrendItem> = {}
    const today = new Date()
    const monthAgo = new Date()
    monthAgo.setDate(today.getDate() - 29)
    source.forEach((r) => {
      const d = new Date(r.date)
      if (Number.isNaN(d.getTime())) return
      if (d < monthAgo) return
      const key = r.date
      if (!map[key]) map[key] = { date: key, present: 0, late: 0, absent: 0, excused: 0 }
      if (r.status === 'present') map[key].present++
      else if (r.status === 'late') map[key].late++
      else if (r.status === 'absent') map[key].absent++
      else if (r.status === 'excused') map[key].excused++
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }, [])

  const fetchAttendancePage = useCallback(async (pageToLoad: number, targetDate: string) => {
    const params = new URLSearchParams({
      limit: HISTORY_PAGE_SIZE.toString(),
      offset: (pageToLoad * HISTORY_PAGE_SIZE).toString(),
    })
    params.set('target_date', targetDate)
    const response = await fetch(`/api/attendance?${params.toString()}`, { credentials: 'include' })
    const logsResponse = await fetch(`/api/attendance/logs?date=${targetDate}`, { credentials: 'include' })
    const data = await response.json() as { attendance?: Attendance[]; todayStudents?: TodayStudent[]; weeklyStats?: WeeklyStatItem[]; studentRates?: StudentAttendanceRateItem[]; selectedDate?: string }
    const logsData = logsResponse.ok ? await logsResponse.json() as { logs?: Array<{ student_id: string; check_in_time: string | null; check_out_time: string | null }> } : { logs: [] }

    if (!response.ok) {
      throw new Error(data?.error || '출결 데이터 로드 실패')
    }

    const fetchedCount = data.attendance?.length || 0
    console.log('[history] page', pageToLoad, 'fetched', fetchedCount, 'hasMore?', fetchedCount === HISTORY_PAGE_SIZE)
    const merged = pageToLoad === 0 ? (data.attendance || []) : [...attendanceHistory, ...(data.attendance || [])]
    setAttendanceHistory(merged)

    // 오늘 날짜 로그 저장 (중복 등하원 스택용)
    if (logsData?.logs) {
      setDailyLogs(logsData.logs)
    }

    // 첫 페이지에서만 오늘/통계 세트업
    if (pageToLoad === 0) {
      const sortedToday = (data.todayStudents || []).slice().sort((a, b) => {
        const pa = statusPriority[a.status] ?? 99
        const pb = statusPriority[b.status] ?? 99
        if (pa !== pb) return pa - pb
        return (a.student_name || '').localeCompare(b.student_name || '')
      })
      setTodayAttendance(sortedToday)
    }

    // hasMore 판단
    setHasMore(fetchedCount === HISTORY_PAGE_SIZE)
  }, [HISTORY_PAGE_SIZE, attendanceHistory, computeWeeklyFromHistory])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        await fetchAttendancePage(0, selectedDate)
        setPage(0)
        setTodayPage(1)
      } catch (err) {
        toast({ title: '출결 데이터 로드 실패', description: err instanceof Error ? err.message : undefined, variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    }
    load()
    // fetchAttendancePage를 의존성에 포함하면 attendanceHistory 변경 시마다 재호출되어 루프가 생겨 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, toast])

  // 좌석 배정된 학생 목록 불러오기 (학생용 출결 페이지와 동일 엔드포인트 활용)
  useEffect(() => {
    const loadSeatAssignments = async () => {
      try {
        const res = await fetch('/api/seat-assignments', { credentials: 'include' })
        if (!res.ok) return
        const data = await res.json()
        const ids: string[] = []
        const map: Record<string, SeatInfo> = {}
        const nameMap: Record<string, SeatInfo> = {}
        for (const a of data.assignments || []) {
          const studentId = a.studentId || (a as any).student_id
          if (!studentId) continue

          const seatNumberRaw = (a.seatNumber ?? (a as any).seat_number) ?? null
          const seatNumber =
            seatNumberRaw === null || seatNumberRaw === undefined
              ? null
              : typeof seatNumberRaw === 'number'
                ? seatNumberRaw
                : Number.isFinite(Number(seatNumberRaw))
                  ? Number(seatNumberRaw)
                  : null
          const grade = a.studentGrade ?? (a as any).student_grade ?? null
          const newEntry: SeatInfo = {
            seatNumber,
            checkInTime: a.checkInTime ?? null,
            sessionStartTime: a.sessionStartTime ?? null,
            status: a.status ?? null,
            updatedAt: a.updatedAt ?? null,
            grade,
          }

          const existing = map[studentId]
          const isValidSeat = typeof seatNumber === 'number' && seatNumber > 0 && seatNumber !== 99
          const existingValid = existing && typeof existing.seatNumber === 'number' && existing.seatNumber > 0 && existing.seatNumber !== 99

          // only overwrite if no existing, or new has valid seat and existing is invalid/empty
          if (!existing || (isValidSeat && !existingValid)) {
            map[studentId] = newEntry
          }

          const studentName = a.studentName || (a as any).student_name
          if (studentName) {
            const existingName = nameMap[studentName]
            if (!existingName || (isValidSeat && !(existingName.seatNumber && existingName.seatNumber !== 99))) {
              nameMap[studentName] = newEntry
            }
          }

          if (isValidSeat) {
            ids.push(studentId)
          }
        }
        setAssignedStudentIds(Array.from(new Set(ids)))
        setSeatMap(map)
        setSeatNameMap(nameMap)
        setRawAssignments(data.assignments || [])
      } catch (e) {
        // 실패해도 전체 목록 표시 (필터 없이)
        setAssignedStudentIds([])
      }
    }
    loadSeatAssignments()
  }, [])

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || isLoadingMore || !historySentinel) return
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect()
          setIsLoadingMore(true)
          try {
            const nextPage = page + 1
            await fetchAttendancePage(nextPage, selectedDate)
            setPage(nextPage)
          } catch (err) {
            toast({ title: '추가 로드 실패', description: err instanceof Error ? err.message : undefined, variant: 'destructive' })
          } finally {
            setIsLoadingMore(false)
          }
        }
      },
      { rootMargin: '800px' }
    )
    observer.observe(historySentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, page, fetchAttendancePage, toast, historySentinel, selectedDate])

  const [userRole, setUserRole] = useState<string | null>(null)
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null)

  // Get user role from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const role = localStorage.getItem('userRole')
      setUserRole(role)
      // In real app, get teacher ID from auth context
      // For demo, assume t1 is the logged-in teacher
      if (role === 'teacher') {
        setCurrentTeacherId('t1')
      }
    }
  }, [])

  const statusMap = {
    scheduled: { label: '수업예정', variant: 'outline' as const, icon: Clock, color: 'text-gray-600' },
    present: { label: '출석', variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
    late: { label: '지각', variant: 'secondary' as const, icon: Clock, color: 'text-orange-600' },
    absent: { label: '결석', variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
    excused: { label: '인정결석', variant: 'outline' as const, icon: CheckCircle, color: 'text-blue-600' },
  }

  const handleStatusChange = async (attendanceId: string | null, studentId: string, classId: string, newStatus: AttendanceStatus) => {
    // optimistic update
    setTodayAttendance(prev => prev.map(r => {
      if (r.student_id !== studentId) return r
      const updatedClasses = r.classes.map(c => c.class_id === classId ? { ...c, status: newStatus } : c)
      // 집계 상태는 최우선순위 적용
      const agg = updatedClasses.reduce((min, c) => Math.min(min, statusPriority[c.status]), 99)
      const aggStatus = (Object.keys(statusPriority) as AttendanceStatus[]).find(s => statusPriority[s] === agg) || 'present'
      return { ...r, classes: updatedClasses, status: aggStatus }
    }))
    try {
      let res
      if (!attendanceId || attendanceId.startsWith('pending')) {
        res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            student_id: studentId,
            class_id: classId,
            status: newStatus,
            date: new Date().toISOString().slice(0, 10),
          }),
        })
      } else {
        res = await fetch(`/api/attendance/${attendanceId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
          credentials: 'include',
        })
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || '저장 실패')
      }
      toast({
        title: '출결 상태 변경',
        description: `출결 상태가 ${statusMap[newStatus].label}(으)로 변경되었습니다.`,
      })
    } catch (err) {
      toast({ title: '저장 실패', description: err instanceof Error ? err.message : undefined, variant: 'destructive' })
      // rollback to present if failed
      setTodayAttendance(prev => prev.map(r => {
        if (r.student_id !== studentId) return r
        const updatedClasses = r.classes.map(c => c.class_id === classId ? { ...c, status: 'present' } : c)
        const agg = updatedClasses.reduce((min, c) => Math.min(min, statusPriority[c.status]), 99)
        const aggStatus = (Object.keys(statusPriority) as AttendanceStatus[]).find(s => statusPriority[s] === agg) || 'present'
        return { ...r, classes: updatedClasses, status: aggStatus }
      }))
    }
  }

  const formatTime = (iso: string | null | undefined) => {
    if (!iso) return '-'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return '-'
    return format(d, 'HH:mm')
  }

  const formatSeatNumber = (seat?: number | null) => {
    if (!seat || seat === 99) return '-'
    return seat
  }

  const getSeatInfo = (studentId?: string | null, studentName?: string | null) => {
    if (studentId && seatMap[studentId]) return seatMap[studentId]
    if (studentName && seatNameMap[studentName]) return seatNameMap[studentName]
    // fallback: search raw assignments by name
    if (studentName && rawAssignments.length > 0) {
      const found = rawAssignments.find((a) => (a.studentName || a.student_name) === studentName)
      if (found) {
        return {
          seatNumber: found.seatNumber ?? found.seat_number ?? null,
          checkInTime: found.checkInTime ?? null,
          sessionStartTime: found.sessionStartTime ?? null,
          status: found.status ?? null,
          updatedAt: found.updatedAt ?? null,
          grade: found.studentGrade ?? found.student_grade ?? null,
        }
      }
    }
    return undefined
  }

  const getAttendanceTimes = (studentId?: string | null) => {
    if (!studentId) return { checkIn: null, checkOut: null }
    const att = attendanceByStudent[studentId]
    return {
      checkIn: (att as any)?.check_in_time || null,
      checkOut: (att as any)?.check_out_time || null,
    }
  }

  const todayColumns: ColumnDef<TodayStudent>[] = [
    {
      accessorKey: 'student_name',
      header: '학생 이름',
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => fetchCommuteSchedules(row.original.student_id, row.original.student_name)}
          className="flex items-center gap-2 hover:text-primary"
        >
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium underline decoration-dotted underline-offset-4">
            {row.getValue('student_name')}
          </span>
        </button>
      ),
    },
    {
      id: 'grade',
      header: '학년',
      cell: ({ row }) => {
        const seat = getSeatInfo(row.original.student_id, row.original.student_name)
        if (!seat?.grade && seat?.grade !== 0) return '-'
        return <span>{seat.grade}학년</span>
      },
    },
    {
      id: 'check_in',
      header: '등원 시간',
      cell: ({ row }) => {
        const logs = dailyLogsByStudent[row.original.student_id] || []
        const seat = getSeatInfo(row.original.student_id, row.original.student_name)
        const fallback = formatTime(getAttendanceTimes(row.original.student_id).checkIn || seat?.checkInTime || seat?.sessionStartTime)
        if (logs.length === 0) return <span>{fallback}</span>
        return (
          <div className="flex flex-col gap-0.5">
            {logs.map((l, idx) => (
              <span key={idx}>{formatTime(l.in)}</span>
            ))}
          </div>
        )
      },
    },
    {
      id: 'check_out',
      header: '하원 시간',
      cell: ({ row }) => {
        const logs = dailyLogsByStudent[row.original.student_id] || []
        const seat = getSeatInfo(row.original.student_id, row.original.student_name)
        const times = getAttendanceTimes(row.original.student_id)
        const fallbackIsOut = Boolean(times.checkOut) || seat?.status === 'checked_out'
        const fallbackTime = times.checkOut || seat?.updatedAt || seat?.sessionStartTime
        if (logs.length === 0) return <span>{fallbackIsOut ? formatTime(fallbackTime) : '-'}</span>
        return (
          <div className="flex flex-col gap-0.5">
            {logs.map((l, idx) => (
              <span key={idx}>{l.out ? formatTime(l.out) : '-'}</span>
            ))}
          </div>
        )
      },
    },
    {
      id: 'seat',
      header: '좌석 번호',
      cell: ({ row }) => {
        const seat = getSeatInfo(row.original.student_id, row.original.student_name)
        return <span>{formatSeatNumber(seat?.seatNumber ?? null)}</span>
      },
    },
  ]

  // 좌석 배정 정보가 있으면 그 학생들로 필터, 없으면 전체 표시
  const seatFilteredAttendance = useMemo(() => {
    if (assignedStudentIds.length === 0) return todayAttendance
    const set = new Set(assignedStudentIds)
    return todayAttendance.filter((record) => set.has(record.student_id))
  }, [assignedStudentIds, todayAttendance])

  const filteredAttendanceHistory = useMemo(() => {
    if (assignedStudentIds.length === 0) return attendanceHistory
    const set = new Set(assignedStudentIds)
    return attendanceHistory.filter((r) => set.has(r.student_id))
  }, [attendanceHistory, assignedStudentIds])

  const weeklyStats = useMemo(() => computeWeeklyFromHistory(filteredAttendanceHistory), [filteredAttendanceHistory, computeWeeklyFromHistory])
  const monthlyTrend = useMemo(() => buildMonthlyTrend(filteredAttendanceHistory), [filteredAttendanceHistory, buildMonthlyTrend])

  const attendanceByStudent = useMemo(() => {
    const map: Record<string, Attendance> = {}
    filteredAttendanceHistory.forEach((r) => {
      if (!r.student_id) return
      if (!map[r.student_id]) map[r.student_id] = r
    })
    return map
  }, [filteredAttendanceHistory])

  // 학생별, 선택 날짜별 복수 등/하원 시각 스택용 맵
  const dailyLogsByStudent = useMemo(() => {
    const map: Record<string, { in: string | null; out: string | null }[]> = {}
    const isSameLocalDate = (iso: string | null | undefined) => {
      if (!iso) return false
      const d = new Date(iso)
      if (Number.isNaN(d.getTime())) return false
      const local = d.toISOString().slice(0, 10) // still UTC; adjust by timezone offset manually
      const offsetMs = d.getTimezoneOffset() * 60 * 1000
      const localDate = new Date(d.getTime() - offsetMs).toISOString().slice(0, 10)
      return localDate === selectedDate
    }

    // attendance_logs 우선 (여러 회차 존재)
    dailyLogs.forEach((l) => {
      if (!l.student_id) return
      if (!isSameLocalDate(l.check_in_time)) return
      if (!map[l.student_id]) map[l.student_id] = []
      map[l.student_id].push({ in: l.check_in_time, out: l.check_out_time })
    })

    // attendance 테이블로 보강 (중복 방지)
    filteredAttendanceHistory
      .filter((r) => r.date === selectedDate)
      .forEach((r) => {
        if (!r.student_id) return
        if (!map[r.student_id]) map[r.student_id] = []
        const exists = map[r.student_id].some((l) => l.in === (r as any).check_in_time && l.out === (r as any).check_out_time)
        if (!exists) {
          map[r.student_id].push({
            in: (r as any).check_in_time ?? null,
            out: (r as any).check_out_time ?? null,
          })
        }
      })

    // 정렬: 등원 시간 오름차순
    Object.keys(map).forEach((k) => {
      map[k].sort((a, b) => {
        const ta = a.in ? new Date(a.in).getTime() : 0
        const tb = b.in ? new Date(b.in).getTime() : 0
        return ta - tb
      })
    })

    return map
  }, [dailyLogs, filteredAttendanceHistory, selectedDate])

  const filteredTodayAttendance = seatFilteredAttendance

  // name search (옵션) - 기존 검색 인풋 값 사용 가능 시 여기에 적용할 수 있음
  const visibleTodayAttendance = useMemo(() => {
    return filteredTodayAttendance.slice(0, todayPage * TODAY_PAGE_SIZE)
  }, [filteredTodayAttendance, todayPage])

  const hasMoreToday = visibleTodayAttendance.length < filteredTodayAttendance.length

  // 오늘 출결 무한스크롤
  useEffect(() => {
    if (!hasMoreToday) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsLoadingMoreToday(true)
          setTodayPage((p) => p + 1)
          setIsLoadingMoreToday(false)
        }
      },
      { rootMargin: '800px' }
    )
    if (todayLoadMoreRef.current) observer.observe(todayLoadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMoreToday])

  const todayStats = useMemo(() => {
    const uniqueStudents = Array.from(new Set(filteredTodayAttendance.map((r) => r.student_id))).filter(Boolean)
    // 로그가 있는 학생은 출석으로 간주, 없고 status absent면 결석
    const presentSet = new Set<string>()
    const absentSet = new Set<string>()
    uniqueStudents.forEach((id) => {
      if (!id) return
      const logs = dailyLogsByStudent[id] || []
      if (logs.length > 0 && logs.some((l) => l.in)) {
        presentSet.add(id)
      } else {
        const status = filteredTodayAttendance.find((r) => r.student_id === id)?.status
        if (status === 'absent') absentSet.add(id)
      }
    })

    const total = uniqueStudents.length
    const present = presentSet.size
    const absent = Math.max(0, total - present)
    const late = 0 // 더미 데이터: 지각 판정 미구현
    const excused = 0
    const scheduled = Math.max(0, total - present - absent)
    const rate = total === 0 ? 0 : Math.round(((present + excused) / total) * 100)

    return { total, present, late, absent, excused, scheduled, rate }
  }, [filteredTodayAttendance, dailyLogsByStudent])

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">독서실 출결관리</h1>
          <p className="text-sm md:text-base text-muted-foreground">학생 출결을 관리하세요 · 출결 데이터는 <span className="font-medium text-blue-600">학생용 출결 페이지</span>의 등원/하원 기록을 기반으로 자동 반영됩니다</p>
        </div>
        <Link
          href={`/${institutionName}/liveattendance`}
          target="_blank"
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          <span>학생용 출결 페이지</span>
        </Link>
      </div>

      {/* 오늘 출결 통계 Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.total}명</div>
            <p className="text-xs text-muted-foreground">오늘 예정</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">출석</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{todayStats.present}명</div>
            <p className="text-xs text-muted-foreground">정상 출석</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">지각</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{todayStats.late}명</div>
            <p className="text-xs text-muted-foreground">늦은 출석</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">결석</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{todayStats.absent}명</div>
            <p className="text-xs text-muted-foreground">미출석</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">출결률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.rate}%</div>
            <p className="text-xs text-muted-foreground">오늘 출결률</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="today">
        <TabsList>
          <TabsTrigger value="today">오늘 출결</TabsTrigger>
        </TabsList>

        {/* 오늘 출결 Tab */}
        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <CardTitle>오늘 출결 현황</CardTitle>
                  <CardDescription>선택한 날짜 기준 실시간 출결</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => shiftDate(-1)} aria-label="이전 날짜">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="text-lg font-semibold whitespace-nowrap">
                    {formatSelectedDateLabel(selectedDate)}
                  </div>
                  <Button variant="outline" size="icon" onClick={() => shiftDate(1)} aria-label="다음 날짜">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={resetToToday} disabled={selectedDate === format(new Date(), 'yyyy-MM-dd')}>
                    오늘
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">좌석을 배정받은 학생만 표시됩니다.</p>
              <DataTable
                columns={todayColumns}
                data={visibleTodayAttendance}
                searchKey="student_name"
                searchPlaceholder="학생 이름으로 검색..."
                disablePagination
              />
              {hasMoreToday && (
                <>
                  <div ref={todayLoadMoreRef} className="h-6" />
                  <div className="text-center text-muted-foreground text-xs py-2">
                    {isLoadingMoreToday ? '불러오는 중...' : ''}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 등하원 일정 모달 */}
      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>등·하원 일정</DialogTitle>
            <DialogDescription>
              {scheduleTarget ? `${scheduleTarget.name} 학생의 요일별 등·하원 예정 시간입니다.` : ''}
            </DialogDescription>
          </DialogHeader>

          {scheduleLoading && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
          {!scheduleLoading && scheduleError && (
            <p className="text-sm text-destructive">{scheduleError}</p>
          )}

          {!scheduleLoading && !scheduleError && (
            <div className="space-y-3">
              {(commuteSchedules || []).length === 0 && (
                <p className="text-sm text-muted-foreground">등록된 일정이 없습니다.</p>
              )}
              {(commuteSchedules || []).map((sch) => (
                <div key={sch.id || sch.weekday} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                  <span className="font-medium capitalize">{sch.weekday}</span>
                  <div className="flex items-center gap-3 text-right">
                    <span>등원 {sch.check_in_time ?? '-'}</span>
                    <span>하원 {sch.check_out_time ?? '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
