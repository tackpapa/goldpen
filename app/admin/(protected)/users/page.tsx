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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Search, Trash2 } from 'lucide-react'
import { format } from 'date-fns/format'

interface User {
  id: string
  email: string
  name: string
  role: string
  phone: string | null
  created_at: string
  organizations: { id: string; name: string; type: string } | null
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 20
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<User | null>(null)

  const roleLabels: Record<string, string> = {
    super_admin: '슈퍼 어드민',
    owner: '원장',
    manager: '매니저',
    teacher: '강사',
    staff: '직원',
    student: '학생',
    parent: '학부모',
  }

  const roleColors: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-800',
    owner: 'bg-blue-100 text-blue-800',
    manager: 'bg-green-100 text-green-800',
    teacher: 'bg-yellow-100 text-yellow-800',
    staff: 'bg-gray-100 text-gray-800',
    student: 'bg-pink-100 text-pink-800',
    parent: 'bg-orange-100 text-orange-800',
  }

  const columns: ColumnDef<User>[] = [
    {
      accessorKey: 'name',
      header: '이름',
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue('name')}</div>
      ),
    },
    {
      accessorKey: 'email',
      header: '이메일',
      cell: ({ row }) => (
        <div className="text-sm text-muted-foreground">
          {row.getValue('email')}
        </div>
      ),
    },
    {
      accessorKey: 'role',
      header: '역할',
      cell: ({ row }) => {
        const role = row.getValue('role') as string
        return (
          <Badge className={roleColors[role]}>
            {roleLabels[role] || role}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'phone',
      header: '전화번호',
      cell: ({ row }) => (
        <div className="text-sm">{row.getValue('phone') || '-'}</div>
      ),
    },
    {
      accessorKey: 'organizations',
      header: '소속 조직',
      cell: ({ row }) => {
        const org = row.getValue('organizations') as { name: string } | null
        return <div className="text-sm">{org?.name || '-'}</div>
      },
    },
    {
      accessorKey: 'created_at',
      header: '가입일',
      cell: ({ row }) => {
        const date = new Date(row.getValue('created_at'))
        return <div className="text-sm">{format(date, 'yyyy-MM-dd')}</div>
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original

        return (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => {
              setUserToDelete(user)
              setDeleteDialogOpen(true)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )
      },
    },
  ]

  const table = useReactTable({
    data: users,
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
    loadUsers()
  }, [page])

  const loadUsers = async () => {
    try {
      setIsLoading(true)
      const searchQuery = table.getColumn('name')?.getFilterValue() as string || ''

      const response = await fetch(
        `/api/admin/users?page=${page}&limit=${limit}&search=${searchQuery}`
      )

      if (response.ok) {
        const data = await response.json() as { users?: any[]; total?: number }
        setUsers(data.users || [])
        setTotalCount(data.total || 0)
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!userToDelete) return

    try {
      const response = await fetch(`/api/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadUsers()
      }
    } catch (error) {
      console.error('Failed to delete user:', error)
    } finally {
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">사용자 관리</h1>
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
      <div>
        <h1 className="text-3xl font-bold mb-2">사용자 관리</h1>
        <p className="text-muted-foreground">
          전체 {totalCount}명의 사용자를 관리하고 있습니다
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="이름 또는 이메일로 검색..."
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
          {totalCount > 0 ? (
            <>전체 {totalCount}명 중 {(page - 1) * limit + 1}-{Math.min(page * limit, totalCount)}명 표시</>
          ) : (
            <>결과 없음</>
          )}
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

      {/* 삭제 확인 모달 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>사용자 삭제</DialogTitle>
            <DialogDescription>
              정말로 <span className="font-semibold">{userToDelete?.name}</span> 사용자를 삭제하시겠습니까?
              <br />
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setUserToDelete(null)
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
