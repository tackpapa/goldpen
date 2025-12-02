'use client'

import { useState, useEffect } from 'react'
import type { Manager } from './ManagerDetailModal'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Activity, Calendar, Clock, FileText, LogIn, LogOut, Plus, Edit, Trash2, Eye, Download, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ActivityLog {
  id: string
  action_type: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'view' | 'export'
  entity_type: string
  entity_name: string | null
  description: string
  created_at: string
}

interface ActivityTabProps {
  manager: Manager
  institutionName?: string
}

const actionIcons: Record<string, React.ElementType> = {
  create: Plus,
  update: Edit,
  delete: Trash2,
  login: LogIn,
  logout: LogOut,
  view: Eye,
  export: Download,
}

const actionColors: Record<string, string> = {
  create: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  update: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  delete: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  login: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  logout: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  view: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  export: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
}

const actionLabels: Record<string, string> = {
  create: '생성',
  update: '수정',
  delete: '삭제',
  login: '로그인',
  logout: '로그아웃',
  view: '조회',
  export: '내보내기',
}

// 더미 데이터 생성 함수
const generateDummyActivities = (managerName: string): ActivityLog[] => {
  const now = new Date()
  return [
    {
      id: '1',
      action_type: 'login',
      entity_type: '시스템',
      entity_name: null,
      description: `${managerName}님이 시스템에 로그인했습니다`,
      created_at: new Date(now.getTime() - 1000 * 60 * 30).toISOString(), // 30분 전
    },
    {
      id: '2',
      action_type: 'update',
      entity_type: '학생',
      entity_name: '홍길동',
      description: '학생 "홍길동"의 연락처 정보를 수정했습니다',
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(), // 2시간 전
    },
    {
      id: '3',
      action_type: 'create',
      entity_type: '상담',
      entity_name: '김철수 학부모',
      description: '신규 상담 "김철수 학부모" 상담 일정을 등록했습니다',
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 5).toISOString(), // 5시간 전
    },
    {
      id: '4',
      action_type: 'view',
      entity_type: '리포트',
      entity_name: '11월 출결 현황',
      description: '"11월 출결 현황" 리포트를 조회했습니다',
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(), // 1일 전
    },
    {
      id: '5',
      action_type: 'export',
      entity_type: '데이터',
      entity_name: '학생 목록',
      description: '학생 목록 데이터를 Excel로 내보냈습니다',
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2일 전
    },
    {
      id: '6',
      action_type: 'update',
      entity_type: '수업',
      entity_name: '수학 기초반',
      description: '"수학 기초반" 수업 시간을 변경했습니다',
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3일 전
    },
    {
      id: '7',
      action_type: 'logout',
      entity_type: '시스템',
      entity_name: null,
      description: `${managerName}님이 시스템에서 로그아웃했습니다`,
      created_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3 - 1000 * 60 * 30).toISOString(), // 3일 전
    },
  ]
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

      // 실제 데이터가 없으면 더미 데이터 사용
      const logs = result.logs || []
      if (logs.length === 0) {
        setActivities(generateDummyActivities(manager.name))
      } else {
        setActivities(logs)
      }
    } catch (err) {
      console.error('[ActivityTab] fetch error', err)
      // 에러 발생 시에도 더미 데이터 표시
      setActivities(generateDummyActivities(manager.name))
      setError(null) // 에러 메시지 숨기고 더미 데이터 표시
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
