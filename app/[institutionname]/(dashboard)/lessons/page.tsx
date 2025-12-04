'use client'

export const runtime = 'edge'


/**
 * 수업일지 페이지 (Lessons/Class Journal) - 강사용
 *
 * TODO: 강사 계정 필터링 구현 필요
 * - 현재: 모든 수업일지 데이터 표시 (개발용)
 * - 향후: 로그인한 강사 본인의 수업일지만 필터링
 *   예: .eq('teacher_id', currentTeacherId)
 */

import { useState, useEffect, useMemo, useCallback, useTransition } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ColumnDef } from '@tanstack/react-table'
import { usePageAccess } from '@/hooks/use-page-access'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { Plus, Edit, BookOpen, TrendingUp, Sparkles, Calendar, Clock, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import type { LessonNote } from '@/lib/types/database'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/auth-context'

// Dynamic import for chart components (heavy library - ~200KB)
const LessonsCharts = dynamic(
  () => import('@/components/charts/LessonsCharts').then((mod) => mod.LessonsCharts),
  {
    ssr: false,
    loading: () => (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-80 flex items-center justify-center text-muted-foreground bg-muted/50 rounded-lg">차트 로딩중...</div>
        <div className="h-80 flex items-center justify-center text-muted-foreground bg-muted/50 rounded-lg">차트 로딩중...</div>
      </div>
    )
  }
)

interface StudentAttendance {
  student_id: string
  student_name: string
  status: 'present' | 'absent' | 'late' | 'excused'
}

// Solapi 알림톡 변수 (각 50자 이하) - Solapi 템플릿 변수명에 맞춤
// Solapi 등록 변수: 기관명, 학생명, 오늘수업, 학습포인트, 선생님코멘트, 원장님코멘트, 숙제, 복습팁
interface AlimtalkVariables {
  오늘수업: string
  학습포인트: string
  선생님코멘트: string
  원장님코멘트: string
  숙제: string
  복습팁: string
}

const ALIMTALK_VARIABLE_LABELS: Record<keyof AlimtalkVariables, string> = {
  오늘수업: '오늘 수업',
  학습포인트: '학습 포인트',
  선생님코멘트: '선생님 코멘트',
  원장님코멘트: '원장님 코멘트',
  숙제: '숙제 내용',
  복습팁: '복습 팁',
}

const MAX_VARIABLE_LENGTH = 50

interface ScheduledClass {
  id: string
  class_name: string
  lesson_time: string
  teacher_name: string
  class_type: '1:1' | '1:다수'
  students: { id: string; name: string }[]
  day?: string
  class_id?: string
  subject?: string
  teacher_id?: string
}

// Today's date
const initialDate = format(new Date(), 'yyyy-MM-dd')

const comprehensionMap = {
  high: { label: '상', variant: 'default' as const, color: 'text-green-600' },
  medium: { label: '중', variant: 'secondary' as const, color: 'text-yellow-600' },
  low: { label: '하', variant: 'outline' as const, color: 'text-red-600' },
}

export default function LessonsPage() {
  usePageAccess('lessons')

  const params = useParams()
  const institutionName = params.institutionname as string
  const { toast } = useToast()
  const [lessons, setLessons] = useState<LessonNote[]>([])
  const [scheduledClasses, setScheduledClasses] = useState<ScheduledClass[]>([])
  const [monthlyProgressData, setMonthlyProgressData] = useState<{month: string; planned: number; lessons: number}[]>([])
  const [comprehensionTrendData, setComprehensionTrendData] = useState<{week: string; high: number; medium: number; low: number}[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string>(initialDate)
  const [selectedLesson, setSelectedLesson] = useState<LessonNote | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false)
  const [isGeneratingDirectorFeedback, setIsGeneratingDirectorFeedback] = useState(false)
  const [isGeneratingFinalMessage, setIsGeneratingFinalMessage] = useState(false)
  const [isSendingNotification, setIsSendingNotification] = useState(false)

  // 알림톡 변수 상태 (Solapi용 - 각 50자 이하, Solapi 변수명에 맞춤)
  const [alimtalkVariables, setAlimtalkVariables] = useState<AlimtalkVariables>({
    오늘수업: '',
    학습포인트: '',
    선생님코멘트: '',
    원장님코멘트: '',
    숙제: '',
    복습팁: '',
  })

  // 50자 초과 여부 검사 - 하나라도 초과하면 true
  const hasOverLimitVariables = Object.values(alimtalkVariables).some(
    (value) => value.length > MAX_VARIABLE_LENGTH
  )
  const [isSaved, setIsSaved] = useState(false)
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all')

  // Schedule selection
  const [selectedSchedule, setSelectedSchedule] = useState<string>('')
  const [selectedScheduleData, setSelectedScheduleData] = useState<ScheduledClass | null>(null)

  // Attendance state
  const [studentAttendances, setStudentAttendances] = useState<StudentAttendance[]>([])
  const [isAttendanceExpanded, setIsAttendanceExpanded] = useState(false)
  const [allPresent, setAllPresent] = useState(true)

  // Homework submission state
  const [homeworkSubmissions, setHomeworkSubmissions] = useState<Record<string, boolean>>({})
  const [allSubmitted, setAllSubmitted] = useState(true)
  const [isHomeworkExpanded, setIsHomeworkExpanded] = useState(false)

  // Auth Context에서 사용자 권한 및 정보 가져오기
  const { user, org } = useAuth()
  const userRole = user?.role ?? 'teacher'
  const currentTeacherId = user?.id ?? ''
  const organizationName = org?.name || institutionName // 실제 기관명 (없으면 슬러그 사용)

  // API에서 데이터 가져오기
  useEffect(() => {
    const fetchLessons = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/lessons?orgSlug=${institutionName}`, { credentials: 'include' })
        const data = await response.json() as {
          lessons?: LessonNote[]
          scheduledClasses?: ScheduledClass[]
          monthlyProgressData?: {month: string; planned: number; lessons: number}[]
          comprehensionTrendData?: {week: string; high: number; medium: number; low: number}[]
          error?: string
        }
        if (response.ok) {
          setLessons(data.lessons || [])
          setScheduledClasses(data.scheduledClasses || [])
          setMonthlyProgressData(data.monthlyProgressData || [])
          setComprehensionTrendData(data.comprehensionTrendData || [])
        } else {
          toast({ title: '수업일지 데이터 로드 실패', variant: 'destructive' })
        }
      } catch {
        toast({ title: '오류 발생', variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    }
    if (institutionName) {
      fetchLessons()
    }
  }, [toast, institutionName])

  // Calculate today's lessons based on selected date
  const todayLessonsList = lessons.filter((lesson) => lesson.lesson_date === selectedDate)

  // Filter scheduled classes based on user role
  // 강사 계정일 경우: 해당 강사의 모든 반 표시 (요일/시간 무관)
  // 원장/관리자 계정일 경우: 전체 반 표시
  // 수업일지는 자정 넘어서 작성하거나 다음날 작성하는 경우가 있으므로 요일/시간 필터 제거
  const filteredScheduledClasses = useMemo(() => {
    const list = scheduledClasses.filter((schedule) => {
      // 강사는 본인 담당 반만, 원장/관리자/owner/super_admin은 전체
      const isAdmin = userRole === 'owner' || userRole === 'manager' || userRole === 'super_admin'
      if (isAdmin) return true

      // 강사인 경우 본인 담당 반만
      if (userRole === 'teacher' && currentTeacherId) {
        return (schedule as ScheduledClass & { teacher_id?: string }).teacher_id === currentTeacherId
      }

      return true
    })

    // 중복 제거: class_id 기준 (같은 반은 하나만 표시)
    const seen = new Set<string>()
    return list.filter((s) => {
      const key = s.class_id ?? s.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [userRole, currentTeacherId, scheduledClasses])

  // Date navigation functions
  const handlePreviousDay = () => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() - 1)
    setSelectedDate(currentDate.toISOString().split('T')[0])
  }

  const handleNextDay = () => {
    const currentDate = new Date(selectedDate)
    currentDate.setDate(currentDate.getDate() + 1)
    setSelectedDate(currentDate.toISOString().split('T')[0])
  }

  // Form state
  const [formData, setFormData] = useState<Partial<LessonNote & {
    director_feedback?: string
    final_message?: string
    homework_submitted?: boolean
    homework_due_date?: string
  }>>({
    lesson_date: selectedDate,
    lesson_time: '',
    class_id: '',
    class_name: '',
    subject: '',
    content: '',
    student_attitudes: '',
    comprehension_level: 'medium',
    homework_assigned: '',
    homework_due_date: '',
    next_lesson_plan: '',
    parent_feedback: '',
    director_feedback: '',
    final_message: '',
    homework_submitted: undefined,
  })

  const handleCreateLesson = () => {
    setIsEditing(false)
    setSelectedSchedule('')
    setSelectedScheduleData(null)
    setFormData({
      lesson_date: selectedDate,
      lesson_time: '',
      class_id: '',
      class_name: '',
      subject: '',
      content: '',
      student_attitudes: '',
      comprehension_level: 'medium',
      homework_assigned: '',
      homework_due_date: '',
      next_lesson_plan: '',
      parent_feedback: '',
      director_feedback: '',
      final_message: '',
    })
    setStudentAttendances([])
    setIsAttendanceExpanded(false)
    setAllPresent(true)
    setHomeworkSubmissions({})
    setAllSubmitted(true)
    setIsHomeworkExpanded(false)
    setIsSaved(false)
    setAlimtalkVariables({
      오늘수업: '',
      학습포인트: '',
      선생님코멘트: '',
      원장님코멘트: '',
      숙제: '',
      복습팁: '',
    })
    setIsDialogOpen(true)
  }

  const handleScheduleChange = (scheduleId: string) => {
    setSelectedSchedule(scheduleId)
    const schedule = scheduledClasses.find((s) => s.id === scheduleId)

    if (schedule) {
      setSelectedScheduleData(schedule)
      setFormData((prev) => ({
        ...prev,
        lesson_time: schedule.lesson_time,
        class_name: schedule.class_name,
        class_id: schedule.class_id ?? schedule.id,
        subject: schedule.subject,
        teacher_name: schedule.teacher_name,
        teacher_id: schedule.teacher_id,
      }))

      // Initialize attendance with all students present
      setStudentAttendances(
        schedule.students.map((s) => ({
          student_id: s.id,
          student_name: s.name,
          status: 'present',
        }))
      )

      // Initialize homework submissions with all students submitted
      const initialSubmissions: Record<string, boolean> = {}
      schedule.students.forEach((s) => {
        initialSubmissions[s.id] = true
      })
      setHomeworkSubmissions(initialSubmissions)

      // 기본적으로 접혀있음
      setIsAttendanceExpanded(false)
      setAllPresent(true)
      setAllSubmitted(true)
    }
  }

  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setStudentAttendances((prev) =>
      prev.map((att) =>
        att.student_id === studentId ? { ...att, status } : att
      )
    )
    setAllPresent(false)
  }

  const handleAllPresentChange = (checked: boolean) => {
    setAllPresent(checked)
    if (checked) {
      setStudentAttendances((prev) =>
        prev.map((att) => ({ ...att, status: 'present' }))
      )
    }
  }

  const handleHomeworkSubmissionChange = (studentId: string, submitted: boolean) => {
    setHomeworkSubmissions((prev) => ({
      ...prev,
      [studentId]: submitted,
    }))
    setAllSubmitted(false)
  }

  const handleAllSubmittedChange = (checked: boolean) => {
    setAllSubmitted(checked)
    if (checked && selectedScheduleData) {
      const allSubmitted: Record<string, boolean> = {}
      selectedScheduleData.students.forEach((s) => {
        allSubmitted[s.id] = true
      })
      setHomeworkSubmissions(allSubmitted)
    }
  }

  const handleEditLesson = (lesson: LessonNote) => {
    setIsEditing(true)
    setSelectedLesson(lesson)
    setFormData(lesson)
    setIsAttendanceExpanded(false)
    setIsDialogOpen(true)
  }

  const handleSendNotification = async () => {
    // 저장되지 않은 수업일지인 경우 먼저 저장
    if (!isEditing || !selectedLesson) {
      toast({
        title: '수업일지 저장 필요',
        description: '수업일지를 먼저 저장한 후 알림톡을 보내주세요.',
        variant: 'destructive',
      })
      return
    }

    // 이미 발송된 경우 중복 발송 방지
    // @ts-ignore
    if (selectedLesson.notification_sent) {
      toast({
        title: '이미 발송됨',
        description: '이 수업일지는 이미 알림톡이 발송되었습니다.',
        variant: 'destructive',
      })
      return
    }

    // 중복 클릭 방지
    if (isSendingNotification) {
      return
    }

    setIsSendingNotification(true)
    try {
      // Workers API를 통해 알림톡 발송 (텔레그램 포함)
      const apiUrl = process.env.NEXT_PUBLIC_WORKERS_API_URL || 'https://goldpen-api.hello-51f.workers.dev'

      const notificationResponse = await fetch(`${apiUrl}/api/lessons/${selectedLesson.id}/notify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: selectedLesson.id,
          class_name: selectedLesson.class_name || formData.class_name,
          lesson_date: selectedLesson.lesson_date || formData.lesson_date,
          content: formData.content || selectedLesson.content,
          homework_assigned: formData.homework_assigned || selectedLesson.homework_assigned,
          final_message: formData.final_message,
          // PPURIO 알림톡 템플릿 변수 전달
          templateVariables: alimtalkVariables,
        }),
      })

      interface NotifyResponse {
        success?: boolean
        error?: string
        telegram_sent?: boolean
      }
      const notifyResult = await notificationResponse.json() as NotifyResponse

      if (!notificationResponse.ok) {
        throw new Error(notifyResult.error || '알림톡 발송 실패')
      }

      // 발송 완료 상태로 업데이트
      const updateRes = await fetch(`/api/lessons/${selectedLesson.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notification_sent: true,
          notification_sent_at: new Date().toISOString(),
        }),
      })

      if (updateRes.ok) {
        setLessons((prev) =>
          prev.map((l) =>
            l.id === selectedLesson.id
              ? { ...l, notification_sent: true, notification_sent_at: new Date().toISOString() }
              : l
          )
        )
      }

      toast({
        title: '알림톡 전송 완료',
        description: notifyResult.telegram_sent
          ? '학부모님께 알림톡이 발송되었습니다. (텔레그램 모니터링 전송됨)'
          : '학부모님께 알림톡이 발송되었습니다.',
      })
      setIsDialogOpen(false)
    } catch (error: any) {
      console.error('[알림톡 발송 오류]', error)
      toast({
        title: '전송 실패',
        description: error?.message || '알림톡 발송 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSendingNotification(false)
    }
  }

  const handleUpdateFeedback = async () => {
    if (isEditing && selectedLesson) {
      try {
        setIsLoading(true)

        // API 호출하여 DB에 저장
        const response = await fetch(`/api/lessons/${selectedLesson.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            parent_feedback: formData.parent_feedback,
            director_feedback: formData.director_feedback,
            final_message: formData.final_message,
          }),
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({})) as { error?: string }
          throw new Error(err.error || '피드백 저장에 실패했습니다.')
        }

        // 로컬 상태 업데이트
        const updatedLessons = lessons.map((lesson) =>
          lesson.id === selectedLesson.id
            ? {
                ...lesson,
                parent_feedback: formData.parent_feedback,
                director_feedback: formData.director_feedback,
                final_message: formData.final_message,
                updated_at: new Date().toISOString()
              }
            : lesson
        )
        setLessons(updatedLessons)

        toast({
          title: '피드백 저장 완료',
          description: '피드백이 성공적으로 저장되었습니다.',
        })
        setIsDialogOpen(false)
      } catch (error: any) {
        toast({
          title: '오류 발생',
          description: error.message || '피드백 저장 중 오류가 발생했습니다.',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleGenerateFeedback = async () => {
    if (!formData.content) {
      toast({
        title: '학습 내용 필요',
        description: '피드백 생성을 위해 학습 내용을 먼저 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setIsGeneratingFeedback(true)
    try {
      // Workers API URL (production)
      const apiUrl = process.env.NEXT_PUBLIC_WORKERS_API_URL || 'https://goldpen-api.hello-51f.workers.dev'
      const response = await fetch(`${apiUrl}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'feedback',
          lesson: {
            class_name: formData.class_name,
            date: formData.lesson_date,
            content: formData.content,
            topic: formData.subject,
            homework: formData.homework_assigned,
            notes: formData.student_attitudes,
          },
        }),
      })

      interface AIResponse {
        success?: boolean
        text?: string
        error?: string
      }
      const result = await response.json() as AIResponse

      if (response.ok && result.success && result.text) {
        setFormData((prev) => ({ ...prev, parent_feedback: result.text }))
        toast({
          title: 'AI 피드백 생성 완료',
          description: '생성된 피드백을 확인하고 필요시 수정 후 저장해주세요.',
        })
      } else {
        throw new Error(result.error || 'AI 응답 오류')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      toast({
        title: 'AI 피드백 생성 실패',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingFeedback(false)
    }
  }

  // 원장님 피드백 AI 생성
  const handleGenerateDirectorFeedback = async () => {
    if (!formData.content) {
      toast({
        title: '학습 내용 필요',
        description: '피드백 생성을 위해 학습 내용을 먼저 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setIsGeneratingDirectorFeedback(true)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_WORKERS_API_URL || 'https://goldpen-api.hello-51f.workers.dev'
      const response = await fetch(`${apiUrl}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'director_feedback',
          lesson: {
            class_name: formData.class_name,
            date: formData.lesson_date,
            content: formData.content,
            topic: formData.subject,
            homework: formData.homework_assigned,
            notes: formData.student_attitudes,
            // 선생님 피드백을 참고하여 원장님 피드백 생성
            teacher_feedback: formData.parent_feedback,
          },
        }),
      })

      interface AIResponse {
        success?: boolean
        text?: string
        error?: string
      }
      const result = await response.json() as AIResponse

      if (response.ok && result.success && result.text) {
        setFormData((prev) => ({ ...prev, director_feedback: result.text }))
        toast({
          title: 'AI 원장님 피드백 생성 완료',
          description: '생성된 피드백을 확인하고 필요시 수정 후 저장해주세요.',
        })
      } else {
        throw new Error(result.error || 'AI 응답 오류')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      toast({
        title: 'AI 원장님 피드백 생성 실패',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingDirectorFeedback(false)
    }
  }

  const handleGenerateFinalMessage = async () => {
    if (!formData.content) {
      toast({
        title: '학습 내용 필요',
        description: '안내 메시지 생성을 위해 학습 내용을 먼저 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setIsGeneratingFinalMessage(true)
    try {
      // Workers API URL (production)
      const apiUrl = process.env.NEXT_PUBLIC_WORKERS_API_URL || 'https://goldpen-api.hello-51f.workers.dev'
      const response = await fetch(`${apiUrl}/api/ai/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'alimtalk_variables',  // 뿌리오용 변수 생성
          lesson: {
            org_name: organizationName,
            class_name: formData.class_name,
            date: formData.lesson_date,
            content: formData.content,
            topic: formData.subject,
            homework: formData.homework_assigned,
            notes: formData.student_attitudes,
            teacher_feedback: formData.parent_feedback,
            director_feedback: formData.director_feedback,
          },
        }),
      })

      interface AIResponse {
        success?: boolean
        variables?: AlimtalkVariables
        error?: string
      }
      const result = await response.json() as AIResponse

      if (response.ok && result.success && result.variables) {
        setAlimtalkVariables(result.variables)
        toast({
          title: 'AI 알림톡 변수 생성 완료',
          description: '각 항목을 확인하고 필요시 수정해주세요. (50자 제한)',
        })
      } else {
        throw new Error(result.error || 'AI 응답 오류')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '알 수 없는 오류'
      toast({
        title: 'AI 메시지 생성 실패',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingFinalMessage(false)
    }
  }

  const handleDeleteLesson = async () => {
    if (!selectedLesson) return
    const confirmed = confirm('수업일지를 삭제하시겠습니까?')
    if (!confirmed) return
    try {
      setIsLoading(true)
      const res = await fetch(`/api/lessons/${selectedLesson.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error || '삭제에 실패했습니다.')
      }
      setLessons((prev) => prev.filter((l) => l.id !== selectedLesson.id))
      toast({ title: '삭제 완료', description: '수업일지가 삭제되었습니다.' })
      setIsDialogOpen(false)
      setSelectedLesson(null)
    } catch (error: any) {
      toast({
        title: '오류 발생',
        description: error.message || '삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveLesson = async () => {
    if (!formData.class_name || !formData.content || !formData.student_attitudes) {
      toast({
        title: '필수 정보 누락',
        description: '반 이름, 학습 내용, 학생 태도는 필수입니다.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsLoading(true)
      const response = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: formData.class_id,
          class_name: formData.class_name,
          subject: formData.subject,
          teacher_id: formData.teacher_id,
          teacher_name: formData.teacher_name,
          lesson_time: formData.lesson_time,
          title: formData.content?.slice(0, 40) || formData.class_name || '수업일지',
          content: formData.content,
          lesson_date: formData.lesson_date,
          homework_assigned: formData.homework_assigned,
          homework_submissions: Object.entries(homeworkSubmissions).map(([student_id, submitted]) => ({
            student_id,
            submitted,
          })),
          comprehension_level: formData.comprehension_level || 'medium',
          student_attitudes: formData.student_attitudes,
          parent_feedback: formData.parent_feedback,
          director_feedback: formData.director_feedback,
          final_message: formData.final_message,
          next_lesson_plan: formData.next_lesson_plan,
          status: 'completed',
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(err.error || '수업일지 저장에 실패했습니다.')
      }

      const data = await response.json() as { lesson: LessonNote }
      setLessons((prev) => [data.lesson, ...prev])

      // 과제명과 마감일이 모두 있으면 과제 자동 생성
      if (formData.homework_assigned && formData.homework_due_date && formData.class_id) {
        try {
          const homeworkResponse = await fetch('/api/homework', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              class_id: formData.class_id,
              title: formData.homework_assigned,
              due_date: formData.homework_due_date,
            }),
          })

          if (homeworkResponse.ok) {
            toast({
              title: '수업일지 작성 완료',
              description: '수업일지와 과제가 성공적으로 저장되었습니다.',
            })
          } else {
            toast({
              title: '수업일지 작성 완료',
              description: '수업일지는 저장되었지만 과제 생성에 실패했습니다.',
              variant: 'destructive',
            })
          }
        } catch {
          toast({
            title: '수업일지 작성 완료',
            description: '수업일지는 저장되었지만 과제 생성에 실패했습니다.',
            variant: 'destructive',
          })
        }
      } else {
        toast({
          title: '수업일지 작성 완료',
          description: '수업일지가 성공적으로 저장되었습니다.',
        })
      }

      // 저장됨 상태로 변경하고 모달 유지
      setIsSaved(true)
      setSelectedLesson(data.lesson)
      setIsEditing(true)
    } catch (error: any) {
      toast({
        title: '오류 발생',
        description: error.message || '수업일지 저장 중 문제가 발생했습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Filter lessons by class
  const filteredLessons = selectedClass === 'all'
    ? lessons
    : lessons.filter((lesson) => lesson.class_id === selectedClass)

  const filteredTodayLessons = todayLessonsList
    .filter((lesson) => selectedClass === 'all' || lesson.class_id === selectedClass)
    .filter((lesson) => selectedTeacher === 'all' || lesson.teacher_name === selectedTeacher)

  // Columns for today's lessons
  const todayColumns: ColumnDef<LessonNote>[] = [
    {
      accessorKey: 'lesson_time',
      header: '시간',
      cell: ({ row }) => {
        const lesson = row.original
        return (
          <button
            onClick={() => handleEditLesson(lesson)}
            className="flex items-center gap-2 hover:text-primary transition-colors text-left w-full"
          >
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div className="font-medium">{row.getValue('lesson_time')}</div>
          </button>
        )
      },
    },
    {
      accessorKey: 'teacher_name',
      header: '선생님',
      cell: ({ row }) => {
        const lesson = row.original
        return (
          <button
            onClick={() => handleEditLesson(lesson)}
            className="hover:text-primary transition-colors text-left w-full"
          >
            {row.getValue('teacher_name')}
          </button>
        )
      },
    },
    {
      accessorKey: 'class_name',
      header: '반 이름',
      cell: ({ row }) => {
        const lesson = row.original
        return (
          <button
            onClick={() => handleEditLesson(lesson)}
            className="flex items-center gap-2 hover:text-primary transition-colors text-left w-full"
          >
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <span>{row.getValue('class_name')}</span>
          </button>
        )
      },
    },
    {
      accessorKey: 'subject',
      header: '과목',
      cell: ({ row }) => {
        const lesson = row.original
        return (
          <button
            onClick={() => handleEditLesson(lesson)}
            className="hover:text-primary transition-colors text-left w-full"
          >
            {row.getValue('subject')}
          </button>
        )
      },
    },
    {
      accessorKey: 'content',
      header: '학습 내용',
      cell: ({ row }) => {
        const content = row.getValue('content') as string
        const lesson = row.original
        return (
          <button
            onClick={() => handleEditLesson(lesson)}
            className="max-w-md truncate block hover:text-primary transition-colors text-left w-full"
          >
            {content}
          </button>
        )
      },
    },
    {
      accessorKey: 'comprehension_level',
      header: '이해도',
      cell: ({ row }) => {
        const level = row.getValue('comprehension_level') as keyof typeof comprehensionMap
        const { label, variant } = comprehensionMap[level]
        const lesson = row.original
        return (
          <button onClick={() => handleEditLesson(lesson)} className="w-full text-left">
            <Badge variant={variant}>{label}</Badge>
          </button>
        )
      },
    },
    {
      id: 'notification_sent',
      header: '알림톡',
      cell: ({ row }) => {
        const lesson = row.original
        // @ts-ignore - notification_sent는 타입에 없지만 런타임에서 처리
        const isSent = lesson.notification_sent
        const lesson_obj = row.original
        return (
          <button onClick={() => handleEditLesson(lesson_obj)} className="w-full text-center">
            {isSent ? (
              <Badge className="bg-blue-600 text-white hover:bg-blue-700">발송완료</Badge>
            ) : (
              <Badge variant="outline" className="text-gray-500">미발송</Badge>
            )}
          </button>
        )
      },
    },
    {
      id: 'actions',
      header: '작업',
      cell: ({ row }) => {
        const lesson = row.original
        return (
          <Button variant="ghost" size="sm" onClick={() => handleEditLesson(lesson)}>
            <Edit className="h-4 w-4" />
          </Button>
        )
      },
    },
  ]

  // Columns for lesson history
  const historyColumns: ColumnDef<LessonNote>[] = [
    {
      accessorKey: 'lesson_date',
      header: '날짜',
      cell: ({ row }) => {
        const date = new Date(row.getValue('lesson_date'))
        return (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(date, 'yyyy-MM-dd (EEE)', { locale: ko })}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'lesson_time',
      header: '시간',
    },
    {
      accessorKey: 'class_name',
      header: '반 이름',
    },
    {
      accessorKey: 'subject',
      header: '과목',
    },
    {
      accessorKey: 'content',
      header: '학습 내용',
      cell: ({ row }) => {
        const content = row.getValue('content') as string
        return <span className="max-w-xs truncate block">{content}</span>
      },
    },
    {
      accessorKey: 'comprehension_level',
      header: '이해도',
      cell: ({ row }) => {
        const level = row.getValue('comprehension_level') as keyof typeof comprehensionMap
        const { label, variant } = comprehensionMap[level]
        return <Badge variant={variant}>{label}</Badge>
      },
    },
    {
      accessorKey: 'teacher_name',
      header: '강사',
    },
    {
      id: 'actions',
      header: '작업',
      cell: ({ row }) => {
        const lesson = row.original
        return (
          <Button variant="ghost" size="sm" onClick={() => handleEditLesson(lesson)}>
            <Edit className="h-4 w-4" />
          </Button>
        )
      },
    },
  ]

  // Statistics
  const totalLessons = lessons.length
  const thisMonthLessons = lessons.filter(
    (lesson) => new Date(lesson.lesson_date).getMonth() === 5
  ).length
  const highComprehension = lessons.filter((l) => l.comprehension_level === 'high').length
  const avgComprehension = Math.round((highComprehension / totalLessons) * 100)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">수업일지 관리</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            수업 내용을 기록하고 학생 피드백을 관리합니다
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-start w-full sm:w-auto">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="반 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 반</SelectItem>
              {filteredScheduledClasses.map((cls) => (
                <SelectItem key={cls.class_id ?? cls.id} value={cls.class_id ?? cls.id}>
                  {cls.class_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleCreateLesson} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            수업일지 작성
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 수업 수</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLessons}회</div>
            <p className="text-xs text-muted-foreground">전체 기록된 수업</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 수업</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthLessons}회</div>
            <p className="text-xs text-muted-foreground">6월 진행 수업</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">높은 이해도</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{highComprehension}회</div>
            <p className="text-xs text-muted-foreground">이해도 '상' 수업</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 이해도</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgComprehension}%</div>
            <p className="text-xs text-muted-foreground">전체 평균</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="today" className="space-y-4">
        <TabsList>
          <TabsTrigger value="today">오늘 수업</TabsTrigger>
          <TabsTrigger value="history">수업일지 기록</TabsTrigger>
          <TabsTrigger value="stats">통계</TabsTrigger>
        </TabsList>

        {/* Today's Lessons Tab */}
        <TabsContent value="today" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handlePreviousDay}
                      className="h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle>오늘의 수업 ({format(new Date(selectedDate), 'yyyy년 M월 d일', { locale: ko })})</CardTitle>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleNextDay}
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">선생님</span>
                    <div className="flex gap-1.5">
                      <Button
                        variant={selectedTeacher === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedTeacher('all')}
                        className="h-8"
                      >
                        전체
                      </Button>
                      {Array.from(new Set(todayLessonsList.map((lesson) => lesson.teacher_name)))
                        .filter(Boolean)
                        .sort()
                        .map((teacherName) => (
                          <Button
                            key={teacherName}
                            variant={selectedTeacher === teacherName ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTeacher(teacherName)}
                            className="h-8"
                          >
                            {teacherName}
                          </Button>
                        ))}
                    </div>
                  </div>
                  <CardDescription>
                    선택한 날짜에 진행된 수업에 대한 수업일지를 작성하세요
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable columns={todayColumns} data={filteredTodayLessons} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>수업일지 기록</CardTitle>
              <CardDescription>
                과거에 작성된 모든 수업일지를 조회합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable columns={historyColumns} data={filteredLessons} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4">
          <LessonsCharts
            monthlyProgressData={monthlyProgressData}
            comprehensionTrendData={comprehensionTrendData}
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? '수업일지 수정' : '수업일지 작성'}
            </DialogTitle>
            <DialogDescription>
              수업 내용과 학생 피드백을 입력하세요
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="scheduled_class">수업 선택</Label>
                <Select value={selectedSchedule} onValueChange={handleScheduleChange}>
                  <SelectTrigger id="scheduled_class">
                    <SelectValue placeholder="수업일지를 작성할 반을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredScheduledClasses.map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id}>
                        {schedule.class_name} - {schedule.teacher_name} ({schedule.subject || '과목 미지정'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedScheduleData && (
                  <p className="text-xs text-muted-foreground">
                    학생 {selectedScheduleData.students.length}명 · {selectedScheduleData.class_type} 수업
                  </p>
                )}
              </div>
            )}

            {isEditing && (
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">수업 날짜</p>
                    <p className="font-medium">{new Date(formData.lesson_date || '').toLocaleDateString('ko-KR')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">수업 시간</p>
                    <p className="font-medium">{formData.lesson_time}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">반 이름</p>
                    <p className="font-medium">{formData.class_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">과목</p>
                    <p className="font-medium">{formData.subject}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">담당 강사</p>
                  <p className="font-medium">{formData.teacher_name}</p>
                </div>
              </div>
            )}


            {studentAttendances.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>학생 출결 체크</Label>
                  <div className="flex items-center gap-3">
                    {selectedScheduleData?.class_type === '1:다수' && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="all-present"
                          checked={allPresent}
                          onCheckedChange={handleAllPresentChange}
                        />
                        <label
                          htmlFor="all-present"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          전원 정시 등원
                        </label>
                      </div>
                    )}
                    {selectedScheduleData?.class_type === '1:다수' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsAttendanceExpanded(!isAttendanceExpanded)}
                      >
                        {isAttendanceExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            접기
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            펼치기
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* 1:1 수업일 때 - 항상 표시 */}
                {selectedScheduleData?.class_type === '1:1' && (
                  <div className="border rounded-lg p-4 bg-muted/20">
                    {studentAttendances.map((attendance) => (
                      <div key={attendance.student_id} className="flex items-center justify-between gap-3">
                        <span className="font-medium min-w-[80px]">{attendance.student_name}</span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={attendance.status === 'present' ? 'default' : 'outline'}
                            onClick={() => handleAttendanceChange(attendance.student_id, 'present')}
                            className={attendance.status === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                            disabled={isEditing}
                          >
                            정시
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={attendance.status === 'late' ? 'default' : 'outline'}
                            onClick={() => handleAttendanceChange(attendance.student_id, 'late')}
                            className={attendance.status === 'late' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                            disabled={isEditing}
                          >
                            지각
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={attendance.status === 'absent' ? 'default' : 'outline'}
                            onClick={() => handleAttendanceChange(attendance.student_id, 'absent')}
                            className={attendance.status === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                            disabled={isEditing}
                          >
                            결석
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={attendance.status === 'excused' ? 'default' : 'outline'}
                            onClick={() => handleAttendanceChange(attendance.student_id, 'excused')}
                            className={attendance.status === 'excused' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                            disabled={isEditing}
                          >
                            인정결석
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 1:다수 수업일 때 - 접을 수 있음 */}
                {selectedScheduleData?.class_type === '1:다수' && isAttendanceExpanded && (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                    {studentAttendances.map((attendance) => (
                      <div key={attendance.student_id} className="flex items-center justify-between gap-3">
                        <span className="font-medium min-w-[80px]">{attendance.student_name}</span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={attendance.status === 'present' ? 'default' : 'outline'}
                            onClick={() => handleAttendanceChange(attendance.student_id, 'present')}
                            className={attendance.status === 'present' ? 'bg-green-600 hover:bg-green-700' : ''}
                            disabled={isEditing}
                          >
                            정시
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={attendance.status === 'late' ? 'default' : 'outline'}
                            onClick={() => handleAttendanceChange(attendance.student_id, 'late')}
                            className={attendance.status === 'late' ? 'bg-orange-600 hover:bg-orange-700' : ''}
                            disabled={isEditing}
                          >
                            지각
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={attendance.status === 'absent' ? 'default' : 'outline'}
                            onClick={() => handleAttendanceChange(attendance.student_id, 'absent')}
                            className={attendance.status === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''}
                            disabled={isEditing}
                          >
                            결석
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={attendance.status === 'excused' ? 'default' : 'outline'}
                            onClick={() => handleAttendanceChange(attendance.student_id, 'excused')}
                            className={attendance.status === 'excused' ? 'bg-blue-600 hover:bg-blue-700' : ''}
                            disabled={isEditing}
                          >
                            인정결석
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 과제 제출 확인 */}
            {studentAttendances.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>학생이 과제를 제출했나요?</Label>
                  <div className="flex items-center gap-3">
                    {selectedScheduleData?.class_type === '1:다수' && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="all-submitted"
                          checked={allSubmitted}
                          onCheckedChange={handleAllSubmittedChange}
                        />
                        <label
                          htmlFor="all-submitted"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          전체 제출
                        </label>
                      </div>
                    )}
                    {selectedScheduleData?.class_type === '1:다수' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsHomeworkExpanded(!isHomeworkExpanded)}
                        className="text-xs"
                      >
                        {isHomeworkExpanded ? (
                          <>
                            <ChevronUp className="h-4 w-4 mr-1" />
                            접기
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            펼치기
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {/* 1:1 수업일 때 - 항상 표시 */}
                {selectedScheduleData?.class_type === '1:1' && (
                  <div className="border rounded-lg p-4 bg-muted/20">
                    {studentAttendances.map((attendance) => (
                      <div key={attendance.student_id} className="flex items-center justify-between gap-3">
                        <span className="font-medium min-w-[80px]">{attendance.student_name}</span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={homeworkSubmissions[attendance.student_id] === true ? 'default' : 'outline'}
                            onClick={() => handleHomeworkSubmissionChange(attendance.student_id, true)}
                            className={homeworkSubmissions[attendance.student_id] === true ? 'bg-green-600 hover:bg-green-700' : ''}
                            disabled={isEditing}
                          >
                            네
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={homeworkSubmissions[attendance.student_id] === false ? 'default' : 'outline'}
                            onClick={() => handleHomeworkSubmissionChange(attendance.student_id, false)}
                            className={homeworkSubmissions[attendance.student_id] === false ? 'bg-red-600 hover:bg-red-700' : ''}
                            disabled={isEditing}
                          >
                            아니오
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* 1:다수 수업일 때 - 접을 수 있음 */}
                {selectedScheduleData?.class_type === '1:다수' && isHomeworkExpanded && (
                  <div className="border rounded-lg p-4 space-y-3 bg-muted/20">
                    {studentAttendances.map((attendance) => (
                      <div key={attendance.student_id} className="flex items-center justify-between gap-3">
                        <span className="font-medium min-w-[80px]">{attendance.student_name}</span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={homeworkSubmissions[attendance.student_id] === true ? 'default' : 'outline'}
                            onClick={() => handleHomeworkSubmissionChange(attendance.student_id, true)}
                            className={homeworkSubmissions[attendance.student_id] === true ? 'bg-green-600 hover:bg-green-700' : ''}
                            disabled={isEditing}
                          >
                            네
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={homeworkSubmissions[attendance.student_id] === false ? 'default' : 'outline'}
                            onClick={() => handleHomeworkSubmissionChange(attendance.student_id, false)}
                            className={homeworkSubmissions[attendance.student_id] === false ? 'bg-red-600 hover:bg-red-700' : ''}
                            disabled={isEditing}
                          >
                            아니오
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="content">학습 내용 *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="오늘 수업에서 다룬 내용을 상세히 입력하세요"
                rows={4}
                disabled={isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="student_attitudes">학생 태도 *</Label>
              <Textarea
                id="student_attitudes"
                value={formData.student_attitudes}
                onChange={(e) =>
                  setFormData({ ...formData, student_attitudes: e.target.value })
                }
                placeholder="학생들의 수업 참여도, 태도, 집중력 등을 입력하세요"
                rows={3}
                disabled={isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comprehension_level">이해도</Label>
              <Select
                value={formData.comprehension_level}
                onValueChange={(value: 'high' | 'medium' | 'low') =>
                  setFormData({ ...formData, comprehension_level: value })
                }
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">상 - 대부분의 학생이 이해함</SelectItem>
                  <SelectItem value="medium">중 - 보통 수준의 이해도</SelectItem>
                  <SelectItem value="low">하 - 추가 설명이 필요함</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="homework_assigned">과제 부여</Label>
              <div className="flex gap-2">
                <Textarea
                  id="homework_assigned"
                  value={formData.homework_assigned}
                  onChange={(e) =>
                    setFormData({ ...formData, homework_assigned: e.target.value })
                  }
                  placeholder="과제명을 적어주세요"
                  rows={2}
                  className="flex-1"
                />
                <div className="flex flex-col gap-1">
                  <Label htmlFor="homework_due_date" className="text-xs text-muted-foreground">마감일</Label>
                  <Input
                    id="homework_due_date"
                    type="date"
                    value={formData.homework_due_date || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, homework_due_date: e.target.value })
                    }
                    className="w-[140px]"
                  />
                </div>
              </div>
              {formData.homework_assigned && formData.homework_due_date && (
                <p className="text-xs text-muted-foreground">
                  과제가 자동으로 생성됩니다
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="next_lesson_plan">다음 수업 계획</Label>
              <Textarea
                id="next_lesson_plan"
                value={formData.next_lesson_plan}
                onChange={(e) =>
                  setFormData({ ...formData, next_lesson_plan: e.target.value })
                }
                placeholder="다음 수업에서 다룰 내용을 입력하세요"
                rows={2}
                disabled={isEditing}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="parent_feedback">선생님 피드백</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateFeedback}
                  disabled={isGeneratingFeedback}
                >
                  {isGeneratingFeedback ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  {isGeneratingFeedback ? 'AI 생성 중...' : 'AI 피드백 생성'}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                선생님이 작성한 부모님에게 보내는 피드백
              </p>
              <Textarea
                id="parent_feedback"
                value={formData.parent_feedback}
                onChange={(e) =>
                  setFormData({ ...formData, parent_feedback: e.target.value })
                }
                placeholder="부모님께 보낼 피드백을 입력하거나 AI로 생성하세요"
                rows={4}
              />
              <p className="text-xs text-muted-foreground">
                AI 버튼을 클릭하면 수업 내용을 바탕으로 부모님께 보낼 피드백 초안이 자동 생성됩니다
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="director_feedback">원장님 피드백</Label>
                <div className="flex items-center gap-2">
                  {userRole === 'owner' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGenerateDirectorFeedback}
                      disabled={isGeneratingDirectorFeedback}
                    >
                      {isGeneratingDirectorFeedback ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      {isGeneratingDirectorFeedback ? 'AI 생성 중...' : 'AI 피드백 생성'}
                    </Button>
                  )}
                  {userRole !== 'owner' && (
                    <Badge variant="secondary" className="text-xs">원장님만 작성 가능</Badge>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                원장님이 작성한 부모님에게 보내는 추가 피드백
              </p>
              <Textarea
                id="director_feedback"
                value={formData.director_feedback}
                onChange={(e) =>
                  setFormData({ ...formData, director_feedback: e.target.value })
                }
                placeholder={userRole === 'owner' ? "원장님의 추가 피드백을 입력하거나 AI로 생성하세요" : "원장님만 작성할 수 있습니다"}
                rows={4}
                disabled={userRole !== 'owner'}
              />
            </div>

            <div className="border-t pt-4 mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">알림톡 변수</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateFinalMessage}
                    disabled={isGeneratingFinalMessage}
                  >
                    {isGeneratingFinalMessage ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    {isGeneratingFinalMessage ? 'AI 생성 중...' : 'AI 변수 생성'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  각 항목은 최대 50자까지 입력 가능합니다. 초과 시 빨간색으로 표시됩니다.
                </p>

                {/* 알림톡 변수별 Input 필드 */}
                <div className="grid gap-3">
                  {(Object.keys(alimtalkVariables) as Array<keyof AlimtalkVariables>).map((key) => {
                    const value = alimtalkVariables[key]
                    const isOverLimit = value.length > MAX_VARIABLE_LENGTH
                    return (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor={`alimtalk-${key}`}
                            className={`text-sm ${isOverLimit ? 'text-red-600' : ''}`}
                          >
                            {ALIMTALK_VARIABLE_LABELS[key]}
                          </Label>
                          <span
                            className={`text-xs ${
                              isOverLimit
                                ? 'text-red-600 font-semibold'
                                : value.length > 40
                                ? 'text-orange-500'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {value.length}/{MAX_VARIABLE_LENGTH}자
                          </span>
                        </div>
                        <Input
                          id={`alimtalk-${key}`}
                          value={value}
                          onChange={(e) =>
                            setAlimtalkVariables((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          placeholder={`${ALIMTALK_VARIABLE_LABELS[key]} 입력 (최대 50자)`}
                          className={`${
                            isOverLimit
                              ? 'border-red-500 focus-visible:ring-red-500 bg-red-50'
                              : ''
                          }`}
                          maxLength={60} // 약간의 여유 (경고 표시용)
                        />
                        {isOverLimit && (
                          <p className="text-xs text-red-600">
                            {value.length - MAX_VARIABLE_LENGTH}자 초과! 50자 이하로 줄여주세요.
                          </p>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* 미리보기 */}
                <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                  <Label className="text-sm font-medium mb-2 block">미리보기</Label>
                  <div className="text-sm whitespace-pre-line font-mono text-muted-foreground">
                    {`[${organizationName}] 수업일지

#{학생명} 학부모님 안녕하세요.

📚 오늘 수업: ${alimtalkVariables.오늘수업 || '(미입력)'}
📝 학습 포인트: ${alimtalkVariables.학습포인트 || '(미입력)'}

💬 선생님: ${alimtalkVariables.선생님코멘트 || '(미입력)'}${alimtalkVariables.원장님코멘트 ? `
🏫 원장님: ${alimtalkVariables.원장님코멘트}` : ''}

✏️ 숙제: ${alimtalkVariables.숙제 || '(미입력)'}
💡 복습 팁: ${alimtalkVariables.복습팁 || '(미입력)'}

감사합니다.`}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  #{'{학생명}'}은 발송 시 각 학생 이름으로 자동 치환됩니다
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              닫기
            </Button>
            {isEditing ? (
              <>
                <Button variant="destructive" onClick={handleDeleteLesson}>
                  삭제
                </Button>
                <Button
                  variant="default"
                  onClick={handleUpdateFeedback}
                  className="bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all shadow-sm text-white"
                >
                  피드백 저장
                </Button>
                {(userRole === 'owner') && (
                  <Button
                    onClick={handleSendNotification}
                    disabled={isSendingNotification || (selectedLesson as any)?.notification_sent || hasOverLimitVariables}
                    variant={(selectedLesson as any)?.notification_sent ? "secondary" : hasOverLimitVariables ? "destructive" : "default"}
                    title={hasOverLimitVariables ? "50자를 초과한 항목이 있습니다" : undefined}
                  >
                    {isSendingNotification ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        발송 중...
                      </>
                    ) : (selectedLesson as any)?.notification_sent ? (
                      '발송완료'
                    ) : hasOverLimitVariables ? (
                      '50자 초과'
                    ) : (
                      '알림톡 보내기'
                    )}
                  </Button>
                )}
              </>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant={isSaved ? "secondary" : "outline"}
                  onClick={handleSaveLesson}
                  disabled={isSaved || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      저장 중...
                    </>
                  ) : isSaved ? (
                    '저장됨'
                  ) : (
                    '작성 완료'
                  )}
                </Button>
                {(userRole === 'owner') && (
                  <Button
                    onClick={handleSendNotification}
                    disabled={isSendingNotification || (selectedLesson as any)?.notification_sent || !isSaved || hasOverLimitVariables}
                    variant={(selectedLesson as any)?.notification_sent ? "secondary" : hasOverLimitVariables ? "destructive" : "default"}
                    title={hasOverLimitVariables ? "50자를 초과한 항목이 있습니다" : !isSaved ? "먼저 저장해주세요" : undefined}
                  >
                    {isSendingNotification ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        발송 중...
                      </>
                    ) : (selectedLesson as any)?.notification_sent ? (
                      '발송완료'
                    ) : hasOverLimitVariables ? (
                      '50자 초과'
                    ) : (
                      '알림톡 보내기'
                    )}
                  </Button>
                )}
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
