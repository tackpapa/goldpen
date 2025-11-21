'use client'

import { useEffect, useState } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search } from 'lucide-react'
import { format } from 'date-fns'

interface AuditLog {
  id: string
  user_id: string
  org_id: string | null
  action: string
  resource_type: string
  resource_id: string
  old_values: any
  new_values: any
  ip_address: string
  user_agent: string
  created_at: string
  users: { id: string; name: string; email: string } | null
  organizations: { id: string; name: string } | null
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [resourceTypeFilter, setResourceTypeFilter] = useState('')
  const limit = 20

  const actionLabels: Record<string, string> = {
    create: '생성',
    update: '수정',
    delete: '삭제',
    login: '로그인',
    logout: '로그아웃',
  }

  const actionColors: Record<string, string> = {
    create: 'bg-green-100 text-green-800',
    update: 'bg-blue-100 text-blue-800',
    delete: 'bg-red-100 text-red-800',
    login: 'bg-purple-100 text-purple-800',
    logout: 'bg-gray-100 text-gray-800',
  }

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: 'created_at',
      header: '시간',
      cell: ({ row }) => {
        const date = new Date(row.getValue('created_at'))
        return (
          <div className="text-sm whitespace-nowrap">
            {format(date, 'yyyy-MM-dd HH:mm:ss')}
          </div>
        )
      },
    },
    {
      accessorKey: 'users',
      header: '사용자',
      cell: ({ row }) => {
        const user = row.getValue('users') as { name: string; email: string } | null
        return (
          <div className="text-sm">
            <div className="font-medium">{user?.name || '-'}</div>
            <div className="text-muted-foreground text-xs">{user?.email || '-'}</div>
          </div>
        )
      },
    },
    {
      accessorKey: 'organizations',
      header: '조직',
      cell: ({ row }) => {
        const org = row.getValue('organizations') as { name: string } | null
        return <div className="text-sm">{org?.name || '-'}</div>
      },
    },
    {
      accessorKey: 'action',
      header: '액션',
      cell: ({ row }) => {
        const action = row.getValue('action') as string
        return (
          <Badge className={actionColors[action]}>
            {actionLabels[action] || action}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'resource_type',
      header: '리소스 타입',
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue('resource_type')}</div>
      ),
    },
    {
      accessorKey: 'ip_address',
      header: 'IP 주소',
      cell: ({ row }) => (
        <div className="text-sm font-mono">{row.getValue('ip_address') || '-'}</div>
      ),
    },
  ]

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  useEffect(() => {
    loadLogs()
  }, [page, actionFilter, resourceTypeFilter])

  const loadLogs = async () => {
    try {
      setIsLoading(true)
      const searchQuery = table.getColumn('resource_type')?.getFilterValue() as string || ''

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      if (searchQuery) params.append('search', searchQuery)
      if (actionFilter) params.append('action', actionFilter)
      if (resourceTypeFilter) params.append('resource_type', resourceTypeFilter)

      const response = await fetch(`/api/admin/audit-logs?${params}`)

      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs)
        setTotalCount(data.total)
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">감사 로그</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">감사 로그</h1>
          <p className="text-muted-foreground">
            전체 {totalCount}개의 로그가 기록되어 있습니다
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="리소스 ID로 검색..."
            value={(table.getColumn('resource_type')?.getFilterValue() as string) ?? ''}
            onChange={(event) => {
              table.getColumn('resource_type')?.setFilterValue(event.target.value)
              setPage(1)
            }}
            className="pl-10"
          />
        </div>
        <Select value={actionFilter} onValueChange={(value) => {
          setActionFilter(value === 'all' ? '' : value)
          setPage(1)
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="액션 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="create">생성</SelectItem>
            <SelectItem value="update">수정</SelectItem>
            <SelectItem value="delete">삭제</SelectItem>
            <SelectItem value="login">로그인</SelectItem>
            <SelectItem value="logout">로그아웃</SelectItem>
          </SelectContent>
        </Select>
        <Select value={resourceTypeFilter} onValueChange={(value) => {
          setResourceTypeFilter(value === 'all' ? '' : value)
          setPage(1)
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="리소스 타입" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            <SelectItem value="user">사용자</SelectItem>
            <SelectItem value="organization">조직</SelectItem>
            <SelectItem value="settings">설정</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  결과가 없습니다.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between space-x-2">
        <div className="text-sm text-muted-foreground">
          전체 {totalCount}개 중 {(page - 1) * limit + 1}-
          {Math.min(page * limit, totalCount)}개 표시
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
          >
            이전
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page * limit >= totalCount}
          >
            다음
          </Button>
        </div>
      </div>
    </div>
  )
}
