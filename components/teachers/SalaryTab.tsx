'use client'

import { useState } from 'react'
import type { Teacher } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, Clock, Calendar } from 'lucide-react'

interface SalaryTabProps {
  teacher: Teacher
}

const normalizeNumber = (value: number | null | undefined, fallback = 0) =>
  typeof value === 'number' && !Number.isNaN(value) ? value : fallback

// Mock salary data
const generateDummySalaryRecords = (teacher: Teacher) => {
  const salaryType = teacher.salary_type === 'hourly' || teacher.salary_type === 'monthly' ? teacher.salary_type : 'monthly'
  const salaryAmount = normalizeNumber(teacher.salary_amount)
  const records = []
  for (let i = 0; i < 6; i++) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)

    const hoursWorked = salaryType === 'hourly' ? Math.floor(Math.random() * 40) + 60 : 0
    const amount =
      salaryType === 'monthly'
        ? salaryAmount
        : hoursWorked * salaryAmount

    records.push({
      id: `salary-${i}`,
      month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      monthLabel: date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' }),
      hoursWorked,
      amount,
      status: i === 0 ? 'pending' : 'paid',
    })
  }
  return records
}

export function SalaryTab({ teacher }: SalaryTabProps) {
  const salaryType = teacher.salary_type === 'hourly' || teacher.salary_type === 'monthly' ? teacher.salary_type : 'monthly'
  const salaryAmount = normalizeNumber(teacher.salary_amount)
  const [salaryRecords] = useState(generateDummySalaryRecords({ ...teacher, salary_type: salaryType, salary_amount: salaryAmount }))

  const totalPaid = salaryRecords
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + r.amount, 0)
  const thisMonthAmount = salaryRecords[0]?.amount ?? 0
  const paidCount = salaryRecords.filter((r) => r.status === 'paid').length || 1
  const avgMonthly = Math.floor(totalPaid / paidCount)

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-2 border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">이번 달 급여</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {thisMonthAmount.toLocaleString()}원
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {salaryRecords[0].status === 'pending' ? '미지급' : '지급 완료'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">누적 지급액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPaid.toLocaleString()}원</div>
            <p className="text-xs text-muted-foreground mt-1">
              {salaryRecords.filter((r) => r.status === 'paid').length}개월
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">월 평균 급여</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMonthly.toLocaleString()}원</div>
          </CardContent>
        </Card>
      </div>

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
          {salaryType === 'hourly' && (
            <>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <span className="text-sm font-medium">이번 달 근무 시간</span>
                <span className="font-semibold">{salaryRecords[0].hoursWorked}시간</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <span className="text-sm font-medium">총 근무 시간</span>
                <span className="font-semibold">
                  {salaryRecords.reduce((sum, r) => sum + r.hoursWorked, 0)}시간
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Salary Records */}
      <Card>
        <CardHeader>
          <CardTitle>급여 지급 내역</CardTitle>
          <CardDescription>월별 급여 지급 기록</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {salaryRecords.map((record) => (
              <div
                key={record.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="font-medium">{record.monthLabel}</span>
                    <Badge variant={record.status === 'paid' ? 'default' : 'secondary'}>
                      {record.status === 'paid' ? '지급 완료' : '미지급'}
                    </Badge>
                  </div>
                  {teacher.salary_type === 'hourly' && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground ml-6">
                      <Clock className="h-3 w-3" />
                      <span>{record.hoursWorked}시간 근무</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold">{record.amount.toLocaleString()}원</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
