'use client'

export const runtime = 'edge'


import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { usePageAccess } from '@/hooks/use-page-access'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Calendar, CheckCircle, XCircle, Clock, User, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react'
import type { Attendance } from '@/lib/types/database'
import { addDays, format } from 'date-fns'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'


// Type definitions
type AttendanceStatus = 'scheduled' | 'present' | 'late' | 'absent' | 'excused'

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

interface ClassAttendanceRateItem {
  name: string
  rate: number
  present: number
  late: number
  absent: number
  excused: number
}

export default function AttendancePage() {
  usePageAccess('attendance')

  const { toast } = useToast()
  const params = useParams()
  const institutionName = params.institutionname as string
  const [todayAttendance, setTodayAttendance] = useState<TodayStudent[]>([])
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([])
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStatItem[]>([])
  const [classAttendanceRate, setClassAttendanceRate] = useState<ClassAttendanceRateItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [historySentinel, setHistorySentinel] = useState<HTMLDivElement | null>(null)
  // Track if initial data load is complete (prevents redundant state updates)
  const initialLoadCompleteRef = useRef(false)
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

  const classOptions = useMemo(() => {
    const map = new Map<string, string>()
    todayAttendance.forEach((s) => {
      s.classes.forEach((c) => {
        if (c.class_id) map.set(c.class_id, c.class_name || c.class_id)
      })
    })
    return Array.from(map.entries())
  }, [todayAttendance])

  const resetTodayPaging = useCallback(() => setTodayPage(1), [])

  const formatSelectedDateLabel = useCallback((dateStr: string) => {
    const d = new Date(dateStr)
    if (Number.isNaN(d.getTime())) return ''
    return format(d, 'yyyy년 MM월 dd일 (eee)')
  }, [])

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
    setWeeklyStats([])
    setClassAttendanceRate([])
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
    setWeeklyStats([])
    setClassAttendanceRate([])
  }, [selectedDate])

  // 통계 fallback 계산 (데이터 없을 때 로컬 계산)
  const computeWeeklyFromHistory = useCallback(
    (source: Attendance[] = attendanceHistory) => {
      const map: Record<string, { date: string; present: number; late: number; absent: number; excused: number }> = {}
      source.forEach((r) => {
        if (!map[r.date]) map[r.date] = { date: r.date, present: 0, late: 0, absent: 0, excused: 0 }
        if (r.status === 'present') map[r.date].present++
        else if (r.status === 'late') map[r.date].late++
        else if (r.status === 'absent') map[r.date].absent++
        else if (r.status === 'excused') map[r.date].excused++
      })
      return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
    },
    [attendanceHistory]
  )

  const computeClassRatesFromHistory = useCallback(
    (source: Attendance[] = attendanceHistory) => {
      const agg: Record<string, { name: string; present: number; late: number; absent: number; excused: number }> = {}
      source.forEach((r) => {
        const key = r.class_id || 'unknown'
        const name = (r as any).class?.name || r.class_id || '미지정 반'
        if (!agg[key]) agg[key] = { name, present: 0, late: 0, absent: 0, excused: 0 }
        if (r.status === 'present') agg[key].present++
        else if (r.status === 'late') agg[key].late++
        else if (r.status === 'absent') agg[key].absent++
        else if (r.status === 'excused') agg[key].excused++
      })
      return Object.values(agg)
        .map((v) => {
          const total = v.present + v.late + v.absent + v.excused
          const rate = total === 0 ? 0 : Math.round((v.present / total) * 100)
          return { ...v, rate }
        })
        .sort((a, b) => b.rate - a.rate)
    },
    [attendanceHistory]
  )

  const fetchAttendancePage = useCallback(
    async (pageToLoad: number, targetDate: string) => {
      const params = new URLSearchParams({
        limit: HISTORY_PAGE_SIZE.toString(),
        offset: (pageToLoad * HISTORY_PAGE_SIZE).toString(),
      })
      params.set('target_date', targetDate)
      const response = await fetch(`/api/attendance?${params.toString()}`, { credentials: 'include' })
      const data = (await response.json()) as {
        attendance?: Attendance[]
        todayStudents?: TodayStudent[]
        weeklyStats?: WeeklyStatItem[]
        studentRates?: any[]
        selectedDate?: string
        error?: string
      }

      if (!response.ok) {
        throw new Error(data?.error || '출결 데이터 로드 실패')
      }

      const fetchedCount = data.attendance?.length || 0
      const serverHasMore = (data as any).hasMore
      console.log(
        '[history] page',
        pageToLoad,
        'fetched',
        fetchedCount,
        'hasMore?',
        serverHasMore ?? fetchedCount === HISTORY_PAGE_SIZE
      )

      setAttendanceHistory((prev) => {
        const merged = pageToLoad === 0 ? data.attendance || [] : [...prev, ...(data.attendance || [])]

        if (pageToLoad === 0) {
          const sortedToday = (data.todayStudents || []).slice().sort((a, b) => {
            const pa = statusPriority[a.status] ?? 99
            const pb = statusPriority[b.status] ?? 99
            if (pa !== pb) return pa - pb
            return (a.student_name || '').localeCompare(b.student_name || '')
          })
          setTodayAttendance(sortedToday)
          const weeklyFallback = computeWeeklyFromHistory(merged)
          setWeeklyStats(data.weeklyStats && data.weeklyStats.length > 0 ? data.weeklyStats : weeklyFallback)
          setClassAttendanceRate(computeClassRatesFromHistory(merged))
        }

        return merged
      })

      setHasMore(serverHasMore ?? fetchedCount === HISTORY_PAGE_SIZE)
    },
    [HISTORY_PAGE_SIZE, computeWeeklyFromHistory, computeClassRatesFromHistory, statusPriority]
  )

  // attendanceHistory 변경 시 반별 출결률 갱신 (초기 로드 완료 후에만 실행)
  useEffect(() => {
    // Skip during initial load (fetchAttendancePage already sets classAttendanceRate)
    if (!initialLoadCompleteRef.current) return
    setClassAttendanceRate(computeClassRatesFromHistory())
  }, [attendanceHistory, computeClassRatesFromHistory])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        await fetchAttendancePage(0, selectedDate)
        setPage(0)
        setTodayPage(1)
        // Mark initial load as complete (prevents redundant classAttendanceRate recalculation)
        initialLoadCompleteRef.current = true
        console.log('[Attendance] ✅ Initial load complete')
      } catch (err) {
        toast({
          title: '출결 데이터 로드 실패',
          description: err instanceof Error ? err.message : undefined,
          variant: 'destructive',
        })
        initialLoadCompleteRef.current = true // Still mark as complete to unblock
      } finally {
        setIsLoading(false)
      }
    }
    load()
    // fetchAttendancePage는 의존성에 넣으면 attendanceHistory 변화 시마다 재호출되어 무한 루프가 되어 제외
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, toast])

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

  const [selectedClass, setSelectedClass] = useState<string>('all')

  // Auth Context에서 사용자 권한 및 정보 가져오기
  const { user } = useAuth()
  const userRole = user?.role ?? null
  const currentTeacherId = user?.role === 'teacher' ? user?.id ?? null : null

  const statusMap = {
    scheduled: { label: '수업예정', variant: 'outline' as const, icon: Calendar, color: 'text-gray-600' },
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
        const body = await res.json().catch(() => ({})) as { error?: string }
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
        const updatedClasses = r.classes.map(c => c.class_id === classId ? { ...c, status: 'present' as AttendanceStatus } : c)
        const agg = updatedClasses.reduce((min, c) => Math.min(min, statusPriority[c.status as AttendanceStatus] ?? 99), 99)
        const aggStatus = (Object.keys(statusPriority) as AttendanceStatus[]).find(s => statusPriority[s] === agg) || 'present'
        return { ...r, classes: updatedClasses, status: aggStatus }
      }))
    }
  }

  const todayColumns: ColumnDef<TodayStudent>[] = [
  {
    accessorKey: 'student_name',
    header: '학생 이름',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{row.getValue('student_name')}</span>
      </div>
    ),
  },
    {
      accessorKey: 'classes',
      header: '반',
      cell: ({ row }) => {
        const classes = row.original.classes
        return (
          <div className="flex flex-col gap-1">
            {classes.map((c) => (
              <Badge key={c.class_id} variant="secondary">{c.class_name}</Badge>
            ))}
          </div>
        )
    },
  },
  {
    id: 'teacher_name',
    header: '선생님',
    cell: ({ row }) => {
      const classes = row.original.classes
      return (
        <div className="flex flex-col gap-1 text-sm">
          {classes.map((c) => (
            <span key={c.class_id}>{c.teacher_name || '-'}</span>
          ))}
        </div>
      )
    },
  },
  {
    id: 'scheduled_time',
    header: '수업 시간',
    cell: ({ row }) => {
      const classes = row.original.classes
      return (
        <div className="flex flex-col gap-1 text-sm">
          {classes.map((c) => (
            <div key={c.class_id} className="flex items-center gap-2">
              <Calendar className="h-3 w-3 text-muted-foreground" />
              <span>{c.scheduled_time || '-'}</span>
            </div>
          ))}
        </div>
      )
    },
  },
  {
    id: 'status',
    header: '출결 상태',
    cell: ({ row }) => {
      const classes = row.original.classes
      return (
        <div className="flex flex-col gap-1">
          {classes.map((c) => {
            const s = c.status as keyof typeof statusMap
            const statusInfo = statusMap[s]
            const Icon = statusInfo.icon
            return (
              <Badge key={c.class_id} variant={statusInfo.variant} className="gap-1 w-fit">
                <Icon className="h-3 w-3" />
                {statusInfo.label}
              </Badge>
            )
          })}
        </div>
      )
    },
  },
  {
    id: 'actions',
    header: '상태 변경',
    cell: ({ row }) => {
      const classes = row.original.classes
      return (
        <div className="flex flex-col gap-1">
          {classes.map((c) => (
            <Select
              key={c.class_id}
              value={c.status}
              onValueChange={(value) =>
                handleStatusChange(c.id, row.original.student_id, c.class_id, value as AttendanceStatus)
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">수업예정</SelectItem>
                <SelectItem value="present">출석</SelectItem>
                <SelectItem value="late">지각</SelectItem>
                <SelectItem value="absent">결석</SelectItem>
                <SelectItem value="excused">인정결석</SelectItem>
              </SelectContent>
            </Select>
          ))}
        </div>
      )
    },
  },
]

  const teacherFilteredAttendance = todayAttendance

  const filteredTodayAttendance =
    selectedClass === 'all'
      ? teacherFilteredAttendance
      : teacherFilteredAttendance.filter((record) =>
          record.classes.some((c) => c.class_id === selectedClass)
        )

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

  const todayStats = {
    total: teacherFilteredAttendance.length,
    scheduled: teacherFilteredAttendance.filter((r) => r.status === 'scheduled').length,
    present: teacherFilteredAttendance.filter((r) => r.status === 'present').length,
    late: teacherFilteredAttendance.filter((r) => r.status === 'late').length,
    absent: teacherFilteredAttendance.filter((r) => r.status === 'absent').length,
    excused: teacherFilteredAttendance.filter((r) => r.status === 'excused').length,
    rate: Math.round(
      (teacherFilteredAttendance.filter((r) => r.status === 'present' || r.status === 'excused').length /
        teacherFilteredAttendance.length) *
        100
    ),
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">강의출결관리</h1>
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
          <TabsTrigger value="history">출결 기록</TabsTrigger>
          <TabsTrigger value="stats">통계</TabsTrigger>
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
              {/* 반 필터 버튼 */}
              <div className="flex flex-wrap gap-2 mb-4">
                <Button
                  variant={selectedClass === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedClass('all')
                    resetTodayPaging()
                  }}
                >
                  전체 반
                </Button>
                {classOptions.map(([id, name]) => (
                  <Button
                    key={id}
                    variant={selectedClass === id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedClass(id)
                      resetTodayPaging()
                    }}
                  >
                    {name}
                  </Button>
                ))}
              </div>
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

        {/* 출결 기록 Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>출결 기록</CardTitle>
              <CardDescription>최근 출결 이력</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                 <table className="w-full text-sm">
                   <thead>
                     <tr className="border-b bg-muted/50">
                       <th className="p-2 text-left">날짜</th>
                       <th className="p-2 text-left">학생</th>
                       <th className="p-2 text-left">반</th>
                       <th className="p-2 text-center">상태</th>
                       <th className="p-2 text-left">비고</th>
                     </tr>
                  </thead>
                  <tbody>
          {attendanceHistory.map((record) => {
            const statusInfo = statusMap[record.status]
            const Icon = statusInfo.icon
            const studentName = (record as any).student?.name || record.student_id
            const className = (record as any).class?.name || record.class_id
            return (
              <tr key={record.id} className="border-b">
                <td className="p-2">{record.date}</td>
                <td className="p-2">{studentName}</td>
                <td className="p-2">{className}</td>
                <td className="p-2 text-center">
                  <Badge variant={statusInfo.variant} className="gap-1">
                    <Icon className="h-3 w-3" />
                    {statusInfo.label}
                  </Badge>
                          </td>
                          <td className="p-2 text-muted-foreground">{record.notes || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {hasMore && (
                  <>
                    <div ref={setHistorySentinel} className="h-6" />
                    <div className="text-center text-muted-foreground text-xs py-2">
                      {isLoadingMore ? '불러오는 중...' : ''}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 통계 Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* 주간 출결 추이 */}
            <Card>
              <CardHeader>
                <CardTitle>주간 출결 추이</CardTitle>
                <CardDescription>이번 주 일별 출결 현황</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="present" name="출석" fill="#10b981" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="late" name="지각" fill="#f59e0b" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="absent" name="결석" fill="#ef4444" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="excused" name="인정결석" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 반별 출결률 */}
            <Card>
              <CardHeader>
                <CardTitle>반별 출결률</CardTitle>
                <CardDescription>이번 달 반별 출결률</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={classAttendanceRate}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      name="출결률"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
