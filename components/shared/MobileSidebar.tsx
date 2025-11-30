'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { navigationItems, getInstitutionName, type BadgeType, type NavigationItem } from '@/lib/config/navigation'
import { useMenuSettings } from '@/lib/hooks/useMenuSettings'
import { usePagePermissions } from '@/lib/hooks/usePagePermissions'
import { useAuth } from '@/contexts/auth-context'
import type { PageId, UserRole } from '@/lib/types/permissions'

const BadgeComponent = ({ type, isActive }: { type: BadgeType; isActive: boolean }) => {
  const badgeStyles: Record<BadgeType, string> = {
    '학원용': isActive
      ? 'bg-blue-100 text-blue-700'
      : 'bg-blue-50/50 text-blue-600',
    '독서실': isActive
      ? 'bg-green-100 text-green-700'
      : 'bg-green-50/50 text-green-600',
    '공부방': isActive
      ? 'bg-orange-100 text-orange-700'
      : 'bg-orange-50/50 text-orange-600',
    '강사용': isActive
      ? 'bg-purple-100 text-purple-700'
      : 'bg-purple-50/50 text-purple-600',
  }

  return (
    <span
      className={cn(
        'px-1.5 py-0.5 text-[10px] font-medium rounded',
        badgeStyles[type]
      )}
    >
      {type}
    </span>
  )
}

interface MobileSidebarProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function MobileSidebar({ open, onOpenChange }: MobileSidebarProps) {
  const pathname = usePathname()
  const [navigation, setNavigation] = useState<NavigationItem[]>(navigationItems)
  const [institutionName, setInstitutionName] = useState('')

  // URL에서 slug 추출
  const slug = typeof window !== 'undefined'
    ? window.location.pathname.split('/').filter(Boolean)[0] || 'goldpen'
    : 'goldpen'

  // 인증 정보
  const { user } = useAuth()

  const { getFilteredNavigation, loading: menuLoading } = useMenuSettings({ orgSlug: slug })

  // 페이지 권한 설정
  const { canAccessPage, loading: permissionsLoading } = usePagePermissions({ orgSlug: slug })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setInstitutionName(getInstitutionName())
    }
  }, [])

  // ref로 함수를 저장하여 dependency 문제 해결
  const getFilteredNavigationRef = useRef(getFilteredNavigation)
  const canAccessPageRef = useRef(canAccessPage)

  useEffect(() => {
    getFilteredNavigationRef.current = getFilteredNavigation
    canAccessPageRef.current = canAccessPage
  }, [getFilteredNavigation, canAccessPage])

  // 메뉴 설정과 페이지 권한이 로드되면 navigation 업데이트 (역할 기반 필터링 적용)
  useEffect(() => {
    if (!menuLoading && !permissionsLoading) {
      const menuFiltered = getFilteredNavigationRef.current(institutionName)

      // 사용자 역할에 따라 페이지 접근 권한 필터링
      const userRole = user?.role as UserRole | undefined

      // settings 페이지는 owner만 접근 가능하도록 별도 처리
      const roleFiltered = menuFiltered.filter((item) => {
        // settings 페이지는 owner만 접근 가능
        if (item.id === 'settings') {
          return userRole === 'owner'
        }

        // 다른 페이지들은 canAccessPage로 체크
        if (userRole) {
          return canAccessPageRef.current(item.id as PageId, userRole)
        }

        // 로그인되지 않은 경우 모든 메뉴 표시 (페이지 자체에서 권한 체크)
        return true
      })

      setNavigation(roleFiltered)
    }
  }, [menuLoading, permissionsLoading, institutionName, user?.role])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-left">메뉴</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-4 overflow-y-auto h-[calc(100vh-80px)]">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname?.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.name}
                href={item.href as any}
                onClick={() => onOpenChange(false)}
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all hover:scale-[1.02]',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/80'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span>{item.name}</span>
                  {item.badges && item.badges.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.badges.map((badge) => (
                        <BadgeComponent key={badge} type={badge} isActive={isActive} />
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
