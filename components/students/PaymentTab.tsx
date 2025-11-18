'use client'

import { useState } from 'react'
import type { Student, PaymentRecord, ClassCredit, StudyRoomPass } from '@/lib/types/database'
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
import { CreditCard, Clock, Calendar as CalendarIcon } from 'lucide-react'

interface PaymentTabProps {
  student: Student
  onPaymentComplete?: () => void
}

export function PaymentTab({ student, onPaymentComplete }: PaymentTabProps) {
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

  const calculateExpiryDate = (type: 'hours' | 'days', amount: number): string => {
    const now = new Date()

    if (type === 'days') {
      // 일수 기반: 오늘 + N일
      now.setDate(now.getDate() + amount)
    } else {
      // 시간 기반: 1년 유효기간
      now.setFullYear(now.getFullYear() + 1)
    }

    return now.toISOString().split('T')[0]
  }

  const handleSubmit = () => {
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

    let creditId: string | undefined
    let passId: string | undefined

    // 1. Create Class Credit if provided
    if (classCredits && Number(classCredits) > 0) {
      const newCredit: ClassCredit = {
        id: `credit-${Date.now()}`,
        created_at: new Date().toISOString(),
        student_id: student.id,
        total_hours: Number(classCredits),
        used_hours: 0,
        remaining_hours: Number(classCredits),
        expiry_date: calculateExpiryDate('hours', Number(classCredits)),
        status: 'active',
      }

      const storedCredits = localStorage.getItem('class_credits')
      const allCredits: ClassCredit[] = storedCredits ? JSON.parse(storedCredits) : []
      allCredits.push(newCredit)
      localStorage.setItem('class_credits', JSON.stringify(allCredits))
      creditId = newCredit.id
    }

    // 2. Create Study Room Pass if provided
    if (passAmount && Number(passAmount) > 0) {
      const now = new Date().toISOString().split('T')[0]
      const expiryDate = calculateExpiryDate(passType, Number(passAmount))

      const newPass: StudyRoomPass = {
        id: `pass-${Date.now()}`,
        created_at: new Date().toISOString(),
        student_id: student.id,
        pass_type: passType,
        total_amount: Number(passAmount),
        remaining_amount: Number(passAmount),
        start_date: now,
        expiry_date: expiryDate,
        status: 'active',
      }

      const storedPasses = localStorage.getItem('study_room_passes')
      const allPasses: StudyRoomPass[] = storedPasses ? JSON.parse(storedPasses) : []
      allPasses.push(newPass)
      localStorage.setItem('study_room_passes', JSON.stringify(allPasses))
      passId = newPass.id
    }

    // 3. Create Payment Record
    const paymentRecord: PaymentRecord = {
      id: `payment-${Date.now()}`,
      created_at: new Date().toISOString(),
      org_id: student.org_id,
      student_id: student.id,
      student_name: student.name,
      amount: Number(amount),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: paymentMethod,
      revenue_category_id: categoryId,
      revenue_category_name: category.name,
      granted_credits: creditId ? {
        hours: Number(classCredits),
        credit_id: creditId,
      } : undefined,
      granted_pass: passId ? {
        type: passType,
        amount: Number(passAmount),
        pass_id: passId,
      } : undefined,
      status: 'completed',
      notes,
    }

    const storedPayments = localStorage.getItem('payment_records')
    const allPayments: PaymentRecord[] = storedPayments ? JSON.parse(storedPayments) : []
    allPayments.push(paymentRecord)
    localStorage.setItem('payment_records', JSON.stringify(allPayments))

    // Success toast
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
            />
          </div>

          {/* 수입 항목 */}
          <div>
            <Label htmlFor="category">수입 항목 *</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
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
            <Select value={paymentMethod} onValueChange={(v: 'card' | 'cash' | 'transfer') => setPaymentMethod(v)}>
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
              />
              <Select value={passType} onValueChange={(v: 'hours' | 'days') => setPassType(v)}>
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
        }}>
          취소
        </Button>
        <Button onClick={handleSubmit}>
          <CreditCard className="mr-2 h-4 w-4" />
          결제 완료
        </Button>
      </div>
    </div>
  )
}
