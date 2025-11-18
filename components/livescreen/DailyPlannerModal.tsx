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
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Trash2, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { DailyPlanner } from '@/lib/types/database'

interface DailyPlannerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: string
  seatNumber: number
  existingPlanner?: DailyPlanner
  onSave: (planner: DailyPlanner) => void
}

interface StudyPlan {
  id: string
  subject: string
  description: string
  completed: boolean
}

export function DailyPlannerModal({
  open,
  onOpenChange,
  studentId,
  seatNumber,
  existingPlanner,
  onSave,
}: DailyPlannerModalProps) {
  const { toast } = useToast()
  const [plans, setPlans] = useState<StudyPlan[]>(
    existingPlanner?.study_plans || []
  )
  const [notes, setNotes] = useState(existingPlanner?.notes || '')
  const [newSubject, setNewSubject] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const handleAddPlan = () => {
    if (!newSubject.trim() || !newDescription.trim()) {
      toast({
        title: '입력 필요',
        description: '과목과 내용을 모두 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    const newPlan: StudyPlan = {
      id: `plan-${Date.now()}`,
      subject: newSubject.trim(),
      description: newDescription.trim(),
      completed: false,
    }

    setPlans([...plans, newPlan])
    setNewSubject('')
    setNewDescription('')
  }

  const handleToggleComplete = (planId: string) => {
    setPlans(
      plans.map((plan) =>
        plan.id === planId ? { ...plan, completed: !plan.completed } : plan
      )
    )
  }

  const handleDeletePlan = (planId: string) => {
    setPlans(plans.filter((plan) => plan.id !== planId))
  }

  const handleSave = () => {
    if (plans.length === 0) {
      toast({
        title: '계획 추가 필요',
        description: '최소 1개 이상의 공부 계획을 추가해주세요.',
        variant: 'destructive',
      })
      return
    }

    const planner: DailyPlanner = {
      id: existingPlanner?.id || `planner-${Date.now()}`,
      created_at: existingPlanner?.created_at || new Date().toISOString(),
      student_id: studentId,
      seat_number: seatNumber,
      date: new Date().toISOString().split('T')[0],
      study_plans: plans,
      notes: notes.trim() || undefined,
    }

    onSave(planner)
    toast({
      title: '저장 완료',
      description: '오늘의 공부 계획이 저장되었습니다.',
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">📝 오늘의 공부 계획</DialogTitle>
          <DialogDescription>
            오늘 공부할 내용을 작성하고 체크해보세요
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* 기존 계획 목록 */}
          {plans.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold">공부 계획 목록</Label>
              <div className="space-y-2">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className="flex items-start gap-3 p-4 border rounded-lg bg-muted/30"
                  >
                    <Checkbox
                      checked={plan.completed}
                      onCheckedChange={() => handleToggleComplete(plan.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-semibold ${
                            plan.completed
                              ? 'line-through text-muted-foreground'
                              : ''
                          }`}
                        >
                          {plan.subject}
                        </span>
                        {plan.completed && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <p
                        className={`text-sm mt-1 ${
                          plan.completed ? 'line-through text-muted-foreground' : ''
                        }`}
                      >
                        {plan.description}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeletePlan(plan.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 새 계획 추가 */}
          <div className="space-y-4 border-t pt-4">
            <Label className="text-base font-semibold">새 계획 추가</Label>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="subject">과목 *</Label>
                <Input
                  id="subject"
                  placeholder="예: 수학"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      document.getElementById('description')?.focus()
                    }
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">내용 *</Label>
                <Input
                  id="description"
                  placeholder="예: 미적분 연습문제 풀기"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddPlan()
                    }
                  }}
                />
              </div>
            </div>
            <Button onClick={handleAddPlan} className="w-full" variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              계획 추가
            </Button>
          </div>

          {/* 메모 */}
          <div className="space-y-2">
            <Label htmlFor="notes">메모 (선택)</Label>
            <Textarea
              id="notes"
              placeholder="오늘의 목표나 메모를 작성하세요..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave}>저장</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
