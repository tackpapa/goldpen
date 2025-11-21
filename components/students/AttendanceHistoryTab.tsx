'use client'

import type { Student } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

interface AttendanceHistoryTabProps {
  student: Student
  attendance?: any[]
  loading?: boolean
}

const statusConfig = {
  present: {
    label: '출석',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    badgeClassName: 'bg-green-600 text-white hover:bg-green-700',
  },
  absent: {
    label: '결석',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    badgeClassName: 'bg-red-600 text-white hover:bg-red-700',
  },
  late: {
    label: '지각',
    icon: AlertCircle,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    badgeClassName: 'bg-orange-600 text-white hover:bg-orange-700',
  },
  excused: {
    label: '인정결석',
    icon: CheckCircle2,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    badgeClassName: 'bg-blue-600 text-white hover:bg-blue-700',
  },
}

export function AttendanceHistoryTab({
  student,
  attendance = [],
  loading = false
}: AttendanceHistoryTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  // Calculate statistics
  const totalClasses = attendance.length
  const presentCount = attendance.filter((r) => r.status === 'present').length
  const absentCount = attendance.filter((r) => r.status === 'absent').length
  const lateCount = attendance.filter((r) => r.status === 'late').length
  const excusedCount = attendance.filter((r) => r.status === 'excused').length
  const attendanceRate = totalClasses > 0 ? ((presentCount + excusedCount) / totalClasses) * 100 : 0

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

      {/* Attendance Records */}
      <Card>
        <CardHeader>
          <CardTitle>출결 내역</CardTitle>
          <CardDescription>최근 수업 출결 기록 ({attendance.length}건)</CardDescription>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              출결 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {attendance.map((record) => {
                const config = statusConfig[record.status as keyof typeof statusConfig] || statusConfig.present
                const Icon = config.icon

                return (
                  <div
                    key={record.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors ${config.bgColor}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${config.color}`} />
                        <span className="font-medium">
                          {new Date(record.attendance_date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            weekday: 'short',
                          })}
                        </span>
                      </div>

                      {record.notes && (
                        <div className="text-xs text-muted-foreground ml-6 mt-1">
                          {record.notes}
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
