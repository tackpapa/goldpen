'use client'

import { useState } from 'react'
import type { Teacher } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock } from 'lucide-react'

interface ScheduleTabProps {
  teacher: Teacher
}

// Mock schedule data
const generateDummySchedule = () => {
  const days = ['월', '화', '수', '목', '금', '토', '일']
  const classes = ['수학 특강반', '과학 실험반', '영어 회화반', '국어 독해반']
  const times = ['09:00-11:00', '11:00-13:00', '14:00-16:00', '16:00-18:00', '18:00-20:00']

  return days.map((day) => ({
    day,
    sessions: Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, i) => ({
      id: `${day}-${i}`,
      time: times[Math.floor(Math.random() * times.length)],
      className: classes[Math.floor(Math.random() * classes.length)],
      students: Math.floor(Math.random() * 15) + 5,
    })),
  }))
}

export function ScheduleTab({ teacher }: ScheduleTabProps) {
  const [schedule] = useState(generateDummySchedule())

  const totalClasses = schedule.reduce((sum, day) => sum + day.sessions.length, 0)
  const totalHoursPerWeek = totalClasses * 2 // Assuming 2 hours per class

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
            {schedule.map((daySchedule) => (
              <div key={daySchedule.day} className="border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">{daySchedule.day}요일</h3>
                  <Badge variant="secondary">{daySchedule.sessions.length}개 수업</Badge>
                </div>

                {daySchedule.sessions.length > 0 ? (
                  <div className="space-y-2 ml-6">
                    {daySchedule.sessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center justify-between p-2 bg-muted/50 rounded"
                      >
                        <div className="flex items-center gap-3">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">{session.time}</span>
                          <span className="text-sm text-muted-foreground">{session.className}</span>
                        </div>
                        <Badge variant="outline">{session.students}명</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground ml-6">수업 없음</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
