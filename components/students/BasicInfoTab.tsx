'use client'

import { useState, useEffect } from 'react'
import type { Student, ServiceEnrollment, Class } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, GraduationCap, BookOpen, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Branch {
  id: string
  name: string
  status?: string
}

interface BasicInfoTabProps {
  student: Student
  onUpdate?: (student: Student) => void
  services?: any[]
  enrollments?: any[]
  loading?: boolean
  onRefresh?: () => void
  branches?: Branch[]
}

const SERVICE_TYPES = [
  { value: 'academy', label: '학원', icon: GraduationCap, color: 'bg-blue-500' },
  { value: 'study_room', label: '독서실', icon: BookOpen, color: 'bg-green-500' },
  { value: 'study_center', label: '공부방', icon: Building2, color: 'bg-purple-500' },
] as const

const parseBranch = (notes?: string) => {
  if (!notes) return ''
  const line = notes.split('\n').find((l) => l.startsWith('지점:'))
  return line ? line.replace('지점:', '').trim() : ''
}

const parseCampuses = (notes?: string) => {
  if (!notes) return [] as string[]
  const line = notes.split('\n').find((l) => l.startsWith('캠퍼스:'))
  if (!line) return []
  return line
    .replace('캠퍼스:', '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// Grade options (StudentSchema와 동일)
const GRADE_OPTIONS = [
  { value: '초1', label: '초1' },
  { value: '초2', label: '초2' },
  { value: '초3', label: '초3' },
  { value: '초4', label: '초4' },
  { value: '초5', label: '초5' },
  { value: '초6', label: '초6' },
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
  onRefresh,
  branches = []
}: BasicInfoTabProps) {
  const { toast } = useToast()
  const [serviceEnrollments, setServiceEnrollments] = useState<ServiceEnrollment[]>([])
  const [localStudent, setLocalStudent] = useState(student)
  const [saving, setSaving] = useState(false)
  const [studentCodeError, setStudentCodeError] = useState<string | null>(null)
  const branchValue = student.branch_name || parseBranch(student.notes) || 'demoSchool'
  const campusValues = student.campuses || parseCampuses(student.notes)
  const placeholderClass = 'placeholder:text-muted-foreground/60'
  const currentCampuses =
    localStudent.campuses && localStudent.campuses.length > 0 ? localStudent.campuses : campusValues

  // Sync local state when student prop changes (including campuses)
  useEffect(() => {
    setLocalStudent(student)
    const campuses = student.campuses || []
    const mapToService = (campus: string): ServiceEnrollment | null => {
      const value =
        campus === '학원' ? 'academy' :
        campus === '독서실' ? 'study_room' :
        campus === '공부방' ? 'study_center' : null
      if (!value) return null
      return {
        id: `enroll-${student.id}-${value}`,
        created_at: new Date().toISOString(),
        student_id: student.id,
        service_type: value as ServiceEnrollment['service_type'],
        status: 'active',
        enrolled_at: new Date().toISOString(),
      }
    }
    setServiceEnrollments(campuses.map(mapToService).filter(Boolean) as ServiceEnrollment[])
  }, [student])

  const handleServiceToggle = (serviceType: 'academy' | 'study_room' | 'study_center', checked: boolean) => {
    // campuses 값을 직접 관리
    const campusLabel =
      serviceType === 'academy' ? '학원' :
      serviceType === 'study_room' ? '독서실' :
      '공부방'

    const nextCampuses = new Set(localStudent.campuses || [])
    if (checked) nextCampuses.add(campusLabel)
    else nextCampuses.delete(campusLabel)

    const nextCampusesArr = Array.from(nextCampuses)
    setLocalStudent({ ...localStudent, campuses: nextCampusesArr })

    // 서비스 표시용 state 동기화
    setServiceEnrollments(
      nextCampusesArr.map((c) => {
        const val =
          c === '학원' ? 'academy' :
          c === '독서실' ? 'study_room' :
          'study_center'
        return {
          id: `enroll-${student.id}-${val}`,
          created_at: new Date().toISOString(),
          student_id: student.id,
          service_type: val as ServiceEnrollment['service_type'],
          status: 'active',
          enrolled_at: new Date().toISOString(),
        }
      })
    )
  }

  const handleFieldChange = (field: keyof Student, value: any) => {
    // 입력 시 해당 필드 에러를 즉시 해제
    if (field === 'student_code') {
      setStudentCodeError(null)
    }
    setLocalStudent({ ...localStudent, [field]: value })
  }

  // Format phone number to remove dashes
  const handlePhoneChange = (field: 'phone' | 'parent_phone', value: string) => {
    // Remove all non-numeric characters
    const numericOnly = value.replace(/[^0-9]/g, '')
    setLocalStudent({ ...localStudent, [field]: numericOnly })
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
          email: (localStudent as any).email,
          student_code: localStudent.student_code,
          notes: localStudent.notes,
          branch_name: localStudent.branch_name || branchValue,
          campuses: localStudent.campuses || campusValues,
        }),
      })

      const result = await response.json() as { error?: string; student?: Student }

      if (!response.ok) {
        // 중복 코드 에러를 필드에 표시
        const errorMsg: string = result.error || '저장에 실패했습니다.'
        if (errorMsg.includes('student_code') || errorMsg.toLowerCase().includes('duplicate key')) {
          setStudentCodeError('이미 사용 중인 출결 코드입니다. 다른 코드를 입력하세요.')
        }
        throw new Error(errorMsg)
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
      {/* 기본 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">서비스 소속</Label>
              <span className="text-xs text-muted-foreground">(복수 선택 가능)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SERVICE_TYPES.map(({ value, label, icon: Icon, color }) => {
                const isEnrolled = serviceEnrollments.some((e) => e.service_type === value)
                return (
                  <Button
                    key={value}
                    type="button"
                    size="sm"
                    variant={isEnrolled ? 'default' : 'outline'}
                    className={`gap-2 rounded-full px-3 ${isEnrolled ? 'shadow-sm' : ''}`}
                    onClick={() => handleServiceToggle(value, !isEnrolled)}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </Button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              학생이 이용하는 서비스를 선택하세요.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={localStudent.name || ''}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className={placeholderClass}
              />
            </div>

            <div>
              <Label htmlFor="phone">연락처</Label>
              <Input
                id="phone"
                value={localStudent.phone || ''}
                onChange={(e) => handlePhoneChange('phone', e.target.value)}
                placeholder="01012345678"
                className={placeholderClass}
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
                className={placeholderClass}
              />
              {studentCodeError ? (
                <p className="text-sm text-destructive mt-1">{studentCodeError}</p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  학생이 출결 체크 시 사용하는 고유 번호입니다
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="branch_name">지점</Label>
              <Select
                value={localStudent.branch_name || branchValue || ''}
                onValueChange={(value) => handleFieldChange('branch_name', value)}
              >
                <SelectTrigger id="branch_name">
                  <SelectValue placeholder="지점을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {branches.length > 0 ? (
                    <>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.name}>
                          {branch.name}
                        </SelectItem>
                      ))}
                      {/* 현재 학생의 branch_name이 목록에 없으면 추가 */}
                      {localStudent.branch_name && !branches.some(b => b.name === localStudent.branch_name) && (
                        <SelectItem value={localStudent.branch_name}>
                          {localStudent.branch_name}
                        </SelectItem>
                      )}
                    </>
                  ) : (
                    <SelectItem value={branchValue || 'demoSchool'}>
                      {branchValue || 'demoSchool'}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
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
                className={placeholderClass}
              />
            </div>

            <div>
              <Label htmlFor="parent_name">학부모 이름</Label>
              <Input
                id="parent_name"
                value={localStudent.parent_name || ''}
                onChange={(e) => handleFieldChange('parent_name', e.target.value)}
                className={placeholderClass}
              />
            </div>

            <div>
              <Label htmlFor="parent_phone">학부모 연락처</Label>
              <Input
                id="parent_phone"
                value={localStudent.parent_phone || ''}
                onChange={(e) => handlePhoneChange('parent_phone', e.target.value)}
                placeholder="01012345678"
                className={placeholderClass}
              />
            </div>

            <div>
              <Label htmlFor="parent_email">학부모 이메일</Label>
              <Input
                id="parent_email"
                type="email"
                value={(localStudent as any).parent_email || ''}
                onChange={(e) => handleFieldChange('parent_email', e.target.value)}
                placeholder="parent@example.com"
                className={placeholderClass}
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
              className={placeholderClass}
            />
          </div>
        </CardContent>
      </Card>

      {/* 수강 수업 */}
      <Card>
        <CardHeader>
          <CardTitle>수강 수업</CardTitle>
          <CardDescription>학생이 등록된 수업 목록</CardDescription>
        </CardHeader>
        <CardContent>
          {!enrollments || enrollments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>등록된 수업이 없습니다</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-sm">반이름</th>
                    <th className="text-left px-4 py-3 font-medium text-sm">과목</th>
                    <th className="text-left px-4 py-3 font-medium text-sm">강사</th>
                    <th className="text-left px-4 py-3 font-medium text-sm">강의실</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {enrollments.map((enrollment: any) => {
                    const classData = enrollment.classes
                    if (!classData) return null
                    return (
                      <tr key={enrollment.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">{classData.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{classData.subject}</td>
                        <td className="px-4 py-3 text-muted-foreground">{classData.teachers?.name || classData.teacher_name || '-'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{classData.room || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? '저장 중...' : '변경사항 저장'}
        </Button>
      </div>
    </div>
  )
}
