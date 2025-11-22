// 사용자 역할 타입
export type UserRole = 'admin' | 'teacher' | 'staff'

// 페이지 식별자
export type PageId =
  | 'overview'
  | 'all-schedules'
  | 'students'
  | 'classes'
  | 'attendance'
  | 'seatsattendance'
  | 'schedule'
  | 'teachers'
  | 'lessons'
  | 'rooms'
  | 'seats'
  | 'consultations'
  | 'exams'
  | 'homework'
  | 'billing'
  | 'expenses'

// 페이지 정보
export interface PageInfo {
  id: PageId
  name: string
  path: string
  icon?: string
}

// 페이지 권한 설정
export interface PagePermissions {
  [key: string]: {
    staff: boolean  // 직원 접속 가능
    teacher: boolean  // 강사 접속 가능
  }
}

// 사용자 계정
export interface UserAccount {
  id: string
  username: string
  password: string
  name: string
  role: UserRole
  createdAt: string
}

// 전체 페이지 목록
export const ALL_PAGES: PageInfo[] = [
  { id: 'overview', name: '대시보드', path: '/overview' },
  { id: 'all-schedules', name: '전체 스케줄', path: '/all-schedules' },
  { id: 'students', name: '학생 관리', path: '/students' },
  { id: 'classes', name: '반 관리', path: '/classes' },
  { id: 'attendance', name: '강의출결관리', path: '/attendance' },
  { id: 'seatsattendance', name: '독서실 출결관리', path: '/seatsattendance' },
  { id: 'schedule', name: '수업일지', path: '/schedule' },
  { id: 'teachers', name: '강사 관리', path: '/teachers' },
  { id: 'lessons', name: '시간표', path: '/lessons' },
  { id: 'rooms', name: '스케줄관리', path: '/rooms' },
  { id: 'seats', name: '자리현황판', path: '/seats' },
  { id: 'consultations', name: '상담 관리', path: '/consultations' },
  { id: 'exams', name: '시험 관리', path: '/exams' },
  { id: 'homework', name: '과제 관리', path: '/homework' },
  { id: 'billing', name: '매출정산', path: '/billing' },
  { id: 'expenses', name: '지출정산', path: '/expenses' },
]

// 기본 페이지 권한 (모든 페이지를 staff와 teacher가 접속 가능하도록 설정)
export const DEFAULT_PERMISSIONS: PagePermissions = ALL_PAGES.reduce((acc, page) => {
  acc[page.id] = {
    staff: true,
    teacher: true,
  }
  return acc
}, {} as PagePermissions)
