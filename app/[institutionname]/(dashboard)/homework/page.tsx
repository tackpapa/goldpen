'use client'



/**
 * 과제 관리 페이지 (Homework Management) - 강사용
 *
 * TODO: 강사 계정 필터링 구현 필요
 * - 현재: 모든 과제 데이터 표시 (개발용)
 * - 향후: 로그인한 강사 본인이 담당하는 학생의 과제만 필터링
 */

import { useState } from 'react'
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

// Mock data
const mockHomework: Homework[] = [
  {
    id: '1',
    created_at: '2025-06-01',
    updated_at: '2025-06-01',
    org_id: 'org-1',
    title: '수학 문제집 1단원',
    description: '1단원 연습문제 1-50번',
    class_id: 'class-1',
    class_name: '수학 특강반',
    due_date: '2025-06-20',
    status: 'active',
    total_students: 15,
    submitted_count: 12,
  },
  {
    id: '2',
    created_at: '2025-06-05',
    updated_at: '2025-06-05',
    org_id: 'org-1',
    title: '영어 에세이 작성',
    description: '주제: My Future Dream',
    class_id: 'class-2',
    class_name: '영어 회화반',
    due_date: '2025-06-25',
    status: 'active',
    total_students: 18,
    submitted_count: 8,
  },
  {
    id: '3',
    created_at: '2025-05-20',
    updated_at: '2025-05-20',
    org_id: 'org-1',
    title: '국어 독서 감상문',
    description: '지정 도서 읽고 감상문 작성',
    class_id: 'class-3',
    class_name: '국어 독해반',
    due_date: '2025-06-10',
    status: 'completed',
    total_students: 12,
    submitted_count: 12,
  },
  {
    id: '4',
    created_at: '2025-05-15',
    updated_at: '2025-05-15',
    org_id: 'org-1',
    title: '과학 실험 보고서',
    description: '화학 실험 결과 정리',
    class_id: 'class-4',
    class_name: '과학 실험반',
    due_date: '2025-05-30',
    status: 'overdue',
    total_students: 10,
    submitted_count: 7,
  },
]

const mockSubmissions: Record<string, HomeworkSubmission[]> = {
  '1': [
    { id: 's1', homework_id: '1', student_id: 'st1', student_name: '김민준', submitted_at: '2025-06-18', status: 'submitted', score: 95, feedback: '매우 잘했습니다' },
    { id: 's2', homework_id: '1', student_id: 'st2', student_name: '이서연', submitted_at: '2025-06-19', status: 'submitted', score: 88 },
    { id: 's3', homework_id: '1', student_id: 'st3', student_name: '박준호', status: 'not_submitted' },
    { id: 's4', homework_id: '1', student_id: 'st4', student_name: '최지우', submitted_at: '2025-06-21', status: 'late', score: 85 },
    { id: 's5', homework_id: '1', student_id: 'st5', student_name: '정하은', submitted_at: '2025-06-17', status: 'submitted', score: 92 },
  ],
  '3': [
    { id: 's6', homework_id: '3', student_id: 'st1', student_name: '김민준', submitted_at: '2025-06-08', status: 'submitted', score: 90 },
    { id: 's7', homework_id: '3', student_id: 'st2', student_name: '이서연', submitted_at: '2025-06-09', status: 'submitted', score: 95 },
  ],
}

export default function HomeworkPage() {
  usePageAccess('homework')

  const { toast } = useToast()
  const [homework, setHomework] = useState<Homework[]>(mockHomework)
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

  // 선택된 반의 학생 목록 가져오기
  const getClassStudents = (className: string) => {
    return mockStudentHomeworkStatus.filter((s) => s.class_name === className)
  }

  // 학생별 데이터: 각 학생의 최근 과제 제출 여부
  interface StudentHomeworkStatus {
    student_id: string
    student_name: string
    class_name: string
    teacher_name: string // 강사 이름
    last_homework: string | null
    last_homework_text: string | null // 수업일지에서 작성된 과제 내용
    submitted: boolean | null // null = 과제 없음
    submission_rate: number // 전체 과제 제출률 (%)
  }

  // Mock 학생별 과제 상태 (실제로는 수업일지의 homework_submitted 데이터 사용)
  const mockStudentHomeworkStatus: StudentHomeworkStatus[] = [
    // 그룹 수업 학생들
    { student_id: 'st1', student_name: '김민준', class_name: '수학 특강반', teacher_name: '김선생', last_homework: '수학 문제집 1단원', last_homework_text: '1단원 연습문제 1-50번 풀이 완료하기', submitted: true, submission_rate: 95 },
    { student_id: 'st2', student_name: '이서연', class_name: '수학 특강반', teacher_name: '김선생', last_homework: '수학 문제집 1단원', last_homework_text: '1단원 연습문제 1-50번 풀이 완료하기', submitted: true, submission_rate: 100 },
    { student_id: 'st3', student_name: '박준호', class_name: '수학 특강반', teacher_name: '김선생', last_homework: '수학 문제집 1단원', last_homework_text: '1단원 연습문제 1-50번 풀이 완료하기', submitted: false, submission_rate: 75 },
    { student_id: 'st4', student_name: '최지우', class_name: '영어 회화반', teacher_name: '이선생', last_homework: '영어 에세이 작성', last_homework_text: '주제: My Future Dream (300단어 이상)', submitted: false, submission_rate: 60 },
    { student_id: 'st5', student_name: '정하은', class_name: '영어 회화반', teacher_name: '이선생', last_homework: '영어 에세이 작성', last_homework_text: '주제: My Future Dream (300단어 이상)', submitted: true, submission_rate: 90 },
    { student_id: 'st6', student_name: '강서준', class_name: '국어 독해반', teacher_name: '박선생', last_homework: '국어 독서 감상문', last_homework_text: '지정 도서 읽고 감상문 1000자 작성', submitted: true, submission_rate: 85 },
    { student_id: 'st7', student_name: '윤지호', class_name: '국어 독해반', teacher_name: '박선생', last_homework: '국어 독서 감상문', last_homework_text: '지정 도서 읽고 감상문 1000자 작성', submitted: true, submission_rate: 92 },
    { student_id: 'st8', student_name: '신예은', class_name: '과학 실험반', teacher_name: '최선생', last_homework: '과학 실험 보고서', last_homework_text: '화학 실험 결과 정리 및 고찰 작성', submitted: false, submission_rate: 70 },
    { student_id: 'st9', student_name: '조민서', class_name: '과학 실험반', teacher_name: '최선생', last_homework: '과학 실험 보고서', last_homework_text: '화학 실험 결과 정리 및 고찰 작성', submitted: true, submission_rate: 88 },
    { student_id: 'st10', student_name: '한도윤', class_name: '수학 특강반', teacher_name: '김선생', last_homework: '수학 문제집 1단원', last_homework_text: '1단원 연습문제 1-50번 풀이 완료하기', submitted: true, submission_rate: 80 },

    // 1:1 강습 학생들
    { student_id: 'st11', student_name: '장서윤', class_name: '김선생 1:1', teacher_name: '김선생', last_homework: '영어 문법 정리', last_homework_text: '현재완료 시제 문법 정리 및 예문 10개 작성', submitted: true, submission_rate: 100 },
    { student_id: 'st12', student_name: '임하준', class_name: '이선생 1:1', teacher_name: '이선생', last_homework: '수학 심화 문제', last_homework_text: '고등 수학 미적분 심화 문제 10문제 풀이', submitted: false, submission_rate: 65 },
    { student_id: 'st13', student_name: '오지안', class_name: '박선생 1:1', teacher_name: '박선생', last_homework: '논술 에세이', last_homework_text: '시사 이슈 논술 에세이 1500자 작성', submitted: true, submission_rate: 95 },
    { student_id: 'st14', student_name: '송시우', class_name: '김선생 1:1', teacher_name: '김선생', last_homework: '영어 독해 연습', last_homework_text: '토플 리딩 지문 5개 풀이 및 오답 정리', submitted: true, submission_rate: 90 },
    { student_id: 'st15', student_name: '배은우', class_name: '최선생 1:1', teacher_name: '최선생', last_homework: '물리 문제 풀이', last_homework_text: '역학 단원 심화 문제 15문제 풀이', submitted: false, submission_rate: 55 },
    { student_id: 'st16', student_name: '양준서', class_name: '정선생 1:1', teacher_name: '정선생', last_homework: '화학 실험 리포트', last_homework_text: '산화환원 반응 실험 결과 분석 보고서 작성', submitted: true, submission_rate: 85 },
    { student_id: 'st17', student_name: '홍수아', class_name: '이선생 1:1', teacher_name: '이선생', last_homework: '수학 경시 대비', last_homework_text: '수학 경시대회 기출문제 20문제 풀이', submitted: true, submission_rate: 92 },
    { student_id: 'st18', student_name: '구민준', class_name: '박선생 1:1', teacher_name: '박선생', last_homework: '국어 고전 해석', last_homework_text: '고전 문학 작품 해석 및 감상문 작성', submitted: false, submission_rate: 68 },
  ]

  // 반별 데이터: 각 반의 과제 제출률
  interface ClassHomeworkStats {
    class_id: string
    class_name: string
    total_students: number
    submitted_count: number
    submission_rate: number
    last_homework: string | null
  }

  const mockClassHomeworkStats: ClassHomeworkStats[] = [
    { class_id: 'class-1', class_name: '수학 특강반', total_students: 15, submitted_count: 12, submission_rate: 80, last_homework: '수학 문제집 1단원' },
    { class_id: 'class-2', class_name: '영어 회화반', total_students: 18, submitted_count: 9, submission_rate: 50, last_homework: '영어 에세이 작성' },
    { class_id: 'class-3', class_name: '국어 독해반', total_students: 12, submitted_count: 12, submission_rate: 100, last_homework: '국어 독서 감상문' },
  ]

  // 강사 목록 추출 (중복 제거)
  const teachers = Array.from(new Set(mockStudentHomeworkStatus.map((s) => s.teacher_name)))

  // 강사별 필터링된 학생 목록
  const filteredStudents = selectedTeacher === 'all'
    ? mockStudentHomeworkStatus
    : mockStudentHomeworkStatus.filter((s) => s.teacher_name === selectedTeacher)

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
                  전체 ({mockStudentHomeworkStatus.length})
                </Button>
                {teachers.map((teacher) => {
                  const count = mockStudentHomeworkStatus.filter((s) => s.teacher_name === teacher).length
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
                {mockClassHomeworkStats.map((classStats) => (
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

          {selectedHomework && mockSubmissions[selectedHomework.id] && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">제출</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {mockSubmissions[selectedHomework.id].filter((s) => s.status === 'submitted').length}명
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">늦은 제출</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">
                      {mockSubmissions[selectedHomework.id].filter((s) => s.status === 'late').length}명
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">미제출</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {mockSubmissions[selectedHomework.id].filter((s) => s.status === 'not_submitted').length}명
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
                    {mockSubmissions[selectedHomework.id].map((submission) => (
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
