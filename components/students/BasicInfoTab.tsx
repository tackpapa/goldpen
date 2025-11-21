'use client'

import { useState, useEffect } from 'react'
import type { Student, ServiceEnrollment, Class, ClassStudent, Teacher } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Building2, GraduationCap, BookOpen, Plus, X, User, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface BasicInfoTabProps {
  student: Student
  onUpdate?: (student: Student) => void
  services?: any[]
  enrollments?: any[]
  loading?: boolean
  onRefresh?: () => void
}

const SERVICE_TYPES = [
  { value: 'academy', label: '학원', icon: GraduationCap, color: 'bg-blue-500' },
  { value: 'study_room', label: '독서실', icon: BookOpen, color: 'bg-green-500' },
  { value: 'study_center', label: '공부방', icon: Building2, color: 'bg-purple-500' },
] as const

// Grade options from 중1 to N수
const GRADE_OPTIONS = [
  { value: '중1', label: '중1' },
  { value: '중2', label: '중2' },
  { value: '중3', label: '중3' },
  { value: '고1', label: '고1' },
  { value: '고2', label: '고2' },
  { value: '고3', label: '고3' },
  { value: '재수', label: '재수' },
  { value: '삼수', label: '삼수' },
  { value: '사수', label: '사수' },
  { value: 'N수', label: 'N수' },
]

export function BasicInfoTab({
  student,
  onUpdate,
  services = [],
  enrollments = [],
  loading = false,
  onRefresh
}: BasicInfoTabProps) {
  const { toast } = useToast()
  const [serviceEnrollments, setServiceEnrollments] = useState<ServiceEnrollment[]>([])
  const [localStudent, setLocalStudent] = useState(student)
  const [saving, setSaving] = useState(false)
  const [enrolledClasses, setEnrolledClasses] = useState<Array<Class & { enrollment_id: string }>>([])
  const [assignedTeachers, setAssignedTeachers] = useState<Teacher[]>([]) // 1:1 배정된 강사들
  const [availableClasses, setAvailableClasses] = useState<Class[]>([])
  const [availableTeachers, setAvailableTeachers] = useState<Teacher[]>([])
  const [isAddClassDialogOpen, setIsAddClassDialogOpen] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')

  // Load service enrollments from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('service_enrollments')
    if (stored) {
      try {
        const all = JSON.parse(stored) as ServiceEnrollment[]
        setServiceEnrollments(all.filter(e => e.student_id === student.id && e.status === 'active'))
      } catch (error) {
        console.error('Failed to load service enrollments:', error)
      }
    }
  }, [student.id])

  // Load teachers from localStorage
  useEffect(() => {
    let teachersStored = localStorage.getItem('teachers')

    // Initialize with mock data if not exists
    if (!teachersStored) {
      const mockTeachers: Teacher[] = [
        {
          id: 'teacher-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          org_id: 'org-1',
          name: '김선생',
          email: 'kim@example.com',
          phone: '01012345678',
          subjects: ['수학', '물리'],
          status: 'active',
          employment_type: 'full_time',
          salary_type: 'monthly',
          salary_amount: 3000000,
          hire_date: '2024-01-01',
          assigned_students: [],
        },
        {
          id: 'teacher-2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          org_id: 'org-1',
          name: '이선생',
          email: 'lee@example.com',
          phone: '01087654321',
          subjects: ['영어', '국어'],
          status: 'active',
          employment_type: 'part_time',
          salary_type: 'hourly',
          salary_amount: 50000,
          hire_date: '2024-03-01',
          assigned_students: [],
        },
        {
          id: 'teacher-3',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          org_id: 'org-1',
          name: '박선생',
          email: 'park@example.com',
          phone: '01011112222',
          subjects: ['과학', '화학'],
          status: 'active',
          employment_type: 'full_time',
          salary_type: 'monthly',
          salary_amount: 3200000,
          hire_date: '2024-02-01',
          assigned_students: [],
        },
      ]
      localStorage.setItem('teachers', JSON.stringify(mockTeachers))
      teachersStored = JSON.stringify(mockTeachers)
    }

    try {
      const allTeachers = JSON.parse(teachersStored) as Teacher[]

      // 현재 학생에게 배정된 강사들 찾기
      const assigned = allTeachers.filter(t =>
        t.assigned_students?.includes(student.id) && t.status === 'active'
      )
      setAssignedTeachers(assigned)

      // 배정 가능한 강사들 (아직 배정되지 않은 활성 강사들)
      const assignedTeacherIds = new Set(assigned.map(t => t.id))
      const available = allTeachers.filter(t =>
        !assignedTeacherIds.has(t.id) && t.status === 'active'
      )
      setAvailableTeachers(available)
    } catch (error) {
      console.error('Failed to load teachers:', error)
    }
  }, [student.id])

  // Load enrolled classes from localStorage
  useEffect(() => {
    let classesStored = localStorage.getItem('classes')
    let enrollmentsStored = localStorage.getItem('class_students')

    // Initialize with mock data if not exists
    if (!classesStored) {
      const mockClasses: Class[] = [
        {
          id: 'class-1',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          org_id: 'org-1',
          name: '수학 특강반',
          subject: '수학',
          teacher_id: 'teacher-1',
          teacher_name: '김선생',
          capacity: 20,
          current_students: 5,
          schedule: [
            { day: '월', start_time: '14:00', end_time: '16:00' },
            { day: '수', start_time: '14:00', end_time: '16:00' },
          ],
          room: 'A301',
          status: 'active',
          notes: '고급 수학 과정',
        },
        {
          id: 'class-2',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          org_id: 'org-1',
          name: '영어 회화반',
          subject: '영어',
          teacher_id: 'teacher-2',
          teacher_name: '이선생',
          capacity: 15,
          current_students: 8,
          schedule: [
            { day: '화', start_time: '16:00', end_time: '18:00' },
            { day: '목', start_time: '16:00', end_time: '18:00' },
          ],
          room: 'B201',
          status: 'active',
        },
        {
          id: 'class-3',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          org_id: 'org-1',
          name: '과학 실험반',
          subject: '과학',
          teacher_id: 'teacher-3',
          teacher_name: '박선생',
          capacity: 12,
          current_students: 10,
          schedule: [
            { day: '금', start_time: '15:00', end_time: '17:00' },
          ],
          room: '실험실',
          status: 'active',
        },
      ]
      localStorage.setItem('classes', JSON.stringify(mockClasses))
      classesStored = JSON.stringify(mockClasses)
    }

    if (!enrollmentsStored) {
      localStorage.setItem('class_students', JSON.stringify([]))
      enrollmentsStored = '[]'
    }

    try {
      const allClasses = JSON.parse(classesStored) as Class[]
      const allEnrollments = JSON.parse(enrollmentsStored) as ClassStudent[]

      // Get student's active enrollments
      const studentEnrollments = allEnrollments.filter(
        e => e.student_id === student.id && e.status === 'active'
      )

      // Join with class data
      const enrolled = studentEnrollments
        .map(enrollment => {
          const classData = allClasses.find(c => c.id === enrollment.class_id)
          if (classData) {
            return { ...classData, enrollment_id: enrollment.id }
          }
          return null
        })
        .filter((c): c is Class & { enrollment_id: string } => c !== null)

      setEnrolledClasses(enrolled)

      // Get available classes (not enrolled and active)
      const enrolledClassIds = new Set(enrolled.map(c => c.id))
      const available = allClasses.filter(
        c => !enrolledClassIds.has(c.id) && c.status === 'active'
      )
      setAvailableClasses(available)
    } catch (error) {
      console.error('Failed to load classes:', error)
    }
  }, [student.id])

  const handleServiceToggle = (serviceType: 'academy' | 'study_room' | 'study_center', checked: boolean) => {
    const stored = localStorage.getItem('service_enrollments')
    let allEnrollments: ServiceEnrollment[] = stored ? JSON.parse(stored) : []

    if (checked) {
      // Add enrollment
      const newEnrollment: ServiceEnrollment = {
        id: `enrollment-${Date.now()}`,
        created_at: new Date().toISOString(),
        student_id: student.id,
        service_type: serviceType,
        status: 'active',
        enrolled_at: new Date().toISOString(),
      }
      allEnrollments.push(newEnrollment)
      setServiceEnrollments([...serviceEnrollments, newEnrollment])
    } else {
      // Remove enrollment
      allEnrollments = allEnrollments.map(e =>
        e.student_id === student.id && e.service_type === serviceType
          ? { ...e, status: 'inactive' as const }
          : e
      )
      setServiceEnrollments(serviceEnrollments.filter(e => e.service_type !== serviceType))
    }

    localStorage.setItem('service_enrollments', JSON.stringify(allEnrollments))
  }

  const handleFieldChange = (field: keyof Student, value: any) => {
    setLocalStudent({ ...localStudent, [field]: value })
  }

  // Format phone number to remove dashes
  const handlePhoneChange = (field: 'phone' | 'parent_phone', value: string) => {
    // Remove all non-numeric characters
    const numericOnly = value.replace(/[^0-9]/g, '')
    setLocalStudent({ ...localStudent, [field]: numericOnly })
  }

  const handleAddClass = () => {
    if (!selectedClassId && !selectedTeacherId) return

    if (selectedClassId) {
      // 그룹 수업 등록
      const enrollmentsStored = localStorage.getItem('class_students')
      let allEnrollments: ClassStudent[] = enrollmentsStored ? JSON.parse(enrollmentsStored) : []

      const newEnrollment: ClassStudent = {
        id: `enrollment-${Date.now()}`,
        class_id: selectedClassId,
        student_id: student.id,
        joined_at: new Date().toISOString(),
        status: 'active',
      }

      allEnrollments.push(newEnrollment)
      localStorage.setItem('class_students', JSON.stringify(allEnrollments))

      // Update state
      const selectedClass = availableClasses.find(c => c.id === selectedClassId)
      if (selectedClass) {
        setEnrolledClasses([...enrolledClasses, { ...selectedClass, enrollment_id: newEnrollment.id }])
        setAvailableClasses(availableClasses.filter(c => c.id !== selectedClassId))
      }
    } else if (selectedTeacherId) {
      // 1:1 강습 등록 - Teacher의 assigned_students에 추가
      const teachersStored = localStorage.getItem('teachers')
      if (!teachersStored) return

      let allTeachers: Teacher[] = JSON.parse(teachersStored)

      // Teacher의 assigned_students 배열에 학생 추가
      allTeachers = allTeachers.map(t => {
        if (t.id === selectedTeacherId) {
          const assignedStudents = t.assigned_students || []
          return {
            ...t,
            assigned_students: [...assignedStudents, student.id],
            updated_at: new Date().toISOString(),
          }
        }
        return t
      })

      localStorage.setItem('teachers', JSON.stringify(allTeachers))

      // Update state
      const selectedTeacher = availableTeachers.find(t => t.id === selectedTeacherId)
      if (selectedTeacher) {
        const updatedTeacher = {
          ...selectedTeacher,
          assigned_students: [...(selectedTeacher.assigned_students || []), student.id],
        }
        setAssignedTeachers([...assignedTeachers, updatedTeacher])
        setAvailableTeachers(availableTeachers.filter(t => t.id !== selectedTeacherId))
      }
    }

    setIsAddClassDialogOpen(false)
    setSelectedClassId('')
    setSelectedTeacherId('')
  }

  const handleRemoveClass = (enrollmentId: string, classId: string) => {
    const enrollmentsStored = localStorage.getItem('class_students')
    if (!enrollmentsStored) return

    let allEnrollments: ClassStudent[] = JSON.parse(enrollmentsStored)

    // Set enrollment to inactive
    allEnrollments = allEnrollments.map(e =>
      e.id === enrollmentId ? { ...e, status: 'inactive' as const } : e
    )
    localStorage.setItem('class_students', JSON.stringify(allEnrollments))

    // Update state
    const removedClass = enrolledClasses.find(c => c.enrollment_id === enrollmentId)
    if (removedClass) {
      setEnrolledClasses(enrolledClasses.filter(c => c.enrollment_id !== enrollmentId))
      const { enrollment_id, ...classData } = removedClass
      setAvailableClasses([...availableClasses, classData as Class])
    }
  }

  const handleRemoveTeacher = (teacherId: string) => {
    const teachersStored = localStorage.getItem('teachers')
    if (!teachersStored) return

    let allTeachers: Teacher[] = JSON.parse(teachersStored)

    // Teacher의 assigned_students에서 학생 제거
    allTeachers = allTeachers.map(t => {
      if (t.id === teacherId) {
        const assignedStudents = t.assigned_students || []
        return {
          ...t,
          assigned_students: assignedStudents.filter(sid => sid !== student.id),
          updated_at: new Date().toISOString(),
        }
      }
      return t
    })

    localStorage.setItem('teachers', JSON.stringify(allTeachers))

    // Update state
    const removedTeacher = assignedTeachers.find(t => t.id === teacherId)
    if (removedTeacher) {
      setAssignedTeachers(assignedTeachers.filter(t => t.id !== teacherId))
      setAvailableTeachers([...availableTeachers, removedTeacher])
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Only send columns that exist in DB schema
      const response = await fetch(`/api/students/${localStudent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: localStudent.name,
          phone: localStudent.phone,
          grade: localStudent.grade,
          school: localStudent.school,
          parent_name: localStudent.parent_name,
          parent_phone: localStudent.parent_phone,
          student_code: localStudent.student_code,
          notes: localStudent.notes,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '저장에 실패했습니다.')
      }

      toast({
        title: '저장 완료',
        description: '학생 정보가 저장되었습니다.',
      })

      onUpdate?.(result.student || localStudent)
      onRefresh?.()
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: '저장 오류',
        description: error instanceof Error ? error.message : '저장에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 서비스 소속 */}
      <Card>
        <CardHeader>
          <CardTitle>서비스 소속</CardTitle>
          <CardDescription>학생이 이용하는 서비스를 선택하세요 (복수 선택 가능)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {SERVICE_TYPES.map(({ value, label, icon: Icon, color }) => {
              const isEnrolled = serviceEnrollments.some(e => e.service_type === value)

              return (
                <div
                  key={value}
                  className={`
                    border-2 rounded-lg p-4 cursor-pointer transition-all
                    ${isEnrolled ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                  `}
                  onClick={() => handleServiceToggle(value, !isEnrolled)}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id={value}
                      checked={isEnrolled}
                      onCheckedChange={(checked) => handleServiceToggle(value, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex items-center gap-2 flex-1">
                      <div className={`${color} p-2 rounded`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <Label htmlFor={value} className="cursor-pointer font-medium">
                        {label}
                      </Label>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {serviceEnrollments.length > 0 && (
            <div className="mt-4 flex gap-2">
              <span className="text-sm text-muted-foreground">현재 소속:</span>
              {serviceEnrollments.map(enrollment => {
                const serviceType = SERVICE_TYPES.find(s => s.value === enrollment.service_type)
                return (
                  <Badge key={enrollment.id} variant="secondary">
                    {serviceType?.label}
                  </Badge>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 수강 수업 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>수강 수업</CardTitle>
              <CardDescription>학생이 등록된 수업 목록</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddClassDialogOpen(true)}
              disabled={availableClasses.length === 0 && availableTeachers.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              수업/강사 추가
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {enrolledClasses.length === 0 && assignedTeachers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>등록된 수업이 없습니다</p>
              <p className="text-sm mt-1">수업 추가 버튼을 클릭하여 수업을 등록하세요</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* 배정된 강사들 (1:1) */}
              {assignedTeachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors bg-blue-50/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{teacher.name} 선생님</h4>
                          <Badge variant="secondary" className="bg-blue-600 text-white text-xs">1:1 강습</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{teacher.subjects.join(', ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground ml-8">
                      <div className="flex items-center gap-1">
                        <span>{teacher.employment_type === 'full_time' ? '정규직' : '시간강사'}</span>
                      </div>
                      <span className="text-xs">{teacher.phone}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveTeacher(teacher.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {/* 등록된 수업들 (그룹) */}
              {enrolledClasses.map((classData) => (
                <div
                  key={classData.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="font-semibold">{classData.name}</h4>
                        <p className="text-sm text-muted-foreground">{classData.subject}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground ml-8">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{classData.teacher_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {classData.schedule.map((s, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {s.day} {s.start_time}-{s.end_time}
                          </Badge>
                        ))}
                      </div>
                      {classData.room && (
                        <span className="text-xs">강의실: {classData.room}</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveClass(classData.enrollment_id, classData.id)}
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={localStudent.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="phone">연락처</Label>
              <Input
                id="phone"
                value={localStudent.phone || ''}
                onChange={(e) => handlePhoneChange('phone', e.target.value)}
                placeholder="01012345678"
              />
            </div>

            <div>
              <Label htmlFor="attendance_code">출결 코드 (4자리)</Label>
              <Input
                id="attendance_code"
                value={localStudent.student_code || ''}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 4)
                  handleFieldChange('student_code', value)
                }}
                placeholder="1234"
                maxLength={4}
              />
              <p className="text-xs text-muted-foreground mt-1">
                학생이 출결 체크 시 사용하는 고유 번호입니다
              </p>
            </div>

            <div>
              <Label htmlFor="grade">학년</Label>
              <Select
                value={localStudent.grade || ''}
                onValueChange={(value) => handleFieldChange('grade', value)}
              >
                <SelectTrigger id="grade">
                  <SelectValue placeholder="학년을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="school">학교</Label>
              <Input
                id="school"
                value={localStudent.school || ''}
                onChange={(e) => handleFieldChange('school', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="parent_name">학부모 이름</Label>
              <Input
                id="parent_name"
                value={localStudent.parent_name || ''}
                onChange={(e) => handleFieldChange('parent_name', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="parent_phone">학부모 연락처</Label>
              <Input
                id="parent_phone"
                value={localStudent.parent_phone || ''}
                onChange={(e) => handlePhoneChange('parent_phone', e.target.value)}
                placeholder="01012345678"
              />
            </div>

            <div>
              <Label htmlFor="email">학생 이메일</Label>
              <Input
                id="email"
                type="email"
                value={localStudent.email || ''}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder="student@example.com"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              value={localStudent.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? '저장 중...' : '변경사항 저장'}
        </Button>
      </div>

      {/* 수업 추가 다이얼로그 */}
      <Dialog open={isAddClassDialogOpen} onOpenChange={setIsAddClassDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>수업 추가</DialogTitle>
            <DialogDescription>
              학생을 등록할 수업을 선택하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {availableClasses.length === 0 && availableTeachers.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <p>등록 가능한 수업 또는 강사가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 수업 선택 */}
                {availableClasses.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="class-select">수업 선택 (그룹 수업)</Label>
                    <Select
                      value={selectedClassId}
                      onValueChange={(value) => {
                        setSelectedClassId(value)
                        setSelectedTeacherId('') // 수업 선택 시 강사 선택 초기화
                      }}
                    >
                      <SelectTrigger id="class-select">
                        <SelectValue placeholder="수업을 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableClasses.map((classData) => (
                          <SelectItem key={classData.id} value={classData.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{classData.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {classData.subject} · {classData.teacher_name} · {classData.current_students}/{classData.capacity}명
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 또는 구분선 */}
                {availableClasses.length > 0 && availableTeachers.length > 0 && (
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">또는</span>
                    </div>
                  </div>
                )}

                {/* 강사 선택 */}
                {availableTeachers.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="teacher-select">강사 선택 (1:1 강습)</Label>
                    <Select
                      value={selectedTeacherId}
                      onValueChange={(value) => {
                        setSelectedTeacherId(value)
                        setSelectedClassId('') // 강사 선택 시 수업 선택 초기화
                      }}
                    >
                      <SelectTrigger id="teacher-select">
                        <SelectValue placeholder="강사를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTeachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{teacher.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {teacher.subjects.join(', ')} · {teacher.employment_type === 'full_time' ? '정규직' : '시간강사'}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* 수업 선택 미리보기 */}
                {selectedClassId && (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    {(() => {
                      const selected = availableClasses.find(c => c.id === selectedClassId)
                      if (!selected) return null

                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{selected.name}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                            <div>과목: {selected.subject}</div>
                            <div>강사: {selected.teacher_name}</div>
                            <div>정원: {selected.current_students}/{selected.capacity}명</div>
                            {selected.room && <div>강의실: {selected.room}</div>}
                          </div>
                          <div className="pt-2">
                            <p className="text-xs text-muted-foreground mb-1">수업 시간</p>
                            <div className="flex flex-wrap gap-1">
                              {selected.schedule.map((s, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  {s.day} {s.start_time}-{s.end_time}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* 강사 선택 미리보기 */}
                {selectedTeacherId && (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    {(() => {
                      const selected = availableTeachers.find(t => t.id === selectedTeacherId)
                      if (!selected) return null

                      return (
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-primary" />
                            <span className="font-semibold">{selected.name} 선생님</span>
                            <Badge variant="secondary" className="text-xs">1:1 강습</Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                            <div>담당 과목: {selected.subjects.join(', ')}</div>
                            <div>고용 형태: {selected.employment_type === 'full_time' ? '정규직' : selected.employment_type === 'part_time' ? '시간강사' : '계약직'}</div>
                            <div>이메일: {selected.email}</div>
                            <div>연락처: {selected.phone}</div>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsAddClassDialogOpen(false)
              setSelectedClassId('')
              setSelectedTeacherId('')
            }}>
              취소
            </Button>
            <Button onClick={handleAddClass} disabled={!selectedClassId && !selectedTeacherId}>
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
