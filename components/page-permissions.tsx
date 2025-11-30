'use client'

import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { usePagePermissions } from '@/lib/hooks/usePagePermissions'
import { useAuth } from '@/contexts/auth-context'
import type { PageId } from '@/lib/types/permissions'
import { ShieldCheck } from 'lucide-react'

interface PagePermissionsProps {
  pageId: PageId
}

export function PagePermissions({ pageId }: PagePermissionsProps) {
  const { user, isLoading: authLoading } = useAuth()
  const [staffAccess, setStaffAccess] = useState(false)
  const [teacherAccess, setTeacherAccess] = useState(false)

  const slug = typeof window !== 'undefined'
    ? window.location.pathname.split('/').filter(Boolean)[0] || 'goldpen'
    : 'goldpen'

  const { permissions, updatePermission, loading } = usePagePermissions({ orgSlug: slug })

  // 권한 데이터가 로드되면 상태 업데이트
  useEffect(() => {
    if (!loading) {
      const pagePermission = permissions[pageId]
      if (pagePermission) {
        setStaffAccess(pagePermission.staff)
        setTeacherAccess(pagePermission.teacher)
      }
    }
  }, [permissions, pageId, loading])

  const handleManagerChange = async (checked: boolean) => {
    setStaffAccess(checked)
    await updatePermission(pageId, 'manager', checked)
  }

  const handleTeacherChange = async (checked: boolean) => {
    setTeacherAccess(checked)
    await updatePermission(pageId, 'teacher', checked)
  }

  // 로딩 중이거나 관리자가 아니면 권한 설정 UI 숨김
  const isAdmin = user?.role && ['owner', 'manager', 'super_admin'].includes(user.role)
  if (authLoading || !isAdmin) {
    return null
  }

  return (
    <div className="flex justify-end mb-4">
      <div className="inline-flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
          <span className="text-xs font-semibold text-blue-900">접근 권한 설정</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Checkbox
              id={`staff-${pageId}`}
              checked={staffAccess}
              onCheckedChange={handleStaffChange}
              className="h-3.5 w-3.5"
            />
            <Label
              htmlFor={`staff-${pageId}`}
              className="text-xs font-medium cursor-pointer whitespace-nowrap"
            >
              직원 접속 가능
            </Label>
          </div>
          <div className="flex items-center gap-1.5">
            <Checkbox
              id={`teacher-${pageId}`}
              checked={teacherAccess}
              onCheckedChange={handleTeacherChange}
              className="h-3.5 w-3.5"
            />
            <Label
              htmlFor={`teacher-${pageId}`}
              className="text-xs font-medium cursor-pointer whitespace-nowrap"
            >
              강사 접속 가능
            </Label>
          </div>
        </div>
      </div>
    </div>
  )
}
