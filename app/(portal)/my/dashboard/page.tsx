'use client'

export const runtime = 'edge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Calendar, Clock, CheckCircle, XCircle, BookOpen, TrendingUp } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// Mock data for student portal
const studentInfo = {
  name: '김민준',
  grade: 10,
  studentId: 'st1',
}

const weeklySchedule = [
  { day: '월요일', time: '15:00-17:00', subject: '수학', teacher: '박선생님', room: '301호' },
  { day: '수요일', time: '15:00-17:00', subject: '수학', teacher: '박선생님', room: '301호' },
  { day: '화요일', time: '17:00-19:00', subject: '영어', teacher: '이선생님', room: '205호' },
  { day: '목요일', time: '17:00-19:00', subject: '영어', teacher: '이선생님', room: '205호' },
  { day: '금요일', time: '15:00-17:00', subject: '국어', teacher: '최선생님', room: '103호' },
]

const attendanceRecords = [
  { date: '2025-06-17', subject: '수학', status: 'present', notes: '' },
  { date: '2025-06-17', subject: '영어', status: 'present', notes: '' },
  { date: '2025-06-16', subject: '수학', status: 'present', notes: '' },
  { date: '2025-06-16', subject: '국어', status: 'late', notes: '지하철 지연' },
  { date: '2025-06-15', subject: '영어', status: 'present', notes: '' },
  { date: '2025-06-14', subject: '수학', status: 'absent', notes: '병결' },
  { date: '2025-06-14', subject: '국어', status: 'present', notes: '' },
]

const examResults = [
  { subject: '수학', examName: '중간고사', score: 95, grade: 'A', date: '2025-06-01' },
  { subject: '영어', examName: '중간고사', score: 88, grade: 'B', date: '2025-06-03' },
  { subject: '국어', examName: '모의고사', score: 90, grade: 'A', date: '2025-05-30' },
]

const homeworkList = [
  { subject: '수학', title: '문제집 1단원', dueDate: '2025-06-20', status: 'submitted', score: 95 },
  { subject: '영어', title: '에세이 작성', dueDate: '2025-06-25', status: 'pending', score: null },
  { subject: '국어', title: '독서 감상문', dueDate: '2025-06-10', status: 'submitted', score: 90 },
]

const scoresTrend = [
  { month: '3월', score: 82 },
  { month: '4월', score: 85 },
  { month: '5월', score: 88 },
  { month: '6월', score: 91 },
]

const attendanceRate = [
  { month: '3월', rate: 92 },
  { month: '4월', rate: 95 },
  { month: '5월', rate: 94 },
  { month: '6월', rate: 96 },
]

export default function MyDashboardPage() {
  const attendanceThisMonth = attendanceRecords.length > 0
    ? Math.round((attendanceRecords.filter((r) => r.status === 'present').length / attendanceRecords.length) * 100)
    : 96

  const homeworkCompletionRate = homeworkList.length > 0
    ? Math.round((homeworkList.filter((h) => h.status === 'submitted').length / homeworkList.length) * 100)
    : 88

  const avgScore = examResults.length > 0
    ? Math.round(examResults.reduce((sum, e) => sum + e.score, 0) / examResults.length)
    : 91

  const statusMap = {
    present: { label: '출석', variant: 'default' as const, icon: CheckCircle },
    absent: { label: '결석', variant: 'destructive' as const, icon: XCircle },
    late: { label: '지각', variant: 'secondary' as const, icon: Clock },
    excused: { label: '인정결석', variant: 'outline' as const, icon: CheckCircle },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{studentInfo.name} 학생의 대시보드</h1>
        <p className="text-muted-foreground">{studentInfo.grade}학년 - 학습 현황을 확인하세요</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">출결률</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceThisMonth}%</div>
            <p className="text-xs text-muted-foreground">이번 달</p>
            <Progress value={attendanceThisMonth} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">과제 완료율</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{homeworkCompletionRate}%</div>
            <p className="text-xs text-muted-foreground">이번 달</p>
            <Progress value={homeworkCompletionRate} className="mt-2 h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 성적</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgScore}점</div>
            <p className="text-xs text-muted-foreground">최근 시험</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="schedule">
        <TabsList>
          <TabsTrigger value="schedule">시간표</TabsTrigger>
          <TabsTrigger value="attendance">출결</TabsTrigger>
          <TabsTrigger value="exams">성적</TabsTrigger>
          <TabsTrigger value="homework">과제</TabsTrigger>
          <TabsTrigger value="reports">리포트</TabsTrigger>
        </TabsList>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>주간 시간표</CardTitle>
              <CardDescription>이번 주 수업 일정</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {weeklySchedule.map((schedule, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="font-semibold">{schedule.day}</span>
                        <span className="text-sm text-muted-foreground">{schedule.time}</span>
                      </div>
                      <div className="h-12 w-px bg-border" />
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">{schedule.subject}</Badge>
                          <span className="text-sm">{schedule.teacher}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{schedule.room}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attendance Tab */}
        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>출결 기록</CardTitle>
              <CardDescription>최근 출결 현황</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left">날짜</th>
                      <th className="p-2 text-left">과목</th>
                      <th className="p-2 text-center">상태</th>
                      <th className="p-2 text-left">비고</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceRecords.map((record, i) => {
                      const statusInfo = statusMap[record.status as keyof typeof statusMap]
                      const Icon = statusInfo.icon
                      return (
                        <tr key={i} className="border-b">
                          <td className="p-2">{record.date}</td>
                          <td className="p-2">{record.subject}</td>
                          <td className="p-2 text-center">
                            <Badge variant={statusInfo.variant} className="gap-1">
                              <Icon className="h-3 w-3" />
                              {statusInfo.label}
                            </Badge>
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {record.notes || '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>월별 출결률</CardTitle>
              <CardDescription>최근 4개월 출결 추이</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={attendanceRate}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
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
        </TabsContent>

        {/* Exams Tab */}
        <TabsContent value="exams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>시험 성적</CardTitle>
              <CardDescription>최근 시험 결과</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left">과목</th>
                      <th className="p-2 text-left">시험명</th>
                      <th className="p-2 text-center">점수</th>
                      <th className="p-2 text-center">등급</th>
                      <th className="p-2 text-left">날짜</th>
                    </tr>
                  </thead>
                  <tbody>
                    {examResults.map((exam, i) => (
                      <tr key={i} className="border-b">
                        <td className="p-2">
                          <Badge variant="secondary">{exam.subject}</Badge>
                        </td>
                        <td className="p-2">{exam.examName}</td>
                        <td className="p-2 text-center font-medium">{exam.score}점</td>
                        <td className="p-2 text-center">
                          <Badge
                            variant={
                              exam.grade === 'A'
                                ? 'default'
                                : exam.grade === 'B'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {exam.grade}
                          </Badge>
                        </td>
                        <td className="p-2 text-muted-foreground">{exam.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>성적 추이</CardTitle>
              <CardDescription>최근 4개월 평균 성적 변화</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={scoresTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar
                    dataKey="score"
                    fill="hsl(var(--primary))"
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Homework Tab */}
        <TabsContent value="homework" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>과제 목록</CardTitle>
              <CardDescription>제출 과제 및 진행 중인 과제</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {homeworkList.map((hw, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{hw.subject}</Badge>
                        <span className="font-medium">{hw.title}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          마감: {hw.dueDate}
                        </span>
                        {hw.score && <span>점수: {hw.score}점</span>}
                      </div>
                    </div>
                    <Badge
                      variant={hw.status === 'submitted' ? 'default' : 'outline'}
                      className="gap-1"
                    >
                      {hw.status === 'submitted' ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          제출 완료
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3" />
                          제출 대기
                        </>
                      )}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>출결 요약</CardTitle>
                <CardDescription>이번 달 출결 통계</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">출석</span>
                  <span className="font-medium">
                    {attendanceRecords.filter((r) => r.status === 'present').length}회
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">지각</span>
                  <span className="font-medium">
                    {attendanceRecords.filter((r) => r.status === 'late').length}회
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">결석</span>
                  <span className="font-medium">
                    {attendanceRecords.filter((r) => r.status === 'absent').length}회
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>성적 요약</CardTitle>
                <CardDescription>최근 시험 평균</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {examResults.map((exam, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-sm">{exam.subject}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{exam.score}점</span>
                      <Badge variant="secondary">{exam.grade}</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>과제 요약</CardTitle>
                <CardDescription>과제 제출 현황</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">제출 완료</span>
                  <span className="font-medium">
                    {homeworkList.filter((h) => h.status === 'submitted').length}건
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">제출 대기</span>
                  <span className="font-medium">
                    {homeworkList.filter((h) => h.status === 'pending').length}건
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">완료율</span>
                  <span className="font-medium">{homeworkCompletionRate}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>수강 과목</CardTitle>
                <CardDescription>현재 수강 중인 과목</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {['수학', '영어', '국어'].map((subject, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Badge variant="secondary">{subject}</Badge>
                    <span className="text-sm text-muted-foreground">주 2회</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
