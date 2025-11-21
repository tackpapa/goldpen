'use client'

import { useState } from 'react'
import type { Student } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { revenueCategoryManager } from '@/lib/utils/revenue-categories'
import { CreditCard, Clock, Calendar as CalendarIcon, Loader2 } from 'lucide-react'

interface PaymentTabProps {
  student: Student
  onPaymentComplete?: () => void
  subscriptions?: any[]
  activeSubscription?: any | null
  loading?: boolean
}

export function PaymentTab({
  student,
  onPaymentComplete,
  subscriptions = [],
  activeSubscription = null,
  loading = false
}: PaymentTabProps) {
  const { toast } = useToast()
  const revenueCategories = revenueCategoryManager.getActiveCategories()

  // Payment form state
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cash' | 'transfer'>('card')

  // Credit form state
  const [classCredits, setClassCredits] = useState('')

  // Study room pass state
  const [passType, setPassType] = useState<'hours' | 'days'>('hours')
  const [passAmount, setPassAmount] = useState('')

  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const calculateExpiryDate = (type: 'hours' | 'days', amount: number): string => {
    const now = new Date()

    if (type === 'days') {
      now.setDate(now.getDate() + amount)
    } else {
      now.setFullYear(now.getFullYear() + 1)
    }

    return now.toISOString().split('T')[0]
  }

  const handleSubmit = async () => {
    // Validation
    if (!amount || Number(amount) <= 0) {
      toast({
        title: '입력 오류',
        description: '결제 금액을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    if (!categoryId) {
      toast({
        title: '입력 오류',
        description: '수입 항목을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    const category = revenueCategoryManager.getCategoryById(categoryId)
    if (!category) return

    setSubmitting(true)

    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: student.org_id,
          student_id: student.id,
          student_name: student.name,
          amount: Number(amount),
          payment_method: paymentMethod,
          revenue_category_id: categoryId,
          revenue_category_name: category.name,
          class_credits: classCredits && Number(classCredits) > 0
            ? { hours: Number(classCredits) }
            : null,
          study_room_pass: passAmount && Number(passAmount) > 0
            ? { type: passType, amount: Number(passAmount) }
            : null,
          notes,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '결제 등록에 실패했습니다.')
      }

      toast({
        title: '결제 완료',
        description: `${student.name} 학생의 결제가 완료되었습니다. (${Number(amount).toLocaleString()}원)`,
      })

      // Reset form
      setAmount('')
      setCategoryId('')
      setClassCredits('')
      setPassAmount('')
      setNotes('')

      onPaymentComplete?.()
    } catch (error) {
      console.error('Payment error:', error)
      toast({
        title: '결제 오류',
        description: error instanceof Error ? error.message : '결제 등록에 실패했습니다.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>새 결제 등록</CardTitle>
          <CardDescription>{student.name} 학생의 결제를 등록합니다</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 금액 */}
          <div>
            <Label htmlFor="amount">결제 금액 *</Label>
            <Input
              id="amount"
              type="number"
              placeholder="100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* 수입 항목 */}
          <div>
            <Label htmlFor="category">수입 항목 *</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={submitting}>
              <SelectTrigger id="category">
                <SelectValue placeholder="수입 항목을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {revenueCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                    {cat.description && (
                      <span className="text-muted-foreground text-xs ml-2">
                        ({cat.description})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 결제 방식 */}
          <div>
            <Label htmlFor="payment-method">결제 방식</Label>
            <Select value={paymentMethod} onValueChange={(v: 'card' | 'cash' | 'transfer') => setPaymentMethod(v)} disabled={submitting}>
              <SelectTrigger id="payment-method">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">카드</SelectItem>
                <SelectItem value="cash">현금</SelectItem>
                <SelectItem value="transfer">계좌이체</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 수업 크레딧 (Optional) */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="credits" className="text-base font-semibold">
                수업 크레딧 (선택)
              </Label>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              10 크레딧 = 10시간 수업권
            </p>
            <Input
              id="credits"
              type="number"
              placeholder="예: 10 (10시간)"
              value={classCredits}
              onChange={(e) => setClassCredits(e.target.value)}
              disabled={submitting}
            />
          </div>

          {/* 독서실 이용기간 (Optional) */}
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base font-semibold">
                독서실 이용기간 부여 (선택)
              </Label>
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <Input
                type="number"
                placeholder="숫자 입력"
                value={passAmount}
                onChange={(e) => setPassAmount(e.target.value)}
                disabled={submitting}
              />
              <Select value={passType} onValueChange={(v: 'hours' | 'days') => setPassType(v)} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">시간</SelectItem>
                  <SelectItem value="days">일수</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {passAmount && Number(passAmount) > 0 && (
              <p className="text-sm text-muted-foreground mt-2">
                만료일: {calculateExpiryDate(passType, Number(passAmount))}
              </p>
            )}
          </div>

          {/* 메모 */}
          <div>
            <Label htmlFor="notes">메모 (선택)</Label>
            <Textarea
              id="notes"
              placeholder="추가 메모..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              disabled={submitting}
            />
          </div>
        </CardContent>
      </Card>

      {/* 결제 버튼 */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => {
          setAmount('')
          setCategoryId('')
          setClassCredits('')
          setPassAmount('')
          setNotes('')
        }} disabled={submitting}>
          취소
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <CreditCard className="mr-2 h-4 w-4" />
          )}
          {submitting ? '처리 중...' : '결제 완료'}
        </Button>
      </div>
    </div>
  )
}
