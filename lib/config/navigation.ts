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
  LucideIcon,
} from 'lucide-react'

export type BadgeType = '학원용' | '독서실' | '공부방'

export interface NavigationItem {
  id: string
  name: string
  href: string
  icon: LucideIcon
  badges: BadgeType[]
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
    name: '반 관리',
    href: '/classes',
    icon: BookOpen,
    badges: ['학원용'],
  },
  {
    id: 'attendance',
    name: '출결 관리',
    href: '/attendance',
    icon: CheckSquare,
    badges: ['학원용', '독서실', '공부방'],
  },
  {
    id: 'lessons',
    name: '수업일지',
    href: '/lessons',
    icon: Calendar,
    badges: ['학원용'],
  },
  {
    id: 'teachers',
    name: '강사 관리',
    href: '/teachers',
    icon: UserCheck,
    badges: ['학원용'],
  },
  {
    id: 'schedule',
    name: '시간표',
    href: '/schedule',
    icon: CalendarDays,
    badges: ['학원용'],
  },
  {
    id: 'rooms',
    name: '스케줄관리',
    href: '/rooms',
    icon: DoorOpen,
    badges: ['독서실'],
  },
  {
    id: 'seats',
    name: '자리현황판',
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
    badges: ['학원용'],
  },
  {
    id: 'homework',
    name: '과제 관리',
    href: '/homework',
    icon: FileText,
    badges: ['학원용'],
  },
  {
    id: 'billing',
    name: '청구/정산',
    href: '/billing',
    icon: CreditCard,
    badges: ['학원용', '독서실', '공부방'],
  },
  {
    id: 'settings',
    name: '설정',
    href: '/settings',
    icon: Settings,
    badges: ['학원용', '독서실', '공부방'],
  },
]

// Helper function to get enabled menu items from localStorage
export function getEnabledMenuIds(): string[] {
  if (typeof window === 'undefined') return navigationItems.map(item => item.id)

  const stored = localStorage.getItem('enabledMenus')
  if (!stored) return navigationItems.map(item => item.id)

  try {
    return JSON.parse(stored)
  } catch {
    return navigationItems.map(item => item.id)
  }
}

// Helper function to save enabled menu items to localStorage
export function setEnabledMenuIds(ids: string[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('enabledMenus', JSON.stringify(ids))
}

// Helper function to get filtered navigation items
export function getFilteredNavigation(): NavigationItem[] {
  const enabledIds = getEnabledMenuIds()
  return navigationItems.filter(item => enabledIds.includes(item.id))
}
