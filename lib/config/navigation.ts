import {
  LayoutDashboard,
  Users,
  BookOpen,
  MessageSquare,
  ClipboardList,
  FileText,
  CreditCard,
  Settings,
  Calendar,
  CheckSquare,
  UserCheck,
  CalendarDays,
  DoorOpen,
  Grid3x3,
  Armchair,
  Wallet,
  Activity,
  LucideIcon,
} from 'lucide-react'

export type BadgeType = '학원용' | '독서실' | '공부방' | '강사용'

export interface NavigationItem {
  id: string
  name: string
  href: string
  icon: LucideIcon
  badges: BadgeType[]
}

// Default institution name
const DEFAULT_INSTITUTION = 'goldpen'

// Helper function to get institution name from URL or use default
export function getInstitutionName(): string {
  if (typeof window === 'undefined') return DEFAULT_INSTITUTION

  const pathSegments = window.location.pathname.split('/').filter(Boolean)
  // Check if first segment looks like an institution name (not a known route)
  const knownRoutes = ['login', 'signup', 'consultation', 'lesson-note', 'my']
  if (pathSegments.length > 0 && !knownRoutes.includes(pathSegments[0])) {
    return pathSegments[0]
  }

  return DEFAULT_INSTITUTION
}

export const navigationItems: NavigationItem[] = [
  {
    id: 'overview',
    name: '대시보드',
    href: '/overview',
    icon: LayoutDashboard,
    badges: ['학원용', '독서실', '공부방'],
  },
  {
    id: 'all-schedules',
    name: '전체 스케줄',
    href: '/all-schedules',
    icon: Grid3x3,
    badges: ['학원용'],
  },
  {
    id: 'students',
    name: '학생 관리',
    href: '/students',
    icon: Users,
    badges: ['학원용', '독서실', '공부방'],
  },
  {
    id: 'classes',
    name: '수업/반 관리',
    href: '/classes',
    icon: BookOpen,
    badges: ['학원용'],
  },
  {
    id: 'attendance',
    name: '강의출결관리',
    href: '/attendance',
    icon: CheckSquare,
    badges: ['학원용', '독서실', '공부방', '강사용'],
  },
  {
    id: 'seatsattendance',
    name: '독서실 출결관리',
    href: '/seatsattendance',
    icon: CheckSquare,
    badges: ['독서실', '공부방'],
  },
  {
    id: 'lessons',
    name: '수업일지',
    href: '/lessons',
    icon: Calendar,
    badges: ['강사용'],
  },
  {
    id: 'teachers',
    name: '강사 관리',
    href: '/teachers',
    icon: UserCheck,
    badges: ['학원용'],
  },
  {
    id: 'managers',
    name: '매니저 관리',
    href: '/managers',
    icon: Users,
    badges: ['학원용', '독서실', '공부방'],
  },
  {
    id: 'schedule',
    name: '강사 시간표',
    href: '/schedule',
    icon: CalendarDays,
    badges: ['학원용'],
  },
  {
    id: 'rooms',
    name: '교실 스케쥴',
    href: '/rooms',
    icon: DoorOpen,
    badges: ['독서실', '공부방'],
  },
  {
    id: 'seats',
    name: '독서실관리',
    href: '/seats',
    icon: Armchair,
    badges: ['독서실', '공부방'],
  },
  {
    id: 'consultations',
    name: '상담 관리',
    href: '/consultations',
    icon: MessageSquare,
    badges: ['학원용', '독서실', '공부방'],
  },
  {
    id: 'exams',
    name: '시험 관리',
    href: '/exams',
    icon: ClipboardList,
    badges: ['강사용'],
  },
  {
    id: 'homework',
    name: '과제 관리',
    href: '/homework',
    icon: FileText,
    badges: ['강사용'],
  },
  {
    id: 'billing',
    name: '매출정산',
    href: '/billing',
    icon: CreditCard,
    badges: ['학원용', '독서실', '공부방'],
  },
  {
    id: 'expenses',
    name: '지출정산',
    href: '/expenses',
    icon: Wallet,
    badges: ['학원용', '독서실', '공부방'],
  },
  {
    id: 'settings',
    name: '설정',
    href: '/settings',
    icon: Settings,
    badges: ['학원용', '독서실', '공부방'],
  },
  {
    id: 'activity-logs',
    name: '활동 로그',
    href: '/activity-logs',
    icon: Activity,
    badges: ['학원용', '독서실', '공부방'],
  },
]

// ============================================
// NOTE: localStorage 함수 제거됨
// DB 기반 메뉴 설정은 useMenuSettings hook 사용
// import { useMenuSettings } from '@/lib/hooks'
// ============================================
