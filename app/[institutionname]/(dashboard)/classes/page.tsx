'use client'

export const runtime = 'edge'


import { useState, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { usePageAccess } from '@/hooks/use-page-access'
import { useClasses, useStudents, useTeachersOverview, useRooms, useClassEnrollments } from '@/lib/swr'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { PageSkeleton } from '@/components/ui/skeleton'
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
  class_id?: string | null
}

interface TeacherOption {
  id: string
  name: string
}

interface RoomOption {
  id: string
  name: string
}

interface ScheduleRow {
  day: string
  start_time: string
  end_time: string
}

interface TeacherScheduleSlot {
  day_of_week: string
  start_time: string
  end_time: string
}

export default function ClassesPage() {
  usePageAccess('classes')

  const { toast } = useToast()

  // SWR hooks로 데이터 페칭
  const { classes: swrClasses, isLoading: classesLoading, refresh: refreshClasses } = useClasses()
  const { students: swrStudents, isLoading: studentsLoading } = useStudents()
  const { teachers: swrTeachers, isLoading: teachersLoading } = useTeachersOverview()
  const { rooms: swrRooms, isLoading: roomsLoading } = useRooms()
  const { enrollments: swrEnrollments, isLoading: enrollmentsLoading } = useClassEnrollments()

  // 로컬 상태 (optimistic updates 용)
  const [classes, setClasses] = useState<Class[]>([])
  const [allStudents, setAllStudents] = useState<StudentForAssignment[]>([])
  const [classEnrollments, setClassEnrollments] = useState<any[]>([])
  const [teachers, setTeachers] = useState<TeacherOption[]>([])
  const [rooms, setRooms] = useState<RoomOption[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [filterTeacherId, setFilterTeacherId] = useState<string | null>(null)
  const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([])
  const [teacherSchedules, setTeacherSchedules] = useState<TeacherScheduleSlot[]>([])
  const [selectedStudentsDraft, setSelectedStudentsDraft] = useState<string[]>([])

  // Student list dialog state
  const [isStudentListOpen, setIsStudentListOpen] = useState(false)
  const [selectedClass, setSelectedClass] = useState<Class | null>(null)

  // Student assignment dialog state
  const [isAssignStudentDialogOpen, setIsAssignStudentDialogOpen] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [classForAssignment, setClassForAssignment] = useState<Class | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<ClassInput>({
    resolver: zodResolver(ClassSchema),
    defaultValues: {
      status: 'active',
      capacity: 20,
    },
  })

  const formTeacherId = watch('teacher_id')

  // 스케줄 JSON을 UI에서 안전하게 다루기 위해 배열로 정규화
  const normalizeClassSchedule = (cls: Class): Class => ({
    ...cls,
    schedule: Array.isArray(cls.schedule) ? cls.schedule : [],
  })

  // SWR 데이터를 로컬 상태에 동기화
  useEffect(() => {
    if (swrClasses.length > 0) {
      let filtered = swrClasses.map(normalizeClassSchedule)
      if (filterTeacherId) {
        filtered = filtered.filter(c => c.teacher_id === filterTeacherId)
      }
      setClasses(filtered)
    }
  }, [swrClasses, filterTeacherId])

  useEffect(() => {
    if (swrStudents.length > 0) {
      setAllStudents(swrStudents)
    }
  }, [swrStudents])

  useEffect(() => {
    if (swrTeachers.length > 0) {
      setTeachers(swrTeachers.map((t: any) => ({ id: t.id, name: t.name })))
    }
  }, [swrTeachers])

  useEffect(() => {
    if (swrRooms.length > 0) {
      setRooms(swrRooms.map((r: any) => ({ id: r.id, name: r.name })))
    }
  }, [swrRooms])

  useEffect(() => {
    if (swrEnrollments.length > 0) {
      setClassEnrollments(swrEnrollments)
    }
  }, [swrEnrollments])

  // 로딩 상태 통합
  const isInitialLoading = classesLoading && classes.length === 0

  // 선택된 강사의 기존 스케줄 불러오기 (충돌 검사용)
  useEffect(() => {
    const fetchTeacherSchedules = async () => {
      if (!formTeacherId) {
        setTeacherSchedules([])
        return
      }
      try {
        const res = await fetch(`/api/schedules?teacher_id=${formTeacherId}`, { credentials: 'include' })
        const data = await res.json() as { schedules?: any[] }
        if (res.ok && data.schedules) {
          const slots: TeacherScheduleSlot[] = data.schedules.map((s) => ({
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
          }))
          setTeacherSchedules(slots)
        } else {
          setTeacherSchedules([])
        }
      } catch {
        setTeacherSchedules([])
      }
    }
    fetchTeacherSchedules()
  }, [formTeacherId])

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
        const safeSchedule = Array.isArray(schedule) ? schedule : []

        const dayMap: Record<string, string> = {
          monday: '월',
          tuesday: '화',
          wednesday: '수',
          thursday: '목',
          friday: '금',
          saturday: '토',
          sunday: '일',
          월: '월',
          화: '화',
          수: '수',
          목: '목',
          금: '금',
          토: '토',
          일: '일',
        }

        const formatDay = (d?: string) => dayMap[d || ''] || d || '미정'
        const formatTime = (t?: string) => (t ? t.slice(0, 5) : '미정')

        return (
          <div className="text-sm">
            {safeSchedule.map((s, i) => (
              <div key={`${s.day}-${s.start_time}-${s.end_time}-${i}`}>
                {formatDay(s.day)} {formatTime(s.start_time)}-{formatTime(s.end_time)}
              </div>
            ))}
            {safeSchedule.length === 0 && <div className="text-muted-foreground">미배정</div>}
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
      capacity: 20,
    })
    setScheduleRows([])
    setSelectedStudentsDraft([])
    setIsDialogOpen(true)
  }

  // 선택된 반의 학생 목록 (모달 열 때 직접 fetch)
  const [selectedClassEnrollments, setSelectedClassEnrollments] = useState<any[]>([])
  const [studentListLoading, setStudentListLoading] = useState(false)

  const handleViewStudents = async (classData: Class) => {
    setSelectedClass(classData)
    setSelectedClassEnrollments([])
    setStudentListLoading(true)
    setIsStudentListOpen(true)

    try {
      // 해당 반의 enrollment를 직접 fetch
      const res = await fetch(`/api/class-enrollments?class_id=${classData.id}`, { credentials: 'include' })
      const data = await res.json() as { enrollments?: any[] }
      if (res.ok && data.enrollments) {
        setSelectedClassEnrollments(data.enrollments)
      }
    } catch (error) {
      console.error('Failed to fetch class enrollments:', error)
    } finally {
      setStudentListLoading(false)
    }
  }

  const handleOpenAssignStudentDialog = async (classData: Class) => {
    if (!classData?.id) {
      toast({
        title: '반을 먼저 저장하세요',
        description: '학생을 배정하려면 반을 생성하고 저장한 뒤 다시 시도해주세요.',
        variant: 'destructive',
      })
      return
    }

    setClassForAssignment(classData)

    // 최신 학생 목록이 없으면 재로드
    if (allStudents.length === 0) {
      try {
        const res = await fetch('/api/students', { credentials: 'include' })
        const data = await res.json() as { students?: StudentForAssignment[] }
        if (res.ok && data.students) {
          setAllStudents(data.students)
        }
      } catch {
        // ignore, fallback below
      }
    }

    // 서버에서 최신 배정 정보 가져오기 (class_enrollments 기반)
    try {
      const res = await fetch(`/api/classes/${classData.id}/assign-students`, { credentials: 'include' })
      const data = await res.json() as { student_ids?: string[] }
      if (res.ok && data.student_ids) {
        setSelectedStudents(data.student_ids)
      } else {
        // fallback: 현재 로컬 students 정보 사용
        const preselected = allStudents
          .filter((s) => s.class_id === classData.id)
          .map((s) => s.id)
        setSelectedStudents(preselected)
      }
    } catch {
      const preselected = allStudents
        .filter((s) => s.class_id === classData.id)
        .map((s) => s.id)
      setSelectedStudents(preselected)
    }

    setStudentSearchQuery('') // Reset search
    setIsAssignStudentDialogOpen(true)
  }

  // Filter students based on search query
  const filteredStudents = allStudents
    .filter((student) => {
      const searchLower = studentSearchQuery.toLowerCase()
      return (
        student.name?.toLowerCase().includes(searchLower) ||
        student.grade?.toLowerCase().includes(searchLower) ||
        student.school?.toLowerCase().includes(searchLower)
      )
    })
    // 선택된 학생을 위로 정렬 (선택 여부 → 이름순)
    .sort((a, b) => {
      const aSelected = selectedStudents.includes(a.id)
      const bSelected = selectedStudents.includes(b.id)
      if (aSelected === bSelected) {
        return (a.name || '').localeCompare(b.name || '')
      }
      return aSelected ? -1 : 1
    })

  const isOverlapping = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + m
    }
    const aS = toMin(aStart)
    const aE = toMin(aEnd)
    const bS = toMin(bStart)
    const bE = toMin(bEnd)
    return Math.max(aS, bS) < Math.min(aE, bE)
  }

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleSaveStudentAssignment = () => {
    if (!classForAssignment) {
      setIsAssignStudentDialogOpen(false)
      return
    }
    setIsLoading(true)
    const classId = classForAssignment.id

    // 옵티미스틱 상태 백업
    const prevClasses = classes
    const prevAllStudents = allStudents
    const prevDraft = selectedStudentsDraft

    // 옵티미스틱 UI 반영
    const optimisticClasses = classes.map((c) =>
      c.id === classId ? { ...c, current_students: selectedStudents.length } : c
    )
    const optimisticStudents = allStudents.map((s) => {
      if (selectedStudents.includes(s.id)) {
        return { ...s, class_id: classId }
      }
      if (s.class_id === classId && !selectedStudents.includes(s.id)) {
        return { ...s, class_id: null }
      }
      return s
    })
    setClasses(optimisticClasses)
    setAllStudents(optimisticStudents)
    setSelectedStudentsDraft(selectedStudents)
    setIsAssignStudentDialogOpen(false)
    setIsDialogOpen(true) // 부모 모달 유지

    fetch(`/api/classes/${classId}/assign-students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_ids: selectedStudents }),
    })
      .then(async (res) => {
        if (res.ok) {
          toast({
            title: '학생 배정 완료',
            description: `${classForAssignment.name}에 ${selectedStudents.length}명의 학생이 배정되었습니다.`,
          })
          setClassForAssignment(null)
          setSelectedStudents([])
        } else {
          const err = await res.json() as { error?: string }
          // 롤백
          setClasses(prevClasses)
          setAllStudents(prevAllStudents)
          setSelectedStudentsDraft(prevDraft)
          setIsAssignStudentDialogOpen(true)
          toast({
            title: '배정 실패',
            description: err.error || '학생 배정에 실패했습니다.',
            variant: 'destructive',
          })
        }
      })
      .catch(() => {
        // 롤백
        setClasses(prevClasses)
        setAllStudents(prevAllStudents)
        setSelectedStudentsDraft(prevDraft)
        setIsAssignStudentDialogOpen(true)
        toast({
          title: '배정 실패',
          description: '서버와 통신할 수 없습니다.',
          variant: 'destructive',
        })
      })
      .finally(() => setIsLoading(false))
  }

  const handleEdit = (classData: Class) => {
    setEditingClass(classData)
    reset({
      name: classData.name,
      subject: classData.subject,
      teacher_id: classData.teacher_id || undefined,
      capacity: classData.capacity,
      room: classData.room || '',
      status: classData.status,
      notes: classData.notes || '',
      schedule: Array.isArray(classData.schedule) ? classData.schedule : [],
    })
    setScheduleRows(Array.isArray(classData.schedule) ? classData.schedule : [])
    setSelectedStudentsDraft([])
    setIsDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 삭제하시겠습니까?')) return

    setIsLoading(true)
    const prevClasses = classes
    // Optimistic remove
    setClasses(classes.filter((c) => c.id !== id))
    try {
      const response = await fetch(`/api/classes/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: '삭제 완료',
          description: '반 정보가 삭제되었습니다.',
        })
      } else {
        const data = await response.json() as { error?: string }
        // rollback
        setClasses(prevClasses)
        toast({
          title: '삭제 실패',
          description: data.error || '반 삭제에 실패했습니다.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      setClasses(prevClasses)
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
          toast({
            title: '수정 완료',
            description: '반 정보가 수정되었습니다.',
          })
          setIsDialogOpen(false)
          reset()
          // SWR 캐시 갱신
          refreshClasses()
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
          toast({
            title: '생성 완료',
            description: '반이 생성되었습니다.',
          })
          setIsDialogOpen(false)
          reset()
          // SWR 캐시 갱신
          refreshClasses()
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

  // 초기 로딩 시 스켈레톤 표시
  if (isInitialLoading) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">수업/반 관리</h1>
          <p className="text-sm md:text-base text-muted-foreground">반 정보를 관리하세요</p>
        </div>
        <Button onClick={handleOpenDialog} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          반 생성
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {/* 강사 필터 */}
          <div className="mb-4 flex flex-wrap gap-2">
            <Button
              variant={filterTeacherId === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterTeacherId(null)}
            >
              전체
            </Button>
            {teachers.map((teacher) => (
              <Button
                key={teacher.id}
                variant={filterTeacherId === teacher.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterTeacherId(teacher.id)}
              >
                {teacher.name}
              </Button>
            ))}
          </div>

          <DataTable
            columns={columns}
            data={classes}
            searchKey="name"
            searchPlaceholder="반 이름으로 검색..."
            infiniteScroll
            pageSize={20}
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
                <Label htmlFor="teacher_id">강사 *</Label>
                <Select
                  onValueChange={(value) => setValue('teacher_id', value)}
                  value={watch('teacher_id') || ''}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="강사를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.teacher_id && (
                  <p className="text-sm text-destructive">{errors.teacher_id.message}</p>
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
                <Select
                  onValueChange={(value) => setValue('room', value)}
                  value={watch('room') || ''}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="강의실 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.name}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            {/* 수업 스케줄 입력 */}
            <div className="space-y-2">
              <Label>수업 스케줄</Label>
              <div className="space-y-3">
                {scheduleRows.map((row, idx) => (
                  <div key={`${row.day}-${idx}`} className="grid grid-cols-4 gap-2 items-center">
                    <Select
                      value={row.day}
                      onValueChange={(v) => {
                        const next = [...scheduleRows]
                        next[idx] = { ...next[idx], day: v }
                        setScheduleRows(next)
                        setValue('schedule', next)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="요일" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">월</SelectItem>
                        <SelectItem value="tuesday">화</SelectItem>
                        <SelectItem value="wednesday">수</SelectItem>
                        <SelectItem value="thursday">목</SelectItem>
                        <SelectItem value="friday">금</SelectItem>
                        <SelectItem value="saturday">토</SelectItem>
                        <SelectItem value="sunday">일</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="time"
                      value={row.start_time}
                      onChange={(e) => {
                        const next = [...scheduleRows]
                        next[idx] = { ...next[idx], start_time: e.target.value }
                        setScheduleRows(next)
                        setValue('schedule', next)
                      }}
                    />
                    <Input
                      type="time"
                      value={row.end_time}
                      onChange={(e) => {
                        const next = [...scheduleRows]
                        next[idx] = { ...next[idx], end_time: e.target.value }
                        setScheduleRows(next)
                        setValue('schedule', next)
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        const next = scheduleRows.filter((_, i) => i !== idx)
                        setScheduleRows(next)
                        setValue('schedule', next)
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (!formTeacherId) {
                    toast({
                      title: '강사를 먼저 선택하세요',
                      description: '스케줄을 추가하기 전에 강사를 지정해야 합니다.',
                      variant: 'destructive',
                    })
                    return
                  }

                  const newRow = { day: 'monday', start_time: '16:00', end_time: '18:00' }

                  // 기존 로컬 스케줄 및 강사 전체 스케줄과 겹치는지 확인
                  const hasLocalOverlap = scheduleRows.some(
                    (row) => row.day === newRow.day && isOverlapping(row.start_time, row.end_time, newRow.start_time, newRow.end_time)
                  )
                  const hasTeacherOverlap = teacherSchedules.some(
                    (row) => row.day_of_week === newRow.day && isOverlapping(row.start_time, row.end_time, newRow.start_time, newRow.end_time)
                  )

                  if (hasLocalOverlap || hasTeacherOverlap) {
                    toast({
                      title: '이미 그 시간에 수업이 있습니다.',
                      description: '겹치지 않는 시간으로 스케줄을 추가해주세요.',
                      variant: 'destructive',
                    })
                    return
                  }

                  const next = [...scheduleRows, newRow]
                  setScheduleRows(next)
                  setValue('schedule', next)
                }}
              >
                스케줄 추가
              </Button>
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
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setClassForAssignment(editingClass || null)
                  setIsAssignStudentDialogOpen(true)
                }}
              >
                <div className="flex items-center gap-2">
                  학생 배정
                  {selectedStudentsDraft.length > 0 && (
                    <Badge variant="secondary" className="rounded-full px-2 py-0">
                      {selectedStudentsDraft.length}
                    </Badge>
                  )}
                </div>
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
            {studentListLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : selectedClassEnrollments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                등록된 학생이 없습니다.
              </p>
            ) : (
              <div className="border rounded-lg overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-sm">학생 이름</th>
                      <th className="text-left px-4 py-3 font-medium text-sm">학년</th>
                      <th className="text-left px-4 py-3 font-medium text-sm">학교</th>
                      <th className="text-left px-4 py-3 font-medium text-sm">수업 잔여 크레딧</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {selectedClassEnrollments.map((enrollment) => {
                      const studentData = enrollment.students
                      if (!studentData) return null

                      // credit은 시간 단위로 저장됨
                      const creditHours = studentData.credit || 0

                      return (
                        <tr key={enrollment.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 font-medium">{studentData.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{studentData.grade || '-'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{studentData.school || '-'}</td>
                          <td className="px-4 py-3">
                            {creditHours > 0 ? (
                              <span className="text-sm">{creditHours}시간</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="text-sm text-muted-foreground text-center">
              총 {selectedClassEnrollments.filter(e => e.students).length}명
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStudentListOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Assignment Dialog */}
      <Dialog
        open={isAssignStudentDialogOpen}
        onOpenChange={(open) => {
          setIsAssignStudentDialogOpen(open)
          if (!open) {
            setClassForAssignment(null)
            setSelectedStudents([])
            setStudentSearchQuery('')
          }
        }}
      >
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
