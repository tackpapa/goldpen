// 위젯 데이터 타입 정의

export interface WidgetStats {
  totalStudents: number
  activeStudents: number
  inactiveStudents: number
  newConsultations: number
  scheduledConsultations: number
  completedConsultations: number
  attendanceRate: number
  monthlyRevenue: number
  revenueChange: string
}

export interface GradeDistributionItem {
  grade: string
  students: number
}

export interface StudentTrendItem {
  month: string
  students: number
}

export interface TeacherStats {
  total: number
  active: number
  avgStudents: number
}

export interface ClassCapacityItem {
  class: string
  current: number
  max: number
}

export interface TodayClassItem {
  id: string
  name: string
  teacher: string
  room: string
  startTime: string
  endTime: string
  students: number
}

export interface UpcomingConsultationItem {
  time: string
  student: string
  parent: string
  type: string
}

export interface ConversionDataItem {
  month: string
  consultations: number
  enrollments: number
}

export interface ExamData {
  pending: number
  completed: number
  avgScore: number
}

export interface RecentExamItem {
  subject: string
  date: string
  avgScore: number
  students: number
}

export interface HomeworkData {
  active: number
  completed: number
  submissionRate: number
}

export interface HomeworkSubmissionItem {
  class: string
  submitted: number
  total: number
}

export interface AttendanceDataItem {
  date: string
  rate: number
}

export interface TodayAttendance {
  present: number
  late: number
  absent: number
  total: number
}

export interface AttendanceAlertItem {
  student: string
  status: string
  class: string
}

export interface LessonLogs {
  thisMonth: number
  pending: number
  avgRating: number
}

export interface RecentLessonItem {
  class: string
  date: string
  teacher: string
  topic: string
}

export interface RevenueDataItem {
  month: string
  revenue: number
}

export interface ExpenseCategoryItem {
  category: string
  amount: number
}

export interface ExpenseTrendItem {
  month: string
  expense: number
}

export interface RoomUsageItem {
  room: string
  usage: number
  classes: number
}

export interface SeatStatus {
  total: number
  occupied: number
  available: number
}

export interface RecentActivityItem {
  time: string
  action: string
  user?: string  // 활동을 수행한 사용자 이름
}

export interface AnnouncementItem {
  title: string
  date: string
}

// 전체 위젯 데이터 타입
export interface WidgetData {
  // Stats
  stats: WidgetStats
  // Students
  gradeDistribution: GradeDistributionItem[]
  studentTrendData: StudentTrendItem[]
  // Teachers
  teacherStats: TeacherStats
  // Classes
  totalClasses: number
  classCapacity: ClassCapacityItem[]
  todayClasses: TodayClassItem[]
  // Consultations
  upcomingConsultations: UpcomingConsultationItem[]
  conversionData: ConversionDataItem[]
  // Exams
  examData: ExamData
  recentExams: RecentExamItem[]
  // Homework
  homeworkData: HomeworkData
  homeworkSubmission: HomeworkSubmissionItem[]
  // Attendance
  attendanceData: AttendanceDataItem[]
  todayAttendance: TodayAttendance
  attendanceAlerts: AttendanceAlertItem[]
  // Lessons
  lessonLogs: LessonLogs
  recentLessons: RecentLessonItem[]
  // Revenue
  revenueData: RevenueDataItem[]
  // Expenses
  monthlyExpenses: number
  expenseCategory: ExpenseCategoryItem[]
  expenseTrend: ExpenseTrendItem[]
  // Rooms
  roomUsage: RoomUsageItem[]
  // Seats
  seatStatus: SeatStatus
  // Activities
  recentActivities: RecentActivityItem[]
  announcements: AnnouncementItem[]
}

// 기본 빈 위젯 데이터
export const emptyWidgetData: WidgetData = {
  stats: {
    totalStudents: 0,
    activeStudents: 0,
    inactiveStudents: 0,
    newConsultations: 0,
    scheduledConsultations: 0,
    completedConsultations: 0,
    attendanceRate: 0,
    monthlyRevenue: 0,
    revenueChange: '+0%',
  },
  gradeDistribution: [],
  studentTrendData: [],
  teacherStats: { total: 0, active: 0, avgStudents: 0 },
  totalClasses: 0,
  classCapacity: [],
  todayClasses: [],
  upcomingConsultations: [],
  conversionData: [],
  examData: { pending: 0, completed: 0, avgScore: 0 },
  recentExams: [],
  homeworkData: { active: 0, completed: 0, submissionRate: 0 },
  homeworkSubmission: [],
  attendanceData: [],
  todayAttendance: { present: 0, late: 0, absent: 0, total: 0 },
  attendanceAlerts: [],
  lessonLogs: { thisMonth: 0, pending: 0, avgRating: 0 },
  recentLessons: [],
  revenueData: [],
  monthlyExpenses: 0,
  expenseCategory: [],
  expenseTrend: [],
  roomUsage: [],
  seatStatus: { total: 0, occupied: 0, available: 0 },
  recentActivities: [],
  announcements: [],
}
