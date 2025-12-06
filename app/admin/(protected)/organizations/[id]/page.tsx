'use client'

export const runtime = 'edge'
import { useState, useCallback, useMemo } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ArrowLeft,
  Users,
  GraduationCap,
  DoorOpen,
  BookOpen,
  TrendingUp,
  MessageSquare,
  Settings,
  User,
  Mail,
  Phone,
  Calendar,
  Wallet,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AdminCreditModal } from '@/components/admin/AdminCreditModal'
import { format } from 'date-fns/format'
import { ko } from 'date-fns/locale'

interface OrganizationDetail {
  id: string
  name: string
  slug: string
  type: string
  status: string
  subscription_plan: string
  max_users: number
  max_students: number
  credit_balance: number
  created_at: string
  updated_at: string
  org_settings: {
    logo_url?: string
    theme?: string
    kakao_enabled?: boolean
    kakao_channel_id?: string
    business_hours?: string
    contact_phone?: string
    address?: string
    settings?: {
      use_kakao?: boolean
      [key: string]: unknown
    }
  } | null
  owner: {
    id: string
    name: string
    email: string
    phone?: string
    created_at: string
  } | null
  users: Array<{
    id: string
    name: string
    email: string
    role: string
    created_at: string
  }>
  user_count: number
  student_count: number
  class_count: number
  room_count: number
  monthly_revenue: number
  total_revenue: number
  available_months: string[]
  selected_month: string
  kakao_stats: {
    total_count: number
    total_cost: number
    success_count: number
  }
  recent_transactions: Array<{
    id: string
    amount: number
    category: string
    description: string
    created_at: string
  }>
}

const typeLabels: Record<string, string> = {
  academy: '학원',
  learning_center: '러닝센터',
  study_cafe: '스터디카페',
  tutoring: '공부방',
}

const typeColors: Record<string, string> = {
  academy: 'bg-blue-100 text-blue-800',
  learning_center: 'bg-purple-100 text-purple-800',
  study_cafe: 'bg-orange-100 text-orange-800',
  tutoring: 'bg-teal-100 text-teal-800',
}

const statusColors: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-yellow-100 text-yellow-800',
  deleted: 'bg-red-100 text-red-800',
}

const statusLabels: Record<string, string> = {
  active: '활성',
  suspended: '정지',
  deleted: '삭제',
}

const roleLabels: Record<string, string> = {
  owner: '원장',
  admin: '관리자',
  manager: '매니저',
  teacher: '강사',
  staff: '직원',
}

const fetcher = <T,>(url: string): Promise<T> => fetch(url, { credentials: 'include' }).then(res => {
  if (!res.ok) throw new Error('Failed to load organization')
  return res.json()
})

const swrOptions = {
  revalidateOnFocus: false,
  dedupingInterval: 30000,
  refreshInterval: 300000,
}

interface OrganizationResponse {
  organization: OrganizationDetail
}

export default function OrganizationDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const { id } = params
  const router = useRouter()
  const [creditDialogOpen, setCreditDialogOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)

  // SWR URL 생성
  const apiUrl = useMemo(() => {
    return selectedMonth
      ? `/api/admin/organizations/${id}?month=${selectedMonth}`
      : `/api/admin/organizations/${id}`
  }, [id, selectedMonth])

  // SWR로 데이터 페칭
  const { data, isLoading, error, mutate } = useSWR<OrganizationResponse>(apiUrl, fetcher, swrOptions)

  const organization = data?.organization || null

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">조직 상세</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-muted rounded"></div>
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || (!isLoading && !organization)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">조직 상세</h1>
        </div>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {error?.message || '조직을 찾을 수 없습니다.'}
          </CardContent>
        </Card>
      </div>
    )
  }

  // After null check, organization is guaranteed to be non-null
  const org = organization!

  const statCards = [
    {
      title: '사용자',
      value: org.user_count,
      max: org.max_users,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: '학생',
      value: org.student_count,
      max: org.max_students,
      icon: GraduationCap,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: '수업',
      value: org.class_count,
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: '강의실',
      value: org.room_count,
      icon: DoorOpen,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{org.name}</h1>
              <Badge className={typeColors[org.type]}>
                {typeLabels[org.type]}
              </Badge>
              <Badge className={statusColors[org.status]}>
                {statusLabels[org.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">
              /{org.slug} &middot; {format(new Date(org.created_at), 'yyyy년 M월 d일', { locale: ko })} 생성
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stat.value.toLocaleString()}
                  {stat.max && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {' '}/ {stat.max.toLocaleString()}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Revenue, Credit and Kakao Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                매출
              </div>
              <Select
                value={org.selected_month}
                onValueChange={(value) => setSelectedMonth(value)}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(org.available_months?.length > 0
                    ? org.available_months
                    : [org.selected_month]
                  ).map((month) => (
                    <SelectItem key={month} value={month}>
                      {month.split('-')[0]}년 {Number(month.split('-')[1])}월
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {org.selected_month?.split('-')[0]}년 {Number(org.selected_month?.split('-')[1])}월 매출
                </p>
                <div className="text-3xl font-bold">
                  {org.monthly_revenue.toLocaleString()}원
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">누적 매출 (전체)</p>
                <div className="text-2xl font-bold text-blue-600">
                  {(org.total_revenue || 0).toLocaleString()}원
                </div>
              </div>
            </div>
            {org.recent_transactions.length > 0 && (
              <div className="mt-4 space-y-2 pt-4 border-t">
                <p className="text-sm font-medium text-muted-foreground">최근 거래</p>
                {org.recent_transactions.slice(0, 3).map((tx: any) => (
                  <div key={tx.id} className="flex justify-between text-sm">
                    <span>{tx.student_name || tx.revenue_category_name || '결제'}</span>
                    <span className="font-medium">{tx.amount?.toLocaleString()}원</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 충전금 카드 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                충전금 잔액
              </div>
              <Button variant="outline" size="sm" onClick={() => setCreditDialogOpen(true)}>
                충전/차감
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">
              {(org.credit_balance || 0).toLocaleString()}원
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              조직에서 사용 가능한 충전금
            </p>
          </CardContent>
        </Card>

        {/* 충전금 관리 모달 */}
        <AdminCreditModal
          open={creditDialogOpen}
          onOpenChange={setCreditDialogOpen}
          orgId={org.id}
          orgName={org.name}
          currentBalance={org.credit_balance || 0}
          onSuccess={() => mutate()}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              이번달 카카오 알림톡
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold">
                  {org.kakao_stats.total_count.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">발송</p>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {org.kakao_stats.success_count.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">성공</p>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {org.kakao_stats.total_cost.toLocaleString()}원
                </div>
                <p className="text-sm text-muted-foreground">비용</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Owner and Settings */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Owner Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              원장 정보
            </CardTitle>
          </CardHeader>
          <CardContent>
            {org.owner ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{org.owner.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{org.owner.email}</span>
                </div>
                {org.owner.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{org.owner.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(org.owner.created_at), 'yyyy년 M월 d일', { locale: ko })} 가입
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">원장 정보가 없습니다</p>
            )}
          </CardContent>
        </Card>

        {/* Org Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              조직 설정
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">구독 플랜</span>
                <Badge variant="outline" className="uppercase">
                  {org.subscription_plan}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">카카오 알림톡</span>
                <Badge className={(org.org_settings?.settings as any)?.use_kakao ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  {(org.org_settings?.settings as any)?.use_kakao ? '활성화' : '비활성화'}
                </Badge>
              </div>
              {org.org_settings?.kakao_channel_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">카카오 채널 ID</span>
                  <span className="text-sm">{org.org_settings.kakao_channel_id}</span>
                </div>
              )}
              {org.org_settings?.contact_phone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">연락처</span>
                  <span>{org.org_settings.contact_phone}</span>
                </div>
              )}
              {org.org_settings?.address && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">주소</span>
                  <span className="text-sm text-right max-w-[200px]">{org.org_settings.address}</span>
                </div>
              )}
              {org.org_settings?.business_hours && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">영업시간</span>
                  <span className="text-sm">{org.org_settings.business_hours}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>사용자 목록 (최근 10명)</CardTitle>
          <CardDescription>
            전체 {org.user_count}명의 사용자 중 최근 가입한 사용자입니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>이름</TableHead>
                  <TableHead>이메일</TableHead>
                  <TableHead>역할</TableHead>
                  <TableHead>가입일</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {org.users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      사용자가 없습니다
                    </TableCell>
                  </TableRow>
                ) : (
                  org.users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{roleLabels[user.role] || user.role}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(user.created_at), 'yyyy-MM-dd')}
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
