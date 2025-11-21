/**
 * Supabase Database Types
 * 자동 생성된 타입 정의
 */

// ============================================
// STUDENT CORE (가볍게 유지)
// ============================================
export interface StudentFile {
  id: string
  name: string
  type: string // MIME type
  size: number // bytes
  url: string // Base64 or file URL
  uploaded_at: string
}

export interface Student {
  id: string
  created_at: string
  updated_at: string
  org_id: string
  name: string
  attendance_code?: string // 출결용 4자리 고유 번호 (자동 생성, 변경 불가)
  grade: string // 중1, 중2, 중3, 고1, 고2, 고3, 재수
  school: string // 학교명
  phone: string
  parent_name: string
  parent_phone: string
  parent_email?: string
  address?: string
  subjects: string[] // 수강 과목 배열
  status: 'active' | 'inactive' | 'graduated'
  enrollment_date: string // 입교 날짜
  notes?: string
  files?: StudentFile[] // 학생 자료 파일
}

// ============================================
// SERVICE ENROLLMENT (서비스 소속)
// ============================================
export interface ServiceEnrollment {
  id: string
  created_at: string
  student_id: string
  service_type: 'academy' | 'study_room' | 'study_center'
  status: 'active' | 'inactive' | 'paused'
  enrolled_at: string
  notes?: string
}

export type ServiceEnrollmentInsert = Omit<ServiceEnrollment, 'id' | 'created_at'>

// ============================================
// ATTENDANCE SCHEDULE (출근 스케줄)
// ============================================
export interface AttendanceSchedule {
  id: string
  created_at: string
  updated_at: string
  student_id: string
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  start_time: string // "09:00"
  end_time: string   // "18:00"
  notes?: string
}

export type AttendanceScheduleInsert = Omit<AttendanceSchedule, 'id' | 'created_at' | 'updated_at'>

// ============================================
// CLASS CREDITS (수업 크레딧)
// ============================================
export interface ClassCredit {
  id: string
  created_at: string
  student_id: string
  total_hours: number      // 총 충전 시간
  used_hours: number       // 사용한 시간
  remaining_hours: number  // 남은 시간
  expiry_date?: string     // 만료일 (optional)
  status: 'active' | 'expired' | 'depleted'
}

// 크레딧 트랜잭션 (충전/사용 내역)
export interface CreditTransaction {
  id: string
  created_at: string
  student_id: string
  credit_id: string
  type: 'charge' | 'use' | 'refund' | 'expire'
  amount: number           // 변동 시간 (+ or -)
  balance_after: number    // 거래 후 잔액
  related_payment_id?: string
  related_class_id?: string  // 수업 사용 시
  notes?: string
}

export type ClassCreditInsert = Omit<ClassCredit, 'id' | 'created_at'>
export type CreditTransactionInsert = Omit<CreditTransaction, 'id' | 'created_at'>

// ============================================
// STUDY ROOM PASS (독서실 이용권)
// ============================================
export interface StudyRoomPass {
  id: string
  created_at: string
  student_id: string
  pass_type: 'hours' | 'days'  // 시간권 or 일수권
  total_amount: number         // 총 시간/일수
  remaining_amount: number     // 남은 시간/일수
  start_date: string
  expiry_date: string
  status: 'active' | 'expired' | 'paused' | 'depleted'
  notes?: string
}

// 독서실 이용 내역
export interface StudyRoomUsage {
  id: string
  created_at: string
  student_id: string
  pass_id: string
  check_in: string   // ISO datetime
  check_out?: string // ISO datetime
  duration_hours?: number  // 계산된 이용 시간
  notes?: string
}

export type StudyRoomPassInsert = Omit<StudyRoomPass, 'id' | 'created_at'>
export type StudyRoomUsageInsert = Omit<StudyRoomUsage, 'id' | 'created_at'>

// ============================================
// PAYMENT RECORDS (결제 내역)
// ============================================
export interface PaymentRecord {
  id: string
  created_at: string
  org_id: string
  student_id: string
  student_name: string

  // 결제 정보
  amount: number
  payment_date: string
  payment_method: 'card' | 'cash' | 'transfer'

  // 수입 항목 (Revenue Category 연동)
  revenue_category_id: string
  revenue_category_name: string

  // 부여 항목 (optional)
  granted_credits?: {
    hours: number
    credit_id: string  // 생성된 ClassCredit ID
  }
  granted_pass?: {
    type: 'hours' | 'days'
    amount: number
    pass_id: string  // 생성된 StudyRoomPass ID
  }

  status: 'completed' | 'refunded' | 'pending'
  refunded_at?: string
  notes?: string
}

export type PaymentRecordInsert = Omit<PaymentRecord, 'id' | 'created_at'>

export interface Class {
  id: string
  created_at: string
  updated_at: string
  org_id: string
  name: string
  subject: string
  teacher_id: string
  teacher_name: string
  capacity: number
  current_students: number
  schedule: {
    day: string
    start_time: string
    end_time: string
  }[]
  room?: string
  status: 'active' | 'inactive'
  notes?: string
}

export interface ClassStudent {
  id: string
  class_id: string
  student_id: string
  joined_at: string
  status: 'active' | 'inactive'
}

export interface Attendance {
  id: string
  created_at: string
  date: string
  class_id: string
  student_id: string
  status: 'present' | 'absent' | 'late' | 'excused'
  notes?: string
}

export interface Payment {
  id: string
  created_at: string
  org_id: string
  student_id: string
  amount: number
  payment_date: string
  payment_method: 'card' | 'cash' | 'transfer'
  status: 'pending' | 'paid' | 'overdue'
  notes?: string
}

// Insert types (without auto-generated fields)
export type StudentInsert = Omit<Student, 'id' | 'created_at' | 'updated_at'>
export type ClassInsert = Omit<Class, 'id' | 'created_at' | 'updated_at'>
export type ClassStudentInsert = Omit<ClassStudent, 'id'>
export type AttendanceInsert = Omit<Attendance, 'id' | 'created_at'>
export type PaymentInsert = Omit<Payment, 'id' | 'created_at'>

// Update types (all fields optional except id)
export type StudentUpdate = Partial<Omit<Student, 'id' | 'created_at'>>
export type ClassUpdate = Partial<Omit<Class, 'id' | 'created_at'>>

// Dashboard statistics
export interface DashboardStats {
  total_students: number
  active_students: number
  total_classes: number
  monthly_revenue: number
  attendance_rate: number
  pending_consultations: number
}

export interface MonthlyRevenue {
  month: string
  revenue: number
}

export interface StudentTrend {
  month: string
  students: number
}

export interface AttendanceRate {
  date: string
  rate: number
}

// Consultation
export interface Consultation {
  id: string
  created_at: string
  updated_at: string
  org_id: string
  student_name: string
  student_grade?: number
  parent_name: string
  parent_phone: string
  parent_email?: string
  goals?: string
  preferred_times?: string
  scheduled_date?: string
  status: 'new' | 'scheduled' | 'enrolled' | 'rejected' | 'on_hold' | 'waitlist'
  notes?: string
  result?: string
  enrolled_date?: string // 입교 날짜 (상태가 enrolled일 때)
  images?: string[] // 업로드된 이미지 URL 배열 (Base64 or file URL)
}

export type ConsultationInsert = Omit<Consultation, 'id' | 'created_at' | 'updated_at'>
export type ConsultationUpdate = Partial<Omit<Consultation, 'id' | 'created_at'>>

// Exam
export interface Exam {
  id: string
  created_at: string
  updated_at: string
  org_id: string
  name: string
  subject: string
  class_id: string
  class_name: string
  exam_date: string
  exam_time: string
  total_score: number
  status: 'scheduled' | 'completed' | 'cancelled'
  notes?: string
}

export interface ExamScore {
  id: string
  exam_id: string
  student_id: string
  student_name: string
  score: number
  grade?: string
  notes?: string
}

export type ExamInsert = Omit<Exam, 'id' | 'created_at' | 'updated_at'>
export type ExamScoreInsert = Omit<ExamScore, 'id'>

// Homework
export interface Homework {
  id: string
  created_at: string
  updated_at: string
  org_id: string
  title: string
  description: string
  class_id: string
  class_name: string
  due_date: string
  status: 'active' | 'completed' | 'overdue'
  total_students: number
  submitted_count: number
}

export interface HomeworkSubmission {
  id: string
  homework_id: string
  student_id: string
  student_name: string
  submitted_at?: string
  status: 'submitted' | 'not_submitted' | 'late'
  score?: number
  feedback?: string
}

export type HomeworkInsert = Omit<Homework, 'id' | 'created_at' | 'updated_at'>
export type HomeworkSubmissionInsert = Omit<HomeworkSubmission, 'id'>

// Billing & Payment
export interface Invoice {
  id: string
  created_at: string
  updated_at: string
  org_id: string
  student_id: string
  student_name: string
  invoice_number: string
  items: {
    description: string
    amount: number
  }[]
  total_amount: number
  due_date: string
  payment_status: 'pending' | 'paid' | 'overdue' | 'cancelled'
  paid_at?: string
  payment_method?: 'card' | 'cash' | 'transfer'
  notes?: string
}

export type InvoiceInsert = Omit<Invoice, 'id' | 'created_at' | 'updated_at'>

// Settings
export interface Organization {
  id: string
  name: string
  owner_name?: string // 원장 이름
  address: string
  phone: string
  email: string
  logo_url?: string
  settings: {
    auto_sms: boolean
    auto_email: boolean
    notification_enabled: boolean
  }
}

export interface Branch {
  id: string
  org_id: string
  name: string
  address: string
  phone: string
  manager_name: string
  status: 'active' | 'inactive'
}

// Lesson Notes
export interface LessonNote {
  id: string
  created_at: string
  updated_at: string
  org_id: string
  lesson_date: string
  lesson_time: string
  lesson_duration?: number // 수업 시간 (분 단위)
  class_id: string
  class_name: string
  teacher_id: string
  teacher_name: string
  student_id?: string // 학생 ID
  student_name?: string // 학생 이름
  subject: string
  content: string // 학습 내용
  student_attitudes: string // 학생 태도
  comprehension_level: 'high' | 'medium' | 'low' // 이해도
  homework_assigned?: string // 과제
  next_lesson_plan?: string // 다음 수업 계획
  parent_feedback?: string // 부모 피드백 (GPT 생성)
  notes?: string
}

export type LessonNoteInsert = Omit<LessonNote, 'id' | 'created_at' | 'updated_at'>
export type LessonNoteUpdate = Partial<Omit<LessonNote, 'id' | 'created_at'>>

// Teachers
export interface Teacher {
  id: string
  created_at: string
  updated_at: string
  org_id: string
  name: string
  email: string
  phone: string
  subjects: string[] // 담당 과목 배열
  status: 'active' | 'inactive'
  employment_type: 'full_time' | 'part_time' | 'contract'
  salary_type: 'monthly' | 'hourly'
  salary_amount: number // 월급 or 시급
  hire_date: string
  lesson_note_token?: string // 수업일지 등록 고유 토큰
  assigned_students?: string[] // 배정된 학생 ID 배열
  total_hours_worked?: number // 시간강사 총 근무 시간
  earned_salary?: number // 시간강사 누적 급여 (시급 × 시간)
  notes?: string
}

export interface TeacherClass {
  teacher_id: string
  class_id: string
  class_name: string
  subject: string
  student_count: number
}

export type TeacherInsert = Omit<Teacher, 'id' | 'created_at' | 'updated_at'>
export type TeacherUpdate = Partial<Omit<Teacher, 'id' | 'created_at'>>

// Schedule
export interface Schedule {
  id: string
  created_at: string
  org_id: string
  class_id: string
  class_name: string
  teacher_id: string
  teacher_name: string
  subject: string
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  start_time: string
  end_time: string
  room?: string
  notes?: string
}

export type ScheduleInsert = Omit<Schedule, 'id' | 'created_at'>

// Rooms (교실관리)
export interface Room {
  id: string
  created_at: string
  org_id: string
  name: string
  capacity: number
  status: 'active' | 'inactive'
  notes?: string
}

export interface RoomSchedule {
  id: string
  created_at: string
  room_id: string
  room_name: string
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  start_time: string
  end_time: string
  teacher_id?: string
  teacher_name?: string
  student_id?: string
  student_name?: string
  student_grade?: number
  notes?: string
}

export type RoomInsert = Omit<Room, 'id' | 'created_at'>
export type RoomScheduleInsert = Omit<RoomSchedule, 'id' | 'created_at'>

// Revenue Settlement (매출정산)
export interface RevenueSettlement {
  id: string
  created_at: string
  org_id: string
  period_start: string // 정산 기간 시작
  period_end: string // 정산 기간 종료
  total_revenue: number // 총 수익 (수강료)
  total_expenses: number // 총 지출 (급여 등)
  teacher_salaries: {
    teacher_id: string
    teacher_name: string
    amount: number
    hours_worked?: number // 시간강사 근무 시간
  }[]
  other_expenses: {
    description: string
    amount: number
    category: 'rent' | 'utilities' | 'supplies' | 'marketing' | 'other'
  }[]
  net_profit: number // 순이익
  notes?: string
}

export type RevenueSettlementInsert = Omit<RevenueSettlement, 'id' | 'created_at'>

// Monthly Revenue Summary (월별 매출 요약)
export interface MonthlyRevenueSummary {
  month: string // YYYY-MM
  revenue: number // 수강료 수익
  expenses: number // 지출
  net_profit: number // 순이익
  student_count: number // 등록 학생 수
  revenue_per_student: number // 학생당 평균 수익
}

// Revenue Category (수입 항목)
export interface RevenueCategory {
  id: string
  name: string // 항목명 (예: 수강료, 자릿세, 룸이용료, 교재판매)
  description?: string // 설명
  is_active: boolean // 활성화 여부
  order: number // 정렬 순서
  created_at: string
}

export type RevenueCategoryInsert = Omit<RevenueCategory, 'id' | 'created_at'>

// Default Revenue Categories (기본 수입 항목)
export const DEFAULT_REVENUE_CATEGORIES: Omit<RevenueCategory, 'id' | 'created_at'>[] = [
  { name: '수강료', description: '학생 수강료 수입', is_active: true, order: 1 },
  { name: '자릿세', description: '독서실 좌석 이용료', is_active: true, order: 2 },
  { name: '룸이용료', description: '스터디룸 대여료', is_active: true, order: 3 },
  { name: '교재판매', description: '교재 및 교구 판매 수입', is_active: true, order: 4 },
]

// Expense Category (지출 항목)
export interface ExpenseCategory {
  id: string
  name: string // 항목명 (예: 강사 급여, 임대료, 관리비, 교재/교구, 마케팅, 기타)
  description?: string // 설명
  is_active: boolean // 활성화 여부
  order: number // 정렬 순서
  color: string // 차트 색상 (hex)
  created_at: string
}

export type ExpenseCategoryInsert = Omit<ExpenseCategory, 'id' | 'created_at'>

// Default Expense Categories (기본 지출 항목)
export const DEFAULT_EXPENSE_CATEGORIES: Omit<ExpenseCategory, 'id' | 'created_at'>[] = [
  { name: '강사 급여', description: '정규직 및 시간강사 급여', is_active: true, order: 1, color: '#3b82f6' },
  { name: '임대료', description: '건물/시설 임대료', is_active: true, order: 2, color: '#8b5cf6' },
  { name: '관리비', description: '전기/수도/인터넷 등', is_active: true, order: 3, color: '#ec4899' },
  { name: '교재/교구', description: '교재 및 교구 구입비', is_active: true, order: 4, color: '#f59e0b' },
  { name: '마케팅', description: '광고/홍보 비용', is_active: true, order: 5, color: '#10b981' },
  { name: '기타', description: '기타 운영 비용', is_active: true, order: 6, color: '#6b7280' },
]

// Expense Record (지출 기록)
export interface ExpenseRecord {
  id: string
  created_at: string
  org_id: string
  category_id: string
  category_name: string
  amount: number
  expense_date: string
  is_recurring: boolean // 반복성 지출 여부
  recurring_type?: 'weekly' | 'monthly' // 주마다 / 월마다
  notes?: string
}

export type ExpenseRecordInsert = Omit<ExpenseRecord, 'id' | 'created_at'>

// Monthly Expense Summary (월별 지출 요약)
export interface MonthlyExpenseSummary {
  month: string // YYYY-MM
  total_expenses: number // 총 지출
  category_expenses: {
    category_id: string
    category_name: string
    amount: number
    percentage: number
  }[]
  previous_month_total?: number // 전월 총 지출
  change_percentage?: number // 전월 대비 변화율
}

// ============================================
// LIVE SCREEN (독서실 라이브 스크린)
// ============================================

// 개별 학습 계획 (태스크)
export interface StudyPlan {
  id: string
  subject: string
  subject_id?: string      // 타이머 과목 연동 시
  subject_color?: string   // 과목 색상
  description: string
  completed: boolean
  started_at?: string      // 태스크 시작 시간
  completed_at?: string    // 완료 시간
  elapsed_seconds?: number // 소요 시간 (초)
}

// 일일 플래너 (학생의 오늘 공부 계획)
export interface DailyPlanner {
  id: string
  created_at: string
  student_id: string
  seat_number: number
  date: string // YYYY-MM-DD
  study_plans: StudyPlan[]
  notes?: string
}

export type DailyPlannerInsert = Omit<DailyPlanner, 'id' | 'created_at'>

// 외출 기록
export interface OutingRecord {
  id: string
  created_at: string
  student_id: string
  seat_number: number
  date: string
  outing_time: string // ISO datetime
  return_time?: string // ISO datetime
  reason: string
  status: 'out' | 'returned'
}

export type OutingRecordInsert = Omit<OutingRecord, 'id' | 'created_at'>

// 수면 기록 (하루 2회 제한)
export interface SleepRecord {
  id: string
  created_at: string
  student_id: string
  seat_number: number
  date: string
  sleep_time: string // ISO datetime
  wake_time?: string // ISO datetime
  duration_minutes?: number
  status: 'sleeping' | 'awake'
}

export type SleepRecordInsert = Omit<SleepRecord, 'id' | 'created_at'>

// 학생 일일 공부 시간 (타이머 기록)
export interface StudyTimeRecord {
  id: string
  created_at: string
  student_id: string
  student_name: string
  seat_number: number
  org_id: string
  date: string // YYYY-MM-DD
  study_duration_minutes: number // 총 공부 시간 (분)
  timer_sessions: {
    id: string
    start_time: string
    end_time: string
    duration_minutes: number
  }[]
}

export type StudyTimeRecordInsert = Omit<StudyTimeRecord, 'id' | 'created_at'>

// 공부시간 랭킹
export interface StudyTimeRanking {
  student_id: string
  student_name: string
  surname: string // 성만 공개 (예: 김**)
  total_minutes: number
  rank: number
  period_type: 'daily' | 'weekly' | 'monthly'
  period: string // YYYY-MM-DD for daily, YYYY-WW for weekly, YYYY-MM for monthly
}

// Live Screen 상태 (학생당 하루 사용 제한)
export interface LiveScreenState {
  student_id: string
  seat_number: number
  date: string
  sleep_count: number // 오늘 수면 사용 횟수 (최대 2)
  is_out: boolean // 현재 외출 중인지
  current_outing_id?: string
  current_sleep_id?: string
  timer_running: boolean
  timer_start_time?: string
}

// 과목 정의 (Subject)
export interface Subject {
  id: string
  created_at: string
  student_id: string
  name: string // 과목명 (예: 국어, 영어, 수학)
  color: string // 버튼 색상 (hex, 예: #FF6B35)
  order: number // 정렬 순서
}

export type SubjectInsert = Omit<Subject, 'id' | 'created_at'>

// 과목별 공부 세션 (Study Session by Subject)
export interface StudySession {
  id: string
  created_at: string
  student_id: string
  subject_id: string
  subject_name: string
  date: string // YYYY-MM-DD
  start_time: string // ISO datetime
  end_time?: string // ISO datetime
  duration_seconds: number
  status: 'active' | 'completed'
}

export type StudySessionInsert = Omit<StudySession, 'id' | 'created_at'>

// 과목별 통계 (일별)
export interface SubjectStatistics {
  subject_id: string
  subject_name: string
  subject_color: string
  total_seconds: number
  session_count: number
  date: string // YYYY-MM-DD
}

// 호출 기록 (Call Records)
export interface CallRecord {
  id: string
  created_at: string
  student_id: string
  seat_number: number
  date: string // YYYY-MM-DD
  call_time: string // ISO datetime
  acknowledged_time?: string // ISO datetime
  message: string
  status: 'calling' | 'acknowledged'
}

export type CallRecordInsert = Omit<CallRecord, 'id' | 'created_at'>

// 매니저 호출 기록 (Manager Calls)
export interface ManagerCall {
  id: string
  created_at: string
  student_id: string
  seat_number: number
  student_name: string
  date: string // YYYY-MM-DD
  call_time: string // ISO datetime
  acknowledged_time?: string // ISO datetime
  status: 'calling' | 'acknowledged'
}

export type ManagerCallInsert = Omit<ManagerCall, 'id' | 'created_at'>
