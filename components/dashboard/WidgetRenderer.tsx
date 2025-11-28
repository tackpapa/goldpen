'use client'

import { Widget } from '@/lib/types/widget'
import { WidgetData, emptyWidgetData } from '@/lib/types/widget-data'
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  BookOpen,
  ClipboardCheck,
  AlertCircle,
  Clock,
  Home,
  Armchair,
  FileText,
  GraduationCap,
  BarChart3,
  PieChart,
  TrendingDown,
  Activity,
  MessageCircle,
  Upload,
  ClipboardList,
  LineChart as LineChartIcon,
  Bell,
} from 'lucide-react'
import { WidgetWrapper } from './WidgetWrapper'
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { ArrowUp, ArrowDown } from 'lucide-react'

interface WidgetRendererProps {
  widget: Widget
  onRemove: () => void
  currentTime?: Date
  data?: WidgetData
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

// Helper function to get current classes
function getCurrentClasses(currentTime: Date, todayClasses: WidgetData['todayClasses']) {
  const currentHour = currentTime.getHours()
  const currentMinute = currentTime.getMinutes()
  const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`

  return todayClasses.filter((cls) => {
    return cls.startTime <= currentTimeStr && currentTimeStr < cls.endTime
  })
}

export function WidgetRenderer({ widget, onRemove, currentTime, data }: WidgetRendererProps) {
  // Use provided data or empty defaults
  const widgetData = data || emptyWidgetData

  const {
    stats,
    gradeDistribution,
    studentTrendData,
    teacherStats,
    classCapacity,
    todayClasses,
    upcomingConsultations,
    conversionData,
    examData,
    recentExams,
    homeworkData,
    homeworkSubmission,
    attendanceData,
    todayAttendance,
    attendanceAlerts,
    lessonLogs,
    recentLessons,
    revenueData,
    expenseCategory,
    expenseTrend,
    roomUsage,
    seatStatus,
    recentActivities,
    announcements,
  } = widgetData

  switch (widget.type) {
    case 'realtime-status':
      const currentClasses = currentTime ? getCurrentClasses(currentTime, todayClasses) : []
      return (
        <WidgetWrapper
          title="실시간 현황"
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{seatStatus.occupied}</div>
                <div className="text-xs text-muted-foreground">독서실 이용</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{currentClasses.length}</div>
                <div className="text-xs text-muted-foreground">진행 중 수업</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{todayAttendance.present}</div>
                <div className="text-xs text-muted-foreground">오늘 출석</div>
              </div>
            </div>
            {currentClasses.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-medium mb-2">진행 중인 수업</div>
                <div className="space-y-2">
                  {currentClasses.slice(0, 3).map((cls) => (
                    <div key={cls.id} className="text-xs p-2 bg-muted rounded">
                      <div className="font-medium">{cls.name}</div>
                      <div className="text-muted-foreground">{cls.teacher} • {cls.room}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </WidgetWrapper>
      )

    case 'students-total':
      return (
        <WidgetWrapper
          title="전체 학생"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          <div className="space-y-2">
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUp className="h-3 w-3 text-green-500" />
              {stats.revenueChange} 전월 대비
            </p>
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-muted-foreground">재학생</span>
              <span className="font-medium text-green-600">{stats.activeStudents}명</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">휴학생</span>
              <span className="font-medium text-yellow-600">{stats.inactiveStudents}명</span>
            </div>
          </div>
        </WidgetWrapper>
      )

    case 'students-grade-distribution':
      return (
        <WidgetWrapper
          title="학년별 분포"
          description="학년별 학생 수"
          icon={<BarChart3 className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          {gradeDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={gradeDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="grade" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="students" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              데이터가 없습니다
            </div>
          )}
        </WidgetWrapper>
      )

    case 'consultations-summary':
      return (
        <WidgetWrapper
          title="상담 현황"
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          <div className="space-y-2">
            <div className="text-2xl font-bold">{stats.newConsultations}</div>
            <p className="text-xs text-muted-foreground">신규 상담</p>
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-muted-foreground">예정</span>
              <span className="font-medium text-blue-600">{stats.scheduledConsultations}건</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">입교</span>
              <span className="font-medium text-green-600">{stats.completedConsultations}건</span>
            </div>
          </div>
        </WidgetWrapper>
      )

    case 'consultations-conversion':
      return (
        <WidgetWrapper
          title="입교 전환율"
          description="상담→입교 전환 추이"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          {conversionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="consultations" stroke="#3b82f6" name="상담" />
                <Line type="monotone" dataKey="enrollments" stroke="#10b981" name="입교" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              데이터가 없습니다
            </div>
          )}
        </WidgetWrapper>
      )

    case 'classes-summary':
      return (
        <WidgetWrapper
          title="반 운영 현황"
          icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          <div className="space-y-2">
            <div className="text-2xl font-bold">{widgetData.totalClasses}</div>
            <p className="text-xs text-muted-foreground">운영 중인 반</p>
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-muted-foreground">평균 충원율</span>
              <span className="font-medium text-green-600">
                {classCapacity.length > 0
                  ? Math.round(classCapacity.reduce((acc, c) => acc + (c.current / c.max) * 100, 0) / classCapacity.length)
                  : 0}%
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">평균 인원</span>
              <span className="font-medium">
                {classCapacity.length > 0
                  ? (classCapacity.reduce((acc, c) => acc + c.current, 0) / classCapacity.length).toFixed(1)
                  : 0}명
              </span>
            </div>
          </div>
        </WidgetWrapper>
      )

    case 'classes-capacity':
      return (
        <WidgetWrapper
          title="반별 충원율"
          description="주요 반 충원 현황"
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          {classCapacity.length > 0 ? (
            <div className="space-y-3">
              {classCapacity.map((cls, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{cls.class}</span>
                    <span className="text-muted-foreground">{cls.current}/{cls.max}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${(cls.current / cls.max) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">등록된 반이 없습니다</div>
          )}
        </WidgetWrapper>
      )

    case 'exams-summary':
      return (
        <WidgetWrapper
          title="시험 현황"
          icon={<ClipboardCheck className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          <div className="space-y-2">
            <div className="text-2xl font-bold">{examData.pending + examData.completed}</div>
            <p className="text-xs text-muted-foreground">총 시험 수</p>
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-muted-foreground">채점 대기</span>
              <span className="font-medium text-yellow-600">{examData.pending}건</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">평균 점수</span>
              <span className="font-medium text-green-600">{examData.avgScore}점</span>
            </div>
          </div>
        </WidgetWrapper>
      )

    case 'exams-recent':
      return (
        <WidgetWrapper
          title="최근 시험 결과"
          description="평균 성적 및 응시 인원"
          icon={<ClipboardList className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          {recentExams.length > 0 ? (
            <div className="space-y-3">
              {recentExams.map((exam, i) => (
                <div key={i} className="flex justify-between items-start text-sm">
                  <div>
                    <div className="font-medium">{exam.subject}</div>
                    <div className="text-xs text-muted-foreground">{exam.date} • {exam.students}명</div>
                  </div>
                  <div className="text-lg font-bold">{exam.avgScore}점</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">최근 시험이 없습니다</div>
          )}
        </WidgetWrapper>
      )

    case 'homework-summary':
      return (
        <WidgetWrapper
          title="과제 현황"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          <div className="space-y-2">
            <div className="text-2xl font-bold">{homeworkData.active}</div>
            <p className="text-xs text-muted-foreground">진행 중인 과제</p>
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-muted-foreground">완료</span>
              <span className="font-medium text-green-600">{homeworkData.completed}건</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">평균 제출률</span>
              <span className="font-medium">{homeworkData.submissionRate}%</span>
            </div>
          </div>
        </WidgetWrapper>
      )

    case 'homework-submission':
      return (
        <WidgetWrapper
          title="과제 제출률"
          description="반별 제출 현황"
          icon={<Upload className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          {homeworkSubmission.length > 0 ? (
            <div className="space-y-3">
              {homeworkSubmission.map((hw, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{hw.class}</span>
                    <span className="text-muted-foreground">{hw.submitted}/{hw.total}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${hw.total > 0 ? (hw.submitted / hw.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">과제 데이터가 없습니다</div>
          )}
        </WidgetWrapper>
      )

    case 'billing-summary':
      return (
        <WidgetWrapper
          title="재무 현황"
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          <div className="space-y-2">
            <div className="text-xl font-bold">₩{stats.monthlyRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUp className="h-3 w-3 text-green-500" />
              {stats.revenueChange} 전월 대비
            </p>
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-muted-foreground">이번 달</span>
              <span className="font-medium text-green-600">₩{stats.monthlyRevenue.toLocaleString()}</span>
            </div>
          </div>
        </WidgetWrapper>
      )

    case 'billing-revenue-trend':
      return (
        <WidgetWrapper
          title="월별 매출"
          description="최근 6개월 매출 추이"
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          {revenueData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${Math.round(value / 10000)}만`} />
                <Tooltip formatter={(value: number) => `₩${value.toLocaleString()}`} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              데이터가 없습니다
            </div>
          )}
        </WidgetWrapper>
      )

    case 'billing-expense-category':
      // 상위 5개 카테고리만 표시, 나머지는 '기타'로 합침
      const sortedExpenses = [...expenseCategory].sort((a, b) => b.amount - a.amount)
      const topExpenses = sortedExpenses.slice(0, 5)
      const otherAmount = sortedExpenses.slice(5).reduce((sum, e) => sum + e.amount, 0)
      const displayExpenses = otherAmount > 0
        ? [...topExpenses, { category: '기타', amount: otherAmount }]
        : topExpenses
      const totalExpense = displayExpenses.reduce((sum, e) => sum + e.amount, 0)

      return (
        <WidgetWrapper
          title="지출 카테고리"
          description="항목별 지출 분포"
          icon={<PieChart className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          {displayExpenses.length > 0 ? (
            <div className="flex flex-col gap-2">
              <ResponsiveContainer width="100%" height={140}>
                <RechartsPieChart>
                  <Pie
                    data={displayExpenses}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={55}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {displayExpenses.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `₩${value.toLocaleString()}`} />
                </RechartsPieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs px-2">
                {displayExpenses.map((item, index) => (
                  <div key={item.category} className="flex items-center gap-1.5 truncate">
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="truncate text-muted-foreground">{item.category}</span>
                    <span className="ml-auto font-medium">{totalExpense > 0 ? Math.round((item.amount / totalExpense) * 100) : 0}%</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              데이터가 없습니다
            </div>
          )}
        </WidgetWrapper>
      )

    case 'attendance-today':
      return (
        <WidgetWrapper
          title="오늘 출결"
          icon={<ClipboardCheck className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          <div className="space-y-2">
            <div className="text-2xl font-bold">{todayAttendance.present}</div>
            <p className="text-xs text-muted-foreground">
              출석 ({todayAttendance.total > 0 ? ((todayAttendance.present / todayAttendance.total) * 100).toFixed(0) : 0}%)
            </p>
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-muted-foreground">지각</span>
              <span className="font-medium text-yellow-600">{todayAttendance.late}명</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">결석</span>
              <span className="font-medium text-red-600">{todayAttendance.absent}명</span>
            </div>
          </div>
        </WidgetWrapper>
      )

    case 'attendance-weekly':
      return (
        <WidgetWrapper
          title="주간 출결률"
          description="이번 주 요일별 출결 현황"
          icon={<LineChartIcon className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          {attendanceData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={attendanceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
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
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              데이터가 없습니다
            </div>
          )}
        </WidgetWrapper>
      )

    case 'attendance-alerts':
      return (
        <WidgetWrapper
          title="출결 경고"
          icon={<AlertCircle className="h-4 w-4 text-red-500" />}
          description="주의가 필요한 학생"
          onRemove={onRemove}
        >
          {attendanceAlerts.length > 0 ? (
            <div className="space-y-3">
              {attendanceAlerts.map((alert, i) => (
                <div key={i} className="p-2 bg-red-50 dark:bg-red-950 rounded text-sm">
                  <div className="font-medium text-red-700 dark:text-red-400">{alert.student}</div>
                  <div className="text-xs text-red-600 dark:text-red-500">{alert.status}</div>
                  <div className="text-xs text-muted-foreground">{alert.class}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">경고 학생이 없습니다</div>
          )}
        </WidgetWrapper>
      )

    case 'lessons-summary':
      return (
        <WidgetWrapper
          title="수업일지 현황"
          icon={<BookOpen className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          <div className="space-y-2">
            <div className="text-2xl font-bold">{lessonLogs.thisMonth}</div>
            <p className="text-xs text-muted-foreground">이번 달 작성</p>
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-muted-foreground">미작성</span>
              <span className="font-medium text-yellow-600">{lessonLogs.pending}건</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">평균 평점</span>
              <span className="font-medium text-green-600">⭐ {lessonLogs.avgRating}</span>
            </div>
          </div>
        </WidgetWrapper>
      )

    case 'lessons-recent':
      return (
        <WidgetWrapper
          title="최근 수업일지"
          description="최근 작성된 수업일지"
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          {recentLessons.length > 0 ? (
            <div className="space-y-3">
              {recentLessons.map((lesson, i) => (
                <div key={i} className="text-sm">
                  <div className="font-medium">{lesson.class}</div>
                  <div className="text-xs text-muted-foreground">{lesson.topic}</div>
                  <div className="text-xs text-muted-foreground">{lesson.teacher} • {lesson.date}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">최근 수업일지가 없습니다</div>
          )}
        </WidgetWrapper>
      )

    case 'teachers-summary':
      return (
        <WidgetWrapper
          title="강사 현황"
          icon={<GraduationCap className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          <div className="space-y-2">
            <div className="text-2xl font-bold">{teacherStats.total}</div>
            <p className="text-xs text-muted-foreground">전체 강사</p>
            <div className="flex items-center justify-between text-xs pt-2">
              <span className="text-muted-foreground">활동 중</span>
              <span className="font-medium text-green-600">{teacherStats.active}명</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">평균 담당 학생</span>
              <span className="font-medium">{teacherStats.avgStudents}명</span>
            </div>
          </div>
        </WidgetWrapper>
      )

    case 'schedule-today':
      return (
        <WidgetWrapper
          title="오늘 수업 일정"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          description="오늘 예정된 수업"
          onRemove={onRemove}
        >
          {todayClasses.length > 0 ? (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {todayClasses.slice(0, 5).map((cls) => (
                <div key={cls.id} className="text-sm p-2 bg-muted rounded">
                  <div className="font-medium">{cls.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {cls.startTime}-{cls.endTime} • {cls.teacher} • {cls.room}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">오늘 예정된 수업이 없습니다</div>
          )}
        </WidgetWrapper>
      )

    case 'rooms-usage':
      return (
        <WidgetWrapper
          title="강의실 사용률"
          icon={<Home className="h-4 w-4 text-muted-foreground" />}
          description="강의실별 사용 현황"
          onRemove={onRemove}
        >
          {roomUsage.length > 0 ? (
            <div className="space-y-3">
              {roomUsage.map((room, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{room.room}</span>
                    <span className="text-muted-foreground">{room.usage}% ({room.classes}개 수업)</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${room.usage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">등록된 강의실이 없습니다</div>
          )}
        </WidgetWrapper>
      )

    case 'seats-realtime':
      return (
        <WidgetWrapper
          title="독서실 좌석"
          icon={<Armchair className="h-4 w-4 text-muted-foreground" />}
          description="실시간 좌석 현황"
          onRemove={onRemove}
        >
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-4xl font-bold">{seatStatus.occupied}/{seatStatus.total}</div>
              <div className="text-sm text-muted-foreground">사용 중 좌석</div>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${seatStatus.total > 0 ? (seatStatus.occupied / seatStatus.total) * 100 : 0}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>사용 중: {seatStatus.occupied}석</span>
              <span>남은 좌석: {seatStatus.available}석</span>
            </div>
          </div>
        </WidgetWrapper>
      )

    case 'expenses-summary':
      return (
        <WidgetWrapper
          title="지출 현황"
          icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          <div className="space-y-2">
            <div className="text-xl font-bold">₩{widgetData.monthlyExpenses.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowDown className="h-3 w-3 text-red-500" />
              이번 달 지출
            </p>
            {expenseCategory.slice(0, 2).map((cat, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate mr-2">{cat.category}</span>
                <span className="font-medium whitespace-nowrap">₩{cat.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </WidgetWrapper>
      )

    case 'expenses-trend':
      return (
        <WidgetWrapper
          title="지출 추이"
          description="월별 지출 변화"
          icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          {expenseTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={expenseTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${Math.round(value / 10000)}만`} />
                <Tooltip formatter={(value: number) => `₩${value.toLocaleString()}`} />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#ef4444"
                  fill="#ef4444"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
              데이터가 없습니다
            </div>
          )}
        </WidgetWrapper>
      )

    case 'recent-activities':
      return (
        <WidgetWrapper
          title="최근 활동"
          description="최근 7일간의 주요 활동"
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          {recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-primary" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">{activity.time}</span>
                      {activity.user && (
                        <span className="text-xs font-medium text-primary">{activity.user}</span>
                      )}
                    </div>
                    <p className="truncate">{activity.action}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">최근 활동이 없습니다</div>
          )}
        </WidgetWrapper>
      )

    case 'announcements':
      return (
        <WidgetWrapper
          title="공지사항"
          description="중요한 공지사항"
          icon={<Bell className="h-4 w-4 text-muted-foreground" />}
          onRemove={onRemove}
        >
          {announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((notice, i) => (
                <div key={i} className="flex justify-between items-start">
                  <p className="text-sm font-medium">{notice.title}</p>
                  <p className="text-xs text-muted-foreground">{notice.date}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">공지사항이 없습니다</div>
          )}
        </WidgetWrapper>
      )

    default:
      return (
        <WidgetWrapper title={widget.title} description={widget.description} onRemove={onRemove}>
          <div className="text-sm text-muted-foreground">위젯을 준비 중입니다...</div>
        </WidgetWrapper>
      )
  }
}
