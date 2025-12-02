'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminHeader } from '@/components/admin/AdminHeader'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        // Use /api/me to check user role
        const response = await fetch('/api/me', { credentials: 'include' })

        if (!response.ok) {
          router.push('/login')
          return
        }

        const data = await response.json() as { user?: { role?: string } }

        if (!data.user) {
          router.push('/login')
          return
        }

        // Check if user has super_admin role
        if (data.user.role !== 'super_admin') {
          router.push('/admin')
          return
        }

        setIsAuthorized(true)
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to check admin access:', error)
        router.push('/login')
      }
    }

    checkAdminAccess()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">권한 확인 중...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen">
      <AdminHeader />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-3 md:p-4 lg:p-6 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
