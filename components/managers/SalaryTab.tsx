'use client'

import type { Manager } from './ManagerDetailModal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface SalaryTabProps {
  manager: Manager
}

export function SalaryTab({ manager }: SalaryTabProps) {
  const salaryType = manager.salary_type
  const salaryAmount = manager.salary_amount || 0
  const hireDate = manager.hire_date

  // 현재 월 급여 기간 계산
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  // 급여 기간: 매월 1일 ~ 말일
  const periodStart = new Date(currentYear, currentMonth, 1)
  const periodEnd = new Date(currentYear, currentMonth + 1, 0)

  // 지급일: 다음달 10일 (예시)
  const paymentDate = new Date(currentYear, currentMonth + 1, 10)

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  // 일할 계산 (입사 첫 달인 경우)
  let isProrated = false
  let proratedDays = 0
  let totalDays = periodEnd.getDate()
  let totalAmount = salaryType === 'monthly' ? salaryAmount : 0

  if (hireDate && salaryType === 'monthly') {
    const hireDateObj = new Date(hireDate)
    if (
      hireDateObj.getFullYear() === currentYear &&
      hireDateObj.getMonth() === currentMonth
    ) {
      isProrated = true
      proratedDays = totalDays - hireDateObj.getDate() + 1
      totalAmount = Math.round((salaryAmount / totalDays) * proratedDays)
    }
  }

  return (
    <div className="space-y-6">
      {/* Period Info */}
      <Card className="bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">급여 기간</p>
              <p className="text-lg font-semibold">
                {formatDate(periodStart)} ~ {formatDate(periodEnd)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">지급 예정일</p>
              <p className="text-lg font-semibold text-primary">
                {formatDate(paymentDate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Amount */}
      <Card className="border-2 border-primary">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">이번 기간 급여</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            {totalAmount.toLocaleString()}원
          </div>
          {isProrated && (
            <p className="text-xs text-muted-foreground mt-2">
              ⓘ 일할 계산: {proratedDays}일 / {totalDays}일
            </p>
          )}
        </CardContent>
      </Card>

      {/* Salary Type Info */}
      <Card>
        <CardHeader>
          <CardTitle>급여 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
            <span className="text-sm font-medium">급여 유형</span>
            <Badge variant="secondary">
              {salaryType === 'monthly' ? '월급제' : '시급제'}
            </Badge>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
            <span className="text-sm font-medium">기본 급여</span>
            <span className="font-semibold">
              {salaryAmount.toLocaleString()}원
              {salaryType === 'hourly' && '/시간'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
            <span className="text-sm font-medium">고용 형태</span>
            <span className="font-semibold">
              {manager.employment_type === 'full_time'
                ? '정규직'
                : manager.employment_type === 'part_time'
                ? '파트타임'
                : '계약직'}
            </span>
          </div>
          {hireDate && (
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
              <span className="text-sm font-medium">입사일</span>
              <span className="font-semibold">{hireDate}</span>
            </div>
          )}
          {isProrated && (
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800">
              <span className="text-sm font-medium">첫 달 일할 계산</span>
              <span className="font-semibold text-yellow-700 dark:text-yellow-500">
                {proratedDays}일 근무
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 시급제의 경우 근무 시간 입력 안내 */}
      {salaryType === 'hourly' && (
        <Card>
          <CardHeader>
            <CardTitle>근무 시간 기록</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              시급제 매니저의 근무 시간 기록 기능은 준비 중입니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
