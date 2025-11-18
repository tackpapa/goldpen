'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Calendar, TrendingUp, DollarSign, ArrowUp, ArrowDown, BookOpen, Clock, UserCheck, Armchair } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// Mock data for charts
const revenueData = [
  { month: '1월', revenue: 18500000 },
  { month: '2월', revenue: 20300000 },
  { month: '3월', revenue: 22100000 },
  { month: '4월', revenue: 21800000 },
  { month: '5월', revenue: 23500000 },
  { month: '6월', revenue: 24500000 },
]

const studentTrendData = [
  { month: '1월', students: 98 },
  { month: '2월', students: 105 },
  { month: '3월', students: 112 },
  { month: '4월', students: 108 },
  { month: '5월', students: 118 },
  { month: '6월', students: 124 },
]

const attendanceData = [
  { date: '월', rate: 92 },
  { date: '화', rate: 95 },
  { date: '수', rate: 94 },
  { date: '목', rate: 96 },
  { date: '금', rate: 93 },
]

// Mock data for real-time info
const todayClasses = [
  // 오전 수업
  { id: 1, name: '고3 수학 모의고사반', teacher: '김선생', room: 'A301', startTime: '09:00', endTime: '12:00', students: 20 },
  { id: 2, name: '중등 영어 기초반', teacher: '박선생', room: 'B201', startTime: '10:00', endTime: '12:00', students: 15 },
  { id: 3, name: '초등 수학 사고력반', teacher: '이선생', room: 'A201', startTime: '11:00', endTime: '13:00', students: 12 },

  // 오후 수업
  { id: 4, name: '고1 수학 특강반', teacher: '김선생', room: 'A301', startTime: '14:00', endTime: '16:00', students: 18 },
  { id: 5, name: '중2 과학 실험반', teacher: '최선생', room: 'C101', startTime: '14:30', endTime: '16:30', students: 14 },
  { id: 6, name: '고2 영어 회화반', teacher: '박선생', room: 'B201', startTime: '15:00', endTime: '17:00', students: 16 },
  { id: 7, name: '중3 국어 독해반', teacher: '이선생', room: 'A201', startTime: '16:00', endTime: '18:00', students: 20 },
  { id: 8, name: '고3 영어 심화반', teacher: '박선생', room: 'B202', startTime: '17:00', endTime: '19:00', students: 22 },
  { id: 9, name: '중1 수학 기초반', teacher: '김선생', room: 'A302', startTime: '17:30', endTime: '19:30', students: 13 },

  // 저녁 수업
  { id: 10, name: '고2 물리 심화반', teacher: '정선생', room: 'C202', startTime: '18:00', endTime: '20:00', students: 10 },
  { id: 11, name: '중3 화학 실험반', teacher: '최선생', room: 'C101', startTime: '18:30', endTime: '20:30', students: 11 },
  { id: 12, name: '고1 국어 문법반', teacher: '이선생', room: 'A201', startTime: '19:00', endTime: '21:00', students: 17 },
  { id: 13, name: '고3 수학 심화반', teacher: '김선생', room: 'A301', startTime: '19:30', endTime: '21:30', students: 19 },
  { id: 14, name: '중2 영어 문법반', teacher: '박선생', room: 'B201', startTime: '20:00', endTime: '22:00', students: 15 },

  // 야간 수업
  { id: 15, name: '고3 야간 자율학습', teacher: '김선생', room: 'A301', startTime: '21:00', endTime: '23:00', students: 25 },
  { id: 16, name: '재수생 특강반', teacher: '정선생', room: 'C202', startTime: '21:30', endTime: '23:30', students: 8 },
]

const stats = [
  {
    title: '전체 학생',
    value: '124',
    change: '+12%',
    trend: 'up',
    icon: Users,
  },
  {
    title: '오늘 상담',
    value: '8',
    change: '예정된 상담',
    trend: 'neutral',
    icon: Calendar,
  },
  {
    title: '출결률',
    value: '94%',
    change: '이번 주 평균',
    trend: 'up',
    icon: TrendingUp,
  },
  {
    title: '월 매출',
    value: '₩24.5M',
    change: '+8%',
    trend: 'up',
    icon: DollarSign,
  },
]

export default function OverviewPage() {
  const [currentTime, setCurrentTime] = useState(new Date())
  const [studyRoomUsers, setStudyRoomUsers] = useState(42) // Mock: 현재 독서실 사용 인원
  const [attendanceStats, setAttendanceStats] = useState({
    present: 98,      // 출석
    late: 5,          // 지각
    absent: 3,        // 결석
    total: 124        // 총 학생
  })

  // 1초마다 시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 현재 진행 중인 수업 필터링
  const getCurrentClasses = () => {
    const now = currentTime
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`

    return todayClasses.filter((cls) => {
      return cls.startTime <= currentTimeStr && currentTimeStr < cls.endTime
    })
  }

  const ongoingClasses = getCurrentClasses()
  const totalStudentsInClass = ongoingClasses.reduce((sum, cls) => sum + cls.students, 0)
  const studyRoomCapacity = 60 // 독서실 총 좌석
  const studyRoomPercentage = Math.round((studyRoomUsers / studyRoomCapacity) * 100)
  const attendanceRate = Math.round((attendanceStats.present / attendanceStats.total) * 100)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">대시보드</h1>
        <p className="text-sm md:text-base text-muted-foreground">오늘의 운영 현황을 확인하세요</p>
      </div>

      {/* Real-time Status Section */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">실시간 현황</CardTitle>
                <CardDescription className="font-mono text-sm">
                  {currentTime.toLocaleString('ko-KR', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                  })}
                </CardDescription>
              </div>
            </div>
            <Badge variant="default" className="px-3 py-1 animate-pulse">
              LIVE
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            {/* 독서실 현황 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Armchair className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">독서실 출결</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary">{studyRoomUsers}</span>
                    <span className="text-muted-foreground">/ {studyRoomCapacity}석</span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${studyRoomPercentage}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    사용률 {studyRoomPercentage}% • 빈 좌석 {studyRoomCapacity - studyRoomUsers}석
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* 실시간 출결 현황 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">수업 출결</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-blue-600">{attendanceRate}</span>
                    <span className="text-muted-foreground">%</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">출석</span>
                      <span className="font-medium text-green-600">{attendanceStats.present}명</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">지각</span>
                      <span className="font-medium text-yellow-600">{attendanceStats.late}명</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">결석</span>
                      <span className="font-medium text-red-600">{attendanceStats.absent}명</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-300"
                      style={{ width: `${attendanceRate}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 현재 수업 현황 */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">진행 중인 수업</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-green-600">{ongoingClasses.length}</span>
                    <span className="text-muted-foreground">개</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-3 w-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">
                      수업 중인 학생 {totalStudentsInClass}명
                    </p>
                  </div>
                  {ongoingClasses.length > 0 ? (
                    <div className="pt-1">
                      <Badge variant="secondary" className="text-xs">
                        {ongoingClasses.length}개 수업 진행 중
                      </Badge>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground pt-1">현재 진행 중인 수업이 없습니다</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 진행 중인 수업 목록 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">수업 상세</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {ongoingClasses.length > 0 ? (
                    ongoingClasses.map((cls) => (
                      <div key={cls.id} className="flex items-start gap-2 p-2 bg-muted/50 rounded-md">
                        <div className="flex-shrink-0 w-1.5 h-1.5 mt-1.5 rounded-full bg-green-500 animate-pulse" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{cls.name}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span>{cls.teacher}</span>
                            <span>•</span>
                            <span>{cls.room}</span>
                            <span>•</span>
                            <span>{cls.students}명</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {cls.startTime} - {cls.endTime}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-center justify-center py-4 text-center">
                      <BookOpen className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
                      <p className="text-xs text-muted-foreground">
                        현재 진행 중인<br />수업이 없습니다
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {stat.trend === 'up' && <ArrowUp className="h-3 w-3 text-green-500" />}
                  {stat.trend === 'down' && <ArrowDown className="h-3 w-3 text-red-500" />}
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>월별 매출</CardTitle>
            <CardDescription>최근 6개월 매출 추이</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                <Tooltip
                  formatter={(value: number) =>
                    `₩${value.toLocaleString()}`
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Student Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>학생 증감 추이</CardTitle>
            <CardDescription>최근 6개월 학생 수 변화</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={studentTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar
                  dataKey="students"
                  fill="hsl(var(--primary))"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>주간 출결률</CardTitle>
          <CardDescription>이번 주 요일별 출결 현황</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[85, 100]} tickFormatter={(value) => `${value}%`} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Recent Activities */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>최근 활동</CardTitle>
            <CardDescription>최근 7일간의 주요 활동</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { time: '2시간 전', action: '김민준 학생이 수학 특강반에 등록했습니다' },
                { time: '5시간 전', action: '영어 회화반 수업이 완료되었습니다' },
                { time: '어제', action: '이서연 학생의 상담이 완료되었습니다' },
                { time: '2일 전', action: '새로운 국어 독해반이 개설되었습니다' },
              ].map((activity, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
                  <div>
                    <p className="text-muted-foreground text-xs">{activity.time}</p>
                    <p>{activity.action}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>공지사항</CardTitle>
            <CardDescription>중요한 공지사항</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { title: '여름 특강 안내', date: '2025-06-15' },
                { title: '학부모 상담 주간 운영', date: '2025-06-10' },
                { title: '시험 일정 안내', date: '2025-06-05' },
                { title: '신규 강좌 개설', date: '2025-06-01' },
              ].map((notice, i) => (
                <div key={i} className="flex justify-between items-start">
                  <p className="text-sm font-medium">{notice.title}</p>
                  <p className="text-xs text-muted-foreground">{notice.date}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
