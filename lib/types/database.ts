/**
 * Supabase Database Types
 * 자동 생성된 타입 정의
 */

export interface Student {
  id: string
  created_at: string
  updated_at: string
  org_id: string
  name: string
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
}

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
