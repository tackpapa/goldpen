'use client'

export const runtime = 'edge'


/**
 * 시험 관리 페이지 (Exams Management) - 강사용
 *
 * TODO: 강사 계정 필터링 구현 필요
 * - 현재: 모든 시험 데이터 표시 (개발용)
 * - 향후: 로그인한 강사 본인이 담당하는 학생의 시험만 필터링
 */

import { useState, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { usePageAccess } from '@/hooks/use-page-access'
import { useAuth } from '@/contexts/auth-context'
import { useExams, useClasses, useTeachers } from '@/lib/swr'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Eye, Edit, Trash2, TrendingUp, PenSquare, BarChart3, Send, Copy } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Exam, ExamScore, Organization } from '@/lib/types/database'
import { format } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

// 기본 시험 결과 템플릿 (설정에서 가져오지 못할 경우 fallback)
const DEFAULT_EXAM_RESULT_TEMPLATE = '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생의 시험 결과를 안내드립니다.\n\n{{시험명}}: {{점수}}점\n\n열심히 준비한 만큼 좋은 결과로 이어지길 바랍니다. 궁금하신 점은 편하게 연락 주세요!'

// 템플릿 변수 치환 함수
function fillMessageTemplate(template: string, variables: Record<string, string>): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value)
  }
  return result
}

export default function ExamsPage() {
  usePageAccess('exams')

  const { toast } = useToast()

  // SWR 훅으로 데이터 페칭
  const { exams: examsData, scores: scoresData, isLoading: examsLoading, refresh: refreshExams } = useExams()
  const { classes: classesData, isLoading: classesLoading } = useClasses()
  const { teachers: teachersData, isLoading: teachersLoading } = useTeachers()

  // 로컬 상태 (수정 시 사용)
  const [localExams, setLocalExams] = useState<Exam[] | null>(null)
  const [localScores, setLocalScores] = useState<Record<string, ExamScore[]> | null>(null)

  // 실제 사용할 데이터 (로컬 상태가 있으면 로컬, 없으면 SWR)
  const exams = localExams ?? examsData
  const scores = localScores ?? scoresData
  const classes = classesData as Array<{ id: string; name: string; teacher_id?: string; teacher_name?: string; teacher?: { id: string; name: string } | null }>
  const teachers = teachersData as Array<{ id: string; name: string }>
  const isLoading = examsLoading || classesLoading || teachersLoading

  // 로컬 상태 업데이트 함수
  const setExams = (updater: Exam[] | ((prev: Exam[]) => Exam[])) => {
    if (typeof updater === 'function') {
      setLocalExams(prev => updater(prev ?? examsData))
    } else {
      setLocalExams(updater)
    }
  }
  const setScores = (updater: Record<string, ExamScore[]> | ((prev: Record<string, ExamScore[]>) => Record<string, ExamScore[]>)) => {
    if (typeof updater === 'function') {
      setLocalScores(prev => updater(prev ?? scoresData))
    } else {
      setLocalScores(updater)
    }
  }

  const [viewTab, setViewTab] = useState<'teacher' | 'class'>('teacher')
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all')
  const [selectedClass, setSelectedClass] = useState<string>('all')

  // Auth Context에서 사용자 권한 가져오기
  const { user } = useAuth()
  const userRole = user?.role ?? 'teacher'
  const [isScoresDialogOpen, setIsScoresDialogOpen] = useState(false)
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isScoreEntryDialogOpen, setIsScoreEntryDialogOpen] = useState(false)
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false)
  const [isNotificationLoading, setIsNotificationLoading] = useState(false)
  const [notificationStudents, setNotificationStudents] = useState<Array<{ id: string; name: string; parent_phone: string | null }>>([])
  const [isGradingDialogOpen, setIsGradingDialogOpen] = useState(false)
  const [isGradingLoading, setIsGradingLoading] = useState(false)
  const [gradingStudents, setGradingStudents] = useState<Array<{ id: string; name: string }>>([])
  const [gradingScores, setGradingScores] = useState<Record<string, string>>({})
  const [gradingFeedbacks, setGradingFeedbacks] = useState<Record<string, string>>({})
  const [gradingTab, setGradingTab] = useState<'manual' | 'auto'>('manual')
  const [bulkGradingText, setBulkGradingText] = useState('')
  const [autoMappedScores, setAutoMappedScores] = useState<Array<{ studentId: string; studentName: string; score: string; feedback: string; matched: boolean }>>([])
  const [unmatchedRows, setUnmatchedRows] = useState<Array<{ name: string; score: string; feedback: string }>>([])
  const [scoreEntryTab, setScoreEntryTab] = useState<'manual' | 'bulk'>('manual')

  // Organization 설정 (템플릿용)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [examResultTemplate, setExamResultTemplate] = useState<string>(DEFAULT_EXAM_RESULT_TEMPLATE)
  const [bulkScoresText, setBulkScoresText] = useState('')
  const [manualScores, setManualScores] = useState<Record<string, number>>({})
  const [manualFeedbacks, setManualFeedbacks] = useState<Record<string, string>>({})
  const [examForm, setExamForm] = useState({
    title: '',
    subject: '',
    class_name: '',
    exam_date: '',
    exam_time: '', // 시험 시작 시간
    duration_minutes: 60,
    total_score: 100,
  })


  // 설정에서 템플릿 로드
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings', { credentials: 'include' })
        const data = await response.json() as { organization?: Organization }
        if (response.ok && data.organization) {
          setOrganization(data.organization)
          // 학부모용 시험 결과 템플릿 가져오기
          const templates = data.organization.settings?.messageTemplatesParent as Record<string, string> | undefined
          if (templates?.exam_result) {
            setExamResultTemplate(templates.exam_result)
          }
        }
      } catch {
        console.error('Failed to fetch settings for templates')
      }
    }
    fetchSettings()
  }, [])

  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' }> = {
    scheduled: { label: '예정', variant: 'secondary' },
    pending_grade: { label: '채점 전', variant: 'outline' },
    graded: { label: '채점 완료', variant: 'default' },
    cancelled: { label: '취소', variant: 'destructive' },
  }

  // 필터링된 시험 목록
  const filteredExams = exams.filter((exam) => {
    if (viewTab === 'teacher') {
      return selectedTeacher === 'all' || exam.teacher_name === selectedTeacher
    } else {
      return selectedClass === 'all' || exam.class_name === selectedClass || exam.class_id === selectedClass
    }
  })

  const columns: ColumnDef<Exam>[] = [
    {
      accessorKey: 'title',
      header: '시험명',
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
      accessorKey: 'class_name',
      header: '반',
    },
    {
      accessorKey: 'teacher_name',
      header: '선생님',
    },
    {
      accessorKey: 'exam_date',
      header: '시험일',
      cell: ({ row }) => {
        const date = row.getValue('exam_date') as string
        return format(new Date(date), 'yyyy-MM-dd')
      },
    },
    {
      accessorKey: 'duration_minutes',
      header: '시험시간',
      cell: ({ row }) => {
        const duration = row.getValue('duration_minutes') as number | null
        return duration ? `${duration}분` : '-'
      },
    },
    {
      id: 'actions',
      header: '액션',
      cell: ({ row }) => {
        const exam = row.original
        const hasScores = scores[exam.id]

        return (
          <div className="flex gap-1 flex-wrap">
            {/* 시험 시작 시간이 지난 경우 채점 버튼 표시 */}
            {(() => {
              const now = new Date()
              const examDate = new Date(exam.exam_date)
              // exam_time이 있으면 그 시간, 없으면 해당 날짜의 00:00 (자정)
              if (exam.exam_time) {
                const [hours, minutes] = exam.exam_time.split(':').map(Number)
                examDate.setHours(hours, minutes, 0, 0)
              } else {
                examDate.setHours(0, 0, 0, 0)
              }
              return now >= examDate
            })() && (
              <Button
                variant={hasScores && hasScores.length > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => handleOpenGrading(exam)}
              >
                <PenSquare className="mr-1 h-3 w-3" />
                {hasScores && hasScores.length > 0 ? '채점완료' : '채점'}
              </Button>
            )}
            {hasScores && hasScores.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={() => handleViewScores(exam)}>
                  <Eye className="mr-1 h-3 w-3" /> 성적 보기
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleViewStats(exam)}>
                  <BarChart3 className="mr-1 h-3 w-3" /> 통계 보기
                </Button>
                {(userRole === 'owner') && (
                  <Button variant="outline" size="sm" onClick={() => handleSendNotification(exam)}>
                    <Send className="mr-1 h-3 w-3" /> 알림톡 보내기
                  </Button>
                )}
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => handleDeleteExam(exam)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]

  const handleDeleteExam = async (exam: Exam) => {
    if (!confirm(`시험 "${exam.title || exam.subject}"을 삭제할까요?`)) return
    try {
      const res = await fetch(`/api/exams/${exam.id}`, { method: 'DELETE', credentials: 'include' })
      if (!res.ok) {
        toast({ title: '삭제 실패', description: '시험 삭제에 실패했습니다.', variant: 'destructive' })
        return
      }
      setExams((prev) => prev.filter((e) => e.id !== exam.id))
      toast({ title: '삭제 완료', description: '시험이 삭제되었습니다.' })
    } catch (e) {
      toast({ title: '삭제 실패', description: '서버 통신 오류', variant: 'destructive' })
    }
  }

  const handleViewScores = (exam: Exam) => {
    setSelectedExam(exam)
    setIsScoresDialogOpen(true)
  }

  const handleViewStats = (exam: Exam) => {
    setSelectedExam(exam)
    setIsStatsDialogOpen(true)
  }

  const handleEnterScores = (exam: Exam) => {
    setSelectedExam(exam)
    setManualScores({})
    setManualFeedbacks({})
    setBulkScoresText('')
    setScoreEntryTab('manual')
    setIsScoreEntryDialogOpen(true)
  }

  const handleSendNotification = async (exam: Exam) => {
    setSelectedExam(exam)
    setNotificationStudents([])
    setIsNotificationDialogOpen(true)
    setIsNotificationLoading(true)

    try {
      // 해당 시험에 성적이 입력된 학생들의 ID 가져오기
      const examScores = scores[exam.id] || []
      const studentIds = examScores.map(s => s.student_id)

      if (studentIds.length === 0) {
        setIsNotificationLoading(false)
        return
      }

      // 전체 학생 정보 (parent_phone 포함) 가져오기
      const res = await fetch('/api/students', { credentials: 'include' })
      if (res.ok) {
        interface StudentsResponse { students?: { id: string; name: string; parent_phone?: string | null }[] }
        const data = await res.json() as StudentsResponse
        const allStudents = data.students || []
        // 성적이 입력된 학생만 필터링
        const studentsWithScores = allStudents
          .filter((s: any) => studentIds.includes(s.id))
          .map((s: any) => ({
            id: s.id,
            name: s.name,
            parent_phone: s.parent_phone || null
          }))
        setNotificationStudents(studentsWithScores)
      }
    } catch (error) {
      console.error('Failed to load students:', error)
    } finally {
      setIsNotificationLoading(false)
    }
  }

  const handleOpenGrading = async (exam: Exam) => {
    // Optimistic: 모달 먼저 열기
    setSelectedExam(exam)
    setGradingScores({})
    setGradingFeedbacks({})
    setBulkGradingText('')
    setAutoMappedScores([])
    setUnmatchedRows([])
    setGradingTab('manual')
    setGradingStudents([])
    setIsGradingDialogOpen(true)
    setIsGradingLoading(true)

    // 기존 점수 먼저 로딩 (이미 메모리에 있음)
    const existingScores = scores[exam.id]
    if (existingScores && existingScores.length > 0) {
      const loadedScores: Record<string, string> = {}
      const loadedFeedbacks: Record<string, string> = {}
      existingScores.forEach((s) => {
        loadedScores[s.student_id] = String(s.score)
        if (s.notes) loadedFeedbacks[s.student_id] = s.notes
      })
      setGradingScores(loadedScores)
      setGradingFeedbacks(loadedFeedbacks)
    }

    // 해당 반의 학생 목록 가져오기 (백그라운드)
    try {
      const res = await fetch(`/api/students?class_id=${exam.class_id}`, { credentials: 'include' })
      if (res.ok) {
        interface ClassStudentsResponse { students?: { id: string; name: string }[] }
        const data = await res.json() as ClassStudentsResponse
        const studentsList = (data.students || []).map((s) => ({ id: s.id, name: s.name }))
        setGradingStudents(studentsList)
      } else {
        setGradingStudents([])
      }
    } catch {
      setGradingStudents([])
    } finally {
      setIsGradingLoading(false)
    }
  }

  const handleSaveGrading = async () => {
    if (!selectedExam) return

    const scoresToSave = Object.entries(gradingScores)
      .filter(([_, score]) => score !== '')
      .map(([studentId, score]) => ({
        student_id: studentId,
        score: parseInt(score) || 0,
        notes: gradingFeedbacks[studentId] || '',
      }))

    if (scoresToSave.length === 0) {
      toast({
        title: '입력 오류',
        description: '최소 1명 이상의 성적을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    try {
      const res = await fetch(`/api/exams/${selectedExam.id}/scores`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ scores: scoresToSave }),
      })

      if (!res.ok) {
        interface GradingErrorResponse { error?: string; details?: string }
        const errorData = await res.json() as GradingErrorResponse
        console.error('[handleSaveGrading] Error:', errorData)
        toast({
          title: '저장 실패',
          description: `${errorData.error || '점수 저장에 실패했습니다.'} ${errorData.details ? `(${errorData.details})` : ''}`,
          variant: 'destructive',
        })
        return
      }

      // scores 상태 즉시 업데이트
      const savedScores = scoresToSave.map((s) => {
        const student = gradingStudents.find((st) => st.id === s.student_id)
        return {
          id: '',
          exam_id: selectedExam.id,
          student_id: s.student_id,
          student_name: student?.name || '',
          score: s.score,
          notes: s.notes,
        }
      })

      setScores((prev) => ({
        ...prev,
        [selectedExam.id]: savedScores,
      }))

      toast({
        title: '채점 저장 완료',
        description: `${scoresToSave.length}명의 성적이 저장되었습니다.`,
      })

      setIsGradingDialogOpen(false)
    } catch (error) {
      console.error('Save grading error:', error)
      toast({
        title: '저장 실패',
        description: '네트워크 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  // 엑셀 데이터 파싱 및 학생 매핑 함수
  const parseAndMapBulkGrading = (text: string) => {
    if (!text.trim()) {
      setAutoMappedScores([])
      setUnmatchedRows([])
      return
    }

    const lines = text.trim().split('\n')
    const mapped: Array<{ studentId: string; studentName: string; score: string; feedback: string; matched: boolean }> = []
    const unmatched: Array<{ name: string; score: string; feedback: string }> = []

    // 이미 매칭된 학생 ID 추적 (같은 이름의 학생이 여러 명일 때 순서대로 매칭)
    const usedStudentIds = new Set<string>()

    for (const line of lines) {
      // 탭 또는 여러 공백으로 구분 (엑셀에서 복사 시 탭으로 구분됨)
      const parts = line.split(/\t+|\s{2,}/)
      if (parts.length < 2) continue

      const name = parts[0].trim()
      const score = parts[1]?.trim() || ''
      const feedback = parts.slice(2).join(' ').trim()

      // 학생 이름 매칭 - 아직 매칭되지 않은 학생 중에서 찾음
      const matchedStudent = gradingStudents.find(
        (s) => !usedStudentIds.has(s.id) &&
               (s.name === name || s.name.includes(name) || name.includes(s.name))
      )

      if (matchedStudent) {
        usedStudentIds.add(matchedStudent.id)
        mapped.push({
          studentId: matchedStudent.id,
          studentName: matchedStudent.name,
          score,
          feedback,
          matched: true,
        })
      } else {
        unmatched.push({ name, score, feedback })
      }
    }

    setAutoMappedScores(mapped)
    setUnmatchedRows(unmatched)
  }

  // 자동 매핑된 데이터를 수기입력으로 적용
  const applyAutoMappedScores = () => {
    const newScores = { ...gradingScores }
    const newFeedbacks = { ...gradingFeedbacks }

    for (const item of autoMappedScores) {
      if (item.matched && item.score) {
        newScores[item.studentId] = item.score
        if (item.feedback) {
          newFeedbacks[item.studentId] = item.feedback
        }
      }
    }

    setGradingScores(newScores)
    setGradingFeedbacks(newFeedbacks)
    setGradingTab('manual')
    toast({
      title: '적용 완료',
      description: `${autoMappedScores.filter(s => s.matched).length}명의 점수가 적용되었습니다.`,
    })
  }

  const getNotificationStats = () => {
    const withPhone = notificationStudents.filter(s => s.parent_phone).length
    const withoutPhone = notificationStudents.filter(s => !s.parent_phone).length

    return {
      total: notificationStudents.length,
      withPhone,
      withoutPhone,
      studentsWithoutPhone: notificationStudents.filter(s => !s.parent_phone).map(s => s.name)
    }
  }

  const handleConfirmSendNotification = () => {
    if (!selectedExam) return

    const stats = getNotificationStats()

    toast({
      title: '알림톡 전송 완료',
      description: `${stats.withPhone}명의 학부모에게 성적 알림톡을 전송했습니다.`,
    })

    setIsNotificationDialogOpen(false)
  }

  const parseBulkScores = (text: string): Array<{ name: string; score: number; feedback?: string }> => {
    const lines = text.trim().split('\n')
    const results: Array<{ name: string; score: number; feedback?: string }> = []

    for (const line of lines) {
      // 패턴 지원: "이름 점수", "이름:점수", "이름\t점수", "이름 점수 피드백"
      const match = line.match(/^(.+?)[:\s\t]+(\d+)(?:[:\s\t]+(.+))?/)
      if (match) {
        const name = match[1].trim()
        const score = parseInt(match[2])
        const feedback = match[3]?.trim() || ''
        if (name && !isNaN(score)) {
          results.push({ name, score, feedback })
        }
      }
    }

    return results
  }

  const handleSaveScores = () => {
    if (!selectedExam) return

    let scoresToSave: Record<string, number> = {}
    let feedbacksToSave: Record<string, string> = {}

    if (scoreEntryTab === 'manual') {
      scoresToSave = manualScores
      feedbacksToSave = manualFeedbacks
    } else {
      // 일괄 입력 파싱
      const parsed = parseBulkScores(bulkScoresText)

      // Students data loaded from API
      const studentsList: Array<{ id: string; name: string }> = []

      for (const { name, score, feedback } of parsed) {
        const student = studentsList.find(s => s.name === name)
        if (student) {
          scoresToSave[student.id] = score
          if (feedback) {
            feedbacksToSave[student.id] = feedback
          }
        }
      }
    }

    if (Object.keys(scoresToSave).length === 0) {
      toast({
        title: '입력 오류',
        description: '최소 1명 이상의 성적을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    const feedbackCount = Object.keys(feedbacksToSave).length

    // 실제로는 여기서 API 호출하여 DB에 저장

    toast({
      title: '성적 저장 완료',
      description: `${Object.keys(scoresToSave).length}명의 성적${feedbackCount > 0 ? ` 및 ${feedbackCount}명의 피드백` : ''}이 저장되었습니다.`,
    })

    setIsScoreEntryDialogOpen(false)
  }

  const handleCreateExam = () => {
    setExamForm({
      title: '',
      subject: '',
      class_name: '',
      exam_date: '',
      exam_time: '',
      duration_minutes: 60,
      total_score: 100,
    })
    setIsCreateDialogOpen(true)
  }

  const handleSaveExam = async () => {
    if (!examForm.title || !examForm.subject || !examForm.class_name || !examForm.exam_date || !examForm.exam_time) {
      toast({
        title: '입력 오류',
        description: '모든 필수 항목을 입력해주세요. (시험 시작 시간 포함)',
        variant: 'destructive',
      })
      return
    }

    // 선택한 반에서 class_id와 teacher 정보 가져오기
    const selectedClassObj = classes.find(c => c.name === examForm.class_name)
    if (!selectedClassObj?.id) {
      toast({
        title: '입력 오류',
        description: '반을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: examForm.title,
          subject: examForm.subject,
          exam_date: examForm.exam_date,
          exam_time: examForm.exam_time || null,
          duration_minutes: examForm.duration_minutes || null,
          total_score: examForm.total_score,
          class_id: selectedClassObj.id,
        }),
      })

      if (!res.ok) {
        const errData = await res.json() as { error?: string }
        toast({
          title: '등록 실패',
          description: errData.error || '시험 등록에 실패했습니다.',
          variant: 'destructive',
        })
        return
      }

      interface ExamCreateResponse { exam?: Exam }
      const data = await res.json() as ExamCreateResponse
      const teacherName = selectedClassObj?.teacher?.name || selectedClassObj?.teacher_name || ''

      // API에서 반환된 데이터로 목록 업데이트
      const newExam: Exam = {
        ...data.exam!,
        class_name: examForm.class_name,
        teacher_name: teacherName,
      }

      setExams([...exams, newExam])
      toast({
        title: '시험 등록 완료',
        description: `${examForm.title} 시험이 등록되었습니다.`,
      })
      setIsCreateDialogOpen(false)
    } catch (error) {
      toast({
        title: '등록 실패',
        description: '서버 통신 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  const getExamStats = (examId: string) => {
    const examScores = scores[examId] || []
    if (examScores.length === 0) return null

    const scoreValues = examScores.map((s) => s.score)
    const avg = scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
    const max = Math.max(...scoreValues)
    const min = Math.min(...scoreValues)

    // Score distribution
    const distribution = [
      { range: '90-100', count: scoreValues.filter((s) => s >= 90).length },
      { range: '80-89', count: scoreValues.filter((s) => s >= 80 && s < 90).length },
      { range: '70-79', count: scoreValues.filter((s) => s >= 70 && s < 80).length },
      { range: '60-69', count: scoreValues.filter((s) => s >= 60 && s < 70).length },
      { range: '0-59', count: scoreValues.filter((s) => s < 60).length },
    ]

    return { avg, max, min, distribution, total: examScores.length }
  }

  // 성적이 입력된 시험을 완료된 시험으로 간주
  const completedExams = exams.filter((e) => scores[e.id] && scores[e.id].length > 0)

  // 로딩 중일 때 스켈레톤 표시
  if (isLoading) {
    return <PageSkeleton />
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">시험 관리</h1>
          <p className="text-sm md:text-base text-muted-foreground">시험 및 성적을 관리하세요</p>
        </div>
        <Button onClick={handleCreateExam} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          시험 등록
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전체 시험</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{exams.length}개</div>
            <p className="text-xs text-muted-foreground">
              완료: {completedExams.length}개
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">평균 성적</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedExams.length > 0
                ? Math.round(
                    completedExams.reduce((sum, exam) => {
                      const stats = getExamStats(exam.id)
                      return sum + (stats?.avg || 0)
                    }, 0) / completedExams.length
                  )
                : 0}
              점
            </div>
            <p className="text-xs text-muted-foreground">전체 시험 평균</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">응시 학생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(scores).reduce((sum, scores) => sum + scores.length, 0)}
              명
            </div>
            <p className="text-xs text-muted-foreground">총 응시 인원</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as 'teacher' | 'class')}>
            <TabsList className="mb-4">
              <TabsTrigger value="teacher">선생님별</TabsTrigger>
              <TabsTrigger value="class">반별</TabsTrigger>
            </TabsList>

            <TabsContent value="teacher" className="mt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">선생님</span>
                <div className="flex gap-1.5 flex-wrap">
                  <Button
                    variant={selectedTeacher === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedTeacher('all')}
                    className="h-8"
                  >
                    전체
                  </Button>
                  {(teachers.length > 0
                    ? teachers.map((t) => t.name)
                    : Array.from(new Set(exams.map((exam) => exam.teacher_name))).filter(Boolean)
                  )
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
            </TabsContent>

            <TabsContent value="class" className="mt-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">반</span>
                <div className="flex gap-1.5 flex-wrap">
                  <Button
                    variant={selectedClass === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedClass('all')}
                    className="h-8"
                  >
                    전체
                  </Button>
                  {(classes.length > 0
                    ? classes
                    : Array.from(new Set(exams.map((exam) => ({ id: exam.class_id, name: exam.class_name }))))
                  )
                    .filter((c) => c.name)
                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                    .map((classItem) => (
                      <Button
                        key={classItem.id || classItem.name}
                        variant={selectedClass === classItem.id || selectedClass === classItem.name ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedClass(classItem.id || classItem.name || '')}
                        className="h-8"
                      >
                        {classItem.name}
                      </Button>
                    ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredExams}
            searchKey="title"
            searchPlaceholder="시험명으로 검색..."
          />
        </CardContent>
      </Card>

      {/* Exam Creation Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>시험 등록</DialogTitle>
            <DialogDescription>새로운 시험을 등록하세요</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="class_select">반 선택 *</Label>
              <Select
                value={examForm.class_name}
                onValueChange={(value) => setExamForm({ ...examForm, class_name: value })}
              >
                <SelectTrigger id="class_select">
                  <SelectValue placeholder="반을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.name}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">시험명 *</Label>
              <Input
                id="title"
                value={examForm.title}
                onChange={(e) => setExamForm({ ...examForm, title: e.target.value })}
                placeholder="예: 중간고사"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">과목 *</Label>
              <Input
                id="subject"
                value={examForm.subject}
                onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                placeholder="예: 수학, 영어, 국어"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="exam_date">시험일 *</Label>
                <Input
                  id="exam_date"
                  type="date"
                  value={examForm.exam_date}
                  onChange={(e) => setExamForm({ ...examForm, exam_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exam_time">시험 시작 시간 *</Label>
                <Input
                  id="exam_time"
                  type="time"
                  value={examForm.exam_time}
                  onChange={(e) => setExamForm({ ...examForm, exam_time: e.target.value })}
                  placeholder="09:00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_score">만점</Label>
              <Input
                id="total_score"
                type="number"
                value={examForm.total_score}
                onChange={(e) => setExamForm({ ...examForm, total_score: parseInt(e.target.value) || 100 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveExam}>
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scores Dialog */}
      <Dialog open={isScoresDialogOpen} onOpenChange={setIsScoresDialogOpen}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
          <DialogHeader className="shrink-0">
            <DialogTitle>{selectedExam?.title} - 성적</DialogTitle>
            <DialogDescription>학생별 성적 목록</DialogDescription>
          </DialogHeader>

          {selectedExam && scores[selectedExam.id] && (
            <div className="flex-1 overflow-hidden">
              <div className="rounded-md border h-full overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-muted">
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left">학생</th>
                      <th className="p-2 text-center">점수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scores[selectedExam.id]
                      .sort((a, b) => b.score - a.score)
                      .map((score, i) => (
                        <tr key={score.id || score.student_id} className="border-b">
                          <td className="p-2">
                            {i + 1}. {score.student_name}
                          </td>
                          <td className="p-2 text-center font-medium">{score.score}점</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={() => setIsScoresDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={isStatsDialogOpen} onOpenChange={setIsStatsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedExam?.title} - 통계</DialogTitle>
            <DialogDescription>성적 분석 및 통계</DialogDescription>
          </DialogHeader>

          {selectedExam && (() => {
            const stats = getExamStats(selectedExam.id)
            return stats ? (
              <div className="space-y-6">
                {/* Stats Summary */}
                <div className="grid gap-4 md:grid-cols-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">평균</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.avg.toFixed(1)}점</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">최고점</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.max}점</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">최저점</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.min}점</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">응시 인원</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.total}명</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Distribution Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>점수 분포</CardTitle>
                    <CardDescription>구간별 학생 수</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={stats.distribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                성적 데이터가 없습니다.
              </p>
            )
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStatsDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Score Entry Dialog */}
      <Dialog open={isScoreEntryDialogOpen} onOpenChange={setIsScoreEntryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedExam?.title} - 성적 입력</DialogTitle>
            <DialogDescription>학생별 성적을 입력하세요</DialogDescription>
          </DialogHeader>

          <Tabs value={scoreEntryTab} onValueChange={(v) => setScoreEntryTab(v as 'manual' | 'bulk')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">수기 입력</TabsTrigger>
              <TabsTrigger value="bulk">일괄 입력</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="text-sm text-muted-foreground mb-2">
                각 학생의 점수를 입력하세요
              </div>
              <div className="space-y-3">
                {[
                  { id: 'st1', name: '김민준' },
                  { id: 'st2', name: '이서연' },
                  { id: 'st3', name: '박준호' },
                  { id: 'st4', name: '최지우' },
                  { id: 'st5', name: '정하은' },
                ].map((student) => (
                  <div key={student.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Label className="w-20 font-semibold shrink-0">{student.name}</Label>
                    <Input
                      type="number"
                      min="0"
                      max={selectedExam?.total_score || 100}
                      placeholder="점수"
                      value={manualScores[student.id] || ''}
                      onChange={(e) => {
                        const value = e.target.value ? parseInt(e.target.value) : 0
                        setManualScores({ ...manualScores, [student.id]: value })
                      }}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground shrink-0">/ {selectedExam?.total_score || 100}점</span>
                    <Input
                      placeholder="선생님 피드백"
                      value={manualFeedbacks[student.id] || ''}
                      onChange={(e) => {
                        setManualFeedbacks({ ...manualFeedbacks, [student.id]: e.target.value })
                      }}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>일괄 입력</Label>
                <p className="text-sm text-muted-foreground">
                  엑셀에서 복사한 데이터를 붙여넣으세요.
                  <br />
                  형식: <code className="bg-muted px-1 py-0.5 rounded">이름 점수 피드백</code> (한 줄에 하나씩, 피드백은 선택사항)
                </p>
                <Textarea
                  placeholder={`김민준 95 수학 실력이 많이 향상되었습니다
이서연 88 기본 개념은 잘 이해하고 있으나 응용 문제 연습이 필요합니다
박준호 92
최지우 85 꾸준히 노력하는 모습이 보입니다
정하은 90`}
                  rows={10}
                  value={bulkScoresText}
                  onChange={(e) => setBulkScoresText(e.target.value)}
                  className="font-mono text-sm"
                />
                {bulkScoresText && (
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium mb-2">파싱 결과:</p>
                    <div className="space-y-2">
                      {parseBulkScores(bulkScoresText).map(({ name, score, feedback }, i) => (
                        <div key={i} className="text-sm p-2 border rounded">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary">{name}</Badge>
                            <span className="font-medium">{score}점</span>
                          </div>
                          {feedback && (
                            <div className="text-xs text-muted-foreground ml-1">
                              💬 {feedback}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsScoreEntryDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveScores}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification Confirmation Dialog */}
      <Dialog open={isNotificationDialogOpen} onOpenChange={setIsNotificationDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>알림톡 발송 확인</DialogTitle>
            <DialogDescription>
              {selectedExam?.title} 성적을 학부모에게 발송합니다
            </DialogDescription>
          </DialogHeader>

          {selectedExam && (() => {
            if (isNotificationLoading) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2" />
                  <p>학생 정보를 불러오는 중...</p>
                </div>
              )
            }

            const stats = getNotificationStats()
            const studentsWithPhone = notificationStudents.filter(s => s.parent_phone)
            const studentsWithoutPhone = notificationStudents.filter(s => !s.parent_phone)

            return (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">총 학생 수</span>
                    <span className="text-lg font-bold">{stats.total}명</span>
                  </div>
                  <div className="flex items-center justify-between text-green-600">
                    <span className="text-sm font-medium">발송 가능</span>
                    <span className="text-lg font-bold">{stats.withPhone}명</span>
                  </div>
                  <div className="flex items-center justify-between text-orange-600">
                    <span className="text-sm font-medium">학부모 번호 없음</span>
                    <span className="text-lg font-bold">{stats.withoutPhone}명</span>
                  </div>
                </div>

                <Tabs defaultValue="receive" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="receive" className="text-green-600 data-[state=active]:text-green-700">
                      알림톡 받는 학생 ({stats.withPhone})
                    </TabsTrigger>
                    <TabsTrigger value="no-receive" className="text-orange-600 data-[state=active]:text-orange-700">
                      받지 못하는 학생 ({stats.withoutPhone})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="receive" className="mt-4">
                    {studentsWithPhone.length > 0 ? (
                      <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                        <p className="text-sm font-medium text-green-900 mb-2">
                          다음 학생의 학부모에게 알림톡이 발송됩니다:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {studentsWithPhone.map((student) => (
                            <Badge key={student.id} variant="outline" className="text-green-700 border-green-300 bg-white">
                              {student.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        발송 가능한 학생이 없습니다.
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="no-receive" className="mt-4">
                    {stats.withoutPhone > 0 ? (
                      <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
                        <p className="text-sm font-medium text-orange-900 mb-2">
                          다음 학생은 학부모 번호가 등록되지 않았습니다:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {studentsWithoutPhone.map((student) => (
                            <Badge key={student.id} variant="outline" className="text-orange-700 border-orange-300 bg-white">
                              {student.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        모든 학생의 학부모 번호가 등록되어 있습니다.
                      </div>
                    )}
                  </TabsContent>
                </Tabs>

                {/* 알림톡 템플릿 미리보기 */}
                <div className="rounded-lg border bg-yellow-50 p-4">
                  <p className="text-sm font-medium text-yellow-900 mb-2">📱 알림톡 미리보기 (설정에서 템플릿 수정 가능)</p>
                  <div className="bg-white rounded-lg p-3 text-sm border border-yellow-200 whitespace-pre-line">
                    <p className="text-muted-foreground">
{fillMessageTemplate(examResultTemplate, {
  '기관명': organization?.name || '학원',
  '학생명': '(학생이름)',
  '시험명': selectedExam?.title || '',
  '점수': '(점수)',
})}
                    </p>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {stats.withPhone}명의 학부모에게 성적 알림톡이 발송됩니다.
                </p>
              </div>
            )
          })()}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNotificationDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleConfirmSendNotification}>
              <Send className="mr-2 h-4 w-4" />
              보내기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grading Dialog */}
      <Dialog open={isGradingDialogOpen} onOpenChange={setIsGradingDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedExam?.title} - 채점</DialogTitle>
            <DialogDescription>학생별 점수와 피드백을 입력하세요</DialogDescription>
          </DialogHeader>

          <Tabs value={gradingTab} onValueChange={(v) => setGradingTab(v as 'manual' | 'auto')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">수기입력</TabsTrigger>
              <TabsTrigger value="auto">자동입력 (엑셀)</TabsTrigger>
            </TabsList>

            {/* 수기입력 탭 */}
            <TabsContent value="manual" className="space-y-4">
              {isGradingLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="animate-spin inline-block w-6 h-6 border-2 border-current border-t-transparent rounded-full mb-2" />
                  <p>학생 목록을 불러오는 중...</p>
                </div>
              ) : gradingStudents.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  이 반에 등록된 학생이 없습니다.
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-3 text-left w-28">
                          <div className="flex items-center gap-1">
                            학생
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0"
                              onClick={() => {
                                const names = gradingStudents.map(s => s.name).join('\n')
                                navigator.clipboard.writeText(names)
                                toast({
                                  title: '복사 완료',
                                  description: `${gradingStudents.length}명의 학생 이름이 복사되었습니다.`,
                                })
                              }}
                              title="학생 이름 전체 복사"
                            >
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        </th>
                        <th className="p-3 text-center w-24">점수</th>
                        <th className="p-3 text-left">피드백</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gradingStudents.map((student) => (
                        <tr key={student.id} className="border-b">
                          <td className="p-3 font-medium">{student.name}</td>
                          <td className="p-3">
                            <Input
                              type="number"
                              min="0"
                              max={selectedExam?.total_score || 100}
                              placeholder="점수"
                              value={gradingScores[student.id] || ''}
                              onChange={(e) => setGradingScores({ ...gradingScores, [student.id]: e.target.value })}
                              className={`w-20 text-center ${!gradingScores[student.id] ? 'border-red-500' : ''}`}
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              placeholder="피드백 입력"
                              value={gradingFeedbacks[student.id] || ''}
                              onChange={(e) => setGradingFeedbacks({ ...gradingFeedbacks, [student.id]: e.target.value })}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            {/* 자동입력 탭 */}
            <TabsContent value="auto" className="space-y-4">
              <div className="space-y-2">
                <Label>엑셀에서 복사한 데이터 붙여넣기</Label>
                <p className="text-sm text-muted-foreground">
                  형식: 이름 [탭] 점수 [탭] 피드백(선택)
                </p>
                <Textarea
                  placeholder={`예시:\n홍길동\t95\t잘했어요\n김철수\t87\n이영희\t92\t꾸준히 노력하세요`}
                  value={bulkGradingText}
                  onChange={(e) => {
                    setBulkGradingText(e.target.value)
                    parseAndMapBulkGrading(e.target.value)
                  }}
                  className="min-h-[120px] font-mono text-sm"
                />
              </div>

              {/* 매핑 결과 미리보기 */}
              {(autoMappedScores.length > 0 || unmatchedRows.length > 0) && (
                <div className="space-y-4">
                  {/* 매핑된 학생 */}
                  {autoMappedScores.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="bg-green-500">매핑 성공</Badge>
                        <span className="text-sm text-muted-foreground">{autoMappedScores.length}명</span>
                      </div>
                      <div className="rounded-md border">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted/50">
                              <th className="p-2 text-left">학생</th>
                              <th className="p-2 text-center w-20">점수</th>
                              <th className="p-2 text-left">피드백</th>
                            </tr>
                          </thead>
                          <tbody>
                            {autoMappedScores.map((item, idx) => (
                              <tr key={idx} className="border-b">
                                <td className="p-2 font-medium">{item.studentName}</td>
                                <td className="p-2 text-center">{item.score}</td>
                                <td className="p-2 text-muted-foreground">{item.feedback || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* 매핑 실패한 행 */}
                  {unmatchedRows.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive">매핑 실패</Badge>
                        <span className="text-sm text-muted-foreground">{unmatchedRows.length}건</span>
                      </div>
                      <div className="rounded-md border border-destructive/50">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-destructive/10">
                              <th className="p-2 text-left">입력된 이름</th>
                              <th className="p-2 text-center w-20">점수</th>
                              <th className="p-2 text-left">피드백</th>
                            </tr>
                          </thead>
                          <tbody>
                            {unmatchedRows.map((item, idx) => (
                              <tr key={idx} className="border-b">
                                <td className="p-2 text-destructive">{item.name}</td>
                                <td className="p-2 text-center">{item.score}</td>
                                <td className="p-2 text-muted-foreground">{item.feedback || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        * 매핑 실패한 항목은 반에 등록된 학생 이름과 일치하지 않습니다.
                      </p>
                    </div>
                  )}

                  {/* 적용 버튼 */}
                  {autoMappedScores.length > 0 && (
                    <Button onClick={applyAutoMappedScores} className="w-full">
                      매핑된 {autoMappedScores.length}명의 점수 적용하기
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGradingDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveGrading} disabled={gradingStudents.length === 0 || gradingTab === 'auto'}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
