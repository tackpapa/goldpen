'use client'

import { useState, useEffect, useRef } from 'react'
import type { Teacher } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface SalaryTabProps {
  teacher: Teacher
}

interface SalaryData {
  period: {
    start_date: string
    end_date: string
    payment_date: string
  }
  salary_type: 'hourly' | 'monthly'
  total_amount: number
  hourly_details?: {
    hourly_rate: number
    total_hours: number
    lessons: Array<{
      date: string
      duration_minutes: number
      duration_hours: number
      subject: string
      class_name?: string
      amount: number
    }>
  }
  monthly_details?: {
    base_salary: number
    is_prorated: boolean
    proration_days?: number
    total_days?: number
    hire_date: string
  }
}

const normalizeNumber = (value: number | null | undefined, fallback = 0) =>
  typeof value === 'number' && !Number.isNaN(value) ? value : fallback

export function SalaryTab({ teacher }: SalaryTabProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null)
  const [displayCount, setDisplayCount] = useState(10)
  const observerTarget = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchSalary = async () => {
      try {
        setLoading(true)
        setError(null)

        // 현재 월 급여 조회
        const response = await fetch(`/api/teachers/${teacher.id}/salary`)
        if (!response.ok) {
          const result = await response.json()
          throw new Error(result.error || '급여 정보 조회 실패')
        }

        const data = await response.json()
        setSalaryData(data)
        setDisplayCount(10) // Reset display count when data changes
      } catch (err) {
        console.error('[SalaryTab] Error fetching salary:', err)
        setError(err instanceof Error ? err.message : '알 수 없는 오류')
      } finally {
        setLoading(false)
      }
    }

    if (teacher.id) {
      fetchSalary()
    }
  }, [teacher.id])

  // Infinite scroll for lessons list
  useEffect(() => {
    if (!salaryData?.hourly_details?.lessons) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayCount < salaryData.hourly_details!.lessons.length) {
          setDisplayCount(prev => Math.min(prev + 10, salaryData.hourly_details!.lessons.length))
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [displayCount, salaryData])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">급여 정보 로딩 중...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-destructive mb-2">❌ 오류: {error}</p>
        <p className="text-sm text-muted-foreground">급여 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  if (!salaryData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">급여 정보가 없습니다.</p>
      </div>
    )
  }

  const salaryType = salaryData.salary_type
  const totalAmount = salaryData.total_amount
  const salaryAmount = teacher.salary_amount || 0

  return (
    <div className="space-y-6">
      {/* Period Info */}
      <Card className="bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">급여 기간</p>
              <p className="text-lg font-semibold">
                {salaryData.period.start_date} ~ {salaryData.period.end_date}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">지급일</p>
              <p className="text-lg font-semibold text-primary">
                {salaryData.period.payment_date}
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
          {salaryData.monthly_details?.is_prorated && (
            <p className="text-xs text-muted-foreground mt-2">
              ⓘ 일할 계산: {salaryData.monthly_details.proration_days}일 /{' '}
              {salaryData.monthly_details.total_days}일
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
          {salaryData.hourly_details && (
            <>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <span className="text-sm font-medium">총 근무 시간</span>
                <span className="font-semibold">{salaryData.hourly_details.total_hours}시간</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <span className="text-sm font-medium">총 수업 횟수</span>
                <span className="font-semibold">{salaryData.hourly_details.lessons.length}회</span>
              </div>
            </>
          )}
          {salaryData.monthly_details && (
            <>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded">
                <span className="text-sm font-medium">입사일</span>
                <span className="font-semibold">{salaryData.monthly_details.hire_date}</span>
              </div>
              {salaryData.monthly_details.is_prorated && (
                <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded border border-yellow-200 dark:border-yellow-800">
                  <span className="text-sm font-medium">첫 달 일할 계산</span>
                  <span className="font-semibold text-yellow-700 dark:text-yellow-500">
                    {salaryData.monthly_details.proration_days}일 근무
                  </span>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Hourly Details: Lessons */}
      {salaryData.hourly_details && salaryData.hourly_details.lessons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>수업 내역</CardTitle>
            <CardDescription>
              급여 기간 내 진행한 수업 목록 (스크롤하여 더 보기)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>반</TableHead>
                    <TableHead>과목</TableHead>
                    <TableHead>수업시간</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryData.hourly_details.lessons.slice(0, displayCount).map((lesson, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{lesson.date}</TableCell>
                      <TableCell>{lesson.class_name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{lesson.subject}</Badge>
                      </TableCell>
                      <TableCell>{lesson.duration_hours}시간</TableCell>
                      <TableCell className="text-right font-semibold">
                        {lesson.amount.toLocaleString()}원
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Infinite Scroll Trigger */}
              <div ref={observerTarget} className="h-4" />

              {/* No More Data */}
              {displayCount >= salaryData.hourly_details.lessons.length && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  모든 수업 내역을 불러왔습니다. (총 {salaryData.hourly_details.lessons.length}건)
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hourly: No Lessons */}
      {salaryData.hourly_details && salaryData.hourly_details.lessons.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>수업 내역</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground py-8">
              이번 기간에 진행한 수업이 없습니다.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
