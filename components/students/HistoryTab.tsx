'use client'

import type { Student, PaymentRecord } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Calendar, CreditCard } from 'lucide-react'

interface ClassCredit {
  id: string
  student_id: string
  total_hours: number
  remaining_hours: number
  used_hours: number
  status: 'active' | 'expired' | 'exhausted'
  expiry_date?: string
}

interface StudyRoomPass {
  id: string
  student_id: string
  pass_type: 'hours' | 'days'
  total_amount: number
  remaining_amount: number
  status: 'active' | 'expired' | 'paused'
  start_date: string
  expiry_date: string
}

interface HistoryTabProps {
  student: Student
  credits?: ClassCredit[]
  passes?: StudyRoomPass[]
  payments?: PaymentRecord[]
}

export function HistoryTab({ student, credits = [], passes = [], payments = [] }: HistoryTabProps) {
  // 결제일 기준 내림차순 정렬
  const sortedPayments = [...payments].sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  const totalCredits = credits.reduce((sum, c) => sum + c.remaining_hours, 0)
  const activePasses = passes.filter(p => p.status === 'active')

  return (
    <div className="space-y-6">
      {/* 현재 보유 현황 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">수업 크레딧</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCredits}시간</div>
            <p className="text-xs text-muted-foreground mt-1">
              사용 가능한 수업 시간
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">독서실 이용권</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePasses.length}개</div>
            <p className="text-xs text-muted-foreground mt-1">
              활성화된 이용권
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 수업 크레딧 상세 */}
      {credits.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>수업 크레딧 내역</CardTitle>
            <CardDescription>보유 중인 수업 크레딧 목록</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {credits.map(credit => (
              <div key={credit.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{credit.total_hours}시간 크레딧</p>
                    <Badge variant={credit.status === 'active' ? 'default' : 'secondary'}>
                      {credit.status === 'active' ? '사용 가능' : credit.status === 'expired' ? '만료' : '소진'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    남은 시간: {credit.remaining_hours}시간 / 사용: {credit.used_hours}시간
                  </p>
                  {credit.expiry_date && (
                    <p className="text-xs text-muted-foreground">
                      만료일: {credit.expiry_date}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 독서실 이용권 상세 */}
      {passes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>독서실 이용권 내역</CardTitle>
            <CardDescription>보유 중인 독서실 이용권 목록</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {passes.map(pass => (
              <div key={pass.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">
                      {pass.total_amount}{pass.pass_type === 'hours' ? '시간' : '일'}권
                    </p>
                    <Badge variant={pass.status === 'active' ? 'default' : 'secondary'}>
                      {pass.status === 'active' ? '사용 가능' : pass.status === 'expired' ? '만료' : '일시정지'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    남은 {pass.pass_type === 'hours' ? '시간' : '일수'}: {pass.remaining_amount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    기간: {pass.start_date} ~ {pass.expiry_date}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 결제 내역 */}
      {sortedPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>결제 내역</CardTitle>
            <CardDescription>최근 결제 기록</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sortedPayments.map(payment => (
              <div key={payment.id} className="p-3 border rounded-lg">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{payment.revenue_category_name}</p>
                      <Badge variant={payment.status === 'completed' ? 'default' : 'secondary'}>
                        {payment.status === 'completed' ? '완료' : payment.status === 'refunded' ? '환불' : '대기'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(payment.payment_date).toLocaleDateString('ko-KR')} · {' '}
                      {payment.payment_method === 'card' ? '카드' : payment.payment_method === 'cash' ? '현금' : '계좌이체'}
                    </p>
                    {(payment as any).granted_credits && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ 수업 크레딧 {(payment as any).granted_credits.hours}시간 부여
                      </p>
                    )}
                    {(payment as any).granted_pass && (
                      <p className="text-xs text-blue-600 mt-1">
                        ✓ 독서실 {(payment as any).granted_pass.amount}{(payment as any).granted_pass.type === 'hours' ? '시간' : '일'}권 부여
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{payment.amount.toLocaleString()}원</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {credits.length === 0 && passes.length === 0 && sortedPayments.length === 0 && (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            아직 내역이 없습니다.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
