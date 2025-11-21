'use client'

import type { Student } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Calendar as CalendarIcon, Clock, TrendingUp, AlertCircle } from 'lucide-react'

interface StudyRoomUsageRecord {
  id: string
  check_in_time: string
  check_out_time: string | null
  duration_minutes: number | null
}

interface StudyRoomPass {
  id: string
  pass_type: 'days' | 'hours'
  total_amount: number
  remaining_amount: number
  expiry_date: string
  status: string
}

interface StudyRoomTabProps {
  student: Student
  passes?: StudyRoomPass[]
  activePass?: StudyRoomPass | null
  usages?: StudyRoomUsageRecord[]
  loading?: boolean
}

export function StudyRoomTab({
  student,
  passes = [],
  activePass = null,
  usages = [],
  loading = false
}: StudyRoomTabProps) {
  // 통계 계산
  const totalMinutes = usages.reduce((sum, u) => sum + (u.duration_minutes || 0), 0)
  const totalHours = totalMinutes / 60
  const averageMinutes = usages.length > 0 ? totalMinutes / usages.length : 0

  const thisMonthUsages = usages.filter(u => {
    const usageDate = new Date(u.check_in_time)
    const now = new Date()
    return usageDate.getMonth() === now.getMonth() && usageDate.getFullYear() === now.getFullYear()
  })
  const thisMonthMinutes = thisMonthUsages.reduce((sum, u) => sum + (u.duration_minutes || 0), 0)
  const thisMonthHours = thisMonthMinutes / 60

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 이용권 정보 */}
      {activePass ? (
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
                  {activePass.remaining_amount}{activePass.pass_type === 'days' ? '일' : '시간'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  총 {activePass.total_amount}{activePass.pass_type === 'days' ? '일' : '시간'} 중 남은 기간
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">만료일</p>
                <p className="text-lg font-semibold">
                  {new Date(activePass.expiry_date).toLocaleDateString('ko-KR')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-gray-300">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle>현재 이용권</CardTitle>
              <Badge variant="secondary">없음</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-5 w-5" />
              <p>활성화된 이용권이 없습니다.</p>
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="text-2xl font-bold">{(averageMinutes / 60).toFixed(1)}시간</div>
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
          {usages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              이용 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {usages.map(usage => {
                const checkInDate = new Date(usage.check_in_time)
                const checkOutDate = usage.check_out_time ? new Date(usage.check_out_time) : null
                const durationHours = (usage.duration_minutes || 0) / 60

                return (
                  <div
                    key={usage.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">
                          {checkInDate.toLocaleDateString('ko-KR', {
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
                          입실: {checkInDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span>
                          퇴실: {checkOutDate
                            ? checkOutDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                            : '-'
                          }
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <Badge variant="secondary" className="text-base font-semibold">
                        {durationHours.toFixed(1)}시간
                      </Badge>
                    </div>
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
