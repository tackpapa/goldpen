'use client'

export const runtime = 'edge'
import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Users, TrendingUp, Activity, MessageSquare, Send, Wallet, DollarSign, CreditCard, ArrowUpCircle, ArrowDownCircle, PiggyBank, Gift, AlertTriangle } from 'lucide-react'

interface Stats {
  totalOrganizations: number
  activeOrganizations: number
  totalUsers: number
  recentOrganizations: number
}

interface MessageStats {
  sms: { count: number; totalPrice: number; totalCost: number; profit: number }
  kakao_alimtalk: { count: number; totalPrice: number; totalCost: number; profit: number }
  total: { count: number; totalPrice: number; totalCost: number; profit: number }
  period: string
}

interface CreditStats {
  totalBalance: number
  paidBalance: number    // 유료 충전금 잔액 (실제 수익)
  freeBalance: number    // 무료 제공금 잔액 (부채)
  orgsWithBalance: number
  today: {
    used: number
    charged: number
    paidCharged: number
    freeCharged: number
  }
  month: {
    used: number
    charged: number
    paidCharged: number
    freeCharged: number
    year: number
    month: number
  }
  monthlyUsage: Array<{
    month: string
    label: string
    used: number
    charged: number
    paidCharged: number
    freeCharged: number
  }>
}

// 월별 옵션 생성 (최근 6개월)
function getMonthOptions() {
  const options = []
  const now = new Date()

  for (let i = 0; i < 6; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = `${date.getFullYear()}년 ${date.getMonth() + 1}월`
    options.push({ value, label })
  }

  return options
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalUsers: 0,
    recentOrganizations: 0,
  })
  const [messageStats, setMessageStats] = useState<MessageStats>({
    sms: { count: 0, totalPrice: 0, totalCost: 0, profit: 0 },
    kakao_alimtalk: { count: 0, totalPrice: 0, totalCost: 0, profit: 0 },
    total: { count: 0, totalPrice: 0, totalCost: 0, profit: 0 },
    period: 'month',
  })
  const [creditStats, setCreditStats] = useState<CreditStats>({
    totalBalance: 0,
    paidBalance: 0,
    freeBalance: 0,
    orgsWithBalance: 0,
    today: { used: 0, charged: 0, paidCharged: 0, freeCharged: 0 },
    month: { used: 0, charged: 0, paidCharged: 0, freeCharged: 0, year: 0, month: 0 },
    monthlyUsage: [],
  })
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [selectedCreditMonth, setSelectedCreditMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const monthOptions = getMonthOptions()

  // 메시지 통계 로드 함수
  const loadMessageStats = async (month: string) => {
    try {
      const res = await fetch(`/api/admin/stats/messages?month=${month}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json() as MessageStats
        setMessageStats(data)
      }
    } catch (error) {
      console.error('Failed to load message stats:', error)
    }
  }

  // 충전금 통계 로드 함수
  const loadCreditStats = async (month: string) => {
    try {
      const res = await fetch(`/api/admin/stats/credits?month=${month}`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json() as CreditStats
        setCreditStats(data)
      }
    } catch (error) {
      console.error('Failed to load credit stats:', error)
    }
  }

  useEffect(() => {
    const loadStats = async () => {
      try {
        const overviewRes = await fetch('/api/admin/stats/overview', { credentials: 'include' })

        if (overviewRes.ok) {
          const data = await overviewRes.json() as Stats
          setStats(data)
        }

        // 메시지 통계도 로드
        await loadMessageStats(selectedMonth)
        // 충전금 통계도 로드
        await loadCreditStats(selectedCreditMonth)
      } catch (error) {
        console.error('Failed to load stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [])

  // 월 변경 시 메시지 통계 다시 로드
  const handleMonthChange = (month: string) => {
    setSelectedMonth(month)
    loadMessageStats(month)
  }

  // 충전금 월 변경 핸들러
  const handleCreditMonthChange = (month: string) => {
    setSelectedCreditMonth(month)
    loadCreditStats(month)
  }

  const statCards = [
    {
      title: '전체 조직',
      value: stats.totalOrganizations,
      icon: Building2,
      description: '등록된 모든 조직',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: '활성 조직',
      value: stats.activeOrganizations,
      icon: Activity,
      description: '현재 운영 중',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: '전체 사용자',
      value: stats.totalUsers,
      icon: Users,
      description: '모든 조직 포함',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: '최근 가입',
      value: stats.recentOrganizations,
      icon: TrendingUp,
      description: '지난 7일',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">대시보드</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="animate-pulse">
                <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">대시보드</h1>
        <p className="text-muted-foreground">
          골드펜 플랫폼의 전체 현황을 한눈에 확인하세요
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* 메시지 발송 통계 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              메시지 발송 현황
            </CardTitle>
            <Select value={selectedMonth} onValueChange={handleMonthChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="월 선택" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* SMS 발송 */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-blue-100">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium">SMS 문자</span>
              </div>
              <div className="text-2xl font-bold">{messageStats.sms.count.toLocaleString()}건</div>
              <div className="text-xs text-muted-foreground mt-1">
                매출 {messageStats.sms.totalPrice.toLocaleString()}원
              </div>
            </div>

            {/* 카카오 알림톡 */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <Send className="h-4 w-4 text-yellow-600" />
                </div>
                <span className="text-sm font-medium">카카오 알림톡</span>
              </div>
              <div className="text-2xl font-bold">{messageStats.kakao_alimtalk.count.toLocaleString()}건</div>
              <div className="text-xs text-muted-foreground mt-1">
                매출 {messageStats.kakao_alimtalk.totalPrice.toLocaleString()}원
              </div>
            </div>

            {/* 총 원가 */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-red-100">
                  <Wallet className="h-4 w-4 text-red-600" />
                </div>
                <span className="text-sm font-medium">총 원가</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                {messageStats.total.totalCost.toLocaleString()}원
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                총 {messageStats.total.count.toLocaleString()}건 발송
              </div>
            </div>

            {/* 순수익 */}
            <div className="p-4 border rounded-lg bg-green-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-green-100">
                  <DollarSign className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm font-medium">순수익</span>
              </div>
              <div className={`text-2xl font-bold ${messageStats.total.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {messageStats.total.profit >= 0 ? '+' : ''}{messageStats.total.profit.toLocaleString()}원
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                매출 {messageStats.total.totalPrice.toLocaleString()}원
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* 상세 통계 */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="text-sm font-medium">SMS 문자 상세</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">발송</span>
                  <div className="font-medium">{messageStats.sms.count.toLocaleString()}건</div>
                </div>
                <div>
                  <span className="text-muted-foreground">원가</span>
                  <div className="font-medium text-red-600">{messageStats.sms.totalCost.toLocaleString()}원</div>
                </div>
                <div>
                  <span className="text-muted-foreground">수익</span>
                  <div className={`font-medium ${messageStats.sms.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {messageStats.sms.profit >= 0 ? '+' : ''}{messageStats.sms.profit.toLocaleString()}원
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">카카오 알림톡 상세</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">발송</span>
                  <div className="font-medium">{messageStats.kakao_alimtalk.count.toLocaleString()}건</div>
                </div>
                <div>
                  <span className="text-muted-foreground">원가</span>
                  <div className="font-medium text-red-600">{messageStats.kakao_alimtalk.totalCost.toLocaleString()}원</div>
                </div>
                <div>
                  <span className="text-muted-foreground">수익</span>
                  <div className={`font-medium ${messageStats.kakao_alimtalk.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {messageStats.kakao_alimtalk.profit >= 0 ? '+' : ''}{messageStats.kakao_alimtalk.profit.toLocaleString()}원
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 충전금 현황 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              충전금 현황
            </CardTitle>
            <Select value={selectedCreditMonth} onValueChange={handleCreditMonthChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="월 선택" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* 유료 충전금 잔액 (실제 수익) */}
            <div className="p-4 border rounded-lg bg-blue-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-blue-100">
                  <PiggyBank className="h-4 w-4 text-blue-600" />
                </div>
                <span className="text-sm font-medium">유료 충전금</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">
                {creditStats.paidBalance.toLocaleString()}원
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                실제 수익 ({creditStats.orgsWithBalance}개 조직)
              </div>
            </div>

            {/* 무료 제공금 잔액 (부채) */}
            <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <Gift className="h-4 w-4 text-yellow-600" />
                </div>
                <span className="text-sm font-medium">무료 제공금</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">
                {creditStats.freeBalance.toLocaleString()}원
              </div>
              <div className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                부채 (미사용 무료 충전)
              </div>
            </div>

            {/* 오늘 사용량 */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-red-100">
                  <ArrowDownCircle className="h-4 w-4 text-red-600" />
                </div>
                <span className="text-sm font-medium">오늘 사용</span>
              </div>
              <div className="text-2xl font-bold text-red-600">
                -{creditStats.today.used.toLocaleString()}원
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                충전 +{creditStats.today.charged.toLocaleString()}원
              </div>
            </div>

            {/* 이번 달 사용량 */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-orange-100">
                  <ArrowDownCircle className="h-4 w-4 text-orange-600" />
                </div>
                <span className="text-sm font-medium">이번 달 사용</span>
              </div>
              <div className="text-2xl font-bold text-orange-600">
                -{creditStats.month.used.toLocaleString()}원
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {creditStats.month.year}년 {creditStats.month.month}월
              </div>
            </div>

            {/* 이번 달 충전량 */}
            <div className="p-4 border rounded-lg bg-green-50">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-lg bg-green-100">
                  <ArrowUpCircle className="h-4 w-4 text-green-600" />
                </div>
                <span className="text-sm font-medium">이번 달 충전</span>
              </div>
              <div className="text-2xl font-bold text-green-600">
                +{creditStats.month.charged.toLocaleString()}원
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                유료 {creditStats.month.paidCharged.toLocaleString()}원 / 무료 {creditStats.month.freeCharged.toLocaleString()}원
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* 월별 사용량 트렌드 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">월별 충전금 현황 (최근 6개월)</h4>
            <div className="space-y-2">
              {creditStats.monthlyUsage.map((m) => {
                const maxValue = Math.max(
                  ...creditStats.monthlyUsage.map((x) => Math.max(x.used, x.charged)),
                  1
                )
                const usedWidth = (m.used / maxValue) * 100
                const chargedWidth = (m.charged / maxValue) * 100

                return (
                  <div key={m.month} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{m.label}</span>
                      <span className="font-medium">
                        사용 <span className="text-red-600">-{m.used.toLocaleString()}</span>
                        {' / '}
                        충전 <span className="text-green-600">+{m.charged.toLocaleString()}</span>
                      </span>
                    </div>
                    <div className="flex gap-1 h-2">
                      <div
                        className="bg-red-400 rounded-sm transition-all duration-300"
                        style={{ width: `${usedWidth}%` }}
                      />
                      <div
                        className="bg-green-400 rounded-sm transition-all duration-300"
                        style={{ width: `${chargedWidth}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-400 rounded-sm" />
                <span>사용</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-400 rounded-sm" />
                <span>충전</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
