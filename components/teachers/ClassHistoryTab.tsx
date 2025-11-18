'use client'

import { useState } from 'react'
import type { Teacher } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Users, Calendar, Clock } from 'lucide-react'

interface ClassHistoryTabProps {
  teacher: Teacher
}

// Mock class history data
const generateDummyClassHistory = () => {
  const subjects = ['수학', '영어', '과학', '국어', '사회']
  const classTypes = ['정규반', '특강', '개인과외', '그룹과외']
  const history = []

  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(i / 2)
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)

    const startHour = [9, 11, 13, 14, 16, 18][Math.floor(Math.random() * 6)]
    const duration = [1, 1.5, 2, 2.5][Math.floor(Math.random() * 4)]

    history.push({
      id: `class-${i}`,
      date: date.toISOString().split('T')[0],
      subject: subjects[Math.floor(Math.random() * subjects.length)],
      classType: classTypes[Math.floor(Math.random() * classTypes.length)],
      startTime: `${startHour.toString().padStart(2, '0')}:00`,
      duration,
      studentCount: Math.floor(Math.random() * 15) + 1,
      completed: daysAgo > 0,
    })
  }

  return history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export function ClassHistoryTab({ teacher }: ClassHistoryTabProps) {
  const [classHistory] = useState(generateDummyClassHistory())

  const totalClasses = classHistory.filter((c) => c.completed).length
  const totalHours = classHistory.filter((c) => c.completed).reduce((sum, c) => sum + c.duration, 0)
  const totalStudents = classHistory.filter((c) => c.completed).reduce((sum, c) => sum + c.studentCount, 0)

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 수업 횟수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClasses}회</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 수업 시간</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}시간</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">누적 학생 수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}명</div>
          </CardContent>
        </Card>
      </div>

      {/* Class History List */}
      <Card>
        <CardHeader>
          <CardTitle>수업 이력</CardTitle>
          <CardDescription>최근 수업 기록 ({classHistory.length}건)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {classHistory.map((classRecord) => (
              <div
                key={classRecord.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <Badge variant="outline" className="font-semibold">
                      {classRecord.subject}
                    </Badge>
                    <span className="font-medium">{classRecord.classType}</span>
                    {!classRecord.completed && (
                      <Badge variant="secondary">예정</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm text-muted-foreground ml-6">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(classRecord.date).toLocaleDateString('ko-KR', {
                        month: 'long',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {classRecord.startTime} ({classRecord.duration}시간)
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {classRecord.studentCount}명
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
