'use client'

import { useState, useEffect } from 'react'
import type { Manager } from './ManagerDetailModal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Activity, Calendar, Clock, FileText, Plus, Edit, Trash2, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ActivityLog {
  id: string
  action_type: 'create' | 'update' | 'delete'
  entity_type: string
  entity_name: string | null
  description: string
  created_at: string
}

interface ActivityTabProps {
  manager: Manager
  institutionName?: string
}

// 실제로 기록되는 액션만 포함
const actionIcons: Record<string, React.ElementType> = {
  create: Plus,
  update: Edit,
  delete: Trash2,
}

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

const actionLabels: Record<string, string> = {
  create: '생성',
  update: '수정',
  delete: '삭제',
}

export function ActivityTab({ manager, institutionName }: ActivityTabProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (manager.id && institutionName) {
      fetchActivities()
    }
  }, [manager.id, institutionName])

  const fetchActivities = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/activity-logs?userId=${manager.id}&limit=20&orgSlug=${institutionName}`)
      const result = (await response.json()) as any
      if (!response.ok) throw new Error(result.error || '활동 이력 조회 실패')

      const logs = result.logs || []
      setActivities(logs)
    } catch (err) {
      console.error('[ActivityTab] fetch error', err)
      setError('활동 이력을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">불러오는 중...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <FileText className="h-8 w-8 text-red-500" />
              </div>
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 bg-muted rounded-full mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">
                아직 활동 기록이 없습니다.
              </p>
              <p className="text-sm text-muted-foreground">
                로그인, 작업 이력 등이 여기에 표시됩니다.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const Icon = actionIcons[activity.action_type] || FileText
                const colorClass = actionColors[activity.action_type] || 'bg-gray-100 text-gray-700'
                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {actionLabels[activity.action_type] || activity.action_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {activity.entity_type}
                        </span>
                      </div>
                      <p className="text-sm truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(activity.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

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
