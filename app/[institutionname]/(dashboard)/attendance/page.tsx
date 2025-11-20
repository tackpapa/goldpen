'use client'
export const runtime = 'edge'


import { useState, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
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

// Mock data - 오늘 예정 학생 (teacher_id와 is_one_on_one 추가)
const mockTodayStudents = [
  { id: '1', student_id: 'st1', student_name: '김민준', class_id: 'class-1', class_name: '수학 특강반', scheduled_time: '1400~1600', teacher_id: 't1', teacher_name: '박철수', is_one_on_one: false, status: 'present' as const },
  { id: '2', student_id: 'st2', student_name: '이서연', class_id: 'class-2', class_name: '영어 회화반', scheduled_time: '1500~1700', teacher_id: 't2', teacher_name: '김영희', is_one_on_one: false, status: 'scheduled' as const },
  { id: '3', student_id: 'st3', student_name: '박준호', class_id: 'class-1', class_name: '수학 특강반', scheduled_time: '1400~1600', teacher_id: 't1', teacher_name: '박철수', is_one_on_one: false, status: 'late' as const },
  { id: '4', student_id: 'st4', student_name: '최지우', class_id: null, class_name: null, scheduled_time: '1600~1800', teacher_id: 't3', teacher_name: '이민준', is_one_on_one: true, status: 'absent' as const },
  { id: '5', student_id: 'st5', student_name: '정하은', class_id: 'class-2', class_name: '영어 회화반', scheduled_time: '1500~1700', teacher_id: 't2', teacher_name: '김영희', is_one_on_one: false, status: 'scheduled' as const },
  { id: '6', student_id: 'st6', student_name: '강민서', class_id: 'class-1', class_name: '수학 특강반', scheduled_time: '1400~1600', teacher_id: 't1', teacher_name: '박철수', is_one_on_one: false, status: 'present' as const },
  { id: '7', student_id: 'st7', student_name: '윤서준', class_id: 'class-3', class_name: '국어 독해반', scheduled_time: '1600~1800', teacher_id: 't3', teacher_name: '이민준', is_one_on_one: false, status: 'scheduled' as const },
  { id: '8', student_id: 'st8', student_name: '장서연', class_id: null, class_name: null, scheduled_time: '1500~1700', teacher_id: 't1', teacher_name: '박철수', is_one_on_one: true, status: 'excused' as const },
  { id: '9', student_id: 'st9', student_name: '임도윤', class_id: 'class-1', class_name: '수학 특강반', scheduled_time: '1400~1600', teacher_id: 't1', teacher_name: '박철수', is_one_on_one: false, status: 'present' as const },
  { id: '10', student_id: 'st10', student_name: '한지우', class_id: 'class-3', class_name: '국어 독해반', scheduled_time: '1600~1800', teacher_id: 't3', teacher_name: '이민준', is_one_on_one: false, status: 'late' as const },
]

// Mock data - 최근 출결 기록
const mockAttendanceHistory: Attendance[] = [
  { id: 'a1', created_at: '2025-06-17', date: '2025-06-17', class_id: 'class-1', student_id: 'st1', status: 'present', notes: '' },
  { id: 'a2', created_at: '2025-06-17', date: '2025-06-17', class_id: 'class-2', student_id: 'st2', status: 'present', notes: '' },
  { id: 'a3', created_at: '2025-06-17', date: '2025-06-17', class_id: 'class-1', student_id: 'st3', status: 'late', notes: '버스 연착' },
  { id: 'a4', created_at: '2025-06-16', date: '2025-06-16', class_id: 'class-1', student_id: 'st1', status: 'present', notes: '' },
  { id: 'a5', created_at: '2025-06-16', date: '2025-06-16', class_id: 'class-2', student_id: 'st2', status: 'present', notes: '' },
  { id: 'a6', created_at: '2025-06-16', date: '2025-06-16', class_id: 'class-3', student_id: 'st4', status: 'absent', notes: '병결' },
  { id: 'a7', created_at: '2025-06-15', date: '2025-06-15', class_id: 'class-1', student_id: 'st1', status: 'present', notes: '' },
  { id: 'a8', created_at: '2025-06-15', date: '2025-06-15', class_id: 'class-2', student_id: 'st2', status: 'late', notes: '' },
]

// 주간 출결 통계 (일별)
const weeklyStats = [
  { date: '월', present: 28, late: 2, absent: 1, excused: 1 },
  { date: '화', present: 30, late: 1, absent: 0, excused: 1 },
  { date: '수', present: 29, late: 2, absent: 2, excused: 0 },
  { date: '목', present: 31, late: 1, absent: 1, excused: 0 },
  { date: '금', present: 27, late: 3, absent: 2, excused: 1 },
]

// 학생별 출결률
const studentAttendanceRate = [
  { name: '김민준', rate: 100, present: 20, late: 0, absent: 0 },
  { name: '이서연', rate: 95, present: 19, late: 1, absent: 0 },
  { name: '박준호', rate: 90, present: 18, late: 2, absent: 0 },
  { name: '최지우', rate: 85, present: 17, late: 1, absent: 2 },
  { name: '정하은', rate: 100, present: 20, late: 0, absent: 0 },
]

export default function AttendancePage() {
  usePageAccess('attendance')

  const { toast } = useToast()
  const [todayAttendance, setTodayAttendance] = useState(mockTodayStudents)
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

  const handleStatusChange = (studentId: string, newStatus: 'scheduled' | 'present' | 'absent' | 'late' | 'excused') => {
    setTodayAttendance(
      todayAttendance.map((record) =>
        record.student_id === studentId ? { ...record, status: newStatus } as typeof record : record
      )
    )
    toast({
      title: '출결 상태 변경',
      description: `출결 상태가 ${statusMap[newStatus].label}(으)로 변경되었습니다.`,
    })
  }

  const todayColumns: ColumnDef<typeof mockTodayStudents[0]>[] = [
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
        return <span className="text-sm">{teacherName}</span>
      },
    },
    {
      accessorKey: 'scheduled_time',
      header: '수업 시간',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{row.getValue('scheduled_time')}</span>
        </div>
      ),
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
              handleStatusChange(student.student_id, value as typeof student.status)
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
          href="/goldpen/liveattendance"
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
                    <SelectItem value="class-1">수학 특강반</SelectItem>
                    <SelectItem value="class-2">영어 회화반</SelectItem>
                    <SelectItem value="class-3">국어 독해반</SelectItem>
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
                      <th className="p-2 text-left">학생 ID</th>
                      <th className="p-2 text-left">반 ID</th>
                      <th className="p-2 text-center">상태</th>
                      <th className="p-2 text-left">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockAttendanceHistory.map((record) => {
                      const statusInfo = statusMap[record.status]
                      const Icon = statusInfo.icon
                      return (
                        <tr key={record.id} className="border-b">
                          <td className="p-2">{record.date}</td>
                          <td className="p-2">{record.student_id}</td>
                          <td className="p-2">{record.class_id}</td>
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
