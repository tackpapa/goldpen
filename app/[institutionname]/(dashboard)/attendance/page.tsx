'use client'

export const runtime = 'edge'


import { useState, useEffect, useCallback, useRef } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { usePageAccess } from '@/hooks/use-page-access'
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
import { Calendar, CheckCircle, XCircle, Clock, User, ExternalLink } from 'lucide-react'
import type { Attendance } from '@/lib/types/database'
import { format } from 'date-fns'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useMemo } from 'react'

// Type definitions
interface TodayStudent {
  id: string
  student_id: string
  student_name: string
  class_id: string | null
  class_name: string | null
  scheduled_time: string
  teacher_id: string
  teacher_name: string
  is_one_on_one: boolean
  status: 'scheduled' | 'present' | 'late' | 'absent' | 'excused'
}

interface WeeklyStatItem {
  date: string
  present: number
  late: number
  absent: number
  excused: number
}

interface StudentAttendanceRateItem {
  name: string
  rate: number
  present: number
  late: number
  absent: number
}

export default function AttendancePage() {
  usePageAccess('attendance')

  const { toast } = useToast()
  const params = useParams()
  const institutionName = params.institutionname as string
  const [todayAttendance, setTodayAttendance] = useState<TodayStudent[]>([])
  const [attendanceHistory, setAttendanceHistory] = useState<Attendance[]>([])
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStatItem[]>([])
  const [studentAttendanceRate, setStudentAttendanceRate] = useState<StudentAttendanceRateItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)
  const PAGE_SIZE = 20
  const statusPriority: Record<string, number> = {
    absent: 0,
    late: 1,
    present: 2,
    excused: 3,
    scheduled: 4,
  }

  // 통계 fallback 계산 (데이터 없을 때 로컬 계산)
  const computeWeeklyFromHistory = useCallback(() => {
    const map: Record<string, { date: string; present: number; late: number; absent: number; excused: number }> = {}
    attendanceHistory.forEach((r) => {
      if (!map[r.date]) map[r.date] = { date: r.date, present: 0, late: 0, absent: 0, excused: 0 }
      if (r.status === 'present') map[r.date].present++
      else if (r.status === 'late') map[r.date].late++
      else if (r.status === 'absent') map[r.date].absent++
      else if (r.status === 'excused') map[r.date].excused++
    })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }, [attendanceHistory])

  const computeStudentRatesFromHistory = useCallback(() => {
    const agg: Record<string, { name: string; present: number; late: number; absent: number; excused: number }> = {}
    attendanceHistory.forEach((r) => {
      if (!agg[r.student_id]) agg[r.student_id] = { name: (r as any).student?.name || r.student_id, present: 0, late: 0, absent: 0, excused: 0 }
      if (r.status === 'present') agg[r.student_id].present++
      else if (r.status === 'late') agg[r.student_id].late++
      else if (r.status === 'absent') agg[r.student_id].absent++
      else if (r.status === 'excused') agg[r.student_id].excused++
    })
    return Object.entries(agg).map(([id, v]) => {
      const total = v.present + v.late + v.absent + v.excused
      const rate = total === 0 ? 0 : Math.round((v.present / total) * 100)
      return { id, name: v.name, ...v, rate }
    })
  }, [attendanceHistory])

  const fetchAttendancePage = useCallback(async (pageToLoad: number) => {
    const params = new URLSearchParams({
      limit: PAGE_SIZE.toString(),
      offset: (pageToLoad * PAGE_SIZE).toString(),
    })
    const response = await fetch(`/api/attendance?${params.toString()}`, { credentials: 'include' })
    const data = await response.json() as { attendance?: Attendance[]; todayStudents?: TodayStudent[]; weeklyStats?: WeeklyStatItem[]; studentRates?: StudentAttendanceRateItem[] }

    if (!response.ok) {
      throw new Error(data?.error || '출결 데이터 로드 실패')
    }

    setAttendanceHistory(prev => pageToLoad === 0 ? (data.attendance || []) : [...prev, ...(data.attendance || [])])

    // 첫 페이지에서만 오늘/통계 세트업
    if (pageToLoad === 0) {
      const sortedToday = (data.todayStudents || []).slice().sort((a, b) => {
        const pa = statusPriority[a.status] ?? 99
        const pb = statusPriority[b.status] ?? 99
        if (pa !== pb) return pa - pb
        return (a.student_name || '').localeCompare(b.student_name || '')
      })
      setTodayAttendance(sortedToday)
      setWeeklyStats((data.weeklyStats && data.weeklyStats.length > 0) ? data.weeklyStats : computeWeeklyFromHistory())
      setStudentAttendanceRate((data.studentRates && data.studentRates.length > 0) ? data.studentRates : computeStudentRatesFromHistory())
    }

    // hasMore 판단
    const fetched = data.attendance?.length || 0
    setHasMore(fetched === PAGE_SIZE)
  }, [PAGE_SIZE])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      try {
        await fetchAttendancePage(0)
        setPage(0)
      } catch (err) {
        toast({ title: '출결 데이터 로드 실패', description: err instanceof Error ? err.message : undefined, variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [fetchAttendancePage, toast])

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || isLoadingMore) return
    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting) {
          observer.disconnect()
          setIsLoadingMore(true)
          try {
            const nextPage = page + 1
            await fetchAttendancePage(nextPage)
            setPage(nextPage)
          } catch (err) {
            toast({ title: '추가 로드 실패', description: err instanceof Error ? err.message : undefined, variant: 'destructive' })
          } finally {
            setIsLoadingMore(false)
          }
        }
      },
      { rootMargin: '200px' }
    )
    if (loadMoreRef.current) observer.observe(loadMoreRef.current)
    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, page, fetchAttendancePage, toast])
  const [selectedClass, setSelectedClass] = useState<string>('all')
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
    scheduled: { label: '수업예정', variant: 'outline' as const, icon: Calendar, color: 'text-gray-600' },
    present: { label: '출석', variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
    late: { label: '지각', variant: 'secondary' as const, icon: Clock, color: 'text-orange-600' },
    absent: { label: '결석', variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
    excused: { label: '인정결석', variant: 'outline' as const, icon: CheckCircle, color: 'text-blue-600' },
  }

  const handleStatusChange = async (recordId: string, newStatus: 'scheduled' | 'present' | 'absent' | 'late' | 'excused') => {
    // optimistic update
    setTodayAttendance(prev => prev.map(r => r.id === recordId ? { ...r, status: newStatus } : r))
    try {
      const res = await fetch(`/api/attendance/${recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
        credentials: 'include',
      })
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
      setTodayAttendance(prev => prev.map(r => r.id === recordId ? { ...r, status: 'present' } : r))
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
      accessorKey: 'class_name',
      header: '반',
      cell: ({ row }) => {
        const student = row.original
        const displayName = student.is_one_on_one ? '1:1' : student.class_name
        return <Badge variant="secondary">{displayName}</Badge>
      },
    },
    {
      accessorKey: 'teacher_name',
      header: '선생님',
      cell: ({ row }) => {
        const teacherName = row.getValue('teacher_name') as string
        return <span className="text-sm">{teacherName || '-'}</span>
      },
    },
    {
      accessorKey: 'scheduled_time',
      header: '수업 시간',
      cell: ({ row }) => {
        const time = row.getValue('scheduled_time') as string
        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{time || '-'}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: '출결 상태',
      cell: ({ row }) => {
        const status = row.getValue('status') as keyof typeof statusMap
        const statusInfo = statusMap[status]
        const Icon = statusInfo.icon
        return (
          <Badge variant={statusInfo.variant} className="gap-1">
            <Icon className="h-3 w-3" />
            {statusInfo.label}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      header: '상태 변경',
      cell: ({ row }) => {
        const student = row.original
        return (
          <Select
            value={student.status}
              onValueChange={(value) =>
                handleStatusChange(student.id, value as typeof student.status)
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
        )
      },
    },
  ]

  // Filter by teacher if user is a teacher (not admin)
  const teacherFilteredAttendance =
    userRole === 'teacher' && currentTeacherId
      ? todayAttendance.filter((record) => record.teacher_id === currentTeacherId)
      : todayAttendance

  const filteredTodayAttendance =
    selectedClass === 'all'
      ? teacherFilteredAttendance
      : teacherFilteredAttendance.filter((record) => record.class_id === selectedClass)

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
          <h1 className="text-2xl md:text-3xl font-bold">출결 관리</h1>
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
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>오늘 출결 현황</CardTitle>
                  <CardDescription>
                    {format(new Date(), 'yyyy년 MM월 dd일')} - 실시간 출결 체크
                  </CardDescription>
                </div>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="반 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 반</SelectItem>
                    {useMemo(() => {
                      const opts = Array.from(new Map(
                        todayAttendance
                          .filter(r => r.class_id)
                          .map(r => [r.class_id!, r.class_name || r.class_id!])
                      ).entries())
                      return opts.map(([id, name]) => (
                        <SelectItem key={id} value={id}>{name}</SelectItem>
                      ))
                    }, [todayAttendance])}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={todayColumns}
                data={filteredTodayAttendance}
                searchKey="student_name"
                searchPlaceholder="학생 이름으로 검색..."
              />
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
            const studentName = record.student?.name || record.student_id
            const className = record.class?.name || record.class_id
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
                  <div ref={loadMoreRef} className="p-4 text-center text-muted-foreground">
                    {isLoadingMore ? '불러오는 중...' : '스크롤하여 더 보기'}
                  </div>
                )}
                {!hasMore && attendanceHistory.length > 0 && (
                  <div className="p-3 text-center text-muted-foreground text-xs">모두 불러왔습니다</div>
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

            {/* 학생별 출결률 */}
            <Card>
              <CardHeader>
                <CardTitle>학생별 출결률</CardTitle>
                <CardDescription>이번 달 주요 학생 출결률</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={studentAttendanceRate}>
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

          {/* 학생별 상세 출결 통계 */}
          <Card>
            <CardHeader>
              <CardTitle>학생별 출결 상세</CardTitle>
              <CardDescription>이번 달 학생별 출결 통계</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left">학생명</th>
                      <th className="p-2 text-center">출석</th>
                      <th className="p-2 text-center">지각</th>
                      <th className="p-2 text-center">결석</th>
                      <th className="p-2 text-center">출결률</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentAttendanceRate.map((student, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 font-medium">{student.name}</td>
                        <td className="p-2 text-center text-green-600">{student.present}회</td>
                        <td className="p-2 text-center text-orange-600">{student.late}회</td>
                        <td className="p-2 text-center text-red-600">{student.absent}회</td>
                        <td className="p-2 text-center">
                          <Badge variant={student.rate >= 95 ? 'default' : 'secondary'}>
                            {student.rate}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
