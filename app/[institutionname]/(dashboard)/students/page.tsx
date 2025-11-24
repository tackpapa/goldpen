'use client'

export const runtime = 'edge'


import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import dynamic from 'next/dynamic'
import { ColumnDef } from '@tanstack/react-table'
import { usePageAccess } from '@/hooks/use-page-access'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Trash2, MoreHorizontal, RefreshCw } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { StudentSchema, type StudentInput } from '@/lib/validations/student'
import type { Student } from '@/lib/types/database'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { generateUniqueAttendanceCode } from '@/lib/utils/generate-attendance-code'

const StudentDetailModal = dynamic(
  () => import('@/components/students/StudentDetailModal').then((m) => m.StudentDetailModal),
  { ssr: false }
)

// Grade options
const gradeOptions = [
  { value: '초1', label: '초1' },
  { value: '초2', label: '초2' },
  { value: '초3', label: '초3' },
  { value: '초4', label: '초4' },
  { value: '초5', label: '초5' },
  { value: '초6', label: '초6' },
  { value: '중1', label: '중1' },
  { value: '중2', label: '중2' },
  { value: '중3', label: '중3' },
  { value: '고1', label: '고1' },
  { value: '고2', label: '고2' },
  { value: '고3', label: '고3' },
  { value: '재수', label: '재수' },
]

export default function StudentsPage() {
  usePageAccess('students')

  const { toast } = useToast()
  const params = useParams()
  const institutionName = (params?.institutionname as string) || ''
  const [students, setStudents] = useState<Student[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [attendanceCodeError, setAttendanceCodeError] = useState<string>('')
  const [campusError, setCampusError] = useState<string>('')
  const [branchError, setBranchError] = useState<string>('')
  const [selectedBranch, setSelectedBranch] = useState<string>(institutionName)
  const [selectedCampuses, setSelectedCampuses] = useState<string[]>([])
  const campusOptions = [
    { id: 'academy', label: '학원' },
    { id: 'studyroom', label: '공부방' },
    { id: 'readingroom', label: '독서실' },
  ]

  // Student detail modal state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [creditFilter, setCreditFilter] = useState<'all' | 'negative'>('all')

  // Fetch students from API on mount
  useEffect(() => {
    const fetchStudents = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/students', { credentials: 'include', credentials: 'include' })
        const data = await response.json() as { students?: Student[]; error?: string }

        if (response.ok) {
          const normalized = (data.students || []).map((s) => ({
            ...s,
            attendance_code: (s as any).attendance_code || (s as any).student_code || '',
            student_code: (s as any).student_code || (s as any).attendance_code || '',
            branch_name: (s as any).branch_name || institutionName || '',
            campuses: (s as any).campuses || [],
          }))
          setStudents(normalized)
        } else {
          toast({
            title: '데이터 로드 실패',
            description: data.error || '학생 목록을 불러올 수 없습니다.',
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
        setIsLoading(false)
      }
    }

    fetchStudents()
  }, [toast])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<StudentInput>({
    resolver: zodResolver(StudentSchema),
    defaultValues: {
      status: 'active',
      subjects: [],
    },
  })

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: 'name',
      header: '이름',
      cell: ({ row }) => {
        const student = row.original
        return (
          <button
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            onClick={() => {
              setSelectedStudent(student)
              setIsDetailModalOpen(true)
            }}
          >
            {student.name}
          </button>
        )
      },
    },
    {
      accessorKey: 'grade',
      header: '학년',
      cell: ({ row }) => {
        const grade = row.getValue('grade') as number
        return grade ? `${grade}학년` : '-'
      },
    },
    {
      accessorKey: 'phone',
      header: '연락처',
    },
    {
      accessorKey: 'branch_name',
      header: '지점',
      cell: ({ row }) => row.getValue('branch_name') || '-',
    },
    {
      accessorKey: 'campuses',
      header: '소속',
      cell: ({ row }) => {
        const campuses = row.getValue('campuses') as string[] | null
        if (!campuses || campuses.length === 0) return '-'
        return (
          <div className="flex gap-1 flex-wrap">
            {campuses.map((campus, i) => (
              <Badge key={i} variant="secondary">
                {campus}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const statusMap = {
          active: { label: '재학', variant: 'default' as const },
          inactive: { label: '휴학', variant: 'secondary' as const },
          graduated: { label: '졸업', variant: 'outline' as const },
        }
        const statusInfo = statusMap[status as keyof typeof statusMap]
        return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const student = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleDelete(student.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const filteredStudents =
    creditFilter === 'negative'
      ? students.filter((s) => (s.credit ?? 0) < 0)
      : students

  const handleOpenDialog = () => {
    reset({
      status: 'active',
      subjects: [],
    })
    setAttendanceCodeError('')
    setIsDialogOpen(true)
  }

  const handleGenerateAttendanceCode = () => {
    const existingCodes = students.map(s => s.attendance_code).filter(Boolean) as string[]
    const newCode = generateUniqueAttendanceCode(existingCodes)
    setValue('attendance_code', newCode)
    setAttendanceCodeError('')
    toast({
      title: '출결코드 생성',
      description: `새로운 출결코드가 생성되었습니다: ${newCode}`,
    })
  }

  const handleAttendanceCodeChange = async (value: string) => {
    setValue('attendance_code', value)

    // 4자리가 아니면 검증 안 함
    if (value.length !== 4) {
      setAttendanceCodeError('')
      return
    }

    // 중복 검증
    const existingCodes = students
      .map(s => s.attendance_code)
      .filter(Boolean) as string[]

    if (existingCodes.includes(value)) {
      setAttendanceCodeError('중복 코드는 사용할 수 없습니다.')
      return
    }

    // 서버 측 중복 확인 (동일 org 내)
    try {
      const res = await fetch(`/api/students?attendance_code=${value}`, { credentials: 'include' })
      const data = await res.json() as { count?: number }
      if (data.count && data.count > 0) {
        setAttendanceCodeError('중복 코드는 사용할 수 없습니다.')
      } else {
        setAttendanceCodeError('')
      }
    } catch {
      // 네트워크 오류 시 기존 상태 유지
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 삭제하시겠습니까?')) return

    setIsLoading(true)
    const prev = students
    setStudents(students.filter((s) => s.id !== id))
    try {
      const response = await fetch(`/api/students/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: '삭제 완료',
          description: '학생 정보가 삭제되었습니다.',
        })
      } else {
        const data = await response.json() as { error?: string }
        setStudents(prev)
        toast({
          title: '삭제 실패',
          description: data.error || '학생 삭제에 실패했습니다.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      setStudents(prev)
      toast({
        title: '오류 발생',
        description: '서버와 통신할 수 없습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmit = async (data: StudentInput) => {
    // 캠퍼스 필수 체크
    if (selectedCampuses.length === 0) {
      setCampusError('소속(학원/공부방/독서실)을 최소 1개 선택하세요.')
      return
    } else {
      setCampusError('')
    }
    if (!selectedBranch) {
      setBranchError('지점을 선택하세요.')
      return
    } else {
      setBranchError('')
    }
    // 출결코드 중복 검증
    if (attendanceCodeError) {
      toast({
        title: '입력 오류',
        description: attendanceCodeError,
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      // 출결코드가 없으면 자동 생성
      let attendanceCode = data.attendance_code
      if (!attendanceCode) {
        const existingCodes = students.map(s => s.attendance_code).filter(Boolean) as string[]
        attendanceCode = generateUniqueAttendanceCode(existingCodes)
      } else {
        // 수동 입력한 경우 최종 중복 검증
        const existingCodes = students
          .map(s => s.attendance_code)
          .filter(Boolean) as string[]

        if (existingCodes.includes(attendanceCode)) {
          toast({
            title: '입력 오류',
            description: '이미 사용 중인 출결코드입니다',
            variant: 'destructive',
          })
          setIsLoading(false)
          return
        }
      }

      const campusNote = `캠퍼스:${selectedCampuses.join(',')}`
      const branchNote = `지점:${selectedBranch}`
      const notesCombined = [branchNote, campusNote].join('\n')
      const payload = {
        ...data,
        attendance_code: attendanceCode,
        branch_name: selectedBranch,
        campuses: selectedCampuses,
        notes: data.notes ? `${data.notes}\n${notesCombined}` : notesCombined,
      }

      const tempId = crypto.randomUUID()
      const optimisticStudent: Student = {
        id: tempId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        org_id: '',
        class_id: data.class_id || null,
        name: data.name,
        grade: data.grade,
        phone: data.phone || '',
        parent_name: data.parent_name || '',
        parent_phone: data.parent_phone || '',
        attendance_code: attendanceCode,
        subjects: data.subjects || [],
        status: data.status || 'active',
        school: data.school || '',
        notes: data.notes || '',
      }
      setStudents((prev) => [...prev, optimisticStudent])

      const response = await fetch('/api/students', {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const { student } = (await response.json()) as { student: Student }
        setStudents((prev) => {
          const idx = prev.findIndex((s) => s.id === tempId)
          if (idx >= 0) {
            const copy = [...prev]
            copy[idx] = student
            return copy
          }
          return [...prev, student]
        })
        toast({
          title: '등록 완료',
          description: `학생이 등록되었습니다. 출결코드: ${attendanceCode}`,
        })
        setIsDialogOpen(false)
        reset()
        setAttendanceCodeError('')
      } else {
        const { error } = (await response.json()) as { error?: string }
        setStudents((prev) => prev.filter((s) => s.id !== tempId))
        toast({
          title: '등록 실패',
          description: error || '학생 등록에 실패했습니다.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      setStudents((prev) => prev.filter((s) => s.id !== tempId))
      toast({
        title: '오류 발생',
        description: '다시 시도해주세요.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">학생 관리</h1>
          <p className="text-sm md:text-base text-muted-foreground">학생 정보를 관리하세요</p>
        </div>
        <Button onClick={handleOpenDialog} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          학생 등록
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <DataTable
            columns={columns}
            data={filteredStudents}
            searchKey="name"
            searchPlaceholder="학생 이름으로 검색..."
            toolbar={
              <div className="flex gap-2">
                <Button
                  variant={creditFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCreditFilter('all')}
                >
                  전체
                </Button>
                <Button
                  variant={creditFilter === 'negative' ? 'destructive' : 'outline'}
                  size="sm"
                  onClick={() => setCreditFilter('negative')}
                >
                  미납중
                </Button>
              </div>
            }
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>
              학생 등록
            </DialogTitle>
            <DialogDescription>
              학생의 기본 정보와 학부모 정보를 입력해주세요
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">학생 이름 *</Label>
                <Input id="name" {...register('name')} disabled={isLoading} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="attendance_code">출결코드 (4자리)</Label>
                {attendanceCodeError && (
                  <p className="text-sm text-destructive">중복 코드는 사용할 수 없습니다.</p>
                )}
                <div className="flex gap-2">
                  <Input
                    id="attendance_code"
                    {...register('attendance_code')}
                    placeholder="비워두면 자동 생성"
                    maxLength={4}
                    disabled={isLoading}
                    className={attendanceCodeError ? 'border-destructive' : ''}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, '')
                      handleAttendanceCodeChange(value)
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleGenerateAttendanceCode}
                    disabled={isLoading}
                    title="출결코드 자동 생성"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
                    {errors.attendance_code && !attendanceCodeError && (
                      <p className="text-sm text-destructive">{errors.attendance_code.message}</p>
                    )}
                <p className="text-xs text-muted-foreground">
                  학생이 출결 체크 시 사용하는 고유 번호입니다
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch">지점 *</Label>
                <Select
                  value={selectedBranch}
                  onValueChange={(val) => setSelectedBranch(val)}
                  disabled={isLoading}
                >
                  <SelectTrigger id="branch">
                    <SelectValue placeholder="지점을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={institutionName || '본점'}>
                      {institutionName || '본점'}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {branchError && <p className="text-sm text-destructive">{branchError}</p>}
              </div>

              <div className="space-y-2">
                <Label>소속(필수) *</Label>
                <div className="flex flex-wrap gap-2">
                  {campusOptions.map((option) => {
                    const checked = selectedCampuses.includes(option.id)
                    return (
                      <Button
                        key={option.id}
                        type="button"
                        variant={checked ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          'px-3',
                          checked ? '' : 'bg-transparent'
                        )}
                        onClick={() => {
                          setSelectedCampuses((prev) =>
                            checked
                              ? prev.filter((id) => id !== option.id)
                              : [...prev, option.id]
                          )
                        }}
                        disabled={isLoading}
                      >
                        {option.label}
                      </Button>
                    )
                  })}
                </div>
                {campusError && <p className="text-sm text-destructive">{campusError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">학년 *</Label>
                <Select
                  disabled={isLoading}
                  onValueChange={(value) => setValue('grade', value as any)}
                                  >
                  <SelectTrigger id="grade">
                    <SelectValue placeholder="학년을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map((grade) => (
                      <SelectItem key={grade.value} value={grade.value}>
                        {grade.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.grade && (
                  <p className="text-sm text-destructive">{errors.grade.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="school">학교 *</Label>
                <Input
                  id="school"
                  placeholder="예: 서울중학교"
                  {...register('school')}
                  disabled={isLoading}
                />
                {errors.school && (
                  <p className="text-sm text-destructive">{errors.school.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">학생 연락처</Label>
                <Input
                  id="phone"
                  placeholder="010-1234-5678"
                  {...register('phone')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">학생 이메일</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                {...register('address')}
                disabled={isLoading}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="parent_name">학부모 이름 *</Label>
                <Input
                  id="parent_name"
                  {...register('parent_name')}
                  disabled={isLoading}
                />
                {errors.parent_name && (
                  <p className="text-sm text-destructive">
                    {errors.parent_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent_phone">학부모 연락처 *</Label>
                <Input
                  id="parent_phone"
                  placeholder="010-1234-5678"
                  {...register('parent_phone')}
                  disabled={isLoading}
                />
                {errors.parent_phone && (
                  <p className="text-sm text-destructive">
                    {errors.parent_phone.message}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent_email">학부모 이메일</Label>
              <Input
                id="parent_email"
                type="email"
                {...register('parent_email')}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">상태</Label>
              <Select
                defaultValue="active"
                onValueChange={(value) =>
                  setValue('status', value as 'active' | 'inactive' | 'graduated')
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">재학</SelectItem>
                  <SelectItem value="inactive">휴학</SelectItem>
                  <SelectItem value="graduated">졸업</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">메모</Label>
              <Textarea
                id="notes"
                rows={3}
                {...register('notes')}
                disabled={isLoading}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isLoading}
              >
                취소
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? '처리중...' : '등록'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Student Detail Modal */}
      <StudentDetailModal
        student={selectedStudent}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        onUpdate={(updatedStudent) => {
          setStudents(students.map(s => s.id === updatedStudent.id ? updatedStudent : s))
          toast({
            title: '학생 정보 업데이트',
            description: `${updatedStudent.name} 학생의 정보가 업데이트되었습니다.`,
          })
        }}
      />
    </div>
  )
}
