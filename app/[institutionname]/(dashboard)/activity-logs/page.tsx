'use client'

export const runtime = 'edge'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { format } from 'date-fns/format'
import { ko } from 'date-fns/locale'
import {
  Activity,
  User,
  Clock,
  Filter,
  RefreshCw,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  Download,
  LogIn,
  LogOut,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface ActivityLog {
  id: string
  user_name: string
  user_role: string | null
  action_type: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'view' | 'export'
  entity_type: string
  entity_name: string | null
  description: string
  created_at: string
}

const actionTypeConfig: Record<string, { label: string; icon: typeof Activity; color: string }> = {
  create: { label: '생성', icon: UserPlus, color: 'bg-green-100 text-green-700' },
  update: { label: '수정', icon: Edit, color: 'bg-blue-100 text-blue-700' },
  delete: { label: '삭제', icon: Trash2, color: 'bg-red-100 text-red-700' },
  login: { label: '로그인', icon: LogIn, color: 'bg-purple-100 text-purple-700' },
  logout: { label: '로그아웃', icon: LogOut, color: 'bg-gray-100 text-gray-700' },
  view: { label: '조회', icon: Eye, color: 'bg-yellow-100 text-yellow-700' },
  export: { label: '내보내기', icon: Download, color: 'bg-orange-100 text-orange-700' },
}

const entityTypeLabels: Record<string, string> = {
  student: '학생',
  consultation: '상담',
  class: '수업/반',
  teacher: '강사',
  exam: '시험',
  attendance: '출결',
  billing: '매출',
  expense: '지출',
  homework: '과제',
  lesson: '수업일지',
  seat: '좌석',
  room: '교실',
  schedule: '시간표',
}

const roleLabels: Record<string, string> = {
  owner: '원장님',
  manager: '관리자',
  teacher: '강사',
  staff: '직원',
  student: '학생',
  parent: '학부모',
  service_role: '시스템',
}

function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ActivityLogsPage() {
  const params = useParams()
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionFilter, setActionFilter] = useState<string>('all')
  const [entityFilter, setEntityFilter] = useState<string>('all')

  const fetchLogs = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const url = new URL('/api/activity-logs', window.location.origin)
      url.searchParams.set('limit', '100')

      if (actionFilter !== 'all') {
        url.searchParams.set('action_type', actionFilter)
      }
      if (entityFilter !== 'all') {
        url.searchParams.set('entity_type', entityFilter)
      }

      const response = await fetch(url.toString())
      interface ActivityLogsResponse {
        error?: string
        data?: ActivityLog[]
      }
      const result = await response.json() as ActivityLogsResponse

      if (!response.ok) {
        throw new Error(result.error || '데이터를 불러오는데 실패했습니다')
      }

      // 최신순 정렬 (created_at 내림차순)
      const sortedLogs = (result.data || []).sort((a: ActivityLog, b: ActivityLog) => {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      })
      setLogs(sortedLogs)
    } catch (err) {
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [actionFilter, entityFilter])

  if (isLoading && logs.length === 0) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            활동 로그
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            시스템 내 모든 활동 기록을 확인할 수 있습니다
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">필터:</span>
            </div>

            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="활동 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 활동</SelectItem>
                <SelectItem value="create">생성</SelectItem>
                <SelectItem value="update">수정</SelectItem>
                <SelectItem value="delete">삭제</SelectItem>
                <SelectItem value="login">로그인</SelectItem>
                <SelectItem value="logout">로그아웃</SelectItem>
                <SelectItem value="view">조회</SelectItem>
                <SelectItem value="export">내보내기</SelectItem>
              </SelectContent>
            </Select>

            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="대상 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 대상</SelectItem>
                <SelectItem value="student">학생</SelectItem>
                <SelectItem value="consultation">상담</SelectItem>
                <SelectItem value="class">수업/반</SelectItem>
                <SelectItem value="teacher">강사</SelectItem>
                <SelectItem value="exam">시험</SelectItem>
                <SelectItem value="attendance">출결</SelectItem>
                <SelectItem value="billing">매출</SelectItem>
                <SelectItem value="expense">지출</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="py-4">
            <p className="text-destructive text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">활동 기록</CardTitle>
          <CardDescription>
            총 {logs.length}개의 활동이 기록되었습니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>아직 기록된 활동이 없습니다</p>
              <p className="text-sm mt-1">
                학생 등록, 상담 추가 등의 활동이 자동으로 기록됩니다
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">일시</TableHead>
                  <TableHead className="w-[120px]">사용자</TableHead>
                  <TableHead className="w-[100px]">활동</TableHead>
                  <TableHead className="w-[100px]">대상</TableHead>
                  <TableHead>내용</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const actionConfig = actionTypeConfig[log.action_type] || {
                    label: log.action_type,
                    icon: Activity,
                    color: 'bg-gray-100 text-gray-700',
                  }
                  const ActionIcon = actionConfig.icon

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span>
                            {format(new Date(log.created_at), 'MM/dd HH:mm', {
                              locale: ko,
                            })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {log.user_name}
                              {log.user_role && (
                                <span className="text-muted-foreground font-normal">
                                  {' / '}{roleLabels[log.user_role] || log.user_role}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`${actionConfig.color} gap-1`}
                        >
                          <ActionIcon className="h-3 w-3" />
                          {actionConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {entityTypeLabels[log.entity_type] || log.entity_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {log.description}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
