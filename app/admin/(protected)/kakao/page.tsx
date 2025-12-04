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
import {
  MessageSquare,
  TrendingUp,
  Building2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  DollarSign,
  Wallet,
  PiggyBank
} from 'lucide-react'
import { format } from 'date-fns/format'
import { ko } from 'date-fns/locale'

interface Stats {
  total_count: number
  success_count: number
  failed_count: number
  total_recipients: number
  total_price: number
  total_cost: number
  total_profit: number
}

interface OrgUsage {
  org_id: string
  org_name: string
  org_type: string
  count: number
  recipients: number
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
  error_message?: string
  sent_at: string
}

interface DailyStat {
  date: string
  count: number
  success: number
  failed: number
}

interface TypeBreakdown {
  type: string
  total: number
  success: number
  failed: number
}

// 실제 notification_logs의 type에 맞는 레이블 (DB CHECK constraint 기준)
// 허용된 타입: study_late, study_absent, class_late, class_absent, commute_late, commute_absent,
//              academy_checkin, academy_checkout, study_checkin, study_checkout,
//              study_out, study_return, lesson_report, exam_result, assignment_new, daily_report
const typeLabels: Record<string, string> = {
  // 등원/하원 (학원)
  academy_checkin: '학원 등원',
  academy_checkout: '학원 하원',
  // 등원/하원 (스터디카페)
  study_checkin: '스터디 등원',
  study_checkout: '스터디 하원',
  // 지각
  class_late: '수업 지각',
  study_late: '독서실 지각',
  commute_late: '출근 지각',
  // 결석
  class_absent: '수업 결석',
  study_absent: '독서실 결석',
  commute_absent: '출근 결석',
  // 외출/복귀
  study_out: '외출',
  study_return: '복귀',
  // 리포트
  lesson_report: '수업 리포트',
  daily_report: '일일 리포트',
  exam_result: '시험 결과',
  assignment_new: '과제 알림',
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
    success_count: 0,
    failed_count: 0,
    total_recipients: 0,
    total_price: 0,
    total_cost: 0,
    total_profit: 0,
  })
  const [orgUsages, setOrgUsages] = useState<OrgUsage[]>([])
  const [recentUsages, setRecentUsages] = useState<RecentUsage[]>([])
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [typeBreakdown, setTypeBreakdown] = useState<TypeBreakdown[]>([])
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
        const data = await response.json() as {
          stats?: Stats
          organization_usages?: OrgUsage[]
          recent_usages?: RecentUsage[]
          daily_stats?: DailyStat[]
          type_breakdown?: TypeBreakdown[]
        }
        if (data.stats) {
          setStats(data.stats)
        }
        setOrgUsages(data.organization_usages || [])
        setRecentUsages(data.recent_usages || [])
        setDailyStats(data.daily_stats || [])
        setTypeBreakdown(data.type_breakdown || [])
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
      title: '총 매출',
      value: `${stats.total_price.toLocaleString()}원`,
      icon: DollarSign,
      description: '기관 청구 금액',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: '원가',
      value: `${stats.total_cost.toLocaleString()}원`,
      icon: Wallet,
      description: '실제 발송 비용',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
    {
      title: '순이익',
      value: `${stats.total_profit.toLocaleString()}원`,
      icon: PiggyBank,
      description: '매출 - 원가',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">카카오 알림톡 모니터링</h1>
        <div className="animate-pulse space-y-4">
          <div className="grid gap-4 md:grid-cols-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
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

      {/* 통계 카드 - 6개 */}
      <div className="grid gap-4 md:grid-cols-6">
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

      {/* 알림 유형별 통계 + 기관별 사용량 */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* 알림 유형별 통계 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              알림 유형별 통계
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {typeBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  데이터가 없습니다
                </p>
              ) : (
                typeBreakdown.map((item) => (
                  <div key={item.type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="min-w-[90px] justify-center">
                        {typeLabels[item.type] || item.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-green-600">
                        {item.success}건
                      </span>
                      {item.failed > 0 && (
                        <span className="text-sm text-red-600">
                          실패 {item.failed}건
                        </span>
                      )}
                      <span className="text-sm font-medium w-16 text-right">
                        {item.total.toLocaleString()}건
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 기관별 사용량 */}
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
      </div>

      {/* 일별 통계 */}
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
                <span className="text-sm w-24">
                  {format(new Date(day.date), 'MM/dd (E)', { locale: ko })}
                </span>
                <div className="flex-1 mx-4">
                  <div className="h-4 bg-muted rounded-full overflow-hidden flex">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${
                          day.count > 0
                            ? (day.success / Math.max(...dailyStats.map((d) => d.count || 1))) * 100
                            : 0
                        }%`,
                      }}
                    />
                    {day.failed > 0 && (
                      <div
                        className="h-full bg-red-500"
                        style={{
                          width: `${
                            (day.failed / Math.max(...dailyStats.map((d) => d.count || 1))) * 100
                          }%`,
                        }}
                      />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 w-32 justify-end">
                  <span className="text-sm font-medium text-green-600">
                    {day.success}
                  </span>
                  {day.failed > 0 && (
                    <span className="text-sm text-red-600">/ {day.failed}</span>
                  )}
                  <span className="text-sm text-muted-foreground">건</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 최근 발송 내역 */}
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
                            usage.status === 'sent'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {usage.status === 'sent' ? '성공' : '실패'}
                        </Badge>
                        {usage.error_message && (
                          <span className="text-xs text-red-500 ml-1" title={usage.error_message}>
                            (!)
                          </span>
                        )}
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
