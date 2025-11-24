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
  // 안전 필터: 현재 학생 결제만 표시
  const filtered = payments.filter(p => p.student_id === student.id)
  const totalAmount = filtered.reduce((sum, p) => sum + (p.amount || 0), 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 통계 */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 결제 횟수</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filtered.length}회</div>
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

      {/* 결제 내역 테이블 */}
      <Card>
          <CardHeader>
            <CardTitle>결제 내역</CardTitle>
            <CardDescription>최근 결제 기록 ({filtered.length}건)</CardDescription>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                결제 내역이 없습니다.
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>항목</TableHead>
                    <TableHead>상태</TableHead>
                    <TableHead>날짜</TableHead>
                    <TableHead>결제수단</TableHead>
                    <TableHead className="text-right">금액</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...filtered].reverse().map(payment => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.revenue_category_name || payment.category || payment.description || '결제'}
                        {payment.notes && (
                          <div className="text-xs text-muted-foreground mt-1">{payment.notes}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.status === 'completed' ? 'default' : 'destructive'}>
                          {payment.status === 'completed' ? '완료' : '환불'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(payment.payment_date).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </TableCell>
                      <TableCell>
                        {payment.payment_method === 'card' ? '카드' : payment.payment_method === 'cash' ? '현금' : '계좌이체'}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {(payment.amount || 0).toLocaleString()}원
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
