'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { navigationItems, getFilteredNavigation, type BadgeType } from '@/lib/config/navigation'

const BadgeComponent = ({ type, isActive }: { type: BadgeType; isActive: boolean }) => {
  const badgeStyles = {
    '학원용': isActive
      ? 'bg-blue-100 text-blue-700'
      : 'bg-blue-50/50 text-blue-600',
    '독서실': isActive
      ? 'bg-green-100 text-green-700'
      : 'bg-green-50/50 text-green-600',
    '공부방': isActive
      ? 'bg-orange-100 text-orange-700'
      : 'bg-orange-50/50 text-orange-600',
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
  const [navigation, setNavigation] = useState(navigationItems)

  useEffect(() => {
    // Update navigation when menu settings change
    const updateNavigation = () => {
      setNavigation(getFilteredNavigation())
    }

    updateNavigation()

    // Listen for storage changes (menu settings updates)
    window.addEventListener('storage', updateNavigation)
    window.addEventListener('menuSettingsChanged', updateNavigation)

    return () => {
      window.removeEventListener('storage', updateNavigation)
      window.removeEventListener('menuSettingsChanged', updateNavigation)
    }
  }, [])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle className="text-left">메뉴</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-4 overflow-y-auto h-[calc(100vh-80px)]">
          {navigation.map((item) => {
            const isActive = pathname?.startsWith(item.href)
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
