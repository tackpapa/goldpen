'use client'

import { useState, useEffect } from 'react'
import type { Student, PaymentRecord } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Clock, Calendar as CalendarIcon } from 'lucide-react'

interface PaymentHistoryTabProps {
  student: Student
}

// 대량 더미 데이터 생성
const generateDummyPayments = (studentId: string, studentName: string): PaymentRecord[] => {
  const payments: PaymentRecord[] = []
  const categories = [
    { id: 'cat-1', name: '수강료' },
    { id: 'cat-2', name: '자릿세' },
    { id: 'cat-3', name: '룸이용료' },
    { id: 'cat-4', name: '교재판매' },
  ]
  const methods: ('card' | 'cash' | 'transfer')[] = ['card', 'cash', 'transfer']

  // 50개 결제 내역 생성 (최근 6개월)
  for (let i = 0; i < 50; i++) {
    const daysAgo = i * 4 // 4일 간격
    const date = new Date()
    date.setDate(date.getDate() - daysAgo)

    const category = categories[Math.floor(Math.random() * categories.length)]
    const amount = [50000, 100000, 150000, 200000, 250000, 300000][Math.floor(Math.random() * 6)]
    const hasCredits = Math.random() > 0.6
    const hasPass = Math.random() > 0.7

    payments.push({
      id: `payment-dummy-${i}`,
      created_at: date.toISOString(),
      org_id: 'org-1',
      student_id: studentId,
      student_name: studentName,
      amount,
      payment_date: date.toISOString().split('T')[0],
      payment_method: methods[Math.floor(Math.random() * methods.length)],
      revenue_category_id: category.id,
      revenue_category_name: category.name,
      granted_credits: hasCredits ? {
        hours: Math.floor(amount / 10000),
        credit_id: `credit-${i}`,
      } : undefined,
      granted_pass: hasPass ? {
        type: Math.random() > 0.5 ? 'days' : 'hours',
        amount: Math.floor(Math.random() * 30) + 10,
        pass_id: `pass-${i}`,
      } : undefined,
      status: Math.random() > 0.95 ? 'refunded' : 'completed',
      refunded_at: undefined,
    })
  }

  return payments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function PaymentHistoryTab({ student }: PaymentHistoryTabProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([])

  useEffect(() => {
    // Load from localStorage
    const stored = localStorage.getItem('payment_records')
    let allPayments: PaymentRecord[] = stored ? JSON.parse(stored) : []

    // Filter by student
    const studentPayments = allPayments.filter(p => p.student_id === student.id)

    // If no payments, generate dummy data
    if (studentPayments.length === 0) {
      const dummyPayments = generateDummyPayments(student.id, student.name)
      setPayments(dummyPayments)
    } else {
      setPayments(studentPayments)
    }
  }, [student.id, student.name])

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)

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
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {payments.map(payment => (
              <div key={payment.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <p className="font-semibold text-lg">{payment.revenue_category_name}</p>
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

                    {payment.granted_credits && (
                      <div className="flex items-center gap-1 text-xs text-green-600 mb-1">
                        <Clock className="h-3 w-3" />
                        수업 크레딧 {payment.granted_credits.hours}시간 부여
                      </div>
                    )}

                    {payment.granted_pass && (
                      <div className="flex items-center gap-1 text-xs text-blue-600">
                        <CalendarIcon className="h-3 w-3" />
                        독서실 {payment.granted_pass.amount}{payment.granted_pass.type === 'hours' ? '시간' : '일'}권 부여
                      </div>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold">{payment.amount.toLocaleString()}원</p>
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
