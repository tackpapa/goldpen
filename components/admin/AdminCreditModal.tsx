'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Minus, Calculator } from 'lucide-react'

interface AdminCreditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  orgName: string
  currentBalance: number
  onSuccess?: () => void
}

export function AdminCreditModal({
  open,
  onOpenChange,
  orgId,
  orgName,
  currentBalance,
  onSuccess,
}: AdminCreditModalProps) {
  const [creditAmount, setCreditAmount] = useState('')
  const [creditDescription, setCreditDescription] = useState('')
  const [creditType, setCreditType] = useState<'charge' | 'deduct'>('charge')
  const [creditPaymentType, setCreditPaymentType] = useState<'free' | 'paid'>('paid')
  const [isUpdating, setIsUpdating] = useState(false)

  // VAT 계산용 상태
  const [userDepositAmount, setUserDepositAmount] = useState('')
  const [vatAmount, setVatAmount] = useState(0)
  const [creditAfterVat, setCreditAfterVat] = useState(0)

  // 유저 입금액 변경 시 VAT 계산
  useEffect(() => {
    const deposit = Number(userDepositAmount)
    if (deposit > 0) {
      // VAT 포함 금액에서 VAT 제외 금액 계산: 금액 / 1.1
      const amountWithoutVat = deposit / 1.1
      // 1000원 단위로 버림
      const creditValue = Math.floor(amountWithoutVat / 1000) * 1000
      const vat = deposit - creditValue

      setVatAmount(Math.round(vat))
      setCreditAfterVat(creditValue)
      setCreditAmount(creditValue.toString())
    } else {
      setVatAmount(0)
      setCreditAfterVat(0)
    }
  }, [userDepositAmount])

  const handleCreditUpdate = useCallback(async () => {
    const amount = Number(creditAmount)
    if (!creditAmount || isNaN(amount) || amount < 1000 || amount % 1000 !== 0) {
      alert('1,000원 단위로 금액을 입력해주세요. (최소 1,000원)')
      return
    }

    setIsUpdating(true)
    try {
      const finalAmount = creditType === 'charge'
        ? Math.abs(amount)
        : -Math.abs(amount)

      const response = await fetch(`/api/admin/organizations/${orgId}/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: finalAmount,
          credit_type: creditPaymentType,
          description: creditDescription || (creditType === 'charge' ? '충전금 충전' : '충전금 차감'),
        }),
      })

      const responseData = await response.json() as { success?: boolean; error?: string }

      if (response.ok && responseData.success) {
        onOpenChange(false)
        setCreditAmount('')
        setCreditDescription('')
        setUserDepositAmount('')
        alert(creditType === 'charge' ? '충전이 완료되었습니다.' : '차감이 완료되었습니다.')
        onSuccess?.()
      } else {
        alert(responseData.error || '처리 중 오류가 발생했습니다.')
      }
    } catch (err) {
      console.error('Credit update failed:', err)
      alert('처리 중 오류가 발생했습니다.')
    } finally {
      setIsUpdating(false)
    }
  }, [orgId, creditAmount, creditType, creditPaymentType, creditDescription, onOpenChange, onSuccess])

  const handleClose = () => {
    onOpenChange(false)
    setCreditAmount('')
    setCreditDescription('')
    setUserDepositAmount('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>충전금 관리 - {orgName}</DialogTitle>
          <DialogDescription>
            현재 잔액: {currentBalance.toLocaleString()}원
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Button
              variant={creditType === 'charge' ? 'default' : 'outline'}
              onClick={() => setCreditType('charge')}
              className="flex-1"
            >
              <Plus className="mr-2 h-4 w-4" />
              충전
            </Button>
            <Button
              variant={creditType === 'deduct' ? 'default' : 'outline'}
              onClick={() => setCreditType('deduct')}
              className="flex-1"
            >
              <Minus className="mr-2 h-4 w-4" />
              차감
            </Button>
          </div>
          <div>
            <label className="text-sm font-medium">충전금 타입</label>
            <div className="flex gap-2 mt-1">
              <Button
                type="button"
                variant={creditPaymentType === 'free' ? 'default' : 'outline'}
                onClick={() => setCreditPaymentType('free')}
                className="flex-1"
                size="sm"
              >
                무료 부여
              </Button>
              <Button
                type="button"
                variant={creditPaymentType === 'paid' ? 'default' : 'outline'}
                onClick={() => setCreditPaymentType('paid')}
                className="flex-1"
                size="sm"
              >
                유저 결제
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {creditPaymentType === 'free'
                ? '관리자가 프로모션/보상 등으로 무료 부여'
                : '유저가 직접 결제하여 충전'}
            </p>
          </div>

          {/* VAT 계산 UI - 유저 결제 + 충전일 때만 표시 */}
          {creditPaymentType === 'paid' && creditType === 'charge' && (
            <div className="bg-blue-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                <Calculator className="h-4 w-4" />
                VAT 자동 계산
              </div>
              <div>
                <label className="text-sm text-blue-600">유저 입금액</label>
                <Input
                  type="number"
                  placeholder="예: 30000"
                  value={userDepositAmount}
                  onChange={(e) => setUserDepositAmount(e.target.value)}
                  className="mt-1"
                />
              </div>
              {Number(userDepositAmount) > 0 && (
                <div className="text-sm space-y-1 pt-2 border-t border-blue-200">
                  <div className="flex justify-between">
                    <span className="text-blue-600">입금액</span>
                    <span className="font-medium">{Number(userDepositAmount).toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-600">VAT (10%)</span>
                    <span className="text-red-500">-{vatAmount.toLocaleString()}원</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-blue-200">
                    <span className="text-blue-700 font-medium">실제 충전 크레딧</span>
                    <span className="font-bold text-blue-700">{creditAfterVat.toLocaleString()}원</span>
                  </div>
                  <p className="text-xs text-blue-500 mt-1">
                    * 1,000원 단위로 버림 처리됩니다
                  </p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="text-sm font-medium">금액 (1,000원 단위)</label>
            <Input
              type="number"
              placeholder="예: 10000"
              value={creditAmount}
              onChange={(e) => setCreditAmount(e.target.value)}
              min={1000}
              step={1000}
            />
            <p className="text-xs text-muted-foreground mt-1">
              1,000원 단위로 입력해주세요
              {creditPaymentType === 'paid' && creditType === 'charge' && creditAfterVat > 0 && (
                <span className="text-blue-600"> (VAT 계산에서 자동 입력됨)</span>
              )}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">설명 (선택)</label>
            <Input
              placeholder="변경 사유를 입력하세요"
              value={creditDescription}
              onChange={(e) => setCreditDescription(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            취소
          </Button>
          <Button
            onClick={handleCreditUpdate}
            disabled={isUpdating || !creditAmount}
          >
            {isUpdating ? '처리 중...' : creditType === 'charge' ? '충전하기' : '차감하기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
