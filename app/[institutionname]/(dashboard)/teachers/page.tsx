'use client'

export const runtime = 'edge'


import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { ColumnDef } from '@tanstack/react-table'
import { usePageAccess } from '@/hooks/use-page-access'
import { useTeachersOverview, useStudents, useClasses } from '@/lib/swr'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { Plus, Edit, Trash2, UserCheck, Users, DollarSign, Clock, BookOpen, Link2, Copy, CheckCircle2, UserPlus, Search, Eye } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal } from 'lucide-react'
import type { Teacher, TeacherClass } from '@/lib/types/database'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const TeacherDetailModal = dynamic(
  () => import('@/components/teachers/TeacherDetailModal').then((m) => m.TeacherDetailModal),
  { ssr: false }
)

interface StudentForAssignment {
  id: string
  name: string
  grade: string
  school: string
}

const COLORS = ['#3b82f6', '#22c55e', '#eab308']

  const statusMap = {
    active: { label: '재직', variant: 'default' as const },
    inactive: { label: '휴직', variant: 'secondary' as const },
  }

const employmentTypeMap = {
  full_time: '정규직',
  part_time: '시간강사',
  contract: '계약직',
}

const salaryTypeMap = {
  monthly: '월급',
  hourly: '시급',
}

const normalizeStatusValue = (status?: string): 'active' | 'inactive' => {
  const s = (status || '').toString().trim().toLowerCase()
  if (['inactive', '휴직', 'leave', '휴무'].includes(s)) return 'inactive'
  return 'active'
}

const normalizeTeacher = (t: any): Teacher => ({
  id: t.id,
  created_at: t.created_at ?? '',
  updated_at: t.updated_at ?? t.created_at ?? '',
  org_id: t.org_id ?? '',
  name: t.name ?? '이름없음',
  email: t.email ?? '',
  phone: t.phone ?? '',
  subjects: Array.isArray(t.subjects)
    ? t.subjects.filter((s: any): s is string => Boolean(s))
    : typeof t.subjects === 'string'
      ? t.subjects.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [],
  status: normalizeStatusValue(t.status),
  employment_type: ['full_time', 'part_time', 'contract'].includes(t.employment_type)
    ? t.employment_type
    : 'full_time',
  salary_type: ['monthly', 'hourly'].includes(t.salary_type) ? t.salary_type : 'monthly',
  salary_amount: Number(t.salary_amount ?? 0),
  hire_date: t.hire_date ?? '',
  lesson_note_token: t.lesson_note_token,
  assigned_students: t.assigned_students ?? [],
  total_hours_worked: Number(t.total_hours_worked ?? 0),
  earned_salary: Number(t.earned_salary ?? 0),
  notes: t.notes ?? '',
})

export default function TeachersPage() {
  usePageAccess('teachers')

  const { toast } = useToast()

  // SWR hooks로 데이터 페칭
  const { teachers: swrTeachers, isLoading: teachersLoading, refresh: refreshTeachers } = useTeachersOverview()
  const { students: swrStudents, isLoading: studentsLoading, refresh: refreshStudents } = useStudents()
  const { classes: swrClasses, isLoading: classesLoading, refresh: refreshClasses } = useClasses()

  // 로컬 상태 (optimistic updates 용)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [rawTeachers, setRawTeachers] = useState<Teacher[]>([])
  const [allStudents, setAllStudents] = useState<StudentForAssignment[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [isAssignStudentDialogOpen, setIsAssignStudentDialogOpen] = useState(false)
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isTeacherDetailModalOpen, setIsTeacherDetailModalOpen] = useState(false)
  const [selectedTeacherForDetail, setSelectedTeacherForDetail] = useState<Teacher | null>(null)
  const [selectedTeacherFilter, setSelectedTeacherFilter] = useState<string>('all') // 강사 필터 상태
  const [displayCount, setDisplayCount] = useState(10) // 무한 스크롤 표시 개수
  const classesObserverTarget = useRef<HTMLDivElement>(null) // 무한 스크롤 센티넬

  // SWR 데이터를 로컬 상태에 동기화
  useEffect(() => {
    if (swrTeachers.length > 0) {
      const normalized = swrTeachers.map(normalizeTeacher)
      setRawTeachers(normalized)
      setTeachers(normalized)
    }
  }, [swrTeachers])

  useEffect(() => {
    if (swrStudents.length > 0) {
      setAllStudents(swrStudents)
    }
  }, [swrStudents])

  useEffect(() => {
    if (swrClasses.length > 0) {
      setClasses(swrClasses)
    }
  }, [swrClasses])

  const normalizeStatus = (status?: string) => normalizeStatusValue(status)

  // Chart data - 실제 DB 데이터 사용
  const teacherHoursData = teachers.map((t) => ({
    name: t.name || '미등록',
    hours: (t as any).monthly_total_hours ?? 0,
  }))

  // 강사별 담당 반 수강생 수 계산 (강사 → 반 → 학생수 합산)
  const teacherStudentsData = teachers.map((teacher) => {
    // 강사가 담당하는 반 찾기
    const teacherClasses = classes.filter(c => c.teacher_id === teacher.id)

    // 각 반의 학생 수 합산 (current_students 또는 capacity 사용)
    const totalStudents = teacherClasses.reduce((sum, cls) => {
      return sum + (cls.current_students ?? cls.capacity ?? 0)
    }, 0)

    return {
      name: teacher.name || '미등록',
      students: totalStudents
    }
  })

  const employmentCounts = teachers.reduce(
    (acc, t) => {
      const key = (t.employment_type as keyof typeof employmentTypeMap) || 'full_time'
      acc[key] = (acc[key] || 0) + 1
      return acc
    },
    { full_time: 0, part_time: 0, contract: 0 } as Record<string, number>
  )

  const employmentTypeData = Object.entries(employmentTypeMap).map(([key, label]) => ({
    name: label,
    value: employmentCounts[key] ?? 0,
  }))
  const employmentPieData = employmentTypeData.filter((d) => d.value > 0)

  const getSalaryAmount = (t: Teacher | any) => Number(t?.salary_amount ?? 0)
  const getSalaryType = (t: Teacher | any) => (t?.salary_type === 'hourly' ? 'hourly' : 'monthly')
  const getEmploymentType = (t: Teacher | any) =>
    employmentTypeMap[(t?.employment_type as keyof typeof employmentTypeMap) ?? 'full_time'] ||
    '형태 미정'

  // Form state
  const [formData, setFormData] = useState<Partial<Teacher>>({
    name: '',
    email: '',
    phone: '',
    subjects: [],
    status: 'active',
    employment_type: 'full_time',
    salary_type: 'monthly',
    salary_amount: 0,
    hire_date: '',
    notes: '',
  })

  const [subjectInput, setSubjectInput] = useState('')

  // 로딩 상태 통합
  const isInitialLoading = teachersLoading && teachers.length === 0

  // Derive assigned_students from student.teacher_id whenever teachers or students change
  useEffect(() => {
    if (!rawTeachers.length) return
    const updated = rawTeachers.map((t) => {
      const assignedIds = allStudents
        .filter((s: any) => s.teacher_id === t.id)
        .map((s: any) => s.id)
      return { ...t, assigned_students: assignedIds }
    })
    setTeachers(updated)
  }, [rawTeachers, allStudents])

  // 필터 변경 시 displayCount 초기화
  useEffect(() => {
    setDisplayCount(10)
  }, [selectedTeacherFilter])

  // 무한 스크롤 IntersectionObserver
  useEffect(() => {
    // 전체 담당반 데이터 계산
    const allTeacherClasses = teachers
      .filter((t) => t.status === 'active')
      .filter((t) => selectedTeacherFilter === 'all' || t.id === selectedTeacherFilter)
      .flatMap((teacher) =>
        classes
          .filter((c) => c.teacher_id === teacher.id)
          .map((c) => ({
            teacher_id: c.teacher_id,
            class_id: c.id,
            class_name: c.name,
            subject: c.subject,
            student_count: c.current_students ?? c.capacity ?? 0,
            teacher_name: teacher.name,
          }))
      )

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < allTeacherClasses.length) {
          setDisplayCount(prev => Math.min(prev + 10, allTeacherClasses.length))
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = classesObserverTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [displayCount, teachers, classes, selectedTeacherFilter])

  const handleCreateTeacher = () => {
    setIsEditing(false)
    setFormData({
      name: '',
      email: '',
      phone: '',
      subjects: [],
      status: 'active',
      employment_type: 'full_time',
      salary_type: 'monthly',
      salary_amount: 0,
      hire_date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
    })
    setIsDialogOpen(true)
  }

  const handleEditTeacher = (teacher: Teacher) => {
    setIsEditing(true)
    const norm = normalizeTeacher(teacher)
    setSelectedTeacher(norm)
    setFormData(norm)
    setIsDialogOpen(true)
  }

  const handleDeleteTeacher = (teacher: Teacher) => {
    setSelectedTeacher(normalizeTeacher(teacher))
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!selectedTeacher) return

    setIsLoading(true)
    const prevTeachers = teachers
    setTeachers(teachers.filter((t) => t.id !== selectedTeacher.id))
    try {
      const response = await fetch(`/api/teachers/${selectedTeacher.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: '강사 삭제 완료',
          description: `${selectedTeacher.name} 강사가 삭제되었습니다.`,
        })
        setIsDeleteDialogOpen(false)
        setSelectedTeacher(null)
      } else {
        const data = await response.json() as { error?: string }
        setTeachers(prevTeachers)
        toast({
          title: '삭제 실패',
          description: data.error || '강사 삭제에 실패했습니다.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      setTeachers(prevTeachers)
      toast({
        title: '오류 발생',
        description: '서버와 통신할 수 없습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenAssignStudentDialog = (teacher: Teacher) => {
    const norm = normalizeTeacher(teacher)
    setSelectedTeacher(norm)
    // 최신 학생 목록 기준 재계산
    const assignedIds = allStudents.filter((s: any) => s.teacher_id === norm.id).map((s: any) => s.id)
    setSelectedStudents(assignedIds)
    setStudentSearchQuery('') // 검색어 초기화
    setIsAssignStudentDialogOpen(true)
  }

  // 검색어로 학생 필터링
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

  const handleSaveStudentAssignment = async () => {
    if (!selectedTeacher) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/teachers/${selectedTeacher.id}/assign-students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds: selectedStudents }),
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) throw new Error(data.error || '배정 저장에 실패했습니다.')

      const updatedTeachers = teachers.map((teacher) =>
        teacher.id === selectedTeacher.id
          ? { ...teacher, assigned_students: selectedStudents, updated_at: new Date().toISOString() }
          : teacher
      )
      setTeachers(updatedTeachers)

      // 로컬 학생 목록에도 teacher_id 반영 (선택된 학생들은 지정, 나머지는 해제)
      setAllStudents((prev: any[]) =>
        prev.map((s) => {
          if (selectedStudents.includes(s.id)) {
            return { ...s, teacher_id: selectedTeacher.id }
          }
          if (s.teacher_id === selectedTeacher.id) {
            return { ...s, teacher_id: null }
          }
          return s
        })
      )

      toast({
        title: '학생 배정 완료',
        description: `${selectedTeacher.name} 강사에게 ${selectedStudents.length}명의 학생이 배정되었습니다.`,
      })
      setIsAssignStudentDialogOpen(false)
      setSelectedTeacher(null)
      setSelectedStudents([])
    } catch (error) {
      toast({
        title: '오류 발생',
        description: error instanceof Error ? error.message : '배정 저장 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewDetail = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setIsDetailDialogOpen(true)
  }

  const handleAddSubject = () => {
    if (subjectInput.trim() && !formData.subjects?.includes(subjectInput.trim())) {
      setFormData({
        ...formData,
        subjects: [...(formData.subjects || []), subjectInput.trim()],
      })
      setSubjectInput('')
    }
  }

  const handleRemoveSubject = (subject: string) => {
    setFormData({
      ...formData,
      subjects: formData.subjects?.filter((s) => s !== subject) || [],
    })
  }

  const handleSaveTeacher = async () => {
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: '필수 정보 누락',
        description: '이름, 이메일, 전화번호는 필수입니다.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    const prevTeachers = teachers
    try {
      if (isEditing && selectedTeacher) {
        // Update existing teacher
        const optimistic = teachers.map((t) =>
          t.id === selectedTeacher.id ? normalizeTeacher({ ...t, ...formData, id: selectedTeacher.id }) : t
        )
        setTeachers(optimistic)
        const response = await fetch(`/api/teachers/${selectedTeacher.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

        if (response.ok) {
          const result = await response.json() as { teacher: Teacher }
          setTeachers(
            teachers.map((teacher) =>
              teacher.id === selectedTeacher.id ? normalizeTeacher(result.teacher) : teacher
            )
          )
          toast({
            title: '강사 정보 수정 완료',
            description: '강사 정보가 성공적으로 수정되었습니다.',
          })
          setIsDialogOpen(false)
          setSelectedTeacher(null)
        } else {
          const error = await response.json() as { error?: string }
          setTeachers(prevTeachers)
          toast({
            title: '수정 실패',
            description: error.error || '강사 정보 수정에 실패했습니다.',
            variant: 'destructive',
          })
        }
      } else {
        // Create new teacher
        const tempId = crypto.randomUUID()
        const optimisticTeacher = normalizeTeacher({ ...formData, id: tempId })
        setTeachers([optimisticTeacher, ...teachers])
        const response = await fetch('/api/teachers', { credentials: 'include',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })

      if (response.ok) {
        const result = await response.json() as { teacher: Teacher }
        setTeachers((prev) =>
          prev.map((t) => (t.id === tempId ? normalizeTeacher(result.teacher) : t))
        )
        toast({
          title: '강사 등록 완료',
          description: '새로운 강사가 등록되었습니다.',
        })
        setIsDialogOpen(false)
        } else {
          const error = await response.json() as { error?: string }
          setTeachers((prev) => prev.filter((t) => t.id !== tempId))
          toast({
            title: '등록 실패',
            description: error.error || '강사 등록에 실패했습니다.',
            variant: 'destructive',
          })
        }
      }
    } catch (error) {
      setTeachers(prevTeachers)
      toast({
        title: '오류 발생',
        description: '서버와 통신할 수 없습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenTeacherDetail = (teacher: Teacher) => {
    const norm = normalizeTeacher(teacher)
    setSelectedTeacherForDetail(norm)
    setIsTeacherDetailModalOpen(true)
  }

  // Teacher list columns
  const teacherColumns: ColumnDef<Teacher>[] = [
    {
      accessorKey: 'name',
      header: '이름',
      cell: ({ row }) => {
        const teacher = row.original
        const initials = teacher.name
          .split('')
          .slice(0, 2)
          .join('')
        return (
          <button
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            onClick={() => handleOpenTeacherDetail(teacher)}
          >
            <Avatar>
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-blue-600 hover:text-blue-800 hover:underline">
              {teacher.name}
            </span>
          </button>
        )
      },
    },
    {
      accessorKey: 'subjects',
      header: '담당 과목',
      cell: ({ row }) => {
        const subjects = row.getValue('subjects') as string[]
        return (
          <div className="flex flex-wrap gap-1">
            {(subjects || []).map((subject) => (
              <Badge key={subject} variant="outline">
                {subject}
              </Badge>
            ))}
          </div>
        )
      },
    },
    {
      accessorKey: 'phone',
      header: '전화번호',
    },
    {
      accessorKey: 'salary_amount',
      header: '급여',
      cell: ({ row }) => {
        const teacher = row.original
        const amount = getSalaryAmount(teacher).toLocaleString()
        const salaryType = getSalaryType(teacher)
        const unit = salaryType === 'monthly' ? '원/월' : '원/시간'
        return <span>{amount}{unit}</span>
      },
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => {
        const statusKey = normalizeStatus(row.getValue('status') as string) as keyof typeof statusMap
        const { label, variant } = statusMap[statusKey]
        return <Badge variant={variant}>{label}</Badge>
      },
    },
    {
      id: 'actions',
      header: '작업',
      cell: ({ row }) => {
        const teacher = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewDetail(teacher)}>
                <Eye className="mr-2 h-4 w-4" />
                상세보기
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditTeacher(teacher)}>
                <Edit className="mr-2 h-4 w-4" />
                수정
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteTeacher(teacher)}
                className="text-destructive"
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

  // Teacher classes columns (통합 테이블용)
  const classColumns: ColumnDef<TeacherClass & { teacher_name: string }>[] = [
    {
      accessorKey: 'teacher_name',
      header: '강사',
      cell: ({ row }) => (
        <span className="font-medium">{row.getValue('teacher_name')}</span>
      ),
    },
    {
      accessorKey: 'class_name',
      header: '반 이름',
      cell: ({ row }) => {
        const className = row.getValue('class_name') as string
        return (
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{className || '미정'}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'subject',
      header: '과목',
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue('subject')}</Badge>
      ),
    },
    {
      accessorKey: 'student_count',
      header: '학생 수',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{row.getValue('student_count')}명</span>
        </div>
      ),
    },
  ]

  // Statistics (now using DB data - currently empty until we add teacher-class relationship)
  const totalTeachers = teachers.length
  const activeTeachers = teachers.filter((t) => normalizeStatus(t.status) === 'active').length
  const totalClasses = classes.length
  const totalStudents = allStudents.length

  // 초기 로딩 시 스켈레톤 표시
  if (isInitialLoading) {
    return <PageSkeleton />
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">강사 관리</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            강사 정보와 담당 반을 관리합니다
          </p>
        </div>
        <Button onClick={handleCreateTeacher} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          강사 등록
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 강사</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeachers}명</div>
            <p className="text-xs text-muted-foreground">전체 등록 강사</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">재직 중</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTeachers}명</div>
            <p className="text-xs text-muted-foreground">현재 재직 강사</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">운영 반</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClasses}개</div>
            <p className="text-xs text-muted-foreground">전체 담당 반</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 학생</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}명</div>
            <p className="text-xs text-muted-foreground">전체 수강 학생</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="teachers" className="space-y-4">
        <TabsList>
          <TabsTrigger value="teachers">강사 목록</TabsTrigger>
          <TabsTrigger value="classes">담당 반 현황</TabsTrigger>
          <TabsTrigger value="stats">통계</TabsTrigger>
        </TabsList>

        {/* Teachers List Tab */}
        <TabsContent value="teachers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>전체 강사</CardTitle>
              <CardDescription>
                등록된 모든 강사의 정보를 확인하고 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <DataTable columns={teacherColumns} data={teachers} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teacher Classes Tab - 통합 테이블 */}
        <TabsContent value="classes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>담당반 현황</CardTitle>
              <CardDescription>전체 강사의 담당 반 목록</CardDescription>
              {/* 강사 필터 버튼 */}
              <div className="flex gap-2 flex-wrap pt-4">
                <Button
                  size="sm"
                  variant={selectedTeacherFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedTeacherFilter('all')}
                >
                  전체
                </Button>
                {teachers
                  .filter((t) => t.status === 'active')
                  .map((teacher) => (
                    <Button
                      key={teacher.id}
                      size="sm"
                      variant={selectedTeacherFilter === teacher.id ? 'default' : 'outline'}
                      onClick={() => setSelectedTeacherFilter(teacher.id)}
                    >
                      {teacher.name}
                    </Button>
                  ))}
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                // 모든 강사의 담당반을 통합하여 배열 생성
                const allTeacherClasses = teachers
                  .filter((t) => t.status === 'active')
                  .filter((t) => selectedTeacherFilter === 'all' || t.id === selectedTeacherFilter)
                  .flatMap((teacher) =>
                    classes
                      .filter((c) => c.teacher_id === teacher.id)
                      .map((c) => ({
                        teacher_id: c.teacher_id,
                        class_id: c.id,
                        class_name: c.name,
                        subject: c.subject,
                        student_count: c.current_students ?? c.capacity ?? 0,
                        teacher_name: teacher.name,
                      }))
                  )

                return allTeacherClasses.length > 0 ? (
                  <div className="rounded-md border max-h-[500px] overflow-y-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead>강사</TableHead>
                          <TableHead>반 이름</TableHead>
                          <TableHead>과목</TableHead>
                          <TableHead>학생 수</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allTeacherClasses.slice(0, displayCount).map((classItem, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{classItem.teacher_name}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{classItem.class_name || '미정'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{classItem.subject}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{classItem.student_count}명</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* 무한 스크롤 센티넬 */}
                    <div ref={classesObserverTarget} className="h-4" />

                    {/* 모든 데이터 로드 완료 */}
                    {displayCount >= allTeacherClasses.length && (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        모든 담당 반을 불러왔습니다. (총 {allTeacherClasses.length}개)
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    담당 반 정보가 없습니다
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>강사별 학생 담당 분포도</CardTitle>
                <CardDescription>전체 학생 중 각 강사가 담당하는 비율</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={teacherStudentsData.filter(d => d.students > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="students"
                    >
                      {teacherStudentsData.filter(d => d.students > 0).map((entry, index) => (
                        <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                {teacherStudentsData.filter(d => d.students > 0).length === 0 && (
                  <p className="mt-4 text-sm text-muted-foreground text-center">배정된 학생이 없습니다.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>강사별 담당 학생 수</CardTitle>
                <CardDescription>현재 담당하고 있는 학생 수</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teacherStudentsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="students" fill="#22c55e" name="학생 수" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>고용 형태 분포</CardTitle>
                <CardDescription>강사 고용 형태별 분포</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={employmentPieData.map((d, idx) => ({ ...d, _id: `${d.name}-${idx}` }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent, index }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {employmentPieData.map((entry, index) => (
                        <Cell key={`cell-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                {employmentPieData.length === 0 && (
                  <p className="mt-4 text-sm text-muted-foreground text-center">표시할 데이터가 없습니다.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>강사 급여 정보</CardTitle>
                <CardDescription>등록된 강사의 급여 정보</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teachers.filter(t => t.status === 'active').map((teacher) => (
                    <div key={teacher.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">
                            {teacher.name.split('').slice(0, 2).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{teacher.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {getEmploymentType(teacher)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {getSalaryAmount(teacher).toLocaleString()}원
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {salaryTypeMap[getSalaryType(teacher)] ?? '월급'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? '강사 정보 수정' : '강사 등록'}
            </DialogTitle>
            <DialogDescription>
              강사의 기본 정보와 담당 과목을 입력하세요
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="예: 김선생"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">전화번호 *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="010-1234-5678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일 *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="example@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label>담당 과목</Label>
              <div className="flex gap-2">
                <Input
                  value={subjectInput}
                  onChange={(e) => setSubjectInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSubject()}
                  placeholder="과목 입력 후 추가 버튼 클릭"
                />
                <Button type="button" onClick={handleAddSubject} variant="outline">
                  추가
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.subjects?.map((subject) => (
                  <Badge key={subject} variant="secondary">
                    {subject}
                    <button
                      onClick={() => handleRemoveSubject(subject)}
                      className="ml-2 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employment_type">고용 형태</Label>
                <Select
                  value={formData.employment_type}
                  onValueChange={(value: 'full_time' | 'part_time' | 'contract') =>
                    setFormData({ ...formData, employment_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">정규직</SelectItem>
                    <SelectItem value="part_time">시간강사</SelectItem>
                    <SelectItem value="contract">계약직</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">상태</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: 'active' | 'inactive') =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">재직</SelectItem>
                    <SelectItem value="inactive">휴직</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary_type">급여 유형</Label>
                <Select
                  value={formData.salary_type}
                  onValueChange={(value: 'monthly' | 'hourly') =>
                    setFormData({ ...formData, salary_type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">월급</SelectItem>
                    <SelectItem value="hourly">시급</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="salary_amount">급여 금액</Label>
                <Input
                  id="salary_amount"
                  type="number"
                  value={formData.salary_amount}
                  onChange={(e) =>
                    setFormData({ ...formData, salary_amount: Number(e.target.value) })
                  }
                  placeholder="3000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hire_date">입사일</Label>
              <Input
                id="hire_date"
                type="date"
                value={formData.hire_date}
                onChange={(e) =>
                  setFormData({ ...formData, hire_date: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">메모</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="강사에 대한 추가 정보"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveTeacher}>
              {isEditing ? '수정' : '등록'} 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>강사 삭제</DialogTitle>
            <DialogDescription>
              정말로 {selectedTeacher?.name} 강사를 삭제하시겠습니까?
              이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              삭제
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
              {selectedTeacher?.name} 강사에게 배정할 학생을 선택하세요
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

      {/* Teacher Detail Modal */}
      <TeacherDetailModal
        teacher={selectedTeacherForDetail}
        open={isTeacherDetailModalOpen}
        onOpenChange={setIsTeacherDetailModalOpen}
        students={allStudents.filter((s: any) => s.teacher_id === selectedTeacherForDetail?.id)}
        classes={classes.filter((c: any) => c.teacher_id === selectedTeacherForDetail?.id)}
        onUpdate={(updatedTeacher) => {
          setTeachers(teachers.map(t => t.id === updatedTeacher.id ? updatedTeacher : t))
          toast({
            title: '강사 정보 업데이트',
            description: `${updatedTeacher.name} 강사의 정보가 업데이트되었습니다.`,
          })
        }}
      />

      {/* Teacher Detail Dialog (Old - can be removed later) */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
          <DialogHeader>
            <DialogTitle>강사 상세 정보</DialogTitle>
            <DialogDescription>
              {selectedTeacher?.name} 강사의 상세 정보입니다
            </DialogDescription>
          </DialogHeader>

          {selectedTeacher && (
            <div className="space-y-6 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">기본 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">이름</Label>
                    <p className="mt-1 font-medium">{selectedTeacher.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">전화번호</Label>
                    <p className="mt-1 font-medium">{selectedTeacher.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-muted-foreground">이메일</Label>
                    <p className="mt-1 font-medium">{selectedTeacher.email}</p>
                  </div>
                </div>
              </div>

              {/* Employment Info */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold">고용 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">고용 형태</Label>
                    <p className="mt-1 font-medium">
                      {getEmploymentType(selectedTeacher)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">급여 유형</Label>
                    <p className="mt-1 font-medium">
                      {salaryTypeMap[getSalaryType(selectedTeacher)] ?? '월급'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">급여 금액</Label>
                    <p className="mt-1 font-medium">
                      {getSalaryAmount(selectedTeacher).toLocaleString()}원
                      {getSalaryType(selectedTeacher) === 'monthly' ? '/월' : '/시간'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">입사일</Label>
                    <p className="mt-1 font-medium">
                      {selectedTeacher.hire_date
                        ? format(new Date(selectedTeacher.hire_date), 'yyyy년 MM월 dd일', { locale: ko })
                        : '미등록'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">상태</Label>
                    <div className="mt-1">
                      <Badge variant={statusMap[normalizeStatus(selectedTeacher.status)].variant}>
                        {statusMap[normalizeStatus(selectedTeacher.status)].label}
                      </Badge>
                    </div>
                  </div>
                  {/* Show salary tracking for hourly teachers */}
                  {getSalaryType(selectedTeacher) === 'hourly' && (
                    <>
                      <div>
                        <Label className="text-muted-foreground">총 근무 시간</Label>
                        <p className="mt-1 font-medium">
                          {(selectedTeacher.total_hours_worked || 0).toFixed(1)}시간
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">누적 급여</Label>
                        <p className="mt-1 font-medium text-primary">
                          {(selectedTeacher.earned_salary || 0).toLocaleString()}원
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Subjects */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold">담당 과목</h3>
                <div className="flex flex-wrap gap-2">
                  {(selectedTeacher.subjects || []).map((subject) => (
                    <Badge key={subject} variant="secondary">
                      {subject}
                    </Badge>
                  ))}
                  {!selectedTeacher.subjects?.length && (
                    <span className="text-sm text-muted-foreground">등록된 과목 없음</span>
                  )}
                </div>
              </div>

              {/* Assigned Students */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold">배정된 학생</h3>
                {selectedTeacher.assigned_students && selectedTeacher.assigned_students.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTeacher.assigned_students.map((studentId) => {
                      const student = allStudents.find((s) => s.id === studentId)
                      return student ? (
                        <div key={studentId} className="flex items-center gap-2 p-2 bg-muted/50 rounded">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{student.name}</span>
                          <span className="text-sm text-muted-foreground">
                            ({student.grade} - {student.school})
                          </span>
                        </div>
                      ) : null
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">배정된 학생이 없습니다</p>
                )}
              </div>

              {/* Notes */}
              {selectedTeacher.notes && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="text-lg font-semibold">메모</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {selectedTeacher.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
