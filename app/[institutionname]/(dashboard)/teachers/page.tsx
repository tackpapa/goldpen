'use client'
export const runtime = 'edge'



import { useState } from 'react'
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
import { TeacherDetailModal } from '@/components/teachers/TeacherDetailModal'

// Generate unique token for lesson notes
const generateToken = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
}

// Mock data
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
  {
    id: 'teacher-5',
    created_at: '2023-09-01T00:00:00',
    updated_at: '2025-05-01T00:00:00',
    org_id: 'org-1',
    name: '정선생',
    email: 'jung@example.com',
    phone: '010-5678-9012',
    subjects: ['화학', '생물'],
    status: 'inactive',
    employment_type: 'full_time',
    salary_type: 'monthly',
    salary_amount: 3000000,
    hire_date: '2023-09-01',
    lesson_note_token: 'jung-teacher-pqr345stu',
    assigned_students: [],
    notes: '휴직 중',
  },
]

// Mock students for student assignment - 50 students for scrolling
const mockStudents = [
  { id: '1', name: '김민준', grade: '고1', school: '강남고등학교' },
  { id: '2', name: '이서연', grade: '고2', school: '서울고등학교' },
  { id: '3', name: '박지훈', grade: '중3', school: '서울중학교' },
  { id: '4', name: '최유진', grade: '고3', school: '강남고등학교' },
  { id: '5', name: '정서준', grade: '중1', school: '대치중학교' },
  { id: '6', name: '강하늘', grade: '고2', school: '대원고등학교' },
  { id: '7', name: '조민서', grade: '중2', school: '서울중학교' },
  { id: '8', name: '윤채원', grade: '고1', school: '휘문고등학교' },
  { id: '9', name: '임도현', grade: '중3', school: '대치중학교' },
  { id: '10', name: '한지우', grade: '고3', school: '강남고등학교' },
  { id: '11', name: '송예은', grade: '중1', school: '청담중학교' },
  { id: '12', name: '오준서', grade: '고2', school: '서울고등학교' },
  { id: '13', name: '신지아', grade: '중2', school: '압구정중학교' },
  { id: '14', name: '허현우', grade: '고1', school: '대원고등학교' },
  { id: '15', name: '남수아', grade: '중3', school: '서울중학교' },
  { id: '16', name: '구민재', grade: '고3', school: '휘문고등학교' },
  { id: '17', name: '배시연', grade: '중1', school: '대치중학교' },
  { id: '18', name: '황지훈', grade: '고2', school: '강남고등학교' },
  { id: '19', name: '석채린', grade: '중2', school: '청담중학교' },
  { id: '20', name: '노태양', grade: '고1', school: '서울고등학교' },
  { id: '21', name: '문소율', grade: '중3', school: '압구정중학교' },
  { id: '22', name: '탁준영', grade: '고3', school: '대원고등학교' },
  { id: '23', name: '차은우', grade: '중1', school: '서울중학교' },
  { id: '24', name: '진하준', grade: '고2', school: '휘문고등학교' },
  { id: '25', name: '홍다은', grade: '중2', school: '대치중학교' },
  { id: '26', name: '류시우', grade: '고1', school: '청담고등학교' },
  { id: '27', name: '전나연', grade: '중3', school: '압구정중학교' },
  { id: '28', name: '도영호', grade: '고3', school: '강남고등학교' },
  { id: '29', name: '곽민지', grade: '중1', school: '서울중학교' },
  { id: '30', name: '변준혁', grade: '고2', school: '대원고등학교' },
  { id: '31', name: '설아린', grade: '중2', school: '청담중학교' },
  { id: '32', name: '추윤서', grade: '고1', school: '휘문고등학교' },
  { id: '33', name: '엄재윤', grade: '중3', school: '대치중학교' },
  { id: '34', name: '사유빈', grade: '고3', school: '서울고등학교' },
  { id: '35', name: '빈서현', grade: '중1', school: '압구정중학교' },
  { id: '36', name: '길하윤', grade: '고2', school: '강남고등학교' },
  { id: '37', name: '지유진', grade: '중2', school: '서울중학교' },
  { id: '38', name: '팽도훈', grade: '고1', school: '대원고등학교' },
  { id: '39', name: '선지민', grade: '중3', school: '청담중학교' },
  { id: '40', name: '표서아', grade: '고3', school: '휘문고등학교' },
  { id: '41', name: '명준우', grade: '중1', school: '대치중학교' },
  { id: '42', name: '단채윤', grade: '고2', school: '압구정고등학교' },
  { id: '43', name: '복시현', grade: '중2', school: '서울중학교' },
  { id: '44', name: '여지환', grade: '고1', school: '강남고등학교' },
  { id: '45', name: '경수민', grade: '중3', school: '대원중학교' },
  { id: '46', name: '옹하은', grade: '고3', school: '청담고등학교' },
  { id: '47', name: '제민준', grade: '중1', school: '휘문중학교' },
  { id: '48', name: '방예진', grade: '고2', school: '서울고등학교' },
  { id: '49', name: '공서진', grade: '중2', school: '대치중학교' },
  { id: '50', name: '감도윤', grade: '고1', school: '압구정고등학교' },
]

const mockTeacherClasses: Record<string, TeacherClass[]> = {
  'teacher-1': [
    { teacher_id: 'teacher-1', class_id: 'class-1', class_name: '수학 특강반', subject: '수학', student_count: 15 },
    { teacher_id: 'teacher-1', class_id: 'class-4', class_name: '과학 실험반', subject: '과학', student_count: 12 },
  ],
  'teacher-2': [
    { teacher_id: 'teacher-2', class_id: 'class-2', class_name: '영어 회화반', subject: '영어', student_count: 18 },
    { teacher_id: 'teacher-2', class_id: 'class-5', class_name: '영어 문법반', subject: '영어', student_count: 14 },
  ],
  'teacher-3': [
    { teacher_id: 'teacher-3', class_id: 'class-3', class_name: '국어 독해반', subject: '국어', student_count: 16 },
  ],
  'teacher-4': [
    { teacher_id: 'teacher-4', class_id: 'class-6', class_name: '물리 심화반', subject: '물리', student_count: 10 },
  ],
}

// Mock statistics data
const teacherHoursData = [
  { name: '김선생', hours: 80 },
  { name: '박선생', hours: 72 },
  { name: '이선생', hours: 45 },
  { name: '최선생', hours: 60 },
  { name: '정선생', hours: 0 },
]

const teacherStudentsData = [
  { name: '김선생', students: 27 },
  { name: '박선생', students: 32 },
  { name: '이선생', students: 16 },
  { name: '최선생', students: 10 },
]

const employmentTypeData = [
  { name: '정규직', value: 2 },
  { name: '계약직', value: 1 },
  { name: '시간강사', value: 1 },
]

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

export default function TeachersPage() {
  usePageAccess('teachers')

  const { toast } = useToast()
  const [teachers, setTeachers] = useState<Teacher[]>(mockTeachers)
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
    setSelectedTeacher(teacher)
    setFormData(teacher)
    setIsDialogOpen(true)
  }

  const handleDeleteTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setIsDeleteDialogOpen(true)
  }

  const confirmDelete = () => {
    if (selectedTeacher) {
      setTeachers(teachers.filter((t) => t.id !== selectedTeacher.id))
      toast({
        title: '강사 삭제 완료',
        description: `${selectedTeacher.name} 강사가 삭제되었습니다.`,
      })
      setIsDeleteDialogOpen(false)
      setSelectedTeacher(null)
    }
  }

  const handleOpenAssignStudentDialog = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setSelectedStudents(teacher.assigned_students || [])
    setStudentSearchQuery('') // 검색어 초기화
    setIsAssignStudentDialogOpen(true)
  }

  // 검색어로 학생 필터링
  const filteredStudents = mockStudents.filter((student) => {
    const searchLower = studentSearchQuery.toLowerCase()
    return (
      student.name.toLowerCase().includes(searchLower) ||
      student.grade.toLowerCase().includes(searchLower) ||
      student.school.toLowerCase().includes(searchLower)
    )
  })

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    )
  }

  const handleSaveStudentAssignment = () => {
    if (!selectedTeacher) return

    const updatedTeachers = teachers.map((teacher) =>
      teacher.id === selectedTeacher.id
        ? { ...teacher, assigned_students: selectedStudents, updated_at: new Date().toISOString() }
        : teacher
    )
    setTeachers(updatedTeachers)

    toast({
      title: '학생 배정 완료',
      description: `${selectedTeacher.name} 강사에게 ${selectedStudents.length}명의 학생이 배정되었습니다.`,
    })

    setIsAssignStudentDialogOpen(false)
    setSelectedTeacher(null)
    setSelectedStudents([])
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

  const handleSaveTeacher = () => {
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: '필수 정보 누락',
        description: '이름, 이메일, 전화번호는 필수입니다.',
        variant: 'destructive',
      })
      return
    }

    if (isEditing && selectedTeacher) {
      // Update existing teacher
      const updatedTeachers = teachers.map((teacher) =>
        teacher.id === selectedTeacher.id
          ? { ...teacher, ...formData, updated_at: new Date().toISOString() }
          : teacher
      )
      setTeachers(updatedTeachers)

      toast({
        title: '강사 정보 수정 완료',
        description: '강사 정보가 성공적으로 수정되었습니다.',
      })
    } else {
      // Create new teacher with unique lesson note token
      const newTeacher: Teacher = {
        ...formData as Teacher,
        id: `teacher-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        org_id: 'org-1',
        lesson_note_token: generateToken(),
      }

      setTeachers([newTeacher, ...teachers])

      toast({
        title: '강사 등록 완료',
        description: '새로운 강사가 등록되었습니다. 수업일지 등록 링크가 생성되었습니다.',
      })
    }

    setIsDialogOpen(false)
    setSelectedTeacher(null)
  }

  const handleOpenTeacherDetail = (teacher: Teacher) => {
    setSelectedTeacherForDetail(teacher)
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
            {subjects.map((subject) => (
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
        const amount = teacher.salary_amount.toLocaleString()
        const unit = teacher.salary_type === 'monthly' ? '원/월' : '원/시간'
        return <span>{amount}{unit}</span>
      },
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => {
        const status = row.getValue('status') as keyof typeof statusMap
        const { label, variant } = statusMap[status]
        return <Badge variant={variant}>{label}</Badge>
      },
    },
    {
      id: 'student_assignment',
      header: '학생 배정',
      cell: ({ row }) => {
        const teacher = row.original
        const assignedCount = teacher.assigned_students?.length || 0
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenAssignStudentDialog(teacher)}
            className="gap-2"
          >
            <UserPlus className="h-3 w-3" />
            <span className="text-xs">
              {assignedCount > 0 ? `${assignedCount}명 배정됨` : '배정하기'}
            </span>
          </Button>
        )
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

  // Teacher classes columns
  const classColumns: ColumnDef<TeacherClass>[] = [
    {
      accessorKey: 'class_name',
      header: '반 이름',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue('class_name')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'subject',
      header: '과목',
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

  // Get all teacher classes for the "담당 반 현황" tab
  const allTeacherClasses = teachers.flatMap((teacher) =>
    (mockTeacherClasses[teacher.id] || []).map((tc) => ({
      ...tc,
      teacher_name: teacher.name,
    }))
  )

  // Statistics
  const totalTeachers = teachers.length
  const activeTeachers = teachers.filter((t) => t.status === 'active').length
  const totalClasses = Object.values(mockTeacherClasses).flat().length
  const totalStudents = Object.values(mockTeacherClasses)
    .flat()
    .reduce((sum, tc) => sum + tc.student_count, 0)

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

        {/* Teacher Classes Tab */}
        <TabsContent value="classes" className="space-y-4">
          <div className="grid gap-4">
            {teachers
              .filter((t) => t.status === 'active')
              .map((teacher) => {
                const classes = mockTeacherClasses[teacher.id] || []
                const totalStudents = classes.reduce((sum, c) => sum + c.student_count, 0)

                return (
                  <Card key={teacher.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {teacher.name.split('').slice(0, 2).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle>{teacher.name}</CardTitle>
                            <CardDescription>
                              {teacher.subjects.join(', ')} · {classes.length}개 반 · {totalStudents}명
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {teacher.subjects.map((subject) => (
                            <Badge key={subject} variant="outline">
                              {subject}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {classes.length > 0 ? (
                        <DataTable columns={classColumns} data={classes} />
                      ) : (
                        <div className="text-center py-6 text-muted-foreground">
                          담당 반이 없습니다
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>강사별 월 수업 시수</CardTitle>
                <CardDescription>이번 달 강사별 진행 시수</CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teacherHoursData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="hours" fill="#3b82f6" name="수업 시수" />
                  </BarChart>
                </ResponsiveContainer>
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
                      data={employmentTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {employmentTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
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
                            {employmentTypeMap[teacher.employment_type]}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          {teacher.salary_amount.toLocaleString()}원
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {salaryTypeMap[teacher.salary_type]}
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
                      {employmentTypeMap[selectedTeacher.employment_type]}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">급여 유형</Label>
                    <p className="mt-1 font-medium">
                      {salaryTypeMap[selectedTeacher.salary_type]}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">급여 금액</Label>
                    <p className="mt-1 font-medium">
                      {selectedTeacher.salary_amount.toLocaleString()}원
                      {selectedTeacher.salary_type === 'monthly' ? '/월' : '/시간'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">입사일</Label>
                    <p className="mt-1 font-medium">
                      {format(new Date(selectedTeacher.hire_date), 'yyyy년 MM월 dd일', { locale: ko })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">상태</Label>
                    <div className="mt-1">
                      <Badge variant={statusMap[selectedTeacher.status].variant}>
                        {statusMap[selectedTeacher.status].label}
                      </Badge>
                    </div>
                  </div>
                  {/* Show salary tracking for hourly teachers */}
                  {selectedTeacher.salary_type === 'hourly' && (
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
                  {selectedTeacher.subjects.map((subject) => (
                    <Badge key={subject} variant="secondary">
                      {subject}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Assigned Students */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold">배정된 학생</h3>
                {selectedTeacher.assigned_students && selectedTeacher.assigned_students.length > 0 ? (
                  <div className="space-y-2">
                    {selectedTeacher.assigned_students.map((studentId) => {
                      const student = mockStudents.find((s) => s.id === studentId)
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
