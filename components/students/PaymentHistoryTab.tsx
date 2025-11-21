'use client'

import type { Student } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Clock, Calendar as CalendarIcon } from 'lucide-react'

interface PaymentHistoryTabProps {
  student: Student
  payments?: any[]
  loading?: boolean
}

export function PaymentHistoryTab({
  student,
  payments = [],
  loading = false
}: PaymentHistoryTabProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0)

  return (
    <div className="space-y-6">
      {/* 통계 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 결제 횟수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payments.length}회</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">결제 누적 금액</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAmount.toLocaleString()}원</div>
          </CardContent>
        </Card>
      </div>

      {/* 결제 내역 리스트 */}
      <Card>
        <CardHeader>
          <CardTitle>결제 내역</CardTitle>
          <CardDescription>최근 결제 기록 ({payments.length}건)</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              결제 내역이 없습니다.
            </div>
          ) : (
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {[...payments].reverse().map(payment => (
                <div key={payment.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <p className="font-semibold text-lg">{payment.revenue_category_name || payment.category || payment.description || '결제'}</p>
                        <Badge variant={payment.status === 'completed' ? 'default' : 'destructive'}>
                          {payment.status === 'completed' ? '완료' : '환불'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {new Date(payment.payment_date).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                        <span>
                          {payment.payment_method === 'card' ? '카드' : payment.payment_method === 'cash' ? '현금' : '계좌이체'}
                        </span>
                      </div>

                      {payment.notes && (
                        <div className="text-xs text-muted-foreground">
                          {payment.notes}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-bold">{(payment.amount || 0).toLocaleString()}원</p>
                    </div>
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
