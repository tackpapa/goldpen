'use client'

export const runtime = 'edge'


/**
 * 과제 관리 페이지 (Homework Management)
 *
 * 강사 계정 필터링 구현 완료:
 * - 강사(teacher) 역할로 로그인 시: 본인 담당 반/학생의 과제만 표시
 * - 관리자(owner, manager, staff) 역할로 로그인 시: 모든 과제 데이터 표시
 */

import { useState, useEffect, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { usePageAccess } from '@/hooks/use-page-access'
import { useAuth } from '@/contexts/auth-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Eye, MoreHorizontal, CheckCircle, XCircle, Plus, Trash2, ClipboardCheck } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Homework, HomeworkSubmission } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns/format'

// API 응답 타입 정의
interface HomeworkApiResponse {
  homework?: Homework[]
  submissions?: Record<string, HomeworkSubmission[]>
  studentHomeworkStatus?: StudentHomeworkStatus[]
  classHomeworkStats?: ClassHomeworkStats[]
  teachers?: { id: string; name: string }[]
  classes?: { id: string; name: string }[]
  error?: string
}

interface ApiErrorResponse {
  error?: string
}

// 학생별 데이터: 각 학생의 최근 과제 제출 여부 (다중 강사 지원)
interface StudentHomeworkStatus {
  student_id: string
  student_name: string
  class_name: string
  teacher_names: string[]
  last_homework: string | null
  last_homework_text: string | null
  last_homework_date: string | null
  submitted: boolean | null
  submission_rate: number
}

// 반별 데이터: 각 반의 과제 제출률
interface ClassHomeworkStats {
  class_id?: string
  class_name: string
  total_students: number
  submitted_count: number
  submission_rate: number
  last_homework?: string | null
  last_homework_text?: string | null
  last_homework_date?: string | null
  students?: Array<{
    student_id: string
    student_name: string
    class_name?: string
    teacher_names?: string[]
    submitted?: boolean
    submission_rate?: number
  }>
}

export default function HomeworkPage() {
  usePageAccess('homework')

  const { user } = useAuth()
  const { toast } = useToast()
  const [homework, setHomework] = useState<Homework[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [submissions, setSubmissions] = useState<Record<string, HomeworkSubmission[]>>({})

  useEffect(() => {
    const fetchHomework = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/homework', { credentials: 'include' })
        const data = await response.json() as HomeworkApiResponse
        if (response.ok) {
          setHomework(data.homework || [])
          setSubmissions(data.submissions || {})
          setStudentHomeworkStatus(data.studentHomeworkStatus || [])
          setClassHomeworkStats(data.classHomeworkStats || [])
          setClasses(data.classes || [])
          if (data.teachers?.length) {
            const names = data.teachers.map((t) => t.name).filter(Boolean)
            setTeachers(names)
            if (selectedTeacher === 'all' && names.length) {
              setSelectedTeacher(names[0])
            }
          } else {
            setTeachers([])
          }
        } else {
          toast({ title: '과제 데이터 로드 실패', variant: 'destructive' })
        }
      } catch {
        toast({ title: '오류 발생', variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    }
    fetchHomework()
  }, [toast])
  const [selectedHomework, setSelectedHomework] = useState<Homework | null>(null)
  const [isSubmissionsDialogOpen, setIsSubmissionsDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'student' | 'class' | 'homework'>('homework')

  // 제출 모달 관련 상태
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false)
  const [selectedHomeworkForSubmit, setSelectedHomeworkForSubmit] = useState<Homework | null>(null)
  const [submitModalStudents, setSubmitModalStudents] = useState<Array<{
    student_id: string
    student_name: string
    submitted: boolean
    originalSubmitted: boolean // 원래 제출 상태 저장 (변경 감지용)
  }>>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false) // 변경사항 있는지 추적

  // 삭제 확인 모달 상태
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [homeworkToDelete, setHomeworkToDelete] = useState<Homework | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all')
  const [selectedClass, setSelectedClass] = useState<ClassHomeworkStats | null>(null)
  const [isClassDetailDialogOpen, setIsClassDetailDialogOpen] = useState(false)
  const [isHomeworkHistoryDialogOpen, setIsHomeworkHistoryDialogOpen] = useState(false)
  const [selectedClassForHistory, setSelectedClassForHistory] = useState<ClassHomeworkStats | null>(null)
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newHomework, setNewHomework] = useState({
    class_id: '',
    title: '',
    due_date: '',
  })
  const [isCreating, setIsCreating] = useState(false)
  const [hideOverdue, setHideOverdue] = useState(false) // 기한 지난 숙제 가리기

  const statusMap = {
    active: { label: '진행중', variant: 'default' as const },
    completed: { label: '완료', variant: 'outline' as const },
    overdue: { label: '기한초과', variant: 'destructive' as const },
  }

  const columns: ColumnDef<Homework>[] = [
    {
      accessorKey: 'title',
      header: '과제명',
    },
    {
      accessorKey: 'class_name',
      header: '반',
      cell: ({ row }) => {
        const className = row.getValue('class_name') as string
        return <Badge variant="secondary">{className}</Badge>
      },
    },
    {
      accessorKey: 'due_date',
      header: '마감일',
      cell: ({ row }) => {
        const date = row.getValue('due_date') as string
        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{format(new Date(date), 'yyyy-MM-dd')}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'submitted_count',
      header: '제출 현황',
      cell: ({ row }) => {
        const submitted = row.getValue('submitted_count') as number
        const total = row.original.total_students
        const percentage = (submitted / total) * 100
        return (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>{submitted}/{total}</span>
              <span className="text-muted-foreground">{Math.round(percentage)}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
        )
      },
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => {
        const status = row.getValue('status') as Homework['status']
        const statusInfo = statusMap[status]
        return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const hw = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleViewSubmissions(hw)}>
                <Eye className="mr-2 h-4 w-4" />
                제출 현황 보기
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const handleViewSubmissions = (hw: Homework) => {
    setSelectedHomework(hw)
    setIsSubmissionsDialogOpen(true)
  }

  const handleViewClassDetail = (classStats: ClassHomeworkStats) => {
    setSelectedClass(classStats)
    setIsClassDetailDialogOpen(true)
  }

  const handleViewHomeworkHistory = (classStats: ClassHomeworkStats, e: React.MouseEvent) => {
    e.stopPropagation() // row 클릭 이벤트 방지
    setSelectedClassForHistory(classStats)
    setIsHomeworkHistoryDialogOpen(true)
  }

  // 과제 생성 핸들러 - Workers API (BFF) 호출 (알림 발송 포함)
  const handleCreateHomework = async () => {
    if (!newHomework.class_id || !newHomework.title) {
      toast({ title: '반과 과제명을 입력해주세요', variant: 'destructive' })
      return
    }

    setIsCreating(true)
    try {
      // Supabase 세션에서 access_token 가져오기
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        toast({ title: '인증이 필요합니다. 다시 로그인해주세요.', variant: 'destructive' })
        return
      }

      // Workers API (BFF)로 과제 생성 - Authorization 헤더로 토큰 전달
      const apiUrl = process.env.NEXT_PUBLIC_WORKERS_API_URL || 'https://goldpen-api.hello-51f.workers.dev'
      const response = await fetch(`${apiUrl}/api/homework`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          class_id: newHomework.class_id,
          title: newHomework.title,
          due_date: newHomework.due_date || undefined, // 빈 문자열이면 undefined로 전달 (서버에서 7일 후로 설정)
        }),
      })

      const result = await response.json() as ApiErrorResponse

      if (response.ok) {
        toast({ title: '과제가 생성되었습니다' })
        setIsCreateDialogOpen(false)
        setNewHomework({ class_id: '', title: '', due_date: '' })
        // 데이터 새로고침
        const refreshResponse = await fetch('/api/homework', { credentials: 'include' })
        const refreshData = await refreshResponse.json() as HomeworkApiResponse
        if (refreshResponse.ok) {
          setHomework(refreshData.homework || [])
          setSubmissions(refreshData.submissions || {})
          setStudentHomeworkStatus(refreshData.studentHomeworkStatus || [])
          setClassHomeworkStats(refreshData.classHomeworkStats || [])
        }
      } else {
        toast({ title: result.error || '과제 생성 실패', variant: 'destructive' })
      }
    } catch {
      toast({ title: '오류가 발생했습니다', variant: 'destructive' })
    } finally {
      setIsCreating(false)
    }
  }

  // 해당 반의 과제 내역 조회
  const getClassHomeworkHistory = (className: string) => {
    return homework.filter((hw) => hw.class_name === className)
  }

  // 제출 모달 열기
  const handleOpenSubmitModal = async (hw: Homework) => {
    setSelectedHomeworkForSubmit(hw)
    setIsSubmitModalOpen(true)

    // 해당 과제의 반 학생 목록 가져오기
    const classStats = classHomeworkStats.find(
      (cls) => cls.class_name === hw.class_name
    )
    const classStudents = classStats?.students || []

    // 기존 제출 현황 가져오기
    const hwSubmissions = submissions[hw.id] || []
    const submittedStudentIds = new Set(
      hwSubmissions
        .filter((s) => s.status === 'submitted' || s.status === 'late')
        .map((s) => s.student_id)
    )

    // 학생 목록 생성
    const studentList = classStudents.map((s) => {
      const isSubmitted = submittedStudentIds.has(s.student_id)
      return {
        student_id: s.student_id,
        student_name: s.student_name,
        submitted: isSubmitted,
        originalSubmitted: isSubmitted, // 원래 상태 저장
      }
    })

    setSubmitModalStudents(studentList)
    setHasChanges(false) // 모달 열 때 변경사항 초기화
  }

  // 개별 학생 제출 상태 토글 (로컬 상태만 변경, API 호출 없음)
  const handleToggleSubmit = (studentId: string) => {
    setSubmitModalStudents((prev) => {
      const updated = prev.map((s) =>
        s.student_id === studentId ? { ...s, submitted: !s.submitted } : s
      )
      // 변경사항 있는지 확인
      const hasAnyChange = updated.some((s) => s.submitted !== s.originalSubmitted)
      setHasChanges(hasAnyChange)
      return updated
    })
  }

  // 저장 버튼 클릭 시 변경된 제출 상태를 API로 전송
  const handleSaveSubmissions = async () => {
    if (!selectedHomeworkForSubmit) return

    // 새로 제출로 변경된 학생들만 필터 (originalSubmitted가 false였는데 submitted가 true가 된 경우)
    const newlySubmittedStudents = submitModalStudents.filter(
      (s) => s.submitted && !s.originalSubmitted
    )

    if (newlySubmittedStudents.length === 0) {
      toast({ title: '변경된 제출 기록이 없습니다' })
      setIsSubmitModalOpen(false)
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/homework/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          homework_id: selectedHomeworkForSubmit.id,
          student_ids: newlySubmittedStudents.map((s) => s.student_id),
          status: 'submitted',
        }),
      })

      if (response.ok) {
        toast({ title: `${newlySubmittedStudents.length}명의 제출이 저장되었습니다` })
        // 데이터 새로고침
        const refreshResponse = await fetch('/api/homework', { credentials: 'include' })
        const refreshData = await refreshResponse.json() as HomeworkApiResponse
        if (refreshResponse.ok) {
          setHomework(refreshData.homework || [])
          setSubmissions(refreshData.submissions || {})
          setStudentHomeworkStatus(refreshData.studentHomeworkStatus || [])
          setClassHomeworkStats(refreshData.classHomeworkStats || [])
        }
        setIsSubmitModalOpen(false)
      } else {
        const result = await response.json() as ApiErrorResponse
        toast({ title: result.error || '제출 기록 저장 실패', variant: 'destructive' })
      }
    } catch {
      toast({ title: '오류가 발생했습니다', variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 과제 삭제 처리
  const handleDeleteHomework = async () => {
    if (!homeworkToDelete) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/homework/${homeworkToDelete.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        toast({ title: '과제가 삭제되었습니다' })
        // 데이터 새로고침
        const refreshResponse = await fetch('/api/homework', { credentials: 'include' })
        const refreshData = await refreshResponse.json() as HomeworkApiResponse
        if (refreshResponse.ok) {
          setHomework(refreshData.homework || [])
          setSubmissions(refreshData.submissions || {})
          setStudentHomeworkStatus(refreshData.studentHomeworkStatus || [])
          setClassHomeworkStats(refreshData.classHomeworkStats || [])
        }
        setIsDeleteDialogOpen(false)
        setHomeworkToDelete(null)
      } else {
        const result = await response.json() as ApiErrorResponse
        toast({ title: result.error || '삭제 실패', variant: 'destructive' })
      }
    } catch {
      toast({ title: '오류가 발생했습니다', variant: 'destructive' })
    } finally {
      setIsDeleting(false)
    }
  }

  const [studentHomeworkStatus, setStudentHomeworkStatus] = useState<StudentHomeworkStatus[]>([])
  const [classHomeworkStats, setClassHomeworkStats] = useState<ClassHomeworkStats[]>([])

  // 선택된 반의 학생 목록 가져오기 (class_enrollments 기반)
  const getClassStudents = (classStats: ClassHomeworkStats): StudentHomeworkStatus[] => {
    // API에서 반환한 학생 목록 (class_enrollments 기반)
    const enrolledStudents = classStats.students || []

    if (enrolledStudents.length === 0) {
      // fallback: class_name 기반
      return studentHomeworkStatus.filter((s) => s.class_name === classStats.class_name)
    }

    // studentHomeworkStatus에서 과제 정보 가져오기
    const statusMap = new Map(studentHomeworkStatus.map(s => [s.student_id, s]))

    return enrolledStudents.map(s => {
      const status = statusMap.get(s.student_id)
      if (status) {
        return status // 과제 정보가 있으면 전체 정보 반환
      }
      // 과제 정보가 없으면 기본값 생성
      // 반에 과제가 있으면 미제출(false)로 표시, 없으면 과제 없음(null)
      return {
        student_id: s.student_id,
        student_name: s.student_name,
        class_name: s.class_name || classStats.class_name,
        teacher_names: s.teacher_names || [],
        last_homework: classStats.last_homework || null,
        last_homework_text: classStats.last_homework_text || null,
        last_homework_date: classStats.last_homework_date || null,
        submitted: classStats.last_homework ? false : null,
        submission_rate: 0,
      }
    })
  }

  // 강사 목록 추출 (중복 제거, 다중 배정 고려)
  const [teachers, setTeachers] = useState<string[]>([])

  const derivedTeachers = Array.from(
    new Set(
      studentHomeworkStatus
        .flatMap((s) => s.teacher_names || [])
        .filter(Boolean)
    )
  )

  const teacherList = teachers.length ? teachers : derivedTeachers.length ? derivedTeachers : ['미배정']

  const teacherCounts = teacherList.reduce<Record<string, number>>((acc, t) => {
    acc[t] = studentHomeworkStatus.filter((s) => (s.teacher_names || []).includes(t)).length
    return acc
  }, {})

  // 강사 계정 여부 확인
  const isTeacherRole = user?.role === 'teacher'
  const currentTeacherName = user?.name || ''

  // 강사 계정인 경우 담당 반 이름 목록 추출 (studentHomeworkStatus에서)
  const teacherClassNames = useMemo(() => {
    if (!isTeacherRole || !currentTeacherName) return null
    const classNames = new Set<string>()
    studentHomeworkStatus.forEach((s) => {
      if ((s.teacher_names || []).includes(currentTeacherName)) {
        classNames.add(s.class_name)
      }
    })
    return classNames
  }, [isTeacherRole, currentTeacherName, studentHomeworkStatus])

  // 강사별 필터링된 학생 목록 (강사 계정은 본인 학생만 자동 필터링)
  const baseFilteredStudents = isTeacherRole && currentTeacherName
    ? studentHomeworkStatus.filter((s) => (s.teacher_names || []).includes(currentTeacherName))
    : studentHomeworkStatus

  const filteredStudents = selectedTeacher === 'all'
    ? baseFilteredStudents
    : baseFilteredStudents.filter((s) => (s.teacher_names || []).includes(selectedTeacher))

  // 강사 계정인 경우 담당 반의 과제만 필터링
  const teacherFilteredHomework = useMemo(() => {
    if (!isTeacherRole || !teacherClassNames) return homework
    return homework.filter((hw) => teacherClassNames.has(hw.class_name))
  }, [isTeacherRole, teacherClassNames, homework])

  // 기한 지난 숙제 필터링 (강사 필터링된 과제 기준)
  const filteredHomework = hideOverdue
    ? teacherFilteredHomework.filter((hw) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const dueDate = new Date(hw.due_date)
        dueDate.setHours(0, 0, 0, 0)
        return dueDate >= today
      })
    : teacherFilteredHomework

  // 강사 계정인 경우 담당 반만 필터링된 classHomeworkStats
  const filteredClassHomeworkStats = useMemo(() => {
    if (!isTeacherRole || !teacherClassNames) return classHomeworkStats
    return classHomeworkStats.filter((cls) => teacherClassNames.has(cls.class_name))
  }, [isTeacherRole, teacherClassNames, classHomeworkStats])

  // 학생별 그룹핑 연산 메모이제이션 (학생별 뷰에서 사용)
  // filteredStudents가 변경될 때만 재계산
  const groupedStudents = useMemo(() => {
    return filteredStudents.reduce((acc, student) => {
      const existing = acc.find(g => g.student_id === student.student_id)
      if (existing) {
        existing.classes.push(student)
      } else {
        acc.push({
          student_id: student.student_id,
          student_name: student.student_name,
          classes: [student]
        })
      }
      return acc
    }, [] as { student_id: string; student_name: string; classes: typeof filteredStudents }[])
  }, [filteredStudents])

  const totalHomework = homework.length
  const activeHomework = homework.filter((hw) => hw.status === 'active').length
  const completedHomework = homework.filter((hw) => hw.status === 'completed').length
  // NaN 방지: total_students가 0인 경우 0%로 처리
  const avgSubmissionRate = homework.length > 0
    ? Math.round(
        homework.reduce((sum, hw) => {
          const rate = hw.total_students > 0 ? (hw.submitted_count / hw.total_students * 100) : 0
          return sum + rate
        }, 0) / homework.length
      )
    : 0

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">과제 관리</h1>
          <p className="text-sm md:text-base text-muted-foreground">과제 및 제출 현황을 관리하세요</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          과제 생성
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 과제</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHomework}개</div>
            <p className="text-xs text-muted-foreground">
              진행중: {activeHomework}개
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">완료된 과제</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedHomework}개</div>
            <p className="text-xs text-muted-foreground">
              전체 과제의 {Math.round(completedHomework / totalHomework * 100)}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 제출률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSubmissionRate}%</div>
            <p className="text-xs text-muted-foreground">전체 과제 평균</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">미제출</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {homework.reduce((sum, hw) => sum + (hw.total_students - hw.submitted_count), 0)}건
            </div>
            <p className="text-xs text-muted-foreground">전체 미제출 건수</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'student' | 'class' | 'homework')}>
        <TabsList>
          <TabsTrigger value="homework">
            과제별
          </TabsTrigger>
          <TabsTrigger value="student">
            학생별
          </TabsTrigger>
          <TabsTrigger value="class">
            반별
          </TabsTrigger>
        </TabsList>

        {/* 학생별 뷰 */}
        <TabsContent value="student" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>학생별 최근 과제 제출 현황</CardTitle>
              <CardDescription>
                {isTeacherRole ? '담당 학생의 가장 최근 과제 제출 여부 및 전체 제출률' : '각 학생의 가장 최근 과제 제출 여부 및 전체 제출률'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* 강사 필터 (강사 계정이 아닐 때만 표시) */}
              {!isTeacherRole && (
                <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
                  <Button
                    variant={selectedTeacher === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTeacher('all')}
                  >
                    전체 ({studentHomeworkStatus.length})
                  </Button>
                  {teachers.map((teacher) => {
                    const count = teacherCounts[teacher] || 0
                    return (
                      <Button
                        key={teacher}
                        variant={selectedTeacher === teacher ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTeacher(teacher)}
                      >
                        {teacher} ({count})
                      </Button>
                    )
                  })}
                </div>
              )}

              <div className="space-y-3">
                {/* 학생 ID별로 그룹핑 (useMemo로 최적화됨) */}
                {groupedStudents.map((group) => (
                    <div
                      key={group.student_id}
                      className="flex items-center p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      {/* 왼쪽: 학생 이름 (고정, 중앙 정렬) */}
                      <div className="w-24 flex-shrink-0 flex items-center justify-center">
                        <h4 className="font-semibold text-center">{group.student_name}</h4>
                      </div>

                      {/* 오른쪽: 반별 정보 스택 */}
                      <div className="flex-1 min-w-0">
                        {group.classes.length === 1 ? (
                          // 반이 1개인 경우: 기존 가로 레이아웃
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-wrap">
                              <Badge variant="outline">{group.classes[0].class_name}</Badge>
                              <Badge variant="secondary">
                                {(group.classes[0].teacher_names || []).join(', ')}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 ml-4">
                              <div className="text-center min-w-[60px]">
                                <div className="text-2xl font-bold text-primary">
                                  {group.classes[0].submission_rate}%
                                </div>
                                <p className="text-xs text-muted-foreground">전체 제출률</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {group.classes[0].submitted === null ? (
                                  <Badge variant="secondary">과제 없음</Badge>
                                ) : group.classes[0].submitted ? (
                                  <>
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <Badge className="bg-green-600 hover:bg-green-700">제출 완료</Badge>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-5 w-5 text-red-600" />
                                    <Badge variant="destructive">미제출</Badge>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          // 반이 여러 개인 경우: 세로 스택 레이아웃
                          <div className="space-y-2">
                            {group.classes.map((classInfo, idx) => (
                              <div
                                key={`${classInfo.student_id}-${classInfo.class_name}-${idx}`}
                                className={`flex items-center justify-between ${idx > 0 ? 'pt-2 border-t border-dashed' : ''}`}
                              >
                                <div className="flex items-center gap-3 flex-wrap">
                                  <Badge variant="outline">{classInfo.class_name}</Badge>
                                  <Badge variant="secondary">
                                    {(classInfo.teacher_names || []).join(', ')}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 ml-4">
                                  <div className="text-center min-w-[50px]">
                                    <div className="text-lg font-bold text-primary">
                                      {classInfo.submission_rate}%
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {classInfo.submitted === null ? (
                                      <Badge variant="secondary">과제 없음</Badge>
                                    ) : classInfo.submitted ? (
                                      <Badge className="bg-green-600 hover:bg-green-700">제출</Badge>
                                    ) : (
                                      <Badge variant="destructive">미제출</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 반별 뷰 */}
        <TabsContent value="class" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>반별 과제 제출률</CardTitle>
              <CardDescription>
                {isTeacherRole ? '담당 반의 최근 과제 제출 현황' : '각 반의 최근 과제 제출 현황'} (클릭하여 학생 목록 확인)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredClassHomeworkStats.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {isTeacherRole ? '담당하는 반이 없습니다.' : '등록된 반 데이터가 없습니다.'}
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredClassHomeworkStats.map((classStats) => (
                    <div
                      key={classStats.class_id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => handleViewClassDetail(classStats)}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-lg hover:text-primary transition-colors">
                            {classStats.class_name}
                          </h4>
                          {classStats.last_homework_text && (
                            <>
                              <span className="text-muted-foreground">:</span>
                              <span className="text-sm text-muted-foreground">
                                {classStats.last_homework_text}
                                {classStats.last_homework_date && (
                                  <span className="ml-1 text-xs">
                                    ({format(new Date(classStats.last_homework_date), 'MM/dd')})
                                  </span>
                                )}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {classStats.submission_rate}%
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {classStats.submitted_count}/{classStats.total_students}명 제출
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => handleViewHomeworkHistory(classStats, e)}
                          >
                            과제내역
                          </Button>
                        </div>
                      </div>
                      <Progress value={classStats.submission_rate} className="h-3" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 과제별 뷰 */}
        <TabsContent value="homework" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>과제 목록</CardTitle>
                  <CardDescription>모든 과제를 관리하고 제출을 기록하세요</CardDescription>
                </div>
                <Button
                  variant={hideOverdue ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setHideOverdue(!hideOverdue)}
                >
                  {hideOverdue ? '전체 보기' : '기한 지난 숙제 가리기'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {filteredHomework.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {hideOverdue ? '기한이 지나지 않은 과제가 없습니다.' : '등록된 과제가 없습니다.'}
                </p>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left font-medium">과제명</th>
                        <th className="p-3 text-left font-medium">반 이름</th>
                        <th className="p-3 text-center font-medium">제출 현황</th>
                        <th className="p-3 text-center font-medium">마감일</th>
                        <th className="p-3 text-center font-medium">액션</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredHomework.map((hw) => {
                        const submissionRate = hw.total_students > 0
                          ? Math.round((hw.submitted_count / hw.total_students) * 100)
                          : 0
                        return (
                          <tr key={hw.id} className="border-b hover:bg-muted/50 transition-colors">
                            <td className="p-3">
                              <div className="font-medium">{hw.title}</div>
                              {hw.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1">{hw.description}</p>
                              )}
                            </td>
                            <td className="p-3">
                              <Badge variant="secondary">{hw.class_name}</Badge>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="font-semibold text-primary">{submissionRate}%</span>
                                <span className="text-xs text-muted-foreground">
                                  {hw.submitted_count}/{hw.total_students}명
                                </span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">{format(new Date(hw.due_date), 'MM/dd')}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenSubmitModal(hw)}
                                >
                                  <ClipboardCheck className="h-4 w-4 mr-1" />
                                  제출
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => {
                                    setHomeworkToDelete(hw)
                                    setIsDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Class Detail Dialog */}
      <Dialog open={isClassDetailDialogOpen} onOpenChange={setIsClassDetailDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedClass?.class_name} - 학생별 과제 제출 현황</DialogTitle>
            <DialogDescription>
              전체 {selectedClass?.total_students}명 중 {selectedClass?.submitted_count}명 제출
              ({selectedClass?.submission_rate}%)
            </DialogDescription>
          </DialogHeader>

          {selectedClass && (
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                {getClassStudents(selectedClass).map((student) => (
                  <div
                    key={student.student_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold">{student.student_name}</h4>
                      <Badge variant="outline">
                        {(student.teacher_names || []).join(', ')}
                      </Badge>
                    </div>
                      {student.last_homework && (
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            최근 과제: {student.last_homework}
                          </p>
                          {student.last_homework_text && (
                            <p className="text-xs text-muted-foreground">
                              {student.last_homework_text}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      {/* 전체 제출률 */}
                      <div className="text-center min-w-[60px]">
                        <div className="text-2xl font-bold text-primary">
                          {student.submission_rate}%
                        </div>
                        <p className="text-xs text-muted-foreground">전체 제출률</p>
                      </div>

                      {/* 최근 과제 제출 상태 */}
                      <div className="flex items-center gap-2">
                        {student.submitted === null ? (
                          <Badge variant="secondary">과제 없음</Badge>
                        ) : student.submitted ? (
                          <>
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <Badge className="bg-green-600 hover:bg-green-700">제출 완료</Badge>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-red-600" />
                            <Badge variant="destructive">미제출</Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClassDetailDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submissions Dialog */}
      <Dialog open={isSubmissionsDialogOpen} onOpenChange={setIsSubmissionsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedHomework?.title} - 제출 현황</DialogTitle>
            <DialogDescription>학생별 과제 제출 상태</DialogDescription>
          </DialogHeader>

          {selectedHomework && (() => {
            // submissions 데이터가 있으면 사용, 없으면 반 학생 목록에서 생성
            const hwSubmissions = submissions[selectedHomework.id] || []

            // 반 학생 목록 가져오기 (classHomeworkStats에서)
            const classStats = classHomeworkStats.find(
              (cls) => cls.class_name === selectedHomework.class_name
            )
            const classStudents = classStats?.students || []

            // submissions 데이터가 없으면 반 학생 목록으로 생성
            let displaySubmissions: Array<{
              id: string
              student_name: string
              status: string
              submitted_at: string | null
              score: number | null
            }> = []

            if (hwSubmissions.length > 0) {
              // 실제 submissions 데이터 사용
              displaySubmissions = hwSubmissions.map(s => ({
                id: s.id,
                student_name: s.student_name || '알 수 없음',
                status: s.status || 'not_submitted',
                submitted_at: s.submitted_at || null,
                score: s.score || null,
              }))
            } else if (classStudents.length > 0) {
              // 반 학생 목록에서 생성 (모두 미제출로 표시)
              displaySubmissions = classStudents.map((s, idx) => ({
                id: `generated-${s.student_id}-${idx}`,
                student_name: s.student_name,
                status: 'not_submitted',
                submitted_at: null,
                score: null,
              }))
            }

            // 통계 계산
            const submittedCount = displaySubmissions.filter(s => s.status === 'submitted').length
            const lateCount = displaySubmissions.filter(s => s.status === 'late').length
            const notSubmittedCount = displaySubmissions.filter(s => s.status === 'not_submitted').length

            return (
              <div className="flex-1 overflow-y-auto space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">제출</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        {submittedCount}명
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">늦은 제출</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {lateCount}명
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">미제출</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-red-600">
                        {notSubmittedCount}명
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {displaySubmissions.length > 0 ? (
                  <div className="rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/50">
                          <th className="p-2 text-left">학생</th>
                          <th className="p-2 text-center">상태</th>
                          <th className="p-2 text-center">제출일</th>
                          <th className="p-2 text-center">점수</th>
                        </tr>
                      </thead>
                      <tbody>
                        {displaySubmissions.map((submission) => (
                          <tr key={submission.id} className="border-b">
                            <td className="p-2">{submission.student_name}</td>
                            <td className="p-2 text-center">
                              {submission.status === 'submitted' && (
                                <Badge variant="default" className="gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  제출
                                </Badge>
                              )}
                              {submission.status === 'late' && (
                                <Badge variant="secondary" className="gap-1">
                                  <CheckCircle className="h-3 w-3" />
                                  늦은 제출
                                </Badge>
                              )}
                              {submission.status === 'not_submitted' && (
                                <Badge variant="destructive" className="gap-1">
                                  <XCircle className="h-3 w-3" />
                                  미제출
                                </Badge>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              {submission.submitted_at
                                ? format(new Date(submission.submitted_at), 'yyyy-MM-dd')
                                : '-'}
                            </td>
                            <td className="p-2 text-center font-medium">
                              {submission.score ? `${submission.score}점` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    이 반에 등록된 학생이 없습니다.
                  </div>
                )}
              </div>
            )
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubmissionsDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Homework History Dialog */}
      <Dialog open={isHomeworkHistoryDialogOpen} onOpenChange={setIsHomeworkHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{selectedClassForHistory?.class_name} - 과제 내역</DialogTitle>
            <DialogDescription>
              이 반에서 출제된 전체 과제 목록 및 제출률
            </DialogDescription>
          </DialogHeader>

          {selectedClassForHistory && (
            <div className="flex-1 overflow-y-auto">
              {(() => {
                const historyList = getClassHomeworkHistory(selectedClassForHistory.class_name)
                if (historyList.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      이 반에 출제된 과제가 없습니다.
                    </div>
                  )
                }
                return (
                  <div className="space-y-3">
                    {historyList
                      .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
                      .map((hw) => {
                        const submissionRate = hw.total_students > 0
                          ? Math.round((hw.submitted_count / hw.total_students) * 100)
                          : 0
                        const statusInfo = statusMap[hw.status]
                        return (
                          <div
                            key={hw.id}
                            className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold">{hw.title}</h4>
                                  <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                                </div>
                                {hw.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {hw.description}
                                  </p>
                                )}
                              </div>
                              <div className="text-right ml-4">
                                <div className="text-2xl font-bold text-primary">
                                  {submissionRate}%
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {hw.submitted_count}/{hw.total_students}명 제출
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Calendar className="h-4 w-4" />
                                <span>마감: {format(new Date(hw.due_date), 'yyyy-MM-dd')}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <Progress value={submissionRate} className="w-32 h-2" />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewSubmissions(hw)}
                                >
                                  제출목록
                                </Button>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                )
              })()}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHomeworkHistoryDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Homework Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>새 과제 생성</DialogTitle>
            <DialogDescription>
              반을 선택하고 과제 정보를 입력하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 반 선택 */}
            <div className="space-y-2">
              <Label htmlFor="class-select">반 선택 *</Label>
              <Select
                value={newHomework.class_id}
                onValueChange={(value) => setNewHomework({ ...newHomework, class_id: value })}
              >
                <SelectTrigger id="class-select">
                  <SelectValue placeholder="반을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 과제명 입력 */}
            <div className="space-y-2">
              <Label htmlFor="homework-title">과제명 *</Label>
              <Input
                id="homework-title"
                placeholder="과제명을 입력하세요"
                value={newHomework.title}
                onChange={(e) => setNewHomework({ ...newHomework, title: e.target.value })}
              />
            </div>

            {/* 마감일 (선택) */}
            <div className="space-y-2">
              <Label htmlFor="due-date">마감일 (선택)</Label>
              <Input
                id="due-date"
                type="date"
                value={newHomework.due_date}
                onChange={(e) => setNewHomework({ ...newHomework, due_date: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                미입력 시 7일 후로 자동 설정됩니다
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setNewHomework({ class_id: '', title: '', due_date: '' })
              }}
            >
              취소
            </Button>
            <Button onClick={handleCreateHomework} disabled={isCreating}>
              {isCreating ? '생성 중...' : '과제 생성'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Modal */}
      <Dialog open={isSubmitModalOpen} onOpenChange={setIsSubmitModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {selectedHomeworkForSubmit?.title} - 제출 기록
            </DialogTitle>
            <DialogDescription>
              학생별 제출 여부를 선택 후 저장 버튼을 눌러주세요
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            {submitModalStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                이 반에 등록된 학생이 없습니다.
              </p>
            ) : (
              <div className="space-y-2">
                {submitModalStudents.map((student) => (
                  <div
                    key={student.student_id}
                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors cursor-pointer ${
                      student.submitted
                        ? 'bg-green-50 border-green-200 hover:bg-green-100'
                        : 'hover:bg-muted/50'
                    } ${
                      student.submitted !== student.originalSubmitted
                        ? 'ring-2 ring-blue-400'
                        : ''
                    }`}
                    onClick={() => !student.originalSubmitted && handleToggleSubmit(student.student_id)}
                  >
                    <div className="flex items-center gap-3">
                      {student.submitted ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <span className="font-medium">{student.student_name}</span>
                    </div>
                    {student.originalSubmitted ? (
                      <Badge className="bg-green-600">제출 완료</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant={student.submitted ? 'default' : 'outline'}
                        className={student.submitted ? 'bg-green-600 hover:bg-green-700' : ''}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleToggleSubmit(student.student_id)
                        }}
                      >
                        {student.submitted ? '제출 ✓' : '제출'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 border-t pt-4">
            <div className="flex-1 text-sm text-muted-foreground">
              {hasChanges && (
                <span className="text-blue-600">
                  {submitModalStudents.filter((s) => s.submitted && !s.originalSubmitted).length}명 제출 예정
                </span>
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setIsSubmitModalOpen(false)}
            >
              취소
            </Button>
            <Button
              onClick={handleSaveSubmissions}
              disabled={isSubmitting || !hasChanges}
            >
              {isSubmitting ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>과제 삭제</DialogTitle>
            <DialogDescription>
              정말 이 과제를 삭제하시겠습니까? 제출 기록도 함께 삭제됩니다.
            </DialogDescription>
          </DialogHeader>

          {homeworkToDelete && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="font-medium">{homeworkToDelete.title}</div>
              <div className="text-sm text-muted-foreground">
                반: {homeworkToDelete.class_name}
              </div>
              <div className="text-sm text-muted-foreground">
                제출: {homeworkToDelete.submitted_count}/{homeworkToDelete.total_students}명
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setHomeworkToDelete(null)
              }}
            >
              취소
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteHomework}
              disabled={isDeleting}
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
