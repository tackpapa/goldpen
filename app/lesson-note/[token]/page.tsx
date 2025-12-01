'use client'

export const runtime = 'edge'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { BookOpen, Calendar, Clock, User, Sparkles, Copy, CheckCircle2 } from 'lucide-react'
import type { Teacher, Student } from '@/lib/types/database'

// Mock teachers data (should match teachers page)
const mockTeachers: Teacher[] = [
  {
    id: 'teacher-1',
    created_at: '2024-01-15T00:00:00',
    updated_at: '2024-01-15T00:00:00',
    org_id: 'org-1',
    name: '김선생',
    email: 'kim@example.com',
    phone: '010-1234-5678',
    subjects: ['수학', '과학'],
    status: 'active',
    employment_type: 'full_time',
    salary_type: 'monthly',
    salary_amount: 3500000,
    hire_date: '2024-01-15',
    lesson_note_token: 'kim-teacher-abc123xyz',
    assigned_students: ['1', '3'], // 김민준, 박지훈
    notes: '수학 전문 강사',
  },
  {
    id: 'teacher-2',
    created_at: '2024-02-01T00:00:00',
    updated_at: '2024-02-01T00:00:00',
    org_id: 'org-1',
    name: '박선생',
    email: 'park@example.com',
    phone: '010-2345-6789',
    subjects: ['영어'],
    status: 'active',
    employment_type: 'full_time',
    salary_type: 'monthly',
    salary_amount: 3200000,
    hire_date: '2024-02-01',
    lesson_note_token: 'park-teacher-def456uvw',
    assigned_students: ['2'], // 이서연
    notes: '영어 회화 전문',
  },
  {
    id: 'teacher-3',
    created_at: '2024-03-10T00:00:00',
    updated_at: '2024-03-10T00:00:00',
    org_id: 'org-1',
    name: '이선생',
    email: 'lee@example.com',
    phone: '010-3456-7890',
    subjects: ['국어'],
    status: 'active',
    employment_type: 'part_time',
    salary_type: 'hourly',
    salary_amount: 50000,
    hire_date: '2024-03-10',
    lesson_note_token: 'lee-teacher-ghi789rst',
    assigned_students: ['1', '2'], // 김민준, 이서연
    total_hours_worked: 0,
    earned_salary: 0,
    notes: '국어 독해 전문',
  },
  {
    id: 'teacher-4',
    created_at: '2024-04-05T00:00:00',
    updated_at: '2024-04-05T00:00:00',
    org_id: 'org-1',
    name: '최선생',
    email: 'choi@example.com',
    phone: '010-4567-8901',
    subjects: ['수학', '물리'],
    status: 'active',
    employment_type: 'contract',
    salary_type: 'monthly',
    salary_amount: 2800000,
    hire_date: '2024-04-05',
    lesson_note_token: 'choi-teacher-jkl012mno',
    assigned_students: [],
  },
]

// Mock students data (should match students page)
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
    credit: 0,
    seatsremainingtime: 0,
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
    credit: 0,
    seatsremainingtime: 0,
  },
  {
    id: '3',
    created_at: '2025-01-03',
    updated_at: '2025-01-03',
    org_id: 'org-1',
    name: '박지훈',
    grade: '중3',
    school: '서울중학교',
    phone: '010-3456-7890',
    parent_name: '박아무개',
    parent_phone: '010-7654-3210',
    subjects: ['수학', '과학'],
    status: 'active',
    enrollment_date: '2025-01-03',
    credit: 0,
    seatsremainingtime: 0,
  },
]

export default function LessonNoteTokenPage() {
  const params = useParams()
  const token = params.token as string
  const { toast } = useToast()

  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [lessonDate, setLessonDate] = useState('')
  const [lessonTime, setLessonTime] = useState('')
  const [lessonDuration, setLessonDuration] = useState<number>(60) // 수업 시간 (분 단위, 기본 60분)
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [studentAttitudes, setStudentAttitudes] = useState('')
  const [comprehensionLevel, setComprehensionLevel] = useState<'high' | 'medium' | 'low'>('medium')
  const [homeworkAssigned, setHomeworkAssigned] = useState('')
  const [nextLessonPlan, setNextLessonPlan] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [aiReport, setAiReport] = useState('')
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  // Find teacher by token
  useEffect(() => {
    const foundTeacher = mockTeachers.find((t) => t.lesson_note_token === token)
    if (foundTeacher) {
      setTeacher(foundTeacher)
      // Set today's date and current time as defaults
      const now = new Date()
      setLessonDate(now.toISOString().split('T')[0])
      setLessonTime(now.toTimeString().slice(0, 5))
    }
  }, [token])

  // Filter students - only show assigned students
  const assignedStudents = mockStudents.filter((student) =>
    teacher?.assigned_students?.includes(student.id)
  )

  const handleGenerateAIReport = () => {
    // TODO: AI 리포트 생성 API 호출
    setIsGeneratingReport(true)

    // 시뮬레이션 (실제로는 API 호출)
    setTimeout(() => {
      const selectedStudent = mockStudents.find((s) => s.id === selectedStudentId)
      const report = `${selectedStudent?.name} 학생의 ${lessonDate} ${subject} 수업 리포트

오늘 수업에서는 ${content || '(수업 내용을 입력해주세요)'}에 대해 학습했습니다.

${studentAttitudes || '학생의 수업 태도가 기록되지 않았습니다.'}

이해도는 ${comprehensionLevel === 'high' ? '상' : comprehensionLevel === 'medium' ? '중' : '하'} 수준으로 평가되었습니다.

${homeworkAssigned ? `과제: ${homeworkAssigned}` : ''}

${nextLessonPlan ? `다음 수업 계획: ${nextLessonPlan}` : ''}

전반적으로 학생이 수업에 집중하며 성실하게 참여했습니다.`

      setAiReport(report)
      setIsGeneratingReport(false)

      toast({
        title: 'AI 리포트 생성 완료',
        description: '리포트가 생성되었습니다. 내용을 확인하고 수정할 수 있습니다.',
      })
    }, 1500)
  }

  const handleCopyReport = async () => {
    try {
      await navigator.clipboard.writeText(aiReport)
      setIsCopied(true)
      toast({
        title: '복사 완료',
        description: 'AI 리포트가 클립보드에 복사되었습니다.',
      })
      setTimeout(() => setIsCopied(false), 2000)
    } catch (err) {
      toast({
        title: '복사 실패',
        description: '다시 시도해주세요.',
        variant: 'destructive',
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedStudentId || !lessonDate || !lessonTime || !subject || !content) {
      toast({
        title: '필수 항목 누락',
        description: '학생, 날짜, 시간, 과목, 수업 내용은 필수입니다.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      // TODO: Save to database via API
      const selectedStudent = mockStudents.find((s) => s.id === selectedStudentId)

      // Calculate hours from lesson duration (분 → 시간)
      const lessonHours = lessonDuration / 60

      // Update teacher salary if hourly teacher
      if (teacher && teacher.salary_type === 'hourly') {
        const earnedAmount = teacher.salary_amount * lessonHours
        const updatedTotalHours = (teacher.total_hours_worked || 0) + lessonHours
        const updatedEarnedSalary = (teacher.earned_salary || 0) + earnedAmount

        console.log('[Salary Update]', {
          teacher_name: teacher.name,
          lesson_duration_minutes: lessonDuration,
          lesson_hours: lessonHours,
          hourly_rate: teacher.salary_amount,
          earned_this_lesson: earnedAmount,
          total_hours_worked: updatedTotalHours,
          total_earned_salary: updatedEarnedSalary,
        })

        // TODO: Update teacher in database
        // For now, just log it
      }

      console.log('[Lesson Note]', {
        teacher_id: teacher?.id,
        teacher_name: teacher?.name,
        student_id: selectedStudentId,
        student_name: selectedStudent?.name,
        lesson_date: lessonDate,
        lesson_time: lessonTime,
        lesson_duration: lessonDuration,
        subject,
        content,
        student_attitudes: studentAttitudes,
        comprehension_level: comprehensionLevel,
        homework_assigned: homeworkAssigned,
        next_lesson_plan: nextLessonPlan,
      })

      toast({
        title: '수업일지 등록 완료',
        description: teacher?.salary_type === 'hourly'
          ? `수업일지가 등록되었습니다. 급여: ${(teacher.salary_amount * lessonHours).toLocaleString()}원 적립`
          : '수업일지가 성공적으로 등록되었습니다.',
      })

      // Reset form
      setSelectedStudentId('')
      setSubject('')
      setContent('')
      setStudentAttitudes('')
      setComprehensionLevel('medium')
      setHomeworkAssigned('')
      setNextLessonPlan('')
      setLessonDuration(60)
      setAiReport('')

      // Reset to current date/time
      const now = new Date()
      setLessonDate(now.toISOString().split('T')[0])
      setLessonTime(now.toTimeString().slice(0, 5))
    } catch (error) {
      toast({
        title: '등록 실패',
        description: '수업일지 등록에 실패했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Invalid token
  if (!teacher) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-destructive">유효하지 않은 링크</CardTitle>
            <CardDescription className="text-center">
              수업일지 등록 링크가 유효하지 않습니다.
              <br />
              관리자에게 문의해주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">수업일지 등록</CardTitle>
                <CardDescription className="text-base">
                  <User className="inline h-4 w-4 mr-1" />
                  {teacher.name} 선생님
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>수업 정보 입력</CardTitle>
            <CardDescription>
              수업 내용과 학생 정보를 입력해주세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Student Selection */}
              <div className="space-y-2">
                <Label htmlFor="student">학생 선택 *</Label>
                <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger id="student">
                    <SelectValue placeholder="학생을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignedStudents.length > 0 ? (
                      assignedStudents.map((student) => (
                        <SelectItem key={student.id} value={student.id}>
                          {student.name} ({student.grade} - {student.school})
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        배정된 학생이 없습니다
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Date, Time, and Duration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lesson_date">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    수업 날짜 *
                  </Label>
                  <Input
                    id="lesson_date"
                    type="date"
                    value={lessonDate}
                    onChange={(e) => setLessonDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lesson_time">
                    <Clock className="inline h-4 w-4 mr-1" />
                    수업 시간 *
                  </Label>
                  <Input
                    id="lesson_time"
                    type="time"
                    value={lessonTime}
                    onChange={(e) => setLessonTime(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lesson_duration">
                    <Clock className="inline h-4 w-4 mr-1" />
                    수업 시간(분) *
                  </Label>
                  <Select
                    value={lessonDuration.toString()}
                    onValueChange={(value) => setLessonDuration(Number(value))}
                  >
                    <SelectTrigger id="lesson_duration">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30분</SelectItem>
                      <SelectItem value="60">60분</SelectItem>
                      <SelectItem value="90">90분</SelectItem>
                      <SelectItem value="120">120분</SelectItem>
                      <SelectItem value="150">150분</SelectItem>
                      <SelectItem value="180">180분</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">과목 *</Label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="과목을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {teacher.subjects.map((sub) => (
                      <SelectItem key={sub} value={sub}>
                        {sub}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lesson Content */}
              <div className="space-y-2">
                <Label htmlFor="content">수업 내용 *</Label>
                <Textarea
                  id="content"
                  placeholder="오늘 수업에서 다룬 내용을 상세히 기록해주세요"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={4}
                  required
                />
              </div>

              {/* Student Attitudes */}
              <div className="space-y-2">
                <Label htmlFor="student_attitudes">학생 태도</Label>
                <Textarea
                  id="student_attitudes"
                  placeholder="학생의 수업 태도, 참여도, 질문 등을 기록해주세요"
                  value={studentAttitudes}
                  onChange={(e) => setStudentAttitudes(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Comprehension Level */}
              <div className="space-y-2">
                <Label htmlFor="comprehension_level">이해도 평가</Label>
                <Select
                  value={comprehensionLevel}
                  onValueChange={(value: 'high' | 'medium' | 'low') => setComprehensionLevel(value)}
                >
                  <SelectTrigger id="comprehension_level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">상 (잘 이해함)</SelectItem>
                    <SelectItem value="medium">중 (보통)</SelectItem>
                    <SelectItem value="low">하 (어려워함)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Homework */}
              <div className="space-y-2">
                <Label htmlFor="homework">과제</Label>
                <Textarea
                  id="homework"
                  placeholder="학생에게 부여한 과제를 기록해주세요"
                  value={homeworkAssigned}
                  onChange={(e) => setHomeworkAssigned(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Next Lesson Plan */}
              <div className="space-y-2">
                <Label htmlFor="next_lesson">다음 수업 계획</Label>
                <Textarea
                  id="next_lesson"
                  placeholder="다음 수업에서 다룰 내용을 간단히 기록해주세요"
                  value={nextLessonPlan}
                  onChange={(e) => setNextLessonPlan(e.target.value)}
                  rows={2}
                />
              </div>

              {/* AI Report Section */}
              {aiReport && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="ai_report">AI 생성 리포트</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyReport}
                      className="gap-2"
                    >
                      {isCopied ? (
                        <>
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          <span className="text-xs">복사됨</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span className="text-xs">복사하기</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    id="ai_report"
                    placeholder="AI가 생성한 리포트가 여기에 표시됩니다"
                    value={aiReport}
                    onChange={(e) => setAiReport(e.target.value)}
                    rows={8}
                    className="font-normal"
                  />
                  <p className="text-xs text-muted-foreground">
                    리포트 내용을 직접 수정할 수 있습니다
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGenerateAIReport}
                  disabled={isGeneratingReport || !content}
                  className="flex-1 gap-2"
                >
                  {isGeneratingReport ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-spin" />
                      <span className="text-sm sm:text-base">생성 중...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span className="text-sm sm:text-base">AI 리포트 생성</span>
                    </>
                  )}
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  <span className="text-sm sm:text-base">
                    {isSubmitting ? '등록 중...' : '수업일지 등록'}
                  </span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
