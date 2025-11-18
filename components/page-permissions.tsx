'use client'

import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { permissionManager } from '@/lib/utils/permissions'
import type { PageId } from '@/lib/types/permissions'
import { ShieldCheck } from 'lucide-react'

interface PagePermissionsProps {
  pageId: PageId
}

export function PagePermissions({ pageId }: PagePermissionsProps) {
  const [userRole, setUserRole] = useState<string | null>(null)
  const [staffAccess, setStaffAccess] = useState(false)
  const [teacherAccess, setTeacherAccess] = useState(false)

  useEffect(() => {
    // 현재 로그인한 사용자 역할 확인
    const role = localStorage.getItem('userRole')
    setUserRole(role)

    // 관리자만 권한 설정 가능
    if (role === 'admin') {
      const permissions = permissionManager.getPermissions()
      const pagePermission = permissions[pageId]
      if (pagePermission) {
        setStaffAccess(pagePermission.staff)
        setTeacherAccess(pagePermission.teacher)
      }
    }
  }, [pageId])

  const handleStaffChange = (checked: boolean) => {
    setStaffAccess(checked)
    permissionManager.updatePagePermission(pageId, 'staff', checked)
  }

  const handleTeacherChange = (checked: boolean) => {
    setTeacherAccess(checked)
    permissionManager.updatePagePermission(pageId, 'teacher', checked)
  }

  // 관리자만 권한 설정 UI 표시
  if (userRole !== 'admin') {
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
