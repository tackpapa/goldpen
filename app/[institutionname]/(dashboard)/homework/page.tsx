'use client'

export const runtime = 'edge'


/**
 * 과제 관리 페이지 (Homework Management) - 강사용
 *
 * TODO: 강사 계정 필터링 구현 필요
 * - 현재: 모든 과제 데이터 표시 (개발용)
 * - 향후: 로그인한 강사 본인이 담당하는 학생의 과제만 필터링
 */

import { useState, useEffect } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { usePageAccess } from '@/hooks/use-page-access'
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
import { Calendar, Eye, MoreHorizontal, CheckCircle, XCircle } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Homework, HomeworkSubmission } from '@/lib/types/database'
import { format } from 'date-fns'


export default function HomeworkPage() {
  usePageAccess('homework')

  const { toast } = useToast()
  const [homework, setHomework] = useState<Homework[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [submissions, setSubmissions] = useState<Record<string, HomeworkSubmission[]>>({})

  useEffect(() => {
    const fetchHomework = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/homework', { credentials: 'include' })
        const data = await response.json() as { homework?: Homework[]; error?: string }
        if (response.ok) {
          setHomework(data.homework || [])
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
  const [viewMode, setViewMode] = useState<'student' | 'class'>('student')
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all')
  const [selectedClass, setSelectedClass] = useState<ClassHomeworkStats | null>(null)
  const [isClassDetailDialogOpen, setIsClassDetailDialogOpen] = useState(false)

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

  // 학생별 데이터: 각 학생의 최근 과제 제출 여부
  interface StudentHomeworkStatus {
    student_id: string
    student_name: string
    class_name: string
    teacher_name: string
    last_homework: string | null
    last_homework_text: string | null
    submitted: boolean | null
    submission_rate: number
  }

  // 반별 데이터: 각 반의 과제 제출률
  interface ClassHomeworkStats {
    class_id: string
    class_name: string
    total_students: number
    submitted_count: number
    submission_rate: number
    last_homework: string | null
  }

  const [studentHomeworkStatus, setStudentHomeworkStatus] = useState<StudentHomeworkStatus[]>([])
  const [classHomeworkStats, setClassHomeworkStats] = useState<ClassHomeworkStats[]>([])

  // 선택된 반의 학생 목록 가져오기
  const getClassStudents = (className: string) => {
    return studentHomeworkStatus.filter((s) => s.class_name === className)
  }

  // 강사 목록 추출 (중복 제거)
  const teachers = Array.from(new Set(studentHomeworkStatus.map((s) => s.teacher_name)))

  // 강사별 필터링된 학생 목록
  const filteredStudents = selectedTeacher === 'all'
    ? studentHomeworkStatus
    : studentHomeworkStatus.filter((s) => s.teacher_name === selectedTeacher)

  const totalHomework = homework.length
  const activeHomework = homework.filter((hw) => hw.status === 'active').length
  const completedHomework = homework.filter((hw) => hw.status === 'completed').length
  const avgSubmissionRate = homework.length > 0
    ? Math.round(homework.reduce((sum, hw) => sum + (hw.submitted_count / hw.total_students * 100), 0) / homework.length)
    : 0

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">과제 관리</h1>
        <p className="text-sm md:text-base text-muted-foreground">과제 및 제출 현황을 관리하세요</p>
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

      <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'student' | 'class')}>
        <TabsList>
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
              <CardDescription>각 학생의 가장 최근 과제 제출 여부 및 전체 제출률</CardDescription>
            </CardHeader>
            <CardContent>
              {/* 강사 필터 */}
              <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b">
                <Button
                  variant={selectedTeacher === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedTeacher('all')}
                >
                  전체 ({studentHomeworkStatus.length})
                </Button>
                {teachers.map((teacher) => {
                  const count = studentHomeworkStatus.filter((s) => s.teacher_name === teacher).length
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

              <div className="space-y-3">
                {filteredStudents.map((student) => (
                  <div
                    key={student.student_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{student.student_name}</h4>
                        <Badge variant="outline">{student.class_name}</Badge>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* 반별 뷰 */}
        <TabsContent value="class" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>반별 과제 제출률</CardTitle>
              <CardDescription>각 반의 최근 과제 제출 현황 (클릭하여 학생 목록 확인)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {classHomeworkStats.map((classStats) => (
                  <div
                    key={classStats.class_id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleViewClassDetail(classStats)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-lg hover:text-primary transition-colors">
                          {classStats.class_name}
                        </h4>
                        {classStats.last_homework && (
                          <p className="text-sm text-muted-foreground">
                            최근 과제: {classStats.last_homework}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {classStats.submission_rate}%
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {classStats.submitted_count}/{classStats.total_students}명 제출
                        </p>
                      </div>
                    </div>
                    <Progress value={classStats.submission_rate} className="h-3" />
                  </div>
                ))}
              </div>
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
                {getClassStudents(selectedClass.class_name).map((student) => (
                  <div
                    key={student.student_id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold">{student.student_name}</h4>
                        <Badge variant="outline">{student.teacher_name}</Badge>
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
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedHomework?.title} - 제출 현황</DialogTitle>
            <DialogDescription>학생별 과제 제출 상태</DialogDescription>
          </DialogHeader>

          {selectedHomework && submissions[selectedHomework.id] && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">제출</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {submissions[selectedHomework.id].filter((s) => s.status === 'submitted').length}명
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">늦은 제출</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {submissions[selectedHomework.id].filter((s) => s.status === 'late').length}명
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">미제출</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {submissions[selectedHomework.id].filter((s) => s.status === 'not_submitted').length}명
                    </div>
                  </CardContent>
                </Card>
              </div>

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
                    {submissions[selectedHomework.id].map((submission) => (
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
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSubmissionsDialogOpen(false)}>
              닫기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
