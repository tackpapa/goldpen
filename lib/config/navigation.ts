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
    badges: ['학원용', '독서실', '공부방', '강사용'],
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
]

// Helper function to get enabled menu items from localStorage
export function getEnabledMenuIds(): string[] {
  if (typeof window === 'undefined') return navigationItems.map(item => item.id)

  const stored = localStorage.getItem('enabledMenus')
  if (!stored) return navigationItems.map(item => item.id)

  try {
    const parsed = JSON.parse(stored)
    // If empty array, return all items (safety check)
    if (Array.isArray(parsed) && parsed.length === 0) {
      return navigationItems.map(item => item.id)
    }
    return parsed
  } catch {
    return navigationItems.map(item => item.id)
  }
}

// Helper function to save enabled menu items to localStorage
export function setEnabledMenuIds(ids: string[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('enabledMenus', JSON.stringify(ids))
}

// Helper function to get menu order from localStorage
export function getMenuOrder(): string[] {
  if (typeof window === 'undefined') return navigationItems.map(item => item.id)

  const stored = localStorage.getItem('menuOrder')
  if (!stored) return navigationItems.map(item => item.id)

  try {
    return JSON.parse(stored)
  } catch {
    return navigationItems.map(item => item.id)
  }
}

// Helper function to save menu order to localStorage
export function setMenuOrder(order: string[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem('menuOrder', JSON.stringify(order))
}

// Helper function to get filtered navigation items
export function getFilteredNavigation(): NavigationItem[] {
  const enabledIds = getEnabledMenuIds()
  const menuOrder = getMenuOrder()

  // Sort by custom order
  const orderedItems = menuOrder
    .map(id => navigationItems.find(item => item.id === id))
    .filter((item): item is NavigationItem => item !== undefined)

  // Add any new items that aren't in the order yet
  const orderedIds = new Set(menuOrder)
  const newItems = navigationItems.filter(item => !orderedIds.has(item.id))

  const allItems = [...orderedItems, ...newItems]
  return allItems.filter(item => enabledIds.includes(item.id))
}
