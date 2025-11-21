'use client'

export const runtime = 'edge'


import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  TrendingDown,
  TrendingUp,
  DollarSign,
  Calendar,
  Download,
  Filter,
  Wallet,
  PieChart as PieChartIcon,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AreaChart,
  Area,
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
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { MonthlyExpenseSummary, ExpenseCategory, ExpenseRecord } from '@/lib/types/database'
import { expenseCategoryManager } from '@/lib/utils/expense-categories'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'


export default function ExpensesPage() {
  const { toast } = useToast()
  const [selectedPeriod, setSelectedPeriod] = useState('6months')
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([])
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpenseSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expenseFilter, setExpenseFilter] = useState<'all' | 'monthly' | 'weekly' | 'one-time'>('all')
  const [selectedMonth, setSelectedMonth] = useState('2024-10')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('전체')

  // Expense creation dialog state
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false)
  const [expenseForm, setExpenseForm] = useState({
    category_id: '',
    custom_category_name: '', // 직접 입력한 항목명
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    is_recurring: false,
    recurring_type: '' as 'weekly' | 'monthly' | '',
    notes: '',
  })

  useEffect(() => {
    // Load expense categories from localStorage
    const categories = expenseCategoryManager.getCategories()
    setExpenseCategories(categories)

    // Fetch expenses from API
    const fetchExpenses = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/expenses', { credentials: 'include' })
        const data = await response.json() as {
          expenseRecords?: ExpenseRecord[]
          monthlyExpenses?: MonthlyExpenseSummary[]
          error?: string
        }
        if (response.ok) {
          setExpenseRecords(data.expenseRecords || [])
          setMonthlyExpenses(data.monthlyExpenses || [])
        } else {
          toast({ title: '지출 데이터 로드 실패', variant: 'destructive' })
        }
      } catch {
        toast({ title: '오류 발생', variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    }
    fetchExpenses()
  }, [toast])

  // Computed values from monthlyExpenses
  const latestMonth = monthlyExpenses[monthlyExpenses.length - 1] || {
    month: '',
    total_expenses: 0,
    category_expenses: [],
    previous_month_total: 0,
    change_percentage: 0
  }
  const previousMonth = monthlyExpenses[monthlyExpenses.length - 2] || {
    month: '',
    total_expenses: 0,
    category_expenses: [],
    previous_month_total: 0,
    change_percentage: 0
  }

  // Chart data transformations
  const trendData = monthlyExpenses.map(item => ({
    month: item.month.slice(5),
    지출: item.total_expenses / 10000,
    증감률: item.change_percentage,
  }))

  const categoryTrendData = monthlyExpenses.map(item => {
    const data: Record<string, string | number> = { month: item.month.slice(5) }
    item.category_expenses.forEach(cat => {
      data[cat.category_name] = cat.amount / 10000
    })
    return data
  })

  // Get colors for each category
  const getCategoryColor = (categoryName: string) => {
    const category = expenseCategories.find(cat => cat.name === categoryName)
    return category?.color || '#6b7280'
  }

  // Handle expense creation
  const handleCreateExpense = () => {
    setExpenseForm({
      category_id: '',
      custom_category_name: '',
      amount: '',
      expense_date: new Date().toISOString().split('T')[0],
      is_recurring: false,
      recurring_type: '',
      notes: '',
    })
    setIsExpenseDialogOpen(true)
  }

  // Handle save expense
  const handleSaveExpense = () => {
    // 직접 입력인 경우 custom_category_name 체크
    const isCustomCategory = expenseForm.category_id === 'custom'
    const categoryName = isCustomCategory
      ? expenseForm.custom_category_name
      : expenseCategories.find(cat => cat.id === expenseForm.category_id)?.name

    if (!categoryName || !expenseForm.amount) {
      toast({
        title: '입력 오류',
        description: isCustomCategory
          ? '항목명과 비용을 입력해주세요.'
          : '항목과 비용을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    if (expenseForm.is_recurring && !expenseForm.recurring_type) {
      toast({
        title: '입력 오류',
        description: '반복 주기를 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    // TODO: Save to database
    const newExpense: ExpenseRecord = {
      id: `expense-${Date.now()}`,
      created_at: new Date().toISOString(),
      org_id: 'org-1', // TODO: Get from context
      category_id: expenseForm.category_id,
      category_name: categoryName,
      amount: parseFloat(expenseForm.amount),
      expense_date: expenseForm.expense_date,
      is_recurring: expenseForm.is_recurring,
      recurring_type: expenseForm.recurring_type || undefined,
      notes: expenseForm.notes || undefined,
    }

    console.log('New expense:', newExpense)

    toast({
      title: '지출 등록 완료',
      description: `${categoryName} - ₩${parseFloat(expenseForm.amount).toLocaleString()} 지출이 등록되었습니다.`,
    })

    setIsExpenseDialogOpen(false)
  }

  // Handle recurring type toggle
  const handleRecurringToggle = (value: boolean) => {
    setExpenseForm({
      ...expenseForm,
      is_recurring: value,
      recurring_type: value ? '' : '',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">지출정산</h1>
          <p className="text-muted-foreground mt-2">
            월별 지출 분석 및 카테고리별 비용 관리
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">최근 3개월</SelectItem>
              <SelectItem value="6months">최근 6개월</SelectItem>
              <SelectItem value="12months">최근 12개월</SelectItem>
              <SelectItem value="custom">기간 설정</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            내보내기
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 지출</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₩{latestMonth.total_expenses.toLocaleString()}
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              <Calendar className="mr-1 h-3 w-3" />
              {latestMonth.month}
            </div>
            <div className="flex items-center mt-2">
              {latestMonth.change_percentage! > 0 ? (
                <TrendingUp className="mr-1 h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="mr-1 h-4 w-4 text-green-500" />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  latestMonth.change_percentage! > 0 ? 'text-red-600' : 'text-green-600'
                )}
              >
                {latestMonth.change_percentage! > 0 ? '+' : ''}
                {latestMonth.change_percentage?.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">vs 전월</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">최대 지출 항목</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {latestMonth.category_expenses[0].category_name}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              ₩{latestMonth.category_expenses[0].amount.toLocaleString()}
            </p>
            <div className="flex items-center mt-2">
              <Badge variant="secondary">
                {latestMonth.category_expenses[0].percentage.toFixed(1)}%
              </Badge>
              <span className="text-xs text-muted-foreground ml-2">전체 지출 대비</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 월 지출</CardTitle>
            <PieChartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₩
              {monthlyExpenses.length > 0 ? (
                monthlyExpenses.reduce((sum, m) => sum + m.total_expenses, 0) /
                monthlyExpenses.length
              ).toLocaleString('ko-KR', { maximumFractionDigits: 0 }) : '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">최근 6개월 평균</p>
            <div className="flex items-center mt-2">
              <Badge variant="outline">
                {expenseCategories.filter(c => c.is_active).length}개 항목
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전월 대비</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₩
              {(
                latestMonth.total_expenses - previousMonth.total_expenses
              ).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">증감액</p>
            <div className="flex items-center mt-2">
              <Badge
                variant={latestMonth.change_percentage! > 0 ? 'destructive' : 'default'}
              >
                {latestMonth.change_percentage! > 0 ? '증가' : '감소'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Tabs */}
      <Tabs defaultValue="records" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="records">지출 내역</TabsTrigger>
            <TabsTrigger value="trend">지출 추이</TabsTrigger>
            <TabsTrigger value="category">카테고리별 분석</TabsTrigger>
            <TabsTrigger value="comparison">월별 비교</TabsTrigger>
            <TabsTrigger value="breakdown">항목별 상세</TabsTrigger>
          </TabsList>
          <Button onClick={handleCreateExpense}>
            <Plus className="mr-2 h-4 w-4" />
            지출 생성
          </Button>
        </div>

        {/* Expense Records Tab */}
        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>지출 내역</CardTitle>
              <CardDescription>선택된 월의 상세 지출 거래 내역</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Month and Category filter */}
                <div className="flex items-center gap-4">
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['2024-10', '2024-09', '2024-08'].map((month) => (
                        <SelectItem key={month} value={month}>
                          {month.split('-')[0]}년 {month.split('-')[1]}월
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2 flex-wrap">
                    {['전체', '강사 급여', '임대료', '관리비', '교재/교구', '마케팅', '기타'].map((category) => (
                      <Badge
                        key={category}
                        variant={selectedCategoryFilter === category ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setSelectedCategoryFilter(category)}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Transaction table */}
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left font-medium">날짜</th>
                        <th className="p-3 text-left font-medium">카테고리</th>
                        <th className="p-3 text-left font-medium">상세내역</th>
                        <th className="p-3 text-center font-medium">반복</th>
                        <th className="p-3 text-right font-medium">금액</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseRecords
                        .filter(expense => expense.expense_date.startsWith(selectedMonth))
                        .filter(expense => selectedCategoryFilter === '전체' || expense.category_name === selectedCategoryFilter)
                        .sort((a, b) => new Date(b.expense_date).getTime() - new Date(a.expense_date).getTime())
                        .map(expense => {
                          const category = expenseCategories.find(cat => cat.name === expense.category_name)
                          const categoryColor = category?.color || '#6b7280'

                          // Category color classes
                          const categoryColors: Record<string, string> = {
                            '강사 급여': 'bg-blue-100 text-blue-700',
                            '임대료': 'bg-purple-100 text-purple-700',
                            '관리비': 'bg-green-100 text-green-700',
                            '교재/교구': 'bg-orange-100 text-orange-700',
                            '마케팅': 'bg-pink-100 text-pink-700',
                            '기타': 'bg-gray-100 text-gray-700',
                          }

                          return (
                            <tr key={expense.id} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="p-3 text-muted-foreground">
                                {format(new Date(expense.expense_date), 'MM/dd')}
                              </td>
                              <td className="p-3">
                                <Badge
                                  variant="secondary"
                                  className={cn('font-medium', categoryColors[expense.category_name])}
                                >
                                  {expense.category_name}
                                </Badge>
                              </td>
                              <td className="p-3 text-muted-foreground">{expense.notes || '메모 없음'}</td>
                              <td className="p-3 text-center">
                                {expense.is_recurring ? (
                                  <Badge variant="outline" className="text-xs">
                                    {expense.recurring_type === 'weekly' ? '주마다' : '월마다'}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-xs">일회성</span>
                                )}
                              </td>
                              <td className="p-3 text-right font-bold">
                                ₩{expense.amount.toLocaleString()}
                              </td>
                            </tr>
                          )
                        })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 bg-muted/30">
                        <td colSpan={4} className="p-3 text-right font-bold">총 지출</td>
                        <td className="p-3 text-right font-bold text-lg">
                          ₩{expenseRecords
                            .filter(expense => expense.expense_date.startsWith(selectedMonth))
                            .filter(expense => selectedCategoryFilter === '전체' || expense.category_name === selectedCategoryFilter)
                            .reduce((sum, expense) => sum + expense.amount, 0)
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

        {/* Expense Trend Tab */}
        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>월별 지출 추이</CardTitle>
              <CardDescription>최근 6개월간의 지출 변화를 확인하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [`₩${(value * 10000).toLocaleString()}`, '지출']}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="지출"
                    stroke="#ef4444"
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>증감률 추이</CardTitle>
                <CardDescription>전월 대비 지출 증감률</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(1)}%`, '증감률']} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="증감률"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>이번 달 지출 구성</CardTitle>
                <CardDescription>카테고리별 지출 비중 ({latestMonth.month})</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={latestMonth.category_expenses}
                      dataKey="amount"
                      nameKey="category_name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry) => `${entry.percentage.toFixed(1)}%`}
                    >
                      {latestMonth.category_expenses.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={getCategoryColor(entry.category_name)} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `₩${value.toLocaleString()}`}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Category Analysis Tab */}
        <TabsContent value="category" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>카테고리별 지출 추이</CardTitle>
              <CardDescription>각 항목별 월별 지출 변화</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={categoryTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => `₩${(value * 10000).toLocaleString()}`}
                  />
                  <Legend />
                  {latestMonth.category_expenses.map((cat, index) => (
                    <Bar
                      key={cat.category_id}
                      dataKey={cat.category_name}
                      fill={getCategoryColor(cat.category_name)}
                      stackId="a"
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {latestMonth.category_expenses.map((cat, index) => {
              const previousCat = previousMonth.category_expenses.find(
                c => c.category_name === cat.category_name
              )
              const change = previousCat
                ? ((cat.amount - previousCat.amount) / previousCat.amount) * 100
                : 0

              return (
                <Card key={cat.category_id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">{cat.category_name}</CardTitle>
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: getCategoryColor(cat.category_name) }}
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">₩{cat.amount.toLocaleString()}</div>
                    <div className="flex items-center justify-between mt-2">
                      <Badge variant="secondary">{cat.percentage.toFixed(1)}% 비중</Badge>
                      <div className="flex items-center">
                        {change > 0 ? (
                          <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                        )}
                        <span
                          className={cn(
                            'text-sm font-medium',
                            change > 0 ? 'text-red-600' : 'text-green-600'
                          )}
                        >
                          {change > 0 ? '+' : ''}
                          {change.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        {/* Monthly Comparison Tab */}
        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>월별 비교 분석</CardTitle>
              <CardDescription>지난 6개월간의 월별 지출 비교</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => [`₩${(value * 10000).toLocaleString()}`, '지출']}
                  />
                  <Legend />
                  <Bar dataKey="지출" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {[...monthlyExpenses].reverse().map((month, index) => (
              <Card key={month.month}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{month.month}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        총 ₩{month.total_expenses.toLocaleString()}
                      </Badge>
                      {month.change_percentage && (
                        <Badge
                          variant={month.change_percentage > 0 ? 'destructive' : 'default'}
                        >
                          {month.change_percentage > 0 ? '+' : ''}
                          {month.change_percentage.toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {month.category_expenses.map(cat => (
                      <div key={cat.category_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: getCategoryColor(cat.category_name) }}
                          />
                          <span className="text-sm font-medium">{cat.category_name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            ₩{cat.amount.toLocaleString()}
                          </span>
                          <Badge variant="secondary" className="w-14 justify-center">
                            {cat.percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Breakdown Tab */}
        <TabsContent value="breakdown" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>항목별 상세 분석</CardTitle>
              <CardDescription>
                각 지출 항목의 상세 내역 ({latestMonth.month})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {latestMonth.category_expenses.map((cat, index) => {
                  const history = monthlyExpenses.map(m => {
                    const categoryData = m.category_expenses.find(
                      c => c.category_name === cat.category_name
                    )
                    return {
                      month: m.month.slice(5),
                      amount: categoryData ? categoryData.amount / 10000 : 0,
                    }
                  })

                  return (
                    <div key={cat.category_id} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-4 w-4 rounded"
                            style={{ backgroundColor: getCategoryColor(cat.category_name) }}
                          />
                          <div>
                            <h4 className="font-semibold">{cat.category_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              ₩{cat.amount.toLocaleString()} ({cat.percentage.toFixed(1)}%)
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm">
                          상세 보기
                        </Button>
                      </div>
                      <ResponsiveContainer width="100%" height={100}>
                        <LineChart data={history}>
                          <XAxis dataKey="month" hide />
                          <YAxis hide />
                          <Tooltip
                            formatter={(value: number) => `₩${(value * 10000).toLocaleString()}`}
                          />
                          <Line
                            type="monotone"
                            dataKey="amount"
                            stroke={getCategoryColor(cat.category_name)}
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Expense Creation Dialog */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>지출 생성</DialogTitle>
            <DialogDescription>
              새로운 지출 내역을 등록하세요
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* 1. 항목 선택 */}
            <div className="space-y-2">
              <Label htmlFor="category">1. 항목 *</Label>
              <Select
                value={expenseForm.category_id}
                onValueChange={(value) => {
                  setExpenseForm({
                    ...expenseForm,
                    category_id: value,
                    custom_category_name: value === 'custom' ? expenseForm.custom_category_name : ''
                  })
                }}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="지출 항목을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.filter(cat => cat.is_active).map(category => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <Plus className="h-3 w-3" />
                      직접 입력
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>

              {/* 직접 입력 필드 (custom 선택 시만 표시) */}
              {expenseForm.category_id === 'custom' && (
                <Input
                  placeholder="항목명을 입력하세요 (예: 사무용품)"
                  value={expenseForm.custom_category_name}
                  onChange={(e) => setExpenseForm({ ...expenseForm, custom_category_name: e.target.value })}
                  className="animate-in slide-in-from-top-2"
                />
              )}
            </div>

            {/* 2. 비용 입력 */}
            <div className="space-y-2">
              <Label htmlFor="amount">2. 비용 *</Label>
              <Input
                id="amount"
                type="number"
                placeholder="예: 3500000"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
              />
            </div>

            {/* 지출 날짜 */}
            <div className="space-y-2">
              <Label htmlFor="expense_date">지출 날짜</Label>
              <Input
                id="expense_date"
                type="date"
                value={expenseForm.expense_date}
                onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
              />
            </div>

            {/* 3. 반복성 지출 / 일회성 지출 */}
            <div className="space-y-3">
              <Label>3. 지출 유형 *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={expenseForm.is_recurring ? 'outline' : 'default'}
                  className="flex-1"
                  onClick={() => handleRecurringToggle(false)}
                >
                  일회성 지출
                </Button>
                <Button
                  type="button"
                  variant={expenseForm.is_recurring ? 'default' : 'outline'}
                  className="flex-1"
                  onClick={() => handleRecurringToggle(true)}
                >
                  반복성 지출
                </Button>
              </div>

              {/* 반복 주기 선택 (반복성 지출일 때만 표시) */}
              {expenseForm.is_recurring && (
                <div className="flex gap-2 animate-in slide-in-from-top-2">
                  <Button
                    type="button"
                    variant={expenseForm.recurring_type === 'weekly' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setExpenseForm({ ...expenseForm, recurring_type: 'weekly' })}
                  >
                    주마다
                  </Button>
                  <Button
                    type="button"
                    variant={expenseForm.recurring_type === 'monthly' ? 'default' : 'outline'}
                    className="flex-1"
                    onClick={() => setExpenseForm({ ...expenseForm, recurring_type: 'monthly' })}
                  >
                    월마다
                  </Button>
                </div>
              )}
            </div>

            {/* 메모 */}
            <div className="space-y-2">
              <Label htmlFor="notes">메모 (선택)</Label>
              <Textarea
                id="notes"
                placeholder="지출에 대한 추가 설명을 입력하세요"
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveExpense}>
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
