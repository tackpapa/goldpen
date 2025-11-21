'use client'

import type { Student } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, User, Calendar as CalendarIcon } from 'lucide-react'

interface ClassCreditsTabProps {
  student: Student
  credits?: any[]
  creditUsages?: any[]
  loading?: boolean
}

export function ClassCreditsTab({
  student,
  credits = [],
  creditUsages = [],
  loading = false
}: ClassCreditsTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  // 현재 활성 크레딧 총합 계산
  const activeCredits = credits.filter(c => c.status === 'active')
  const currentCredits = activeCredits.reduce((sum, c) => sum + (c.remaining_hours || 0), 0)

  // 모든 사용 내역 (별도로 전달받은 creditUsages 사용)
  const allUsages = creditUsages
  const totalUsedCredits = allUsages.reduce((sum, u) => sum + (u.hours_used || 0), 0)

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
            <p className="text-xs text-muted-foreground mt-1">총 {allUsages.length}회 수업</p>
          </CardContent>
        </Card>
      </div>

      {/* 활성 크레딧 목록 */}
      {activeCredits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>활성 크레딧</CardTitle>
            <CardDescription>현재 사용 가능한 크레딧</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {activeCredits.map(credit => (
                <div
                  key={credit.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">
                      {credit.remaining_hours}/{credit.total_hours}시간 남음
                    </p>
                    <p className="text-sm text-muted-foreground">
                      만료: {new Date(credit.expiry_date).toLocaleDateString('ko-KR')}
                    </p>
                  </div>
                  <Badge variant="default">활성</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 크레딧 이용 내역 */}
      <Card>
        <CardHeader>
          <CardTitle>크레딧 이용 내역</CardTitle>
          <CardDescription>수업 참여 기록 ({allUsages.length}건)</CardDescription>
        </CardHeader>
        <CardContent>
          {allUsages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              이용 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {allUsages.map(usage => (
                <div
                  key={usage.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="font-semibold">
                        {usage.subject || '수업'}
                      </Badge>
                      <span className="font-medium">{usage.teacher_name || '선생님'}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {new Date(usage.used_at || usage.created_at).toLocaleDateString('ko-KR', {
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold text-orange-600">-{usage.hours_used}시간</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
