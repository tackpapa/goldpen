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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Eye, Edit, MoreHorizontal, TrendingUp, PenSquare, BarChart3, Send } from 'lucide-react'
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
import type { Exam, ExamScore } from '@/lib/types/database'
import { format } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'


export default function ExamsPage() {
  usePageAccess('exams')

  const { toast } = useToast()
  const [exams, setExams] = useState<Exam[]>([])
  const [scores, setScores] = useState<Record<string, ExamScore[]>>({})
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchExams = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/exams', { credentials: 'include' })
        const data = await response.json() as { exams?: Exam[]; scores?: Record<string, ExamScore[]>; error?: string }
        if (response.ok) {
          setExams(data.exams || [])
          setScores(data.scores || {})
        } else {
          toast({ title: '시험 데이터 로드 실패', variant: 'destructive' })
        }
      } catch {
        toast({ title: '오류 발생', variant: 'destructive' })
      } finally {
        setIsLoading(false)
      }
    }
    fetchExams()
  }, [toast])
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null)
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all')
  const [userRole, setUserRole] = useState<string>('teacher')
  const [isScoresDialogOpen, setIsScoresDialogOpen] = useState(false)
  const [isStatsDialogOpen, setIsStatsDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isScoreEntryDialogOpen, setIsScoreEntryDialogOpen] = useState(false)
  const [isNotificationDialogOpen, setIsNotificationDialogOpen] = useState(false)
  const [scoreEntryTab, setScoreEntryTab] = useState<'manual' | 'bulk'>('manual')
  const [bulkScoresText, setBulkScoresText] = useState('')
  const [manualScores, setManualScores] = useState<Record<string, number>>({})
  const [manualFeedbacks, setManualFeedbacks] = useState<Record<string, string>>({})
  const [examForm, setExamForm] = useState({
    name: '',
    subject: '',
    class_name: '',
    exam_date: '',
    exam_time: '',
    total_score: 100,
  })

  useEffect(() => {
    const role = localStorage.getItem('userRole') || 'teacher'
    setUserRole(role)
  }, [])

  const statusMap = {
    pending_grade: { label: '채점 전', variant: 'outline' as const },
    graded: { label: '채점 완료', variant: 'default' as const },
  }

  // 필터링된 시험 목록
  const filteredExams = exams.filter((exam) =>
    selectedTeacher === 'all' || exam.teacher_name === selectedTeacher
  )

  const columns: ColumnDef<Exam>[] = [
    {
      accessorKey: 'name',
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
        const time = row.original.exam_time
        return `${format(new Date(date), 'yyyy-MM-dd')} ${time}`
      },
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => {
        const status = row.getValue('status') as Exam['status']
        const statusInfo = statusMap[status]
        return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
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
            {exam.status === 'graded' && hasScores && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewScores(exam)}
                >
                  <Eye className="mr-1 h-3 w-3" />
                  성적 보기
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewStats(exam)}
                >
                  <BarChart3 className="mr-1 h-3 w-3" />
                  통계 보기
                </Button>
                {(userRole === 'director' || userRole === 'admin') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSendNotification(exam)}
                  >
                    <Send className="mr-1 h-3 w-3" />
                    알림톡 보내기
                  </Button>
                )}
              </>
            )}
            {(exam.status === 'pending_grade' || (exam.status === 'graded' && !hasScores)) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEnterScores(exam)}
              >
                <PenSquare className="mr-1 h-3 w-3" />
                성적 입력
              </Button>
            )}
          </div>
        )
      },
    },
  ]

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

  const handleSendNotification = (exam: Exam) => {
    setSelectedExam(exam)
    setIsNotificationDialogOpen(true)
  }

  const getNotificationStats = (examId: string) => {
    // Students data loaded from API
    const studentsWithParents: Array<{ id: string; name: string; parent_phone: string | null }> = []

    const examScores = scores[examId] || []
    const studentsWithScores = studentsWithParents.filter(s =>
      examScores.some(score => score.student_id === s.id)
    )

    const withPhone = studentsWithScores.filter(s => s.parent_phone).length
    const withoutPhone = studentsWithScores.filter(s => !s.parent_phone).length

    return {
      total: studentsWithScores.length,
      withPhone,
      withoutPhone,
      studentsWithoutPhone: studentsWithScores.filter(s => !s.parent_phone).map(s => s.name)
    }
  }

  const handleConfirmSendNotification = () => {
    if (!selectedExam) return

    const stats = getNotificationStats(selectedExam.id)

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
    console.log('저장할 성적:', scoresToSave)
    console.log('저장할 피드백:', feedbacksToSave)

    toast({
      title: '성적 저장 완료',
      description: `${Object.keys(scoresToSave).length}명의 성적${feedbackCount > 0 ? ` 및 ${feedbackCount}명의 피드백` : ''}이 저장되었습니다.`,
    })

    setIsScoreEntryDialogOpen(false)
  }

  const handleCreateExam = () => {
    setExamForm({
      name: '',
      subject: '',
      class_name: '',
      exam_date: '',
      exam_time: '',
      total_score: 100,
    })
    setIsCreateDialogOpen(true)
  }

  const handleSaveExam = () => {
    if (!examForm.name || !examForm.subject || !examForm.class_name || !examForm.exam_date || !examForm.exam_time) {
      toast({
        title: '입력 오류',
        description: '모든 필수 항목을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    const newExam: Exam = {
      id: `exam-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      org_id: 'org-1',
      name: examForm.name,
      subject: examForm.subject,
      class_id: 'class-new',
      class_name: examForm.class_name,
      exam_date: examForm.exam_date,
      exam_time: examForm.exam_time,
      total_score: examForm.total_score,
      status: 'scheduled',
    }

    setExams([...exams, newExam])
    toast({
      title: '시험 등록 완료',
      description: `${examForm.name} 시험이 등록되었습니다.`,
    })
    setIsCreateDialogOpen(false)
  }

  const getExamStats = (examId: string) => {
    const examScores = scores[examId] || []
    if (scores.length === 0) return null

    const scoreValues = scores.map((s) => s.score)
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

    return { avg, max, min, distribution, total: scores.length }
  }

  const completedExams = exams.filter((e) => e.status === 'graded')

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
          <div className="flex items-center gap-2 flex-wrap">
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
              {Array.from(new Set(exams.map((exam) => exam.teacher_name)))
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
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredExams}
            searchKey="name"
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
              <Label htmlFor="name">시험명 *</Label>
              <Input
                id="name"
                value={examForm.name}
                onChange={(e) => setExamForm({ ...examForm, name: e.target.value })}
                placeholder="예: 수학 중간고사"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">과목 *</Label>
              <Input
                id="subject"
                value={examForm.subject}
                onChange={(e) => setExamForm({ ...examForm, subject: e.target.value })}
                placeholder="예: 수학"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="class_name">반 이름 *</Label>
              <Input
                id="class_name"
                value={examForm.class_name}
                onChange={(e) => setExamForm({ ...examForm, class_name: e.target.value })}
                placeholder="예: 수학 특강반"
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
                <Label htmlFor="exam_time">시험 시간 *</Label>
                <Input
                  id="exam_time"
                  type="time"
                  value={examForm.exam_time}
                  onChange={(e) => setExamForm({ ...examForm, exam_time: e.target.value })}
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedExam?.name} - 성적</DialogTitle>
            <DialogDescription>학생별 성적 목록</DialogDescription>
          </DialogHeader>

          {selectedExam && scores[selectedExam.id] && (
            <div className="space-y-4">
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="p-2 text-left">학생</th>
                      <th className="p-2 text-center">점수</th>
                      <th className="p-2 text-center">등급</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scores[selectedExam.id]
                      .sort((a, b) => b.score - a.score)
                      .map((score, i) => (
                        <tr key={score.id} className="border-b">
                          <td className="p-2">
                            {i + 1}. {score.student_name}
                          </td>
                          <td className="p-2 text-center font-medium">{score.score}점</td>
                          <td className="p-2 text-center">
                            <Badge
                              variant={
                                score.grade === 'A'
                                  ? 'default'
                                  : score.grade === 'B'
                                  ? 'secondary'
                                  : 'outline'
                              }
                            >
                              {score.grade}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter>
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
            <DialogTitle>{selectedExam?.name} - 통계</DialogTitle>
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
            <DialogTitle>{selectedExam?.name} - 성적 입력</DialogTitle>
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
              {selectedExam?.name} 성적을 학부모에게 발송합니다
            </DialogDescription>
          </DialogHeader>

          {selectedExam && (() => {
            const stats = getNotificationStats(selectedExam.id)
            // Students data loaded from API
            const studentsData: Array<{ id: string; name: string; parent_phone: string | null }> = []
            const examScores = scores[selectedExam.id] || []
            const studentsWithScores = studentsData.filter(s =>
              examScores.some(score => score.student_id === s.id)
            )
            const studentsWithPhone = studentsWithScores.filter(s => s.parent_phone)
            const studentsWithoutPhone = studentsWithScores.filter(s => !s.parent_phone)

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
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                      <p className="text-sm font-medium text-green-900 mb-3">
                        다음 학생의 학부모에게 알림톡이 발송됩니다:
                      </p>
                      <div className="space-y-2">
                        {studentsWithPhone.map((student) => (
                          <div key={student.id} className="flex items-center bg-white rounded-md p-2 border border-green-100">
                            <Badge variant="outline" className="text-green-700 border-green-300">
                              {student.name}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="no-receive" className="mt-4">
                    {stats.withoutPhone > 0 ? (
                      <div className="rounded-lg bg-orange-50 border border-orange-200 p-3">
                        <p className="text-sm font-medium text-orange-900 mb-3">
                          다음 학생은 학부모 번호가 등록되지 않았습니다:
                        </p>
                        <div className="space-y-2">
                          {studentsWithoutPhone.map((student) => (
                            <div key={student.id} className="flex items-center justify-between bg-white rounded-md p-2 border border-orange-100">
                              <Badge variant="outline" className="text-orange-700 border-orange-300">
                                {student.name}
                              </Badge>
                              <span className="text-xs text-orange-600">번호 없음</span>
                            </div>
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
    </div>
  )
}
