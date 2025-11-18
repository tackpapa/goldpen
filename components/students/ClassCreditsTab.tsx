'use client'

import { useState, useEffect } from 'react'
import type { Student } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, TrendingUp, User, Calendar as CalendarIcon } from 'lucide-react'

interface CreditUsage {
  id: string
  date: string
  teacher_name: string
  class_time: string
  hours_used: number
  subject: string
}

interface ClassCreditsTabProps {
  student: Student
}

// 대량 더미 이용 내역 생성
const generateDummyCreditUsages = (): CreditUsage[] => {
  const teachers = ['김선생', '이선생', '박선생', '최선생', '정선생']
  const subjects = ['수학', '영어', '과학', '국어', '사회']
  const usages: CreditUsage[] = []

  // 80개 이용 내역 생성 (최근 4개월)
  for (let i = 0; i < 80; i++) {
    const daysAgo = Math.floor(i / 2) // 하루에 2개 수업
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)

    const startHour = [9, 11, 13, 14, 16, 18][Math.floor(Math.random() * 6)]
    const duration = [1, 1.5, 2, 2.5][Math.floor(Math.random() * 4)]
    const endHour = startHour + duration

    usages.push({
      id: `usage-${i}`,
      date: date.toISOString().split('T')[0],
      teacher_name: teachers[Math.floor(Math.random() * teachers.length)],
      class_time: `${startHour.toString().padStart(2, '0')}:00-${Math.floor(endHour).toString().padStart(2, '0')}:${endHour % 1 === 0.5 ? '30' : '00'}`,
      hours_used: duration,
      subject: subjects[Math.floor(Math.random() * subjects.length)],
    })
  }

  return usages.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function ClassCreditsTab({ student }: ClassCreditsTabProps) {
  const [creditUsages] = useState<CreditUsage[]>(generateDummyCreditUsages())

  // 통계 계산
  const currentCredits = 48.5 // 현재 남은 크레딧
  const totalUsedCredits = creditUsages.reduce((sum, u) => sum + u.hours_used, 0)
  const totalChargedCredits = currentCredits + totalUsedCredits

  return (
    <div className="space-y-6">
      {/* 크레딧 통계 */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-2 border-primary">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">현재 보유 크레딧</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{currentCredits}시간</div>
            <p className="text-xs text-muted-foreground mt-1">사용 가능</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">누적 사용 크레딧</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600">{totalUsedCredits}시간</div>
            <p className="text-xs text-muted-foreground mt-1">총 {creditUsages.length}회 수업</p>
          </CardContent>
        </Card>
      </div>

      {/* 크레딧 이용 내역 */}
      <Card>
        <CardHeader>
          <CardTitle>크레딧 이용 내역</CardTitle>
          <CardDescription>수업 참여 기록 ({creditUsages.length}건)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {creditUsages.map(usage => (
              <div
                key={usage.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-semibold">
                      {usage.subject}
                    </Badge>
                    <span className="font-medium">{usage.teacher_name}</span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {new Date(usage.date).toLocaleDateString('ko-KR', {
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {usage.class_time}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-bold text-orange-600">-{usage.hours_used}시간</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
