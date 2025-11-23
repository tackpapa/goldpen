'use client'

import type { Student } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Clock, User, Calendar as CalendarIcon, AlertCircle } from 'lucide-react'

interface ClassCreditsTabProps {
  student: Student
  credits?: any[] // Deprecated: 이제 student.credit 사용
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

  // 마이그레이션 후: students.credit 컬럼 사용 (시간 단위)
  const currentCredits = student.credit || 0

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
            <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>날짜</TableHead>
                    <TableHead>과목</TableHead>
                    <TableHead>선생님</TableHead>
                    <TableHead className="text-right">사용시간</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsages.map(usage => (
                    <TableRow key={usage.id}>
                      <TableCell>
                        {new Date(usage.used_at || usage.created_at).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-semibold">
                          {usage.subject || '수업'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {usage.teacher_name || '선생님'}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-600">
                        -{usage.hours_used}시간
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
