'use client'

export const runtime = 'edge'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { MessageSquare, TrendingUp, Building2, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'

interface Stats {
  total_count: number
  total_cost: number
  success_count: number
  failed_count: number
}

interface OrgUsage {
  org_id: string
  org_name: string
  org_type: string
  count: number
  cost: number
}

interface RecentUsage {
  id: string
  org_id: string
  org_name: string
  student_name: string
  type: string
  message: string
  cost: number
  status: string
  sent_at: string
}

interface DailyStat {
  date: string
  count: number
  cost: number
}

const typeLabels: Record<string, string> = {
  attendance: '출결 알림',
  payment: '결제 알림',
  schedule: '일정 알림',
  homework: '과제 알림',
  exam: '시험 알림',
  consultation: '상담 알림',
  general: '일반 알림',
}

const orgTypeLabels: Record<string, string> = {
  academy: '학원',
  learning_center: '러닝센터',
  study_cafe: '스터디카페',
  tutoring: '공부방',
}

export default function KakaoPage() {
  const [stats, setStats] = useState<Stats>({
    total_count: 0,
    total_cost: 0,
    success_count: 0,
    failed_count: 0,
  })
  const [orgUsages, setOrgUsages] = useState<OrgUsage[]>([])
  const [recentUsages, setRecentUsages] = useState<RecentUsage[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    loadData()
  }, [period])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/admin/kakao?period=${period}`)
      if (response.ok) {
        const data = await response.json() as { stats?: any; organization_usages?: any[]; recent_usages?: any[]; daily_stats?: any[] }
        setStats(data.stats)
        setOrgUsages(data.organization_usages || [])
        setRecentUsages(data.recent_usages || [])
        setDailyStats(data.daily_stats || [])
      }
    } catch (error) {
      console.error('Failed to load kakao data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const statCards = [
    {
      title: '전체 발송',
      value: stats.total_count.toLocaleString(),
      icon: MessageSquare,
      description: `최근 ${period}일`,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: '성공',
      value: stats.success_count.toLocaleString(),
      icon: CheckCircle2,
      description: `성공률 ${stats.total_count > 0 ? ((stats.success_count / stats.total_count) * 100).toFixed(1) : 0}%`,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: '실패',
      value: stats.failed_count.toLocaleString(),
      icon: AlertCircle,
      description: '발송 실패 건',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: '총 비용',
      value: `${stats.total_cost.toLocaleString()}원`,
      icon: TrendingUp,
      description: '예상 비용',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">카카오 알림톡 모니터링</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">카카오 알림톡 모니터링</h1>
          <p className="text-muted-foreground">
            전체 기관의 알림톡 사용 현황을 확인합니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">최근 7일</SelectItem>
              <SelectItem value="30">최근 30일</SelectItem>
              <SelectItem value="90">최근 90일</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={loadData}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              기관별 사용량 TOP 10
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orgUsages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  데이터가 없습니다
                </p>
              ) : (
                orgUsages.map((org, index) => (
                  <div key={org.org_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-6">
                        {index + 1}
                      </span>
                      <div>
                        <div className="font-medium">{org.org_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {orgTypeLabels[org.org_type] || org.org_type}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{org.count.toLocaleString()}건</div>
                      <div className="text-sm text-muted-foreground">
                        {org.cost.toLocaleString()}원
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              일별 발송 추이 (최근 7일)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dailyStats.map((day) => (
                <div key={day.date} className="flex items-center justify-between">
                  <span className="text-sm">{format(new Date(day.date), 'MM/dd (E)')}</span>
                  <div className="flex-1 mx-4">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${Math.min(
                            (day.count / Math.max(...dailyStats.map((d) => d.count || 1))) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium w-16 text-right">
                    {day.count.toLocaleString()}건
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 발송 내역</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>발송 시간</TableHead>
                  <TableHead>기관</TableHead>
                  <TableHead>수신자</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">비용</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentUsages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      발송 내역이 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  recentUsages.map((usage) => (
                    <TableRow key={usage.id}>
                      <TableCell className="text-sm">
                        {format(new Date(usage.sent_at), 'MM/dd HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {usage.org_name}
                      </TableCell>
                      <TableCell>{usage.student_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {typeLabels[usage.type] || usage.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            usage.status === 'success'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {usage.status === 'success' ? '성공' : '실패'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {usage.cost.toLocaleString()}원
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
