'use client'

import type { Teacher } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock } from 'lucide-react'

interface ScheduleTabProps {
  teacher: Teacher
  classes?: Array<{
    id: string
    name?: string
    subject?: string
    student_count?: number
    day_of_week?: string | null
    start_time?: string | null
    end_time?: string | null
  }> | null
}

const dayLabels: Record<string, string> = {
  monday: '월요일',
  tuesday: '화요일',
  wednesday: '수요일',
  thursday: '목요일',
  friday: '금요일',
  saturday: '토요일',
  sunday: '일요일',
}

export function ScheduleTab({ classes }: ScheduleTabProps) {
  const grouped = (classes || []).reduce<Record<string, any[]>>((acc, c) => {
    const key = c.day_of_week || 'unscheduled'
    acc[key] = acc[key] || []
    acc[key].push(c)
    return acc
  }, {})

  const totalClasses = classes?.length || 0
  const totalHoursPerWeek = Math.max(totalClasses, 0) * 2 // rough fallback

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">주간 수업 횟수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClasses}회</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">주간 수업 시간</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHoursPerWeek}시간</div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>주간 수업 스케줄</CardTitle>
          <CardDescription>요일별 수업 일정</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(grouped).length === 0 && (
              <p className="text-sm text-muted-foreground">등록된 수업이 없습니다.</p>
            )}
            {Object.entries(grouped).map(([day, dayClasses]) => (
              <div key={day} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">{dayLabels[day] || '요일 미지정'}</h3>
                  <Badge variant="secondary">{dayClasses.length}개 수업</Badge>
                </div>

                <div className="space-y-2 ml-6">
                  {dayClasses.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between p-2 bg-muted/50 rounded"
                    >
                      <div className="flex items-center gap-3">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {c.start_time && c.end_time ? `${c.start_time}-${c.end_time}` : '시간 미지정'}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {c.name || c.subject || '반 이름 없음'}
                        </span>
                      </div>
                      <Badge variant="outline">{c.student_count ?? 0}명</Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
