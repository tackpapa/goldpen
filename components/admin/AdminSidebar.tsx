'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  Users,
  FileText,
  Settings,
  Shield,
} from 'lucide-react'

interface NavigationItem {
  id: string
  name: string
  href: string
  icon: any
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    name: '대시보드',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    id: 'organizations',
    name: '조직 관리',
    href: '/admin/organizations',
    icon: Building2,
  },
  {
    id: 'users',
    name: '사용자 관리',
    href: '/admin/users',
    icon: Users,
  },
  {
    id: 'audit-logs',
    name: '감사 로그',
    href: '/admin/audit-logs',
    icon: FileText,
  },
  {
    id: 'settings',
    name: '시스템 설정',
    href: '/admin/settings',
    icon: Settings,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [sidebarWidth, setSidebarWidth] = useState(256)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const storedWidth = localStorage.getItem('adminSidebarWidth')
    if (storedWidth) {
      setSidebarWidth(parseInt(storedWidth, 10))
    }
  }, [])

  return (
    <div
      className="hidden lg:flex h-full flex-col border-r bg-muted/10"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Super Admin Logo */}
      <div className="px-4 py-6 border-b">
        <Link href="/admin/dashboard" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-lg leading-tight">Super Admin</span>
            <span className="text-xs text-muted-foreground">GoldPen Management</span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
        {navigationItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
          const Icon = item.icon

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
