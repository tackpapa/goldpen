'use client'

import { useState } from 'react'
import type { Teacher } from '@/lib/types/database'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useToast } from '@/hooks/use-toast'

interface BasicInfoTabProps {
  teacher: Teacher
  onUpdate?: (teacher: Teacher) => void
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

const normalizeSubjects = (subjects: Teacher['subjects']) => {
  if (Array.isArray(subjects)) return subjects.filter((s): s is string => Boolean(s))
  if (typeof subjects === 'string')
    return (subjects as string)
      .split(',')
      .map((s: any) => s.trim())
      .filter(Boolean)
  return []
}

export function BasicInfoTab({ teacher, onUpdate }: BasicInfoTabProps) {
  const { toast } = useToast()
  const [localTeacher, setLocalTeacher] = useState({
    ...teacher,
    subjects: normalizeSubjects(teacher.subjects),
  })
  const [subjectInput, setSubjectInput] = useState('')

  const handleFieldChange = (field: keyof Teacher, value: any) => {
    setLocalTeacher({ ...localTeacher, [field]: value })
  }

  const handlePhoneChange = (value: string) => {
    const numericOnly = value.replace(/[^0-9]/g, '')
    setLocalTeacher({ ...localTeacher, phone: numericOnly })
  }

  const handleAddSubject = () => {
    const value = subjectInput.trim()
    if (value && !localTeacher.subjects?.includes(value)) {
      setLocalTeacher({
        ...localTeacher,
        subjects: [...(localTeacher.subjects ?? []), value],
      })
      setSubjectInput('')
    }
  }

  const handleRemoveSubject = (subject: string) => {
    setLocalTeacher({
      ...localTeacher,
      subjects: (localTeacher.subjects ?? []).filter((s: any) => s !== subject),
    })
  }

  const handleSave = () => {
    onUpdate?.(localTeacher)
    toast({
      title: '저장 완료',
      description: '강사 정보가 업데이트되었습니다.',
    })
  }

  return (
    <div className="space-y-6">
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
                value={localTeacher.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                value={localTeacher.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="01012345678"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={localTeacher.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="hire_date">입사일</Label>
              <Input
                id="hire_date"
                type="date"
                value={localTeacher.hire_date}
                onChange={(e) => handleFieldChange('hire_date', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="status">상태</Label>
              <Select
                value={localTeacher.status}
                onValueChange={(value: 'active' | 'inactive') => handleFieldChange('status', value)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">재직</SelectItem>
                  <SelectItem value="inactive">휴직</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>담당 과목</Label>
            <div className="flex gap-2 mt-2">
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
              {(localTeacher.subjects ?? []).map((subject: any) => (
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

          <div>
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              value={localTeacher.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* 고용 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>고용 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employment_type">고용 형태</Label>
              <Select
                value={localTeacher.employment_type}
                onValueChange={(value: 'full_time' | 'part_time' | 'contract') =>
                  handleFieldChange('employment_type', value)
                }
              >
                <SelectTrigger id="employment_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">정규직</SelectItem>
                  <SelectItem value="part_time">시간강사</SelectItem>
                  <SelectItem value="contract">계약직</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="salary_type">급여 유형</Label>
              <Select
                value={localTeacher.salary_type}
                onValueChange={(value: 'monthly' | 'hourly') =>
                  handleFieldChange('salary_type', value)
                }
              >
                <SelectTrigger id="salary_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">월급</SelectItem>
                  <SelectItem value="hourly">시급</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label htmlFor="salary_amount">급여 금액</Label>
              <Input
                id="salary_amount"
                type="number"
                value={localTeacher.salary_amount}
                onChange={(e) => handleFieldChange('salary_amount', Number(e.target.value))}
                placeholder="3000000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {localTeacher.salary_type === 'monthly' ? '월급 (원)' : '시급 (원/시간)'}
              </p>
            </div>

            <div>
              <Label htmlFor="payment_day">급여일</Label>
              <Select
                value={localTeacher.payment_day?.toString() || '25'}
                onValueChange={(value) => handleFieldChange('payment_day', Number(value))}
              >
                <SelectTrigger id="payment_day">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day}일
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                매월 급여 지급일 (1-31일)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button onClick={handleSave}>변경사항 저장</Button>
      </div>
    </div>
  )
}
