'use client'

import { useState } from 'react'
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
import { Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react'
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
import { StudentDetailModal } from '@/components/students/StudentDetailModal'

// Grade options
const gradeOptions = [
  { value: '중1', label: '중1' },
  { value: '중2', label: '중2' },
  { value: '중3', label: '중3' },
  { value: '고1', label: '고1' },
  { value: '고2', label: '고2' },
  { value: '고3', label: '고3' },
  { value: '재수', label: '재수' },
]

// Mock data for development
const mockStudents: Student[] = [
  {
    id: '1',
    created_at: '2025-01-01',
    updated_at: '2025-01-01',
    org_id: 'org-1',
    name: '김민준',
    grade: '고1',
    school: '강남고등학교',
    phone: '010-1234-5678',
    parent_name: '김아무개',
    parent_phone: '010-9876-5432',
    parent_email: 'parent@example.com',
    address: '서울시 강남구',
    subjects: ['수학', '영어'],
    status: 'active',
    enrollment_date: '2025-01-01',
    notes: '성실한 학생',
    files: [
      {
        id: 'file-1',
        name: '성적표_2025_1학기.pdf',
        type: 'application/pdf',
        size: 245678,
        url: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        uploaded_at: '2025-01-15T10:30:00',
      },
      {
        id: 'file-2',
        name: '학생증_사진.jpg',
        type: 'image/jpeg',
        size: 156789,
        url: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=300&fit=crop',
        uploaded_at: '2025-01-20T14:20:00',
      },
    ],
  },
  {
    id: '2',
    created_at: '2025-01-02',
    updated_at: '2025-01-02',
    org_id: 'org-1',
    name: '이서연',
    grade: '고2',
    school: '서울고등학교',
    phone: '010-2345-6789',
    parent_name: '이아무개',
    parent_phone: '010-8765-4321',
    parent_email: 'parent2@example.com',
    subjects: ['국어', '사회'],
    status: 'active',
    enrollment_date: '2025-01-02',
  },
]

export default function StudentsPage() {
  usePageAccess('students')

  const { toast } = useToast()
  const [students, setStudents] = useState<Student[]>(mockStudents)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Student detail modal state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)

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
      accessorKey: 'parent_name',
      header: '학부모',
    },
    {
      accessorKey: 'subjects',
      header: '수강 과목',
      cell: ({ row }) => {
        const subjects = row.getValue('subjects') as string[]
        return (
          <div className="flex gap-1">
            {subjects?.map((subject, i) => (
              <Badge key={i} variant="secondary">
                {subject}
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
              <DropdownMenuItem onClick={() => handleEdit(student)}>
                <Pencil className="mr-2 h-4 w-4" />
                수정
              </DropdownMenuItem>
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

  const handleOpenDialog = () => {
    setEditingStudent(null)
    reset({
      status: 'active',
      subjects: [],
    })
    setIsDialogOpen(true)
  }

  const handleEdit = (student: Student) => {
    setEditingStudent(student)
    reset({
      name: student.name,
      grade: student.grade as StudentInput['grade'],
      school: student.school,
      phone: student.phone,
      parent_name: student.parent_name,
      parent_phone: student.parent_phone,
      parent_email: student.parent_email || '',
      address: student.address || '',
      subjects: student.subjects,
      status: student.status as StudentInput['status'],
      notes: student.notes || '',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('정말로 삭제하시겠습니까?')) {
      setStudents(students.filter((s) => s.id !== id))
      toast({
        title: '삭제 완료',
        description: '학생 정보가 삭제되었습니다.',
      })
    }
  }

  const onSubmit = async (data: StudentInput) => {
    setIsLoading(true)
    try {
      // TODO: Supabase integration
      if (editingStudent) {
        // Update existing student
        setStudents(
          students.map((s) =>
            s.id === editingStudent.id
              ? { ...s, ...data, updated_at: new Date().toISOString() }
              : s
          )
        )
        toast({
          title: '수정 완료',
          description: '학생 정보가 수정되었습니다.',
        })
      } else {
        // Create new student
        const newStudent: Student = {
          id: Date.now().toString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          org_id: 'org-1',
          ...data,
        } as Student
        setStudents([...students, newStudent])
        toast({
          title: '등록 완료',
          description: '학생이 등록되었습니다.',
        })
      }
      setIsDialogOpen(false)
      reset()
    } catch (error) {
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
            data={students}
            searchKey="name"
            searchPlaceholder="학생 이름으로 검색..."
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>
              {editingStudent ? '학생 정보 수정' : '학생 등록'}
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
                <Label htmlFor="grade">학년 *</Label>
                <Select
                  disabled={isLoading}
                  onValueChange={(value) => setValue('grade', value as any)}
                  defaultValue={editingStudent?.grade}
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
                {isLoading
                  ? '처리중...'
                  : editingStudent
                  ? '수정'
                  : '등록'}
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
