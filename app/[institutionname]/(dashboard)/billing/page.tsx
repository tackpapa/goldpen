'use client'

export const runtime = 'edge'
import { useState, useEffect } from 'react'
import { usePageAccess } from '@/hooks/use-page-access'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Download,
  FileText,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
} from 'recharts'
import type { MonthlyRevenueSummary } from '@/lib/types/database'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useParams } from 'next/navigation'

// Mock data - 수입 내역
interface RevenueTransaction {
  id: string
  date: string
  category: string // 수강료, 자릿세, 룸이용료, 교재판매
  amount: number
  student_name: string
  description: string
  payment_method: '현금' | '카드' | '계좌이체'
}

// Revenue transactions loaded from API
const revenueTransactions: RevenueTransaction[] = []

// Mock data - 월별 매출 요약
const monthlySummary: MonthlyRevenueSummary[] = [
  {
    month: '2025-01',
    revenue: 18500000,
    expenses: 12300000,
    net_profit: 6200000,
    student_count: 98,
    revenue_per_student: 188776,
  },
  {
    month: '2025-02',
    revenue: 20300000,
    expenses: 13100000,
    net_profit: 7200000,
    student_count: 105,
    revenue_per_student: 193333,
  },
  {
    month: '2025-03',
    revenue: 22100000,
    expenses: 14200000,
    net_profit: 7900000,
    student_count: 112,
    revenue_per_student: 197321,
  },
  {
    month: '2025-04',
    revenue: 21800000,
    expenses: 13900000,
    net_profit: 7900000,
    student_count: 108,
    revenue_per_student: 201852,
  },
  {
    month: '2025-05',
    revenue: 23500000,
    expenses: 15100000,
    net_profit: 8400000,
    student_count: 118,
    revenue_per_student: 199153,
  },
  {
    month: '2025-06',
    revenue: 24500000,
    expenses: 15800000,
    net_profit: 8700000,
    student_count: 124,
    revenue_per_student: 197581,
  },
]

// 지출 카테고리별 데이터
const expensesCategoryData = [
  { name: '강사 급여', value: 8500000, color: '#3b82f6' },
  { name: '임대료', value: 3000000, color: '#8b5cf6' },
  { name: '관리비', value: 1200000, color: '#ec4899' },
  { name: '교재/교구', value: 1500000, color: '#f59e0b' },
  { name: '마케팅', value: 1200000, color: '#10b981' },
  { name: '기타', value: 400000, color: '#6b7280' },
]

// 강사별 급여 데이터 - Now using real data from teacher_salaries table
// Moved to after data fetching (line ~295)

export default function BillingPage() {
  usePageAccess('billing')

  const { toast } = useToast()
  const params = useParams()
  const institution = (params?.institutionname as string) || 'goldpen'
  const dataEndpoint = `/${institution}/billing/data`

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('전체')

  // State for real data
  const [billingTransactions, setBillingTransactions] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [expenseCategories, setExpenseCategories] = useState<any[]>([])
  const [teacherSalaries, setTeacherSalaries] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data from BFF
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch(dataEndpoint, { credentials: 'include' })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || '데이터 조회 실패')

        setBillingTransactions(json.transactions || [])
        setExpenses(json.expenses || [])
        setExpenseCategories(json.expenseCategories || [])
        setTeacherSalaries(json.teacherSalaries || [])
        setStudents(json.students || [])

        // 초기 월 선택: 가장 최근 거래 월 또는 오늘
        if (!selectedMonth) {
          const latestTxMonth = json.transactions?.[0]?.payment_date?.substring(0, 7)
          const latestExpMonth = json.expenses?.[0]?.expense_date?.substring(0, 7)
          const candidate = latestTxMonth || latestExpMonth || new Date().toISOString().substring(0, 7)
          setSelectedMonth(candidate)
        }
      } catch (err) {
        console.error('Error fetching billing data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch data')
        toast({
          title: '데이터 로딩 실패',
          description: '데이터를 불러오는데 실패했습니다.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [toast, dataEndpoint])

  // Compute monthly summary from real data
  const computeMonthlySummary = () => {
    const monthlyData = new Map<string, { revenue: number; expenses: number }>()

    // Aggregate billing transactions (revenue) by month
    billingTransactions.forEach((tx) => {
      const month = tx.payment_date.substring(0, 7) // YYYY-MM format
      const current = monthlyData.get(month) || { revenue: 0, expenses: 0 }
      current.revenue += tx.amount || 0
      monthlyData.set(month, current)
    })

    // Aggregate expenses by month
    expenses.forEach((exp) => {
      const month = exp.expense_date.substring(0, 7) // YYYY-MM format
      const current = monthlyData.get(month) || { revenue: 0, expenses: 0 }
      current.expenses += exp.amount || 0
      monthlyData.set(month, current)
    })

    // Convert to array and calculate student counts
    return Array.from(monthlyData.entries())
      .map(([month, data]) => {
        // Count students who were created before or during this month (active students)
        const monthEnd = `${month}-31` // Approximate end of month
        const studentCount = students.filter(student => {
          const createdMonth = student.created_at.substring(0, 7) // YYYY-MM format
          return createdMonth <= month // Students registered on or before this month
        }).length

        return {
          month,
          revenue: data.revenue,
          expenses: data.expenses,
          net_profit: data.revenue - data.expenses,
          student_count: studentCount,
          revenue_per_student: studentCount > 0 ? Math.round(data.revenue / studentCount) : 0,
        }
      })
      .sort((a, b) => a.month.localeCompare(b.month))
  }

  const monthlySummary = loading ? [] : computeMonthlySummary()

  // Transform real billing transactions to match the expected format
  const revenueTransactions = billingTransactions.map(tx => ({
    id: tx.id,
    date: tx.payment_date,
    category: tx.revenue_category_name || tx.category || '수강료',
    amount: tx.amount || 0,
    student_name: tx.student_name || '미상',
    description: tx.notes || tx.description || '',
    payment_method:
      tx.payment_method === 'card'
        ? '카드'
        : tx.payment_method === 'cash'
        ? '현금'
        : tx.payment_method === 'transfer'
        ? '계좌이체'
        : '기타',
  }))

  // Transform teacher salaries to match the expected format
  const teacherSalaryData = teacherSalaries.map(ts => ({
    name: ts.name,
    type: ts.type,
    salary: ts.salary || 0,
    hours: ts.hours || 160 // Default to 160 hours for 정규직
  }))

  // 선택된 월의 데이터
  const monthKey = selectedMonth || new Date().toISOString().substring(0, 7)

  const currentMonthData = monthlySummary.find(item => item.month === selectedMonth) || monthlySummary[monthlySummary.length - 1] || {
    month: monthKey,
    revenue: 0,
    expenses: 0,
    net_profit: 0,
    student_count: 0,
    revenue_per_student: 0
  }
  const previousMonthData = monthlySummary[monthlySummary.findIndex(item => item.month === selectedMonth) - 1]

  // 전월 대비 변화율 계산
  const revenueChange = previousMonthData && currentMonthData
    ? Math.round(((currentMonthData.revenue - previousMonthData.revenue) / previousMonthData.revenue) * 100)
    : 0
  const profitChange = previousMonthData && currentMonthData
    ? Math.round(((currentMonthData.net_profit - previousMonthData.net_profit) / previousMonthData.net_profit) * 100)
    : 0
  const profitMargin = currentMonthData && currentMonthData.revenue > 0
    ? Math.round((currentMonthData.net_profit / currentMonthData.revenue) * 100)
    : 0

  // Compute expense categories data from real data
  const computeExpensesCategoryData = () => {
    if (!selectedMonth) return []
    const categoryTotals = new Map<string, { name: string; value: number; color: string }>()

    expenses
      .filter(exp => exp.expense_date.startsWith(monthKey))
      .forEach((exp) => {
        const categoryName = exp.category?.name || '기타'
        const categoryColor = exp.category?.color || '#6b7280'
        const current = categoryTotals.get(categoryName) || { name: categoryName, value: 0, color: categoryColor }
        current.value += exp.amount / 100 // Convert cents to won
        categoryTotals.set(categoryName, current)
      })

    return Array.from(categoryTotals.values())
  }

  const realExpensesCategoryData = loading ? expensesCategoryData : computeExpensesCategoryData()
  const totalExpenses = realExpensesCategoryData.reduce((sum, e) => sum + e.value, 0)

  // For teacher salary - use mock data for now (no teacher_salaries table yet)
  const totalTeacherSalary = teacherSalaryData.reduce((sum, t) => sum + t.salary, 0)

  // 항목별 수익 추이 데이터 (수강료/자릿세/룸이용료/교재판매)
  const categoryTrendData = monthlySummary.map((item) => {
    const ym = item.month
    const monthLabel = ym.split('-')[1] + '월'
    const sums: Record<string, number> = {
      '수강료': 0,
      '자릿세': 0,
      '룸이용료': 0,
      '교재판매': 0,
    }
    revenueTransactions
      .filter((t) => t.date.startsWith(ym))
      .forEach((t) => {
        if (sums[t.category] !== undefined) {
          sums[t.category] += t.amount || 0
        }
      })
    return { month: monthLabel, ...sums }
  })

  // 공통: 그래프 시작 구간을 실제 데이터 존재월로 제한
  const firstMonthWithData = (() => {
    const months = new Set<string>()
    billingTransactions.forEach((t) => {
      if (t.payment_date) months.add(t.payment_date.substring(0, 7))
    })
    expenses.forEach((e) => {
      if (e.expense_date) months.add(e.expense_date.substring(0, 7))
    })
    return Array.from(months).sort()[0] // YYYY-MM
  })()

  const monthlySummaryTrimmed = firstMonthWithData
    ? monthlySummary.filter((m) => m.month >= firstMonthWithData)
    : monthlySummary

  const profitMarginData = monthlySummaryTrimmed.map(item => ({
    month: item.month.split('-')[1] + '월',
    수익률: item.revenue > 0 ? Math.round((item.net_profit / item.revenue) * 100) : 0,
    수익: item.revenue,
    지출: item.expenses,
  }))

  const categoryTrendDataTrimmed = categoryTrendData.filter((row, idx) => {
    if (!firstMonthWithData) return true
    const ym = monthlySummary[idx]?.month
    return ym && ym >= firstMonthWithData
  })

  const handleExportReport = () => {
    toast({
      title: '리포트 내보내기',
      description: 'Excel 파일로 내보내기 기능은 구현 예정입니다.',
    })
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">데이터를 불러오는 중...</p>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>데이터 로딩 실패</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">매출정산</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            수익과 지출을 분석하고 재무 현황을 확인하세요
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={monthKey} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[...monthlySummary].sort((a, b) => b.month.localeCompare(a.month)).map((item) => (
                <SelectItem key={item.month} value={item.month}>
                  {item.month.split('-')[0]}년 {item.month.split('-')[1]}월
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExportReport}>
            <Download className="mr-2 h-4 w-4" />
            리포트
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 수익</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩{currentMonthData.revenue.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {revenueChange >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              )}
              <span className={revenueChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                {revenueChange > 0 && '+'}{revenueChange}%
              </span>
              <span>전월 대비</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 지출</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₩{currentMonthData.expenses.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>강사 급여 ₩{totalTeacherSalary.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">순이익</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₩{currentMonthData.net_profit.toLocaleString()}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {profitChange >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-500" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-500" />
              )}
              <span className={profitChange >= 0 ? 'text-green-500' : 'text-red-500'}>
                {profitChange > 0 && '+'}{profitChange}%
              </span>
              <span>전월 대비</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">수익률</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{profitMargin}%</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              <span>{currentMonthData.student_count}명 등록</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Summary (no filters) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['수강료', '자릿세', '룸이용료', '교재판매'].map((category) => {
          const categoryTotal = revenueTransactions
            .filter(t => t.date.startsWith(monthKey) && t.category === category)
            .reduce((sum, t) => sum + t.amount, 0)
          const categoryCount = revenueTransactions
            .filter(t => t.date.startsWith(monthKey) && t.category === category)
            .length

          const categoryIcons: Record<string, string> = {
            '수강료': '📚',
            '자릿세': '🪑',
            '룸이용료': '🚪',
            '교재판매': '📖',
          }

          return (
            <Card key={category}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{categoryIcons[category]}</span>
                  <CardTitle className="text-sm">{category}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">₩{categoryTotal.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">{categoryCount}건</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="income" className="space-y-4">
        <TabsList>
          <TabsTrigger value="income">수입내역</TabsTrigger>
          <TabsTrigger value="revenue">수익 분석</TabsTrigger>
          <TabsTrigger value="trends">추이 분석</TabsTrigger>
        </TabsList>

        {/* 수입내역 탭 */}
        <TabsContent value="income" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>수입 내역</CardTitle>
              <CardDescription>선택된 월의 상세 수입 거래 내역</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Month selector above filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <Select value={monthKey} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthlySummary.map((item) => (
                        <SelectItem key={item.month} value={item.month}>
                          {item.month.split('-')[0]}년 {item.month.split('-')[1]}월
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Category filter */}
                <div className="flex gap-2 flex-wrap">
                  {['전체', '수강료', '자릿세', '룸이용료', '교재판매'].map((category) => (
                    <Badge
                      key={category}
                      variant={selectedCategory === category ? 'default' : 'outline'}
                      className="cursor-pointer"
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </Badge>
                  ))}
                </div>

                {/* Transaction list */}
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left font-medium">날짜</th>
                        <th className="p-3 text-left font-medium">카테고리</th>
                        <th className="p-3 text-left font-medium">학생명</th>
                        <th className="p-3 text-left font-medium">상세내역</th>
                        <th className="p-3 text-right font-medium">금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {revenueTransactions
                        .filter(t => t.date.startsWith(monthKey))
                        .filter(t => selectedCategory === '전체' || t.category === selectedCategory)
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((transaction) => {
                          const categoryColors: Record<string, string> = {
                            '수강료': 'bg-blue-100 text-blue-700',
                            '자릿세': 'bg-purple-100 text-purple-700',
                            '룸이용료': 'bg-green-100 text-green-700',
                            '교재판매': 'bg-orange-100 text-orange-700',
                          }
                          return (
                            <tr key={transaction.id} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="p-3 text-muted-foreground">
                                {format(new Date(transaction.date), 'MM/dd')}
                              </td>
                              <td className="p-3">
                                <Badge
                                  variant="secondary"
                                  className={cn('font-medium', categoryColors[transaction.category])}
                                >
                                  {transaction.category}
                                </Badge>
                              </td>
                              <td className="p-3 font-medium">{transaction.student_name}</td>
                              <td className="p-3 text-muted-foreground">{transaction.description}</td>
                              <td className="p-3 text-right font-bold">
                                ₩{transaction.amount.toLocaleString()}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-muted/30">
                        <td colSpan={4} className="p-3 text-right font-bold">총 수입</td>
                        <td className="p-3 text-right font-bold text-lg">
                          ₩{revenueTransactions
                            .filter(t => t.date.startsWith(monthKey))
                            .filter(t => selectedCategory === '전체' || t.category === selectedCategory)
                            .reduce((sum, t) => sum + t.amount, 0)
                            .toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 수익 분석 탭 */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>월별 수익 추이</CardTitle>
                <CardDescription>최근 6개월 수익 변화</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlySummaryTrimmed}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(value) => value.split('-')[1] + '월'}
                    />
                    <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                    <Tooltip
                      formatter={(value: number) => `₩${value.toLocaleString()}`}
                      labelFormatter={(label) => `${label.split('-')[0]}년 ${label.split('-')[1]}월`}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      fill="hsl(var(--primary))"
                      fillOpacity={0.2}
                      name="수익"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>학생당 평균 수익</CardTitle>
                <CardDescription>등록 학생 수 대비 수익</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlySummaryTrimmed}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="month"
                      tickFormatter={(value) => value.split('-')[1] + '월'}
                    />
                    <YAxis tickFormatter={(value) => `₩${(value / 1000).toFixed(0)}K`} />
                    <Tooltip
                      formatter={(value: number) => `₩${value.toLocaleString()}`}
                      labelFormatter={(label) => `${label.split('-')[0]}년 ${label.split('-')[1]}월`}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue_per_student"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                      name="학생당 수익"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>항목별 수익 추이</CardTitle>
              <CardDescription>수강료, 자릿세, 룸이용료, 교재판매 월별 비교</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                <LineChart data={categoryTrendDataTrimmed}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(v) => `₩${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v: number) => `₩${v.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="수강료" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="자릿세" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="룸이용료" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="교재판매" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>수익 상세</CardTitle>
              <CardDescription>선택된 월의 수익 내역</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="font-medium">총 수강료 수익</span>
                  <span className="text-lg font-bold">₩{currentMonthData.revenue.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">등록 학생 수</span>
                  <span>{currentMonthData.student_count}명</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">학생당 평균 수익</span>
                  <span>₩{currentMonthData.revenue_per_student.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 추이 분석 탭 */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>수익 vs 지출 추이</CardTitle>
              <CardDescription>최근 6개월 수익과 지출 비교</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={monthlySummary}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={(value) => value.split('-')[1] + '월'}
                  />
                  <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} />
                  <Tooltip
                    formatter={(value: number) => `₩${value.toLocaleString()}`}
                    labelFormatter={(label) => `${label.split('-')[0]}년 ${label.split('-')[1]}월`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    name="수익"
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: '#ef4444', r: 4 }}
                    name="지출"
                  />
                  <Line
                    type="monotone"
                    dataKey="net_profit"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    name="순이익"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>수익률 추이</CardTitle>
              <CardDescription>순이익 / 총수익 비율</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={profitMarginData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `${value}%`} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === '수익률') return `${value}%`
                      return `₩${value.toLocaleString()}`
                    }}
                  />
                  <Legend />
                  <Bar dataKey="수익률" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
