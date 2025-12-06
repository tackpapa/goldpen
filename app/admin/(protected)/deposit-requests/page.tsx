'use client'

export const runtime = 'edge'

import { useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Wallet, Clock, CheckCircle, RefreshCw, Plus, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns/format'
import { ko } from 'date-fns/locale'
import { AdminCreditModal } from '@/components/admin/AdminCreditModal'

interface DepositRequest {
  id: string
  org_id: string
  org_name: string
  org_slug: string
  credit_balance: number
  message: string
  status: 'pending' | 'completed'
  amount: number | null
  created_at: string
  updated_at: string
}

interface DepositRequestsResponse {
  requests: DepositRequest[]
}

const fetcher = <T,>(url: string): Promise<T> => fetch(url, { credentials: 'include' }).then(res => res.json())

const swrOptions = {
  revalidateOnFocus: true,
  dedupingInterval: 5000,
}

export default function DepositRequestsPage() {
  const { toast } = useToast()
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [creditModalOpen, setCreditModalOpen] = useState(false)
  const [selectedOrg, setSelectedOrg] = useState<{
    id: string
    name: string
    creditBalance: number
  } | null>(null)

  // SWR로 데이터 페칭
  const { data, isLoading, mutate } = useSWR<DepositRequestsResponse>(
    '/api/admin/deposit-requests',
    fetcher,
    swrOptions
  )

  const requests = data?.requests || []

  // Stats
  const pendingCount = requests.filter(r => r.status === 'pending').length
  const completedCount = requests.filter(r => r.status === 'completed').length

  const handleOpenCreditModal = (request: DepositRequest) => {
    setSelectedOrg({
      id: request.org_id,
      name: request.org_name,
      creditBalance: request.credit_balance,
    })
    setCreditModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const res = await fetch(`/api/admin/deposit-requests?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (res.ok) {
        toast({
          title: '삭제 완료',
          description: '입금 신청이 삭제되었습니다.',
        })
        mutate()
      } else {
        const errorData = await res.json() as { error?: string }
        toast({
          title: '삭제 실패',
          description: errorData.error || '다시 시도해주세요.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '오류 발생',
        description: '서버와 통신할 수 없습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id)
    try {
      const res = await fetch('/api/admin/deposit-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, status: newStatus }),
      })

      if (res.ok) {
        toast({
          title: '상태 변경 완료',
          description: newStatus === 'completed' ? '입금완료로 변경되었습니다.' : '입금신청으로 변경되었습니다.',
        })
        mutate()
      } else {
        const errorData = await res.json() as { error?: string }
        toast({
          title: '변경 실패',
          description: errorData.error || '다시 시도해주세요.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '오류 발생',
        description: '서버와 통신할 수 없습니다.',
        variant: 'destructive',
      })
    } finally {
      setUpdatingId(null)
    }
  }

  const columns: ColumnDef<DepositRequest>[] = [
    {
      accessorKey: 'org_name',
      header: '조직',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.org_name}</div>
          <div className="text-xs text-muted-foreground">{row.original.org_slug}</div>
        </div>
      ),
    },
    {
      accessorKey: 'credit_balance',
      header: '현재 잔액',
      cell: ({ row }) => (
        <div className="font-medium text-emerald-600">
          {row.original.credit_balance.toLocaleString()}원
        </div>
      ),
    },
    {
      accessorKey: 'message',
      header: '입금 메시지',
      cell: ({ row }) => (
        <div className="max-w-[200px] truncate" title={row.original.message}>
          {row.original.message}
        </div>
      ),
    },
    {
      accessorKey: 'created_at',
      header: '신청일시',
      cell: ({ row }) => {
        try {
          return format(new Date(row.original.created_at), 'yyyy-MM-dd HH:mm', { locale: ko })
        } catch {
          return '-'
        }
      },
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => {
        const isUpdating = updatingId === row.original.id
        return (
          <Select
            value={row.original.status}
            onValueChange={(value) => handleStatusChange(row.original.id, value)}
            disabled={isUpdating}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-yellow-500" />
                  입금신청
                </div>
              </SelectItem>
              <SelectItem value="completed">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  입금완료
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        )
      },
    },
    {
      id: 'actions',
      header: '충전',
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleOpenCreditModal(row.original)}
        >
          <Plus className="h-3 w-3 mr-1" />
          충전하기
        </Button>
      ),
    },
    {
      id: 'delete',
      header: '',
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
          onClick={() => handleDelete(row.original.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ]

  const table = useReactTable({
    data: requests,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">입금 신청 관리</h1>
          <p className="text-muted-foreground">조직의 충전금 입금 신청을 관리합니다.</p>
        </div>
        <Button variant="outline" onClick={() => mutate()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          새로고침
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 신청</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requests.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">입금대기</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">입금완료</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bank Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">입금 계좌 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm">
            <div><span className="text-muted-foreground">은행:</span> <span className="font-medium">신한은행</span></div>
            <div><span className="text-muted-foreground">계좌:</span> <span className="font-medium font-mono">110-530-753434</span></div>
            <div><span className="text-muted-foreground">예금주:</span> <span className="font-medium">버클리컨설팅</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>입금 신청 목록</CardTitle>
          <CardDescription>상태를 변경하여 입금 처리를 완료하세요. 충전하기 버튼으로 바로 충전금을 적립할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              입금 신청이 없습니다.
            </div>
          ) : (
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
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={row.original.status === 'pending' ? 'bg-yellow-50/50' : ''}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Modal */}
      {selectedOrg && (
        <AdminCreditModal
          open={creditModalOpen}
          onOpenChange={setCreditModalOpen}
          orgId={selectedOrg.id}
          orgName={selectedOrg.name}
          currentBalance={selectedOrg.creditBalance}
          onSuccess={() => mutate()}
        />
      )}
    </div>
  )
}
