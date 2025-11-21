'use client'

export const runtime = 'edge'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Plus, Search } from 'lucide-react'
import { format } from 'date-fns'

interface Organization {
  id: string
  name: string
  type: string
  status: string
  subscription_plan: string
  created_at: string
  user_count: number
  users: { name: string } | null
}

export default function OrganizationsPage() {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 20

  const typeLabels: Record<string, string> = {
    academy: '학원',
    learning_center: '러닝센터',
    study_cafe: '스터디카페',
    tutoring: '공부방',
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

  const columns: ColumnDef<Organization>[] = [
    {
      accessorKey: 'name',
      header: '조직명',
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('name')}</div>
      ),
    },
    {
      accessorKey: 'type',
      header: '타입',
      cell: ({ row }) => (
        <Badge variant="outline">
          {typeLabels[row.getValue('type')] || row.getValue('type')}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <Badge className={statusColors[status]}>
            {statusLabels[status] || status}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'subscription_plan',
      header: '플랜',
      cell: ({ row }) => (
        <div className="uppercase text-sm">
          {row.getValue('subscription_plan')}
        </div>
      ),
    },
    {
      accessorKey: 'user_count',
      header: '사용자 수',
      cell: ({ row }) => (
        <div className="text-center">{row.getValue('user_count')}</div>
      ),
    },
    {
      accessorKey: 'users',
      header: '원장',
      cell: ({ row }) => {
        const owner = row.getValue('users') as { name: string } | null
        return <div>{owner?.name || '-'}</div>
      },
    },
    {
      accessorKey: 'created_at',
      header: '생성일',
      cell: ({ row }) => {
        const date = new Date(row.getValue('created_at'))
        return <div>{format(date, 'yyyy-MM-dd')}</div>
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const organization = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">메뉴 열기</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>작업</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => router.push(`/admin/organizations/${organization.id}` as any)}
              >
                상세 보기
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/admin/organizations/${organization.id}/edit` as any)}
              >
                수정
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(organization.id)}
                className="text-red-600"
              >
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: organizations,
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
    loadOrganizations()
  }, [page])

  const loadOrganizations = async () => {
    try {
      setIsLoading(true)
      const searchQuery = table.getColumn('name')?.getFilterValue() as string || ''

      const response = await fetch(
        `/api/admin/organizations?page=${page}&limit=${limit}&search=${searchQuery}`
      )

      if (response.ok) {
        const data = await response.json()
        setOrganizations(data.organizations)
        setTotalCount(data.total)
      }
    } catch (error) {
      console.error('Failed to load organizations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 조직을 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/admin/organizations/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadOrganizations()
      }
    } catch (error) {
      console.error('Failed to delete organization:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">조직 관리</h1>
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
          <h1 className="text-3xl font-bold mb-2">조직 관리</h1>
          <p className="text-muted-foreground">
            전체 {totalCount}개의 조직을 관리하고 있습니다
          </p>
        </div>
        <Button onClick={() => router.push('/admin/organizations/new' as any)}>
          <Plus className="mr-2 h-4 w-4" />
          조직 추가
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="조직명으로 검색..."
            value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
            onChange={(event) => {
              table.getColumn('name')?.setFilterValue(event.target.value)
              setPage(1)
            }}
            className="pl-10"
          />
        </div>
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
