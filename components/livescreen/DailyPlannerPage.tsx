'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowLeft, Plus, Trash2, Check } from 'lucide-react'
import type { DailyPlanner, StudyPlan } from '@/lib/types/database'

interface DailyPlannerPageProps {
  studentId: string
  seatNumber: number
  existingPlanner?: DailyPlanner
  onSave: (planner: DailyPlanner) => void
  onBack: () => void
}

export function DailyPlannerPage({
  studentId,
  seatNumber,
  existingPlanner,
  onSave,
  onBack,
}: DailyPlannerPageProps) {
  const [plans, setPlans] = useState<StudyPlan[]>(
    existingPlanner?.study_plans || []
  )
  const [notes, setNotes] = useState(existingPlanner?.notes || '')
  const [newPlanSubject, setNewPlanSubject] = useState('')
  const [newPlanDescription, setNewPlanDescription] = useState('')

  const handleAddPlan = () => {
    if (!newPlanSubject.trim()) return

    const newPlan: StudyPlan = {
      id: `plan-${Date.now()}`,
      subject: newPlanSubject.trim(),
      description: newPlanDescription.trim(),
      completed: false,
    }

    setPlans([...plans, newPlan])
    setNewPlanSubject('')
    setNewPlanDescription('')
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
    const planner: DailyPlanner = {
      id: existingPlanner?.id || `planner-${Date.now()}`,
      created_at: existingPlanner?.created_at || new Date().toISOString(),
      student_id: studentId,
      seat_number: seatNumber,
      date: new Date().toISOString().split('T')[0],
      study_plans: plans,
      notes,
    }

    onSave(planner)
  }

  const completedCount = plans.filter((p) => p.completed).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">오늘의 공부 계획</h1>
              <p className="text-sm text-muted-foreground">
                {completedCount}/{plans.length} 완료
              </p>
            </div>
          </div>
          <Button onClick={handleSave} size="lg">
            <Check className="h-5 w-5 mr-2" />
            저장
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Add New Plan */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">새 계획 추가</h3>
              <div className="space-y-3">
                <Input
                  placeholder="과목 (예: 국어, 영어, 수학)"
                  value={newPlanSubject}
                  onChange={(e) => setNewPlanSubject(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddPlan()
                    }
                  }}
                />
                <Input
                  placeholder="세부 내용 (예: 교과서 p.10-20, 문제집 3단원)"
                  value={newPlanDescription}
                  onChange={(e) => setNewPlanDescription(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddPlan()
                    }
                  }}
                />
                <Button
                  onClick={handleAddPlan}
                  disabled={!newPlanSubject.trim()}
                  className="w-full"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  계획 추가
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Study Plans List */}
          <div className="space-y-3">
            <h3 className="font-semibold text-lg">학습 계획 목록</h3>
            {plans.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <p>아직 계획이 없습니다</p>
                  <p className="text-sm mt-1">위에서 새 계획을 추가해보세요!</p>
                </CardContent>
              </Card>
            ) : (
              plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`transition-all ${
                    plan.completed ? 'bg-green-50 border-green-200' : ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Checkbox */}
                      <Checkbox
                        checked={plan.completed}
                        onCheckedChange={() => handleToggleComplete(plan.id)}
                        className="mt-1 h-5 w-5"
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4
                          className={`font-semibold text-lg mb-1 ${
                            plan.completed
                              ? 'line-through text-muted-foreground'
                              : ''
                          }`}
                        >
                          {plan.subject}
                        </h4>
                        {plan.description && (
                          <p
                            className={`text-sm ${
                              plan.completed
                                ? 'line-through text-muted-foreground'
                                : 'text-gray-600'
                            }`}
                          >
                            {plan.description}
                          </p>
                        )}
                      </div>

                      {/* Delete Button */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletePlan(plan.id)}
                        className="flex-shrink-0 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Notes */}
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3">메모</h3>
              <Textarea
                placeholder="오늘의 목표, 특이사항, 메모 등을 자유롭게 작성하세요..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                className="resize-none"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
