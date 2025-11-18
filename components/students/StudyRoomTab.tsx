'use client'

import { useState } from 'react'
import type { Student } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Calendar as CalendarIcon, Clock, TrendingUp } from 'lucide-react'

interface StudyRoomUsageRecord {
  id: string
  date: string
  check_in: string
  check_out: string
  duration_hours: number
}

interface StudyRoomTabProps {
  student: Student
}

// 대량 더미 독서실 이용 내역 생성
const generateDummyStudyRoomUsages = (): StudyRoomUsageRecord[] => {
  const usages: StudyRoomUsageRecord[] = []

  // 100개 이용 내역 생성 (최근 3개월)
  for (let i = 0; i < 100; i++) {
    const daysAgo = Math.floor(i / 3) // 하루에 보통 3번 입퇴실 (아침, 점심 후, 저녁)
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)

    const sessionType = i % 3 // 0: 아침, 1: 오후, 2: 저녁
    let checkInHour, duration

    if (sessionType === 0) {
      checkInHour = 9 + Math.floor(Math.random() * 2) // 9-10시
      duration = 2 + Math.random() * 2 // 2-4시간
    } else if (sessionType === 1) {
      checkInHour = 13 + Math.floor(Math.random() * 2) // 13-14시
      duration = 3 + Math.random() * 3 // 3-6시간
    } else {
      checkInHour = 18 + Math.floor(Math.random() * 2) // 18-19시
      duration = 2 + Math.random() * 3 // 2-5시간
    }

    const checkOutHour = checkInHour + duration

    const checkIn = `${checkInHour.toString().padStart(2, '0')}:${(Math.random() * 60).toFixed(0).padStart(2, '0')}`
    const checkOut = `${Math.floor(checkOutHour).toString().padStart(2, '0')}:${((checkOutHour % 1) * 60).toFixed(0).padStart(2, '0')}`

    usages.push({
      id: `study-usage-${i}`,
      date: date.toISOString().split('T')[0],
      check_in: checkIn,
      check_out: checkOut,
      duration_hours: Number(duration.toFixed(1)),
    })
  }

  return usages.sort((a, b) => {
    const dateCompare = new Date(b.date).getTime() - new Date(a.date).getTime()
    if (dateCompare !== 0) return dateCompare
    return b.check_in.localeCompare(a.check_in)
  })
}

export function StudyRoomTab({ student }: StudyRoomTabProps) {
  const [usages] = useState<StudyRoomUsageRecord[]>(generateDummyStudyRoomUsages())

  // 통계 계산
  const totalHours = usages.reduce((sum, u) => sum + u.duration_hours, 0)
  const averageHoursPerDay = totalHours / usages.length
  const thisMonthUsages = usages.filter(u => {
    const usageDate = new Date(u.date)
    const now = new Date()
    return usageDate.getMonth() === now.getMonth() && usageDate.getFullYear() === now.getFullYear()
  })
  const thisMonthHours = thisMonthUsages.reduce((sum, u) => sum + u.duration_hours, 0)

  // 현재 활성 이용권
  const activePass = {
    type: 'days' as const,
    remaining: 23,
    total: 30,
    expiry_date: '2025-12-18',
  }

  return (
    <div className="space-y-6">
      {/* 이용권 정보 */}
      <Card className="border-2 border-blue-500">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle>현재 이용권</CardTitle>
            <Badge variant="default">사용 가능</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-600">
                {activePass.remaining}{activePass.type === 'days' ? '일' : '시간'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                총 {activePass.total}{activePass.type === 'days' ? '일' : '시간'} 중 남은 기간
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">만료일</p>
              <p className="text-lg font-semibold">{activePass.expiry_date}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 이용 통계 */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">이번 달 이용</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthHours.toFixed(1)}시간</div>
            <p className="text-xs text-muted-foreground mt-1">{thisMonthUsages.length}회 방문</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">총 이용 시간</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}시간</div>
            <p className="text-xs text-muted-foreground mt-1">총 {usages.length}회</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">평균 이용 시간</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageHoursPerDay.toFixed(1)}시간</div>
            <p className="text-xs text-muted-foreground mt-1">회당 평균</p>
          </CardContent>
        </Card>
      </div>

      {/* 이용 내역 */}
      <Card>
        <CardHeader>
          <CardTitle>독서실 이용 내역</CardTitle>
          <CardDescription>입퇴실 기록 ({usages.length}건)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {usages.map(usage => (
              <div
                key={usage.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">
                      {new Date(usage.date).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        weekday: 'short',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      입실: {usage.check_in}
                    </span>
                    <span>퇴실: {usage.check_out}</span>
                  </div>
                </div>

                <div className="text-right">
                  <Badge variant="secondary" className="text-base font-semibold">
                    {usage.duration_hours}시간
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
