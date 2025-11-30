'use client'

import { useState, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import useSWR, { mutate } from 'swr'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/hooks/use-toast'
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Users,
  UserCheck,
  UserX,
  ArrowUpDown,
} from 'lucide-react'
import { ManagerDetailModal, type Manager as ManagerModalType } from '@/components/managers'

interface Manager {
  id: string
  org_id: string
  user_id: string
  name: string
  email: string
  phone: string
  status: 'active' | 'inactive'
  employment_type: 'full_time' | 'part_time' | 'contract'
  salary_type: 'monthly' | 'hourly'
  salary_amount: number
  payment_day: number | null
  hire_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

interface ManagerFormData {
  name: string
  email: string
  phone: string
  status: 'active' | 'inactive'
  employment_type: 'full_time' | 'part_time' | 'contract'
  salary_type: 'monthly' | 'hourly'
  salary_amount: number
  hire_date: string
  notes: string
}

const defaultFormData: ManagerFormData = {
  name: '',
  email: '',
  phone: '',
  status: 'active',
  employment_type: 'full_time',
  salary_type: 'monthly',
  salary_amount: 0,
  hire_date: new Date().toISOString().split('T')[0],
  notes: '',
}

interface ManagersResponse {
  managers: Manager[]
}

const fetcher = async (url: string): Promise<ManagersResponse> => {
  const res = await fetch(url)
  if (!res.ok) {
    const errorData = await res.json() as { error?: string }
    throw new Error(errorData.error || '데이터를 불러오는데 실패했습니다')
  }
  return res.json()
}

export default function ManagersPage() {
  const router = useRouter()
  const params = useParams()
  const institutionName = params.institutionname as string
  const { toast } = useToast()

  // 테이블 상태
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  // 다이얼로그 상태
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedManager, setSelectedManager] = useState<Manager | null>(null)
  const [formData, setFormData] = useState<ManagerFormData>(defaultFormData)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 상세 모달 상태
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [detailManager, setDetailManager] = useState<Manager | null>(null)

  // 매니저 목록 조회
  const { data: managersData, error: managersError, isLoading: managersLoading } = useSWR<ManagersResponse>(
    `/api/managers?orgSlug=${institutionName}`,
    fetcher
  )

  const managers = managersData?.managers ?? []

  // 통계
  const stats = useMemo(() => {
    const total = managers.length
    const active = managers.filter((m: Manager) => m.status === 'active').length
    const inactive = managers.filter((m: Manager) => m.status === 'inactive').length
    return { total, active, inactive }
  }, [managers])

  // 테이블 컬럼 정의
  const columns: ColumnDef<Manager>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4"
        >
          이름
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const manager = row.original
        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-orange-100 text-orange-700 text-xs">
                {manager.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{manager.name}</div>
              <div className="text-xs text-muted-foreground">{manager.email}</div>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'phone',
      header: '연락처',
      cell: ({ row }) => row.original.phone || '-',
    },
    {
      accessorKey: 'employment_type',
      header: '고용형태',
      cell: ({ row }) => {
        const type = row.original.employment_type
        const labels: Record<string, string> = {
          full_time: '정규직',
          part_time: '파트타임',
          contract: '계약직',
        }
        return labels[type] || type
      },
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => {
        const status = row.original.status
        return (
          <Badge variant={status === 'active' ? 'default' : 'secondary'}>
            {status === 'active' ? '활성' : '비활성'}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const manager = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setSelectedManager(manager)
                  setFormData({
                    name: manager.name,
                    email: manager.email,
                    phone: manager.phone || '',
                    status: manager.status,
                    employment_type: manager.employment_type,
                    salary_type: manager.salary_type,
                    salary_amount: manager.salary_amount,
                    hire_date: manager.hire_date || '',
                    notes: manager.notes || '',
                  })
                  setEditDialogOpen(true)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                수정
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSelectedManager(manager)
                  setDeleteDialogOpen(true)
                }}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: managers,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  })

  // 매니저 생성
  const handleCreate = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: '입력 오류',
        description: '이름, 이메일, 연락처는 필수입니다.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/managers?orgSlug=${institutionName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json() as { error?: string }
        throw new Error(error.error || '매니저 생성에 실패했습니다')
      }

      const data = await res.json() as { tempPassword?: string }
      toast({
        title: '매니저 등록 완료',
        description: `${formData.name}님이 매니저로 등록되었습니다.`,
      })

      // 임시 비밀번호 안내
      if (data.tempPassword) {
        toast({
          title: '임시 비밀번호',
          description: `임시 비밀번호: ${data.tempPassword} (초대 메일 발송 필요)`,
          duration: 10000,
        })
      }

      setCreateDialogOpen(false)
      setFormData(defaultFormData)
      mutate(`/api/managers?orgSlug=${institutionName}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : '매니저 생성에 실패했습니다'
      toast({
        title: '오류',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 매니저 수정
  const handleEdit = async () => {
    if (!selectedManager) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/managers/${selectedManager.id}?orgSlug=${institutionName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json() as { error?: string }
        throw new Error(error.error || '매니저 수정에 실패했습니다')
      }

      toast({
        title: '수정 완료',
        description: `${formData.name}님의 정보가 수정되었습니다.`,
      })

      setEditDialogOpen(false)
      setSelectedManager(null)
      setFormData(defaultFormData)
      mutate(`/api/managers?orgSlug=${institutionName}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : '매니저 수정에 실패했습니다'
      toast({
        title: '오류',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 매니저 삭제
  const handleDelete = async () => {
    if (!selectedManager) return

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/managers/${selectedManager.id}?orgSlug=${institutionName}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json() as { error?: string }
        throw new Error(error.error || '매니저 삭제에 실패했습니다')
      }

      toast({
        title: '삭제 완료',
        description: `${selectedManager.name}님이 삭제되었습니다.`,
      })

      setDeleteDialogOpen(false)
      setSelectedManager(null)
      mutate(`/api/managers?orgSlug=${institutionName}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : '매니저 삭제에 실패했습니다'
      toast({
        title: '오류',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 로딩 상태
  if (managersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">매니저 관리</h1>
          <p className="text-muted-foreground">매니저(직원) 정보를 관리합니다.</p>
        </div>
        <Button onClick={() => {
          setFormData(defaultFormData)
          setCreateDialogOpen(true)
        }}>
          <Plus className="mr-2 h-4 w-4" />
          매니저 등록
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 매니저</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}명</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">활성 매니저</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}명</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">비활성 매니저</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">{stats.inactive}명</div>
          </CardContent>
        </Card>
      </div>

      {/* 검색 및 테이블 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>매니저 목록</CardTitle>
              <CardDescription>총 {managers.length}명의 매니저가 등록되어 있습니다.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="이름, 이메일 검색..."
                  value={globalFilter ?? ''}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="pl-8 w-[250px]"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
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
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => {
                        setDetailManager(row.original)
                        setDetailModalOpen(true)
                      }}
                    >
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
                      등록된 매니저가 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-end space-x-2 py-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              이전
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              다음
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 매니저 생성 다이얼로그 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>매니저 등록</DialogTitle>
            <DialogDescription>
              새로운 매니저(직원) 정보를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="홍길동"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="manager@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">연락처 *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="010-1234-5678"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="employment_type">고용형태</Label>
              <Select
                value={formData.employment_type}
                onValueChange={(v) => setFormData({ ...formData, employment_type: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">정규직</SelectItem>
                  <SelectItem value="part_time">파트타임</SelectItem>
                  <SelectItem value="contract">계약직</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">상태</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">활성</SelectItem>
                  <SelectItem value="inactive">비활성</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? '등록 중...' : '등록'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 매니저 수정 다이얼로그 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>매니저 정보 수정</DialogTitle>
            <DialogDescription>
              매니저 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">이름 *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">이메일 *</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">연락처 *</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-employment_type">고용형태</Label>
              <Select
                value={formData.employment_type}
                onValueChange={(v) => setFormData({ ...formData, employment_type: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">정규직</SelectItem>
                  <SelectItem value="part_time">파트타임</SelectItem>
                  <SelectItem value="contract">계약직</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-status">상태</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">활성</SelectItem>
                  <SelectItem value="inactive">비활성</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 매니저 삭제 다이얼로그 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>매니저 삭제</DialogTitle>
            <DialogDescription>
              정말 {selectedManager?.name}님을 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 매니저 상세 모달 */}
      <ManagerDetailModal
        manager={detailManager}
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        institutionName={institutionName}
        onUpdate={(updatedManager) => {
          setDetailManager(updatedManager)
          mutate(`/api/managers?orgSlug=${institutionName}`)
        }}
      />
    </div>
  )
}
