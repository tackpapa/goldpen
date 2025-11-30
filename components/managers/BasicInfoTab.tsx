'use client'

import { useState } from 'react'
import type { Manager } from './ManagerDetailModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { useToast } from '@/hooks/use-toast'

interface BasicInfoTabProps {
  manager: Manager
  onUpdate?: (manager: Manager) => void
}

export function BasicInfoTab({ manager, onUpdate }: BasicInfoTabProps) {
  const { toast } = useToast()
  const [localManager, setLocalManager] = useState({ ...manager })

  const handleFieldChange = (field: keyof Manager, value: any) => {
    setLocalManager({ ...localManager, [field]: value })
  }

  const handlePhoneChange = (value: string) => {
    const numericOnly = value.replace(/[^0-9]/g, '')
    setLocalManager({ ...localManager, phone: numericOnly })
  }

  const handleSave = () => {
    onUpdate?.(localManager)
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
                value={localManager.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                value={localManager.phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="01012345678"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={localManager.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="hire_date">입사일</Label>
              <Input
                id="hire_date"
                type="date"
                value={localManager.hire_date || ''}
                onChange={(e) => handleFieldChange('hire_date', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="status">상태</Label>
              <Select
                value={localManager.status}
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
            <Label htmlFor="notes">메모</Label>
            <Textarea
              id="notes"
              value={localManager.notes || ''}
              onChange={(e) => handleFieldChange('notes', e.target.value)}
              rows={4}
              placeholder="매니저에 대한 메모를 입력하세요..."
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
                value={localManager.employment_type}
                onValueChange={(value: 'full_time' | 'part_time' | 'contract') =>
                  handleFieldChange('employment_type', value)
                }
              >
                <SelectTrigger id="employment_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full_time">정규직</SelectItem>
                  <SelectItem value="part_time">파트타임</SelectItem>
                  <SelectItem value="contract">계약직</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="salary_type">급여 유형</Label>
              <Select
                value={localManager.salary_type}
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

            <div>
              <Label htmlFor="salary_amount">급여 금액</Label>
              <Input
                id="salary_amount"
                type="number"
                value={localManager.salary_amount}
                onChange={(e) => handleFieldChange('salary_amount', Number(e.target.value))}
                placeholder="3000000"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {localManager.salary_type === 'monthly' ? '월급 (원)' : '시급 (원/시간)'}
              </p>
            </div>

            <div>
              <Label htmlFor="payment_day">급여일</Label>
              <Select
                value={localManager.payment_day?.toString() || '25'}
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
