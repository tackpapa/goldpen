'use client'

import { useState } from 'react'
import type { Student } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Users } from 'lucide-react'

interface AttendanceHistoryTabProps {
  student: Student
}

interface AttendanceRecord {
  id: string
  date: string
  subject: string
  teacher: string
  classTime: string
  status: 'present' | 'absent' | 'late' | 'excused'
  note?: string
}

// Generate dummy attendance data
const generateDummyAttendance = (): AttendanceRecord[] => {
  const subjects = ['수학', '영어', '과학', '국어', '사회', '물리', '화학']
  const teachers = ['김선생', '이선생', '박선생', '최선생', '정선생']
  const statuses: ('present' | 'absent' | 'late' | 'excused')[] = ['present', 'absent', 'late', 'excused']
  const times = ['09:00-11:00', '11:00-13:00', '14:00-16:00', '16:00-18:00', '18:00-20:00']
  const records: AttendanceRecord[] = []

  // Generate 60 records over 2 months (about 2-3 classes per day)
  for (let i = 0; i < 60; i++) {
    const daysAgo = Math.floor(i / 2.5)
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)

    // Most records should be present (80%), some late (10%), few absent (7%), few excused (3%)
    const rand = Math.random()
    let status: 'present' | 'absent' | 'late' | 'excused'
    if (rand < 0.8) status = 'present'
    else if (rand < 0.9) status = 'late'
    else if (rand < 0.97) status = 'absent'
    else status = 'excused'

    let note: string | undefined
    if (status === 'absent') note = '무단 결석'
    else if (status === 'late') note = `${Math.floor(Math.random() * 20) + 5}분 지각`
    else if (status === 'excused') note = '병원 진료'

    records.push({
      id: `attendance-${i}`,
      date: date.toISOString().split('T')[0],
      subject: subjects[Math.floor(Math.random() * subjects.length)],
      teacher: teachers[Math.floor(Math.random() * teachers.length)],
      classTime: times[Math.floor(Math.random() * times.length)],
      status,
      note,
    })
  }

  return records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

const statusConfig = {
  present: {
    label: '출석',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    badgeVariant: 'default' as const,
    badgeClassName: 'bg-green-600 text-white hover:bg-green-700',
  },
  absent: {
    label: '결석',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    badgeVariant: 'destructive' as const,
    badgeClassName: 'bg-red-600 text-white hover:bg-red-700',
  },
  late: {
    label: '지각',
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    badgeVariant: 'secondary' as const,
    badgeClassName: 'bg-orange-600 text-white hover:bg-orange-700',
  },
  excused: {
    label: '인정결석',
    icon: CheckCircle2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    badgeVariant: 'outline' as const,
    badgeClassName: 'bg-blue-600 text-white hover:bg-blue-700',
  },
}

export function AttendanceHistoryTab({ student }: AttendanceHistoryTabProps) {
  const [attendanceRecords] = useState(generateDummyAttendance())

  // Calculate statistics
  const totalClasses = attendanceRecords.length
  const presentCount = attendanceRecords.filter((r) => r.status === 'present').length
  const absentCount = attendanceRecords.filter((r) => r.status === 'absent').length
  const lateCount = attendanceRecords.filter((r) => r.status === 'late').length
  const excusedCount = attendanceRecords.filter((r) => r.status === 'excused').length
  const attendanceRate = ((presentCount + excusedCount) / totalClasses) * 100

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="border-2 border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">출석률</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{attendanceRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">총 {totalClasses}회</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">출석</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentCount}회</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">지각</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lateCount}회</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">결석</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{absentCount}회</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">인정결석</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{excusedCount}회</div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Summary */}
      <Card>
        <CardHeader>
          <CardTitle>월별 출석 현황</CardTitle>
          <CardDescription>최근 2개월 출석률</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, monthIndex) => {
              const targetDate = new Date()
              targetDate.setMonth(targetDate.getMonth() - monthIndex)
              const monthRecords = attendanceRecords.filter((r) => {
                const recordDate = new Date(r.date)
                return (
                  recordDate.getMonth() === targetDate.getMonth() &&
                  recordDate.getFullYear() === targetDate.getFullYear()
                )
              })

              const monthTotal = monthRecords.length
              const monthPresent = monthRecords.filter((r) => r.status === 'present').length
              const monthExcused = monthRecords.filter((r) => r.status === 'excused').length
              const monthRate = monthTotal > 0 ? ((monthPresent + monthExcused) / monthTotal) * 100 : 0

              return (
                <div
                  key={monthIndex}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {targetDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                    </p>
                    <p className="text-sm text-muted-foreground">총 {monthTotal}회 수업</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{monthRate.toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">
                      출석 {monthPresent}회 · 인정결석 {monthExcused}회
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>출결 내역</CardTitle>
          <CardDescription>최근 수업 출결 기록 ({attendanceRecords.length}건)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {attendanceRecords.map((record) => {
              const config = statusConfig[record.status]
              const Icon = config.icon

              return (
                <div
                  key={record.id}
                  className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors ${config.bgColor}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${config.color}`} />
                      <Badge variant="outline" className="font-semibold">
                        {record.subject}
                      </Badge>
                      <span className="font-medium">{record.teacher}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground ml-6">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(record.date).toLocaleDateString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                          weekday: 'short',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {record.classTime}
                      </span>
                    </div>

                    {record.note && (
                      <div className="text-xs text-muted-foreground ml-6 mt-1">
                        {record.note}
                      </div>
                    )}
                  </div>

                  <Badge className={config.badgeClassName}>
                    {config.label}
                  </Badge>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
