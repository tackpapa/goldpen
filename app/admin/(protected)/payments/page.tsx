'use client'

export const runtime = 'edge'
import { useState, useMemo } from 'react'
import useSWR from 'swr'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CreditCard,
  ArrowUpCircle,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Calendar
} from 'lucide-react'
import { format } from 'date-fns/format'
import { ko } from 'date-fns/locale'

interface Transaction {
  id: string
  org_id: string
  amount: number
  balance_after: number
  type: 'paid' | 'free'
  description: string | null
  admin_id: string | null
  created_at: string
  organizations: { id: string; name: string }
  users: { id: string; name: string; email: string } | null
}

interface PaymentsResponse {
  transactions: Transaction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats: {
    totalCharged: number
    paidCharged: number
    freeCharged: number
  }
}

const fetcher = <T,>(url: string): Promise<T> => fetch(url, { credentials: 'include' }).then(res => res.json())

const swrOptions = {
  revalidateOnFocus: false,
  dedupingInterval: 30000,
  refreshInterval: 300000,
}

export default function PaymentsPage() {
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // SWR URL 생성
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: '20',
      type: typeFilter,
    })
    if (startDate) params.set('start_date', startDate)
    if (endDate) params.set('end_date', endDate)
    return `/api/admin/payments?${params.toString()}`
  }, [page, typeFilter, startDate, endDate])

  // SWR로 데이터 페칭
  const { data, isLoading } = useSWR<PaymentsResponse>(apiUrl, fetcher, swrOptions)

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: 'created_at',
      header: '일시',
      cell: ({ row }) => {
        const date = new Date(row.original.created_at)
        return (
          <div className="text-sm">
            <div>{format(date, 'yyyy.MM.dd', { locale: ko })}</div>
            <div className="text-muted-foreground text-xs">{format(date, 'HH:mm', { locale: ko })}</div>
          </div>
        )
      },
    },
    {
      accessorKey: 'organizations',
      header: '조직',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.organizations?.name || '-'}</div>
      ),
    },
    {
      accessorKey: 'type',
      header: '유형',
      cell: ({ row }) => {
        const type = row.original.type
        const amount = row.original.amount

        if (amount > 0) {
          return (
            <Badge variant="outline" className={type === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}>
              {type === 'paid' ? '유료 충전' : '무료 부여'}
            </Badge>
          )
        }
        return null
      },
    },
    {
      accessorKey: 'amount',
      header: '금액',
      cell: ({ row }) => {
        const amount = row.original.amount
        const isPositive = amount > 0
        return (
          <div className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? '+' : ''}{amount.toLocaleString()}원
          </div>
        )
      },
    },
    {
      accessorKey: 'balance_after',
      header: '잔액',
      cell: ({ row }) => (
        <div className="text-sm">{row.original.balance_after.toLocaleString()}원</div>
      ),
    },
    {
      accessorKey: 'description',
      header: '설명',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground max-w-[200px] truncate">
          {row.original.description || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'users',
      header: '처리자',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.original.users?.name || '-'}
        </div>
      ),
    },
  ]

  const table = useReactTable({
    data: data?.transactions || [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">결제내역</h1>
        <p className="text-muted-foreground">
          조직별 충전금 충전 내역을 확인합니다
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 충전</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              +{(data?.stats.totalCharged || 0).toLocaleString()}원
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">유료 충전</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {(data?.stats.paidCharged || 0).toLocaleString()}원
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">무료 부여</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {(data?.stats.freeCharged || 0).toLocaleString()}원
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="space-y-2">
          <label className="text-sm font-medium">유형</label>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="전체" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="paid">유료 충전</SelectItem>
              <SelectItem value="free">무료 부여</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">시작일</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1) }}
            className="w-[160px]"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">종료일</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1) }}
            className="w-[160px]"
          />
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setTypeFilter('all')
            setStartDate('')
            setEndDate('')
            setPage(1)
          }}
        >
          필터 초기화
        </Button>
      </div>

      {/* 테이블 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  결제 내역이 없습니다
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 페이지네이션 */}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            총 {data.pagination.total}건 중 {(page - 1) * 20 + 1}-{Math.min(page * 20, data.pagination.total)}건
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              이전
            </Button>
            <span className="text-sm">
              {page} / {data.pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(data.pagination.totalPages, p + 1))}
              disabled={page === data.pagination.totalPages}
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
