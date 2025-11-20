'use client'


/**
 * 수업일지 페이지 (Lessons/Class Journal) - 강사용
 *
 * TODO: 강사 계정 필터링 구현 필요
 * - 현재: 모든 수업일지 데이터 표시 (개발용)
 * - 향후: 로그인한 강사 본인의 수업일지만 필터링
 *   예: .eq('teacher_id', currentTeacherId)
 */

import { useState, useEffect, useMemo } from 'react'
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
import { Plus, Edit, BookOpen, TrendingUp, Sparkles, Calendar, Clock, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import type { LessonNote } from '@/lib/types/database'
import { Checkbox } from '@/components/ui/checkbox'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface StudentAttendance {
  student_id: string
  student_name: string
  status: 'present' | 'absent' | 'late' | 'excused'
}

interface ScheduledClass {
  id: string
  class_name: string
  lesson_time: string
  teacher_name: string
  class_type: '1:1' | '1:다수'
  students: { id: string; name: string }[]
}

// Mock scheduled classes for today
const mockScheduledClasses: ScheduledClass[] = [
  {
    id: 'schedule-1',
    class_name: '수학 특강반',
    lesson_time: '09:00',
    teacher_name: '김선생',
    class_type: '1:다수',
    students: [
      { id: '1', name: '김민준' },
      { id: '2', name: '이서연' },
      { id: '3', name: '박지우' },
      { id: '4', name: '최서준' },
      { id: '5', name: '정하은' },
    ],
  },
  {
    id: 'schedule-2',
    class_name: '영어 회화반',
    lesson_time: '11:00',
    teacher_name: '박선생',
    class_type: '1:다수',
    students: [
      { id: '6', name: '강민서' },
      { id: '7', name: '윤서준' },
      { id: '8', name: '조유진' },
    ],
  },
  {
    id: 'schedule-3',
    class_name: '국어 1:1 개인과외',
    lesson_time: '14:00',
    teacher_name: '이선생',
    class_type: '1:1',
    students: [{ id: '9', name: '신예은' }],
  },
  {
    id: 'schedule-4',
    class_name: '과학 특강반',
    lesson_time: '16:00',
    teacher_name: '최선생',
    class_type: '1:다수',
    students: [
      { id: '10', name: '한지호' },
      { id: '11', name: '임서현' },
      { id: '12', name: '송민재' },
      { id: '13', name: '오지안' },
    ],
  },
]

// Mock data
const mockLessons: LessonNote[] = [
  {
    id: '1',
    created_at: '2025-06-18T09:00:00',
    updated_at: '2025-06-18T11:00:00',
    org_id: 'org-1',
    lesson_date: '2025-06-18',
    lesson_time: '09:00',
    class_id: 'class-1',
    class_name: '수학 특강반',
    teacher_id: 'teacher-1',
    teacher_name: '김선생',
    subject: '수학',
    content: '미적분 기본 정리 - 극한의 개념과 연속성 학습. 함수의 극한값 계산 연습문제 풀이.',
    student_attitudes: '전반적으로 집중도가 높았으며, 질문도 활발하게 했습니다. 특히 김민준, 이서연 학생이 적극적이었습니다.',
    comprehension_level: 'high',
    homework_assigned: '교재 p.45-48 문제 풀이, 극한값 계산 연습문제 10개',
    next_lesson_plan: '함수의 미분과 도함수 개념 도입',
    parent_feedback: '오늘 수업에서 미적분의 기본 개념인 극한에 대해 학습했습니다. 학생들의 이해도가 높았으며, 특히 개념 이해를 위한 다양한 예제를 통해 실력이 향상되고 있습니다.',
  },
  {
    id: '2',
    created_at: '2025-06-18T13:00:00',
    updated_at: '2025-06-18T15:00:00',
    org_id: 'org-1',
    lesson_date: '2025-06-18',
    lesson_time: '13:00',
    class_id: 'class-2',
    class_name: '영어 회화반',
    teacher_id: 'teacher-2',
    teacher_name: '박선생',
    subject: '영어',
    content: 'Daily conversation - Ordering food at restaurant. Role-playing activities and pronunciation practice.',
    student_attitudes: '대부분의 학생들이 적극적으로 참여했으나, 몇몇 학생들은 발음에 어려움을 겪었습니다.',
    comprehension_level: 'medium',
    homework_assigned: '오늘 배운 표현으로 짧은 대화문 작성하기, 발음 연습 녹음 제출',
    next_lesson_plan: 'Telephone conversation practice',
    parent_feedback: '레스토랑에서 음식 주문하기를 주제로 실용적인 회화 연습을 진행했습니다. 학생들이 적극적으로 참여했으며, 발음 교정을 통해 실력이 향상되고 있습니다.',
  },
  {
    id: '3',
    created_at: '2025-06-17T10:00:00',
    updated_at: '2025-06-17T12:00:00',
    org_id: 'org-1',
    lesson_date: '2025-06-17',
    lesson_time: '10:00',
    class_id: 'class-3',
    class_name: '국어 독해반',
    teacher_id: 'teacher-3',
    teacher_name: '이선생',
    subject: '국어',
    content: '현대 소설 분석 - 작품의 주제 의식과 인물 간 갈등 구조 파악. 문학적 표현 기법 학습.',
    student_attitudes: '학생들이 텍스트 분석에 어려움을 겪었으나, 토론을 통해 이해도가 높아졌습니다.',
    comprehension_level: 'low',
    homework_assigned: '작품 전체 읽고 주제 의식 정리하기, 인물 관계도 작성',
    next_lesson_plan: '시 문학의 이해 - 운율과 심상',
    parent_feedback: '현대 소설 작품 분석을 통해 문학적 사고력을 키우는 시간이었습니다. 처음에는 어려워했지만, 토론을 통해 이해도가 높아졌으며, 개별 지도를 통해 실력 향상을 도모하고 있습니다.',
  },
  {
    id: '4',
    created_at: '2025-06-17T14:00:00',
    updated_at: '2025-06-17T16:00:00',
    org_id: 'org-1',
    lesson_date: '2025-06-17',
    lesson_time: '14:00',
    class_id: 'class-1',
    class_name: '수학 특강반',
    teacher_id: 'teacher-1',
    teacher_name: '김선생',
    subject: '수학',
    content: '이차함수의 그래프 - 평행이동과 대칭이동, 최댓값과 최솟값 구하기',
    student_attitudes: '학생들이 그래프 그리기 실습에 집중했으며, 개념 이해가 빨랐습니다.',
    comprehension_level: 'high',
    homework_assigned: '이차함수 그래프 그리기 연습 10문제',
    next_lesson_plan: '이차방정식과 이차함수의 관계',
  },
  {
    id: '5',
    created_at: '2025-06-16T11:00:00',
    updated_at: '2025-06-16T13:00:00',
    org_id: 'org-1',
    lesson_date: '2025-06-16',
    lesson_time: '11:00',
    class_id: 'class-2',
    class_name: '영어 회화반',
    teacher_id: 'teacher-2',
    teacher_name: '박선생',
    subject: '영어',
    content: 'Grammar focus - Present perfect tense usage and practice',
    student_attitudes: '문법 개념 이해는 좋았으나 실제 문장 만들기에서 실수가 많았습니다.',
    comprehension_level: 'medium',
    homework_assigned: 'Present perfect tense 문장 20개 작성',
    next_lesson_plan: 'Present perfect vs Simple past comparison',
  },
]

// Today's lessons (filtering for selected date)
const initialDate = '2025-06-18'

// Mock statistics data
const monthlyProgressData = [
  { month: '1월', lessons: 18, planned: 20 },
  { month: '2월', lessons: 19, planned: 20 },
  { month: '3월', lessons: 20, planned: 20 },
  { month: '4월', lessons: 17, planned: 20 },
  { month: '5월', lessons: 19, planned: 20 },
  { month: '6월', lessons: 12, planned: 20 },
]

const comprehensionTrendData = [
  { week: '1주차', high: 65, medium: 25, low: 10 },
  { week: '2주차', high: 70, medium: 20, low: 10 },
  { week: '3주차', high: 68, medium: 22, low: 10 },
  { week: '4주차', high: 75, medium: 20, low: 5 },
]

const comprehensionMap = {
  high: { label: '상', variant: 'default' as const, color: 'text-green-600' },
  medium: { label: '중', variant: 'secondary' as const, color: 'text-yellow-600' },
  low: { label: '하', variant: 'outline' as const, color: 'text-red-600' },
}

export default function LessonsPage() {
  usePageAccess('lessons')

  const { toast } = useToast()
  const [lessons, setLessons] = useState<LessonNote[]>(mockLessons)
  const [selectedDate, setSelectedDate] = useState<string>(initialDate)
  const [selectedLesson, setSelectedLesson] = useState<LessonNote | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [isGeneratingFeedback, setIsGeneratingFeedback] = useState(false)
  const [isGeneratingFinalMessage, setIsGeneratingFinalMessage] = useState(false)
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

  // 실제 사용자 권한 및 정보 가져오기
  const [userRole, setUserRole] = useState<string>('teacher')
  const [currentTeacherId, setCurrentTeacherId] = useState<string>('')

  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'teacher'
    const teacherId = localStorage.getItem('teacherId') || ''
    setUserRole(role)
    setCurrentTeacherId(teacherId)
  }, [])

  // Calculate today's lessons based on selected date
  const todayLessonsList = lessons.filter((lesson) => lesson.lesson_date === selectedDate)

  // Filter scheduled classes based on user role
  // 강사 계정일 경우: 해당 강사의 스케줄만 표시
  // 원장/관리자 계정일 경우: 모든 스케줄 표시
  const filteredScheduledClasses = useMemo(() => {
    if (userRole === 'teacher' && currentTeacherId) {
      return mockScheduledClasses.filter(schedule => schedule.teacher_id === currentTeacherId)
    }
    return mockScheduledClasses
  }, [userRole, currentTeacherId])

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
      next_lesson_plan: '',
      parent_feedback: '',
    })
    setStudentAttendances([])
    setIsAttendanceExpanded(false)
    setAllPresent(true)
    setHomeworkSubmissions({})
    setAllSubmitted(true)
    setIsHomeworkExpanded(false)
    setIsDialogOpen(true)
  }

  const handleScheduleChange = (scheduleId: string) => {
    setSelectedSchedule(scheduleId)
    const schedule = mockScheduledClasses.find((s) => s.id === scheduleId)

    if (schedule) {
      setSelectedScheduleData(schedule)
      setFormData((prev) => ({
        ...prev,
        lesson_time: schedule.lesson_time,
        class_name: schedule.class_name,
        class_id: schedule.id,
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

  const handleSendNotification = () => {
    if (isEditing && selectedLesson) {
      // Update notification sent status
      const updatedLessons = lessons.map((lesson) =>
        lesson.id === selectedLesson.id
          ? {
              ...lesson,
              // @ts-ignore - notification_sent는 타입에 없지만 런타임에서 처리
              notification_sent: true,
              notification_sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          : lesson
      )
      setLessons(updatedLessons)
    }

    // TODO: 실제 알림톡 전송 API 호출
    toast({
      title: '알림톡 전송 완료',
      description: '학부모님께 수업일지 알림톡이 전송되었습니다.',
    })
    setIsDialogOpen(false)
  }

  const handleUpdateFeedback = () => {
    if (isEditing && selectedLesson) {
      // Update only feedback fields
      const updatedLessons = lessons.map((lesson) =>
        lesson.id === selectedLesson.id
          ? {
              ...lesson,
              parent_feedback: formData.parent_feedback,
              // @ts-ignore - director_feedback는 타입에 없지만 런타임에서 처리
              director_feedback: formData.director_feedback,
              updated_at: new Date().toISOString()
            }
          : lesson
      )
      setLessons(updatedLessons)

      toast({
        title: '피드백 수정 완료',
        description: '피드백이 성공적으로 수정되었습니다.',
      })
    }
    setIsDialogOpen(false)
  }

  const handleGenerateFeedback = () => {
    setIsGeneratingFeedback(true)

    // Mock GPT feedback generation
    setTimeout(() => {
      const mockFeedback = `오늘 ${formData.subject} 수업에서 ${formData.content?.substring(0, 30)}... 내용을 학습했습니다. 학생들의 이해도는 ${comprehensionMap[formData.comprehension_level as keyof typeof comprehensionMap].label} 수준이며, ${formData.student_attitudes} 다음 시간에는 ${formData.next_lesson_plan}를 진행할 예정입니다.`

      setFormData((prev) => ({
        ...prev,
        parent_feedback: mockFeedback,
      }))

      setIsGeneratingFeedback(false)

      toast({
        title: 'AI 피드백 생성 완료',
        description: '부모님께 보낼 피드백이 생성되었습니다.',
      })
    }, 1500)
  }

  const handleGenerateFinalMessage = () => {
    setIsGeneratingFinalMessage(true)

    // Mock GPT final message generation
    setTimeout(() => {
      let finalMessage = `[${formData.class_name}] 수업일지\n\n`
      finalMessage += `📅 ${new Date(formData.lesson_date || '').toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} ${formData.lesson_time}\n\n`

      if (formData.content) {
        finalMessage += `📚 학습 내용\n${formData.content}\n\n`
      }

      if (formData.parent_feedback) {
        finalMessage += `👨‍🏫 선생님 피드백\n${formData.parent_feedback}\n\n`
      }

      if (formData.director_feedback) {
        finalMessage += `👔 원장님 한마디\n${formData.director_feedback}\n\n`
      }

      if (formData.homework_assigned) {
        finalMessage += `📝 과제\n${formData.homework_assigned}\n\n`
      }

      if (formData.next_lesson_plan) {
        finalMessage += `📌 다음 수업 예고\n${formData.next_lesson_plan}\n`
      }

      setFormData((prev) => ({
        ...prev,
        final_message: finalMessage,
      }))

      setIsGeneratingFinalMessage(false)

      toast({
        title: 'AI 알림톡 생성 완료',
        description: '최종 알림톡 내용이 생성되었습니다.',
      })
    }, 1500)
  }

  const handleSaveLesson = () => {
    if (!formData.class_name || !formData.content || !formData.student_attitudes) {
      toast({
        title: '필수 정보 누락',
        description: '반 이름, 학습 내용, 학생 태도는 필수입니다.',
        variant: 'destructive',
      })
      return
    }

    if (isEditing && selectedLesson) {
      // Update existing lesson
      const updatedLessons = lessons.map((lesson) =>
        lesson.id === selectedLesson.id
          ? { ...lesson, ...formData, updated_at: new Date().toISOString() }
          : lesson
      )
      setLessons(updatedLessons)

      toast({
        title: '수업일지 수정 완료',
        description: '수업일지가 성공적으로 수정되었습니다.',
      })
    } else {
      // Create new lesson
      const newLesson: LessonNote = {
        ...formData as LessonNote,
        id: `lesson-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        org_id: 'org-1',
        teacher_id: 'teacher-1',
        teacher_name: '김선생',
      }

      const updatedLessons = [newLesson, ...lessons]
      setLessons(updatedLessons)

      toast({
        title: '수업일지 작성 완료',
        description: '수업일지가 성공적으로 작성되었습니다.',
      })
    }

    setIsDialogOpen(false)
    setSelectedLesson(null)
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
              <SelectItem value="class-1">수학 특강반</SelectItem>
              <SelectItem value="class-2">영어 회화반</SelectItem>
              <SelectItem value="class-3">국어 독해반</SelectItem>
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
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>월별 수업 진행률</CardTitle>
                <CardDescription>계획 대비 실제 진행된 수업 수</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyProgressData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="planned" fill="#94a3b8" name="계획" />
                    <Bar dataKey="lessons" fill="#3b82f6" name="실제" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>주차별 이해도 트렌드</CardTitle>
                <CardDescription>학생들의 이해도 분포 변화</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={comprehensionTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="high" stroke="#22c55e" name="상" strokeWidth={2} />
                    <Line type="monotone" dataKey="medium" stroke="#eab308" name="중" strokeWidth={2} />
                    <Line type="monotone" dataKey="low" stroke="#ef4444" name="하" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
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
                <Label htmlFor="scheduled_class">오늘 수업 선택</Label>
                <Select value={selectedSchedule} onValueChange={handleScheduleChange}>
                  <SelectTrigger id="scheduled_class">
                    <SelectValue placeholder="스케줄에서 수업을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredScheduledClasses.map((schedule) => (
                      <SelectItem key={schedule.id} value={schedule.id}>
                        {schedule.lesson_time} - {schedule.class_name} ({schedule.class_type}) - {schedule.teacher_name}
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
              <Textarea
                id="homework_assigned"
                value={formData.homework_assigned}
                onChange={(e) =>
                  setFormData({ ...formData, homework_assigned: e.target.value })
                }
                placeholder="과제를 부여하세요! (작성 완료 시 학생들에게 자동으로 전송됩니다)"
                rows={2}
              />
            </div>

            {isEditing && formData.homework_assigned && (
              <div className="space-y-2">
                <Label>과제를 제출했나요?</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={formData.homework_submitted === true ? 'default' : 'outline'}
                    className={formData.homework_submitted === true ? 'bg-green-600 hover:bg-green-700' : ''}
                    onClick={() => setFormData({ ...formData, homework_submitted: true })}
                  >
                    Yes
                  </Button>
                  <Button
                    type="button"
                    variant={formData.homework_submitted === false ? 'default' : 'outline'}
                    className={formData.homework_submitted === false ? 'bg-red-600 hover:bg-red-700' : ''}
                    onClick={() => setFormData({ ...formData, homework_submitted: false })}
                  >
                    No
                  </Button>
                </div>
                {formData.homework_submitted !== undefined && (
                  <p className="text-xs text-muted-foreground">
                    {formData.homework_submitted ? '✓ 과제가 제출되었습니다' : '✗ 과제가 미제출되었습니다'}
                  </p>
                )}
              </div>
            )}

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
                {!isEditing && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateFeedback}
                    disabled={isGeneratingFeedback || !formData.content}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isGeneratingFeedback ? 'AI 생성 중...' : 'AI 피드백 생성'}
                  </Button>
                )}
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
              {!isEditing && (
                <p className="text-xs text-muted-foreground">
                  AI 버튼을 클릭하면 수업 내용을 바탕으로 부모님께 보낼 피드백 초안이 자동 생성됩니다
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="director_feedback">원장님 피드백</Label>
                {userRole !== 'director' && userRole !== 'admin' && (
                  <Badge variant="secondary" className="text-xs">원장님만 작성 가능</Badge>
                )}
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
                placeholder={userRole === 'director' || userRole === 'admin' ? "원장님의 추가 피드백을 입력하세요" : "원장님만 작성할 수 있습니다"}
                rows={4}
                disabled={userRole !== 'director' && userRole !== 'admin'}
              />
            </div>

            <div className="border-t pt-4 mt-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="final_message" className="text-base font-semibold">최종 부모님에게 가는 알림톡 내용</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateFinalMessage}
                    disabled={isGeneratingFinalMessage}
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {isGeneratingFinalMessage ? 'AI 생성 중...' : 'AI 알림톡 생성'}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mb-2">
                  위의 모든 내용을 종합하여 부모님께 전송될 최종 알림톡 메시지입니다
                </p>
                <Textarea
                  id="final_message"
                  value={formData.final_message}
                  onChange={(e) =>
                    setFormData({ ...formData, final_message: e.target.value })
                  }
                  placeholder="AI 알림톡 생성 버튼을 클릭하면 자동으로 알림톡 내용이 생성됩니다"
                  rows={8}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  생성된 내용을 수정한 후 '알림톡 보내기' 버튼을 클릭하여 전송할 수 있습니다
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
                <Button variant="secondary" onClick={handleUpdateFeedback}>
                  피드백 저장
                </Button>
                {(userRole === 'director' || userRole === 'admin') && (
                  <Button onClick={handleSendNotification}>
                    알림톡 보내기 (원장님만 가능)
                  </Button>
                )}
              </>
            ) : (
              <Button onClick={handleSaveLesson}>
                작성 완료
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
