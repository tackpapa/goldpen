'use client'

import { useState } from 'react'
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
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Copy, CreditCard, Building2, Hash } from 'lucide-react'

interface ChargeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgSlug: string
}

export function ChargeModal({ open, onOpenChange, orgSlug }: ChargeModalProps) {
  const { toast } = useToast()
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const bankInfo = {
    accountHolder: '버클리컨설팅',
    bank: '신한은행',
    accountNumber: '110-530-753434',
  }

  const handleCopyAccount = async () => {
    try {
      await navigator.clipboard.writeText(bankInfo.accountNumber)
      toast({
        title: '복사 완료',
        description: '계좌번호가 클립보드에 복사되었습니다.',
      })
    } catch {
      toast({
        title: '복사 실패',
        description: '계좌번호를 수동으로 복사해주세요.',
        variant: 'destructive',
      })
    }
  }

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({
        title: '입력 오류',
        description: '입금 정보를 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/credit-charge-requests?orgSlug=${orgSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message: message.trim() }),
      })

      if (res.ok) {
        toast({
          title: '입금 신청 완료',
          description: '입금 확인 후 충전금이 적립됩니다.',
        })
        setMessage('')
        onOpenChange(false)
      } else {
        const data = await res.json() as { error?: string }
        toast({
          title: '신청 실패',
          description: data.error || '다시 시도해주세요.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: '오류 발생',
        description: '서버와 통신할 수 없습니다.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            충전금 충전
          </DialogTitle>
          <DialogDescription>
            아래 계좌로 입금 후 입금 정보를 입력해주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bank Info Card */}
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">은행:</span>
              <span className="font-medium">{bankInfo.bank}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Hash className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">계좌번호:</span>
              <span className="font-medium font-mono">{bankInfo.accountNumber}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopyAccount}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground ml-6">예금주:</span>
              <span className="font-medium">{bankInfo.accountHolder}</span>
            </div>
          </div>

          {/* Input */}
          <div className="space-y-2">
            <Label htmlFor="deposit-message">입금 정보</Label>
            <Input
              id="deposit-message"
              placeholder="홍길동 이름으로 50,000원 입금했어요"
              className="placeholder:opacity-50"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              입금자명과 금액을 입력해주세요. 확인 후 1시간이내로 충전됩니다. (10% 부가세가 적용됩니다)
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '신청 중...' : '입금 신청'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
