'use client'

import type { Manager } from './ManagerDetailModal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Activity, Calendar, Clock, FileText } from 'lucide-react'

interface ActivityTabProps {
  manager: Manager
}

export function ActivityTab({ manager }: ActivityTabProps) {
  // 활동 이력은 나중에 activity_logs 테이블과 연결할 예정
  // 현재는 placeholder UI만 제공

  return (
    <div className="space-y-6">
      {/* 활동 요약 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">입사일</p>
                <p className="text-lg font-semibold">{manager.hire_date || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">근속 기간</p>
                <p className="text-lg font-semibold">
                  {manager.hire_date ? calculateDuration(manager.hire_date) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 활동 이력 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            활동 이력
          </CardTitle>
          <CardDescription>
            매니저의 시스템 활동 기록
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2">
              활동 이력 기능은 준비 중입니다.
            </p>
            <p className="text-sm text-muted-foreground">
              로그인 기록, 작업 이력 등이 여기에 표시됩니다.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 메모 */}
      {manager.notes && (
        <Card>
          <CardHeader>
            <CardTitle>메모</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{manager.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function calculateDuration(hireDate: string): string {
  const hire = new Date(hireDate)
  const now = new Date()

  const years = now.getFullYear() - hire.getFullYear()
  const months = now.getMonth() - hire.getMonth()

  let totalMonths = years * 12 + months
  if (now.getDate() < hire.getDate()) {
    totalMonths--
  }

  if (totalMonths < 0) return '-'

  const y = Math.floor(totalMonths / 12)
  const m = totalMonths % 12

  if (y === 0) {
    return `${m}개월`
  } else if (m === 0) {
    return `${y}년`
  } else {
    return `${y}년 ${m}개월`
  }
}
