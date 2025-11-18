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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { DoorOpen, Utensils, Coffee, School, GraduationCap, Users, Hospital, ShoppingBag } from 'lucide-react'
import type { OutingRecord } from '@/lib/types/database'

interface OutingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  seatNumber: number
  onOutingStart: (record: OutingRecord) => void
}

const OUTING_REASONS = [
  { label: '식사', icon: Utensils, value: '식사' },
  { label: '카페', icon: Coffee, value: '카페' },
  { label: '학교', icon: School, value: '학교' },
  { label: '학원', icon: GraduationCap, value: '학원' },
  { label: '부모님', icon: Users, value: '부모님 볼일' },
  { label: '병원', icon: Hospital, value: '병원' },
  { label: '편의점', icon: ShoppingBag, value: '편의점' },
]

export function OutingModal({
  open,
  onOpenChange,
  studentId,
  seatNumber,
  onOutingStart,
}: OutingModalProps) {
  const { toast } = useToast()
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')

  const handleReasonSelect = (value: string) => {
    setReason(value)
    setCustomReason('')
  }

  const handleSubmit = () => {
    const finalReason = customReason.trim() || reason

    if (!finalReason) {
      toast({
        title: '사유 선택 필요',
        description: '외출 사유를 선택하거나 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    const outingRecord: OutingRecord = {
      id: `outing-${Date.now()}`,
      created_at: new Date().toISOString(),
      student_id: studentId,
      seat_number: seatNumber,
      date: new Date().toISOString().split('T')[0],
      outing_time: new Date().toISOString(),
      reason: finalReason,
      status: 'out',
    }

    onOutingStart(outingRecord)
    toast({
      title: '외출 시작',
      description: '외출이 기록되었습니다. 조심히 다녀오세요!',
    })
    setReason('')
    setCustomReason('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5" />
            외출 신청
          </DialogTitle>
          <DialogDescription>
            외출 사유를 선택해주세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Quick Reason Buttons */}
          <div className="space-y-2">
            <Label>외출 사유 선택</Label>
            <div className="grid grid-cols-4 gap-2">
              {OUTING_REASONS.map((item) => {
                const Icon = item.icon
                return (
                  <Button
                    key={item.value}
                    variant={reason === item.value ? 'default' : 'outline'}
                    className="h-20 flex flex-col gap-1"
                    onClick={() => handleReasonSelect(item.value)}
                    type="button"
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-xs">{item.label}</span>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Custom Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="custom-reason">직접 입력 (선택)</Label>
            <Textarea
              id="custom-reason"
              placeholder="기타 사유를 직접 입력하세요"
              value={customReason}
              onChange={(e) => {
                setCustomReason(e.target.value)
                if (e.target.value.trim()) {
                  setReason('')
                }
              }}
              rows={2}
              className="resize-none"
            />
          </div>

          {/* Selected Reason Display */}
          {(reason || customReason) && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">선택된 사유</p>
              <p className="font-medium">{customReason.trim() || reason}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSubmit}>
            <DoorOpen className="mr-2 h-4 w-4" />
            외출하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
