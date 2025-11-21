'use client'

export const runtime = 'edge'


import { useState, useEffect } from 'react'
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
import { Plus, Pencil, Trash2, MoreHorizontal, Users, Search } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ClassSchema, type ClassInput } from '@/lib/validations/class'
import type { Class } from '@/lib/types/database'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Student interface for assignment dialog
interface StudentForAssignment {
  id: string
  name: string
  grade: string
  school: string
}

export default function ClassesPage() {
  usePageAccess('classes')

  const { toast } = useToast()
  const [classes, setClasses] = useState<Class[]>([])
  const [allStudents, setAllStudents] = useState<StudentForAssignment[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Student list dialog state
  const [isStudentListOpen, setIsStudentListOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)

  // Student assignment dialog state
  const [isAssignStudentDialogOpen, setIsAssignStudentDialogOpen] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [classForAssignment, setClassForAssignment] = useState<Class | null>(null)

  // Fetch classes from API
  useEffect(() => {
    const fetchClasses = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/classes', { credentials: 'include', credentials: 'include' })
        const data = await response.json() as { classes?: Class[]; error?: string }

        if (response.ok) {
          setClasses(data.classes || [])
        } else {
          toast({
            title: '데이터 로드 실패',
            description: data.error || '반 목록을 불러올 수 없습니다.',
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

    const fetchStudents = async () => {
      try {
        const response = await fetch('/api/students', { credentials: 'include', credentials: 'include' })
        const data = await response.json() as { students?: any[]; error?: string }

        if (response.ok) {
          setAllStudents(data.students || [])
        }
      } catch (error) {
        console.error('Failed to fetch students:', error)
      }
    }

    fetchClasses()
    fetchStudents()
  }, [toast])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<ClassInput>({
    resolver: zodResolver(ClassSchema),
    defaultValues: {
      status: 'active',
    },
  })

  const columns: ColumnDef<Class>[] = [
    {
      accessorKey: 'name',
      header: '반 이름',
      cell: ({ row }) => {
        const classData = row.original
        return (
          <button
            className="text-primary hover:underline font-medium"
            onClick={() => handleViewStudents(classData)}
          >
            {classData.name}
          </button>
        )
      },
    },
    {
      accessorKey: 'subject',
      header: '과목',
      cell: ({ row }) => {
        const subject = row.getValue('subject') as string
        return <Badge variant="secondary">{subject}</Badge>
      },
    },
    {
      accessorKey: 'teacher_name',
      header: '강사',
    },
    {
      accessorKey: 'current_students',
      header: '학생 수',
      cell: ({ row }) => {
        const current = row.original.current_students
        const capacity = row.original.capacity
        const percentage = (current / capacity) * 100
        return (
          <div className="flex items-center gap-2">
            <span>
              {current}/{capacity}
            </span>
            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'schedule',
      header: '수업 시간',
      cell: ({ row }) => {
        const schedule = row.getValue('schedule') as Class['schedule']
        return (
          <div className="text-sm">
            {schedule.map((s, i) => (
              <div key={i}>
                {s.day} {s.start_time}-{s.end_time}
              </div>
            ))}
          </div>
        )
      },
    },
    {
      accessorKey: 'room',
      header: '강의실',
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        const statusMap = {
          active: { label: '운영중', variant: 'default' as const },
          inactive: { label: '운영 중단', variant: 'secondary' as const },
        }
        const statusInfo = statusMap[status as keyof typeof statusMap]
        return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      },
    },
    {
      id: 'assign',
      header: '학생 배정',
      cell: ({ row }) => {
        const classData = row.original
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenAssignStudentDialog(classData)}
          >
            <Users className="mr-1 h-4 w-4" />
            배정
          </Button>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const classData = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(classData)}>
                <Pencil className="mr-2 h-4 w-4" />
                수정
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(classData.id)}>
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
    setEditingClass(null)
    reset({
      status: 'active',
    })
    setIsDialogOpen(true)
  }

  const handleViewStudents = (classData: Class) => {
    setSelectedClass(classData)
    setIsStudentListOpen(true)
  }

  const handleOpenAssignStudentDialog = (classData: Class) => {
    setClassForAssignment(classData)
    setSelectedStudents([]) // Reset selection
    setStudentSearchQuery('') // Reset search
    setIsAssignStudentDialogOpen(true)
  }

  // Filter students based on search query
  const filteredStudents = allStudents.filter((student) => {
    const searchLower = studentSearchQuery.toLowerCase()
    return (
      student.name?.toLowerCase().includes(searchLower) ||
      student.grade?.toLowerCase().includes(searchLower) ||
      student.school?.toLowerCase().includes(searchLower)
    )
  })

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleSaveStudentAssignment = () => {
    if (!classForAssignment) return

    toast({
      title: '학생 배정 완료',
      description: `${classForAssignment.name}에 ${selectedStudents.length}명의 학생이 배정되었습니다.`,
    })

    setIsAssignStudentDialogOpen(false)
    setClassForAssignment(null)
    setSelectedStudents([])
  }

  const handleEdit = (classData: Class) => {
    setEditingClass(classData)
    reset({
      name: classData.name,
      subject: classData.subject,
      teacher_name: classData.teacher_name,
      capacity: classData.capacity,
      room: classData.room || '',
      status: classData.status,
      notes: classData.notes || '',
    })
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 삭제하시겠습니까?')) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/classes/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setClasses(classes.filter((c) => c.id !== id))
        toast({
          title: '삭제 완료',
          description: '반 정보가 삭제되었습니다.',
        })
      } else {
        const data = await response.json() as { error?: string }
        toast({
          title: '삭제 실패',
          description: data.error || '반 삭제에 실패했습니다.',
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

  const onSubmit = async (data: ClassInput) => {
    setIsLoading(true)
    try {
      if (editingClass) {
        // Update existing class
        const response = await fetch(`/api/classes/${editingClass.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (response.ok) {
          const result = await response.json() as { class: Class }
          setClasses(
            classes.map((c) =>
              c.id === editingClass.id ? result.class : c
            )
          )
          toast({
            title: '수정 완료',
            description: '반 정보가 수정되었습니다.',
          })
          setIsDialogOpen(false)
          reset()
        } else {
          const error = await response.json() as { error?: string }
          toast({
            title: '수정 실패',
            description: error.error || '반 정보 수정에 실패했습니다.',
            variant: 'destructive',
          })
        }
      } else {
        // Create new class
        const response = await fetch('/api/classes', { credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (response.ok) {
          const result = await response.json() as { class: Class }
          setClasses([result.class, ...classes])
          toast({
            title: '생성 완료',
            description: '반이 생성되었습니다.',
          })
          setIsDialogOpen(false)
          reset()
        } else {
          const error = await response.json() as { error?: string }
          toast({
            title: '생성 실패',
            description: error.error || '반 생성에 실패했습니다.',
            variant: 'destructive',
          })
        }
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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">반 관리</h1>
          <p className="text-sm md:text-base text-muted-foreground">반 정보를 관리하세요</p>
        </div>
        <Button onClick={handleOpenDialog} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          반 생성
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <DataTable
            columns={columns}
            data={classes}
            searchKey="name"
            searchPlaceholder="반 이름으로 검색..."
          />
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>
              {editingClass ? '반 정보 수정' : '반 생성'}
            </DialogTitle>
            <DialogDescription>
              반의 기본 정보를 입력해주세요
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">반 이름 *</Label>
                <Input id="name" {...register('name')} disabled={isLoading} />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">과목 *</Label>
                <Input
                  id="subject"
                  {...register('subject')}
                  placeholder="예: 수학, 영어, 국어"
                  disabled={isLoading}
                />
                {errors.subject && (
                  <p className="text-sm text-destructive">{errors.subject.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="teacher_name">강사 이름 *</Label>
                <Input
                  id="teacher_name"
                  {...register('teacher_name')}
                  disabled={isLoading}
                />
                {errors.teacher_name && (
                  <p className="text-sm text-destructive">
                    {errors.teacher_name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">정원 *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  {...register('capacity', { valueAsNumber: true })}
                  disabled={isLoading}
                />
                {errors.capacity && (
                  <p className="text-sm text-destructive">{errors.capacity.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="room">강의실</Label>
                <Input
                  id="room"
                  {...register('room')}
                  placeholder="예: A301"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">상태</Label>
                <Select
                  defaultValue="active"
                  onValueChange={(value) =>
                    setValue('status', value as 'active' | 'inactive')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">운영중</SelectItem>
                    <SelectItem value="inactive">운영 중단</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                  : editingClass
                  ? '수정'
                  : '생성'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Student List Dialog */}
      <Dialog open={isStudentListOpen} onOpenChange={setIsStudentListOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedClass?.name} - 학생 목록</DialogTitle>
            <DialogDescription>
              정원: {selectedClass?.capacity}명
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-center text-muted-foreground py-8">등록된 학생이 없습니다.</p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStudentListOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Assignment Dialog */}
      <Dialog open={isAssignStudentDialogOpen} onOpenChange={setIsAssignStudentDialogOpen}>
        <DialogContent className="max-w-2xl w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>학생 배정</DialogTitle>
            <DialogDescription>
              {classForAssignment?.name}에 배정할 학생을 선택하세요
            </DialogDescription>
          </DialogHeader>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="학생 이름, 학년, 학교로 검색..."
              value={studentSearchQuery}
              onChange={(e) => setStudentSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="py-4 max-h-[400px] overflow-y-auto">
            <div className="space-y-3">
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 cursor-pointer" onClick={() => handleToggleStudent(student.id)}>
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleToggleStudent(student.id)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded accent-primary cursor-pointer"
                      />
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.grade} - {student.school}
                        </p>
                      </div>
                    </div>
                    {selectedStudents.includes(student.id) && (
                      <Badge variant="default" className="ml-2">선택됨</Badge>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  검색 결과가 없습니다
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-4">
            <p className="text-sm text-muted-foreground">
              {selectedStudents.length > 0 ? (
                <>
                  <strong>{selectedStudents.length}명</strong> 선택됨
                </>
              ) : (
                '학생을 선택해주세요'
              )}
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignStudentDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveStudentAssignment}>
              배정 완료 ({selectedStudents.length}명)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
