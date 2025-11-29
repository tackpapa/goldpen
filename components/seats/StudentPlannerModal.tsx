'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Clock, Moon, DoorOpen, Check, Loader2, Send, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface StudyPlan {
  id: string
  subject: string           // 과목명
  subject_id?: string
  subject_color?: string
  description: string       // 할일 내용
  completed: boolean
  completed_at?: string
  elapsed_seconds?: number
}

interface DailyPlanner {
  id: string
  student_id: string
  date: string
  study_plans: StudyPlan[]
  notes?: string
}

interface PlannerFeedback {
  id: string
  feedback: string
  teacher_name?: string
  updated_at: string
}

interface Subject {
  id: string
  name: string
  color?: string
  order?: number
}

interface SleepStats {
  count: number
  total_minutes: number
}

interface OutingStats {
  count: number
  total_minutes: number
}

interface StudentPlannerModalProps {
  isOpen: boolean
  onClose: () => void
  studentId: string
  studentName: string
  orgId: string
}

export function StudentPlannerModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  orgId,
}: StudentPlannerModalProps) {
  const [planner, setPlanner] = useState<DailyPlanner | null>(null)
  const [feedback, setFeedback] = useState<PlannerFeedback | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sleepStats, setSleepStats] = useState<SleepStats>({ count: 0, total_minutes: 0 })
  const [outingStats, setOutingStats] = useState<OutingStats>({ count: 0, total_minutes: 0 })

  const getTodayDate = () => new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (isOpen && studentId) {
      fetchData()
    }
  }, [isOpen, studentId])

  const fetchData = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const today = getTodayDate()

      // 플래너, 피드백, 잠자기/외출 기록, subjects를 병렬로 조회
      const [plannerRes, feedbackRes, subjectsRes, sleepRes, outingRes] = await Promise.all([
        fetch(`/api/daily-planners?studentId=${studentId}&date=${today}&service=1&orgId=${orgId}`),
        fetch(`/api/planner-feedback?studentId=${studentId}&service=1&orgId=${orgId}`),
        fetch(`/api/subjects?studentId=${studentId}&service=1&orgId=${orgId}`),
        supabase
          .from('sleep_records')
          .select('*')
          .eq('student_id', studentId)
          .eq('date', today),
        supabase
          .from('outing_records')
          .select('*')
          .eq('student_id', studentId)
          .eq('date', today),
      ])

      console.log('[StudentPlannerModal] Planner API response status:', plannerRes.status)

      // subjects 데이터 가져오기
      let subjects: Subject[] = []
      if (subjectsRes.ok) {
        const subjectsData = await subjectsRes.json() as { subjects?: Subject[] }
        subjects = subjectsData.subjects || []
        console.log('[StudentPlannerModal] Subjects data:', subjects)
      }

      if (plannerRes.ok) {
        const plannerData = await plannerRes.json() as { planner?: DailyPlanner }
        console.log('[StudentPlannerModal] Planner data:', plannerData)

        // planner.study_plans와 subjects를 merge (livescreen과 동일한 로직)
        const dbPlans = plannerData.planner?.study_plans || []
        const existingSubjectIds = new Set(dbPlans.map(p => p.subject_id).filter(Boolean))
        const existingPlanIds = new Set(dbPlans.map(p => p.id))

        const newPlansFromSubjects: StudyPlan[] = subjects
          .filter(s => !existingSubjectIds.has(s.id) && !existingPlanIds.has(`plan-${s.id}`))
          .map((subject) => ({
            id: `plan-${subject.id}`,
            subject: subject.name,
            subject_id: subject.id,
            subject_color: subject.color,
            description: '',
            completed: false,
          }))

        const mergedPlans = [...dbPlans, ...newPlansFromSubjects]

        if (plannerData.planner) {
          setPlanner({
            ...plannerData.planner,
            study_plans: mergedPlans,
          })
        } else if (newPlansFromSubjects.length > 0) {
          // planner가 없지만 subjects가 있으면 임시 planner 생성
          setPlanner({
            id: `temp-${Date.now()}`,
            student_id: studentId,
            date: today,
            study_plans: newPlansFromSubjects,
          })
        } else {
          setPlanner(null)
        }
      }

      console.log('[StudentPlannerModal] Feedback API response status:', feedbackRes.status)
      if (feedbackRes.ok) {
        const feedbackData = await feedbackRes.json() as { feedback?: PlannerFeedback }
        console.log('[StudentPlannerModal] Feedback data:', feedbackData)
        setFeedback(feedbackData.feedback || null)
        setFeedbackText(feedbackData.feedback?.feedback || '')
      }

      // 잠자기 통계 계산
      if (sleepRes.data) {
        const sleepCount = sleepRes.data.length
        const totalSleepMinutes = sleepRes.data.reduce((acc: number, record: any) => {
          return acc + (record.duration_minutes || 0)
        }, 0)
        setSleepStats({ count: sleepCount, total_minutes: totalSleepMinutes })
      }

      // 외출 통계 계산
      if (outingRes.data) {
        const outingCount = outingRes.data.length
        const totalOutingMinutes = outingRes.data.reduce((acc: number, record: any) => {
          return acc + (record.duration_minutes || 0)
        }, 0)
        setOutingStats({ count: outingCount, total_minutes: totalOutingMinutes })
      }
    } catch (error) {
      console.error('Failed to fetch planner data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveFeedback = async () => {
    if (!feedbackText.trim()) return

    setSaving(true)
    try {
      const response = await fetch(`/api/planner-feedback?service=1&orgId=${orgId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          feedback: feedbackText.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json() as { feedback: PlannerFeedback }
        setFeedback(data.feedback)
      }
    } catch (error) {
      console.error('Failed to save feedback:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteFeedback = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/planner-feedback?service=1&orgId=${orgId}&studentId=${studentId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setFeedback(null)
        setFeedbackText('')
      }
    } catch (error) {
      console.error('Failed to delete feedback:', error)
    } finally {
      setSaving(false)
    }
  }

  const completedCount = planner?.study_plans?.filter(p => p.completed).length || 0
  const totalCount = planner?.study_plans?.length || 0
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{studentName}</span>
            <span className="text-sm text-muted-foreground">오늘의 공부 계획</span>
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* 진행률 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{completedCount}/{totalCount} 완료</span>
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${completionRate}%` }}
                />
              </div>
              <span className={`text-sm font-medium ${completionRate === 100 ? 'text-green-600' : 'text-orange-500'}`}>
                {completionRate}%
              </span>
            </div>

            {/* 잠자기/외출 통계 */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Moon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">잠자기</p>
                    <p className="text-sm font-semibold text-blue-800">
                      {sleepStats.count}회 / {sleepStats.total_minutes}분
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-full">
                    <DoorOpen className="h-4 w-4 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs text-orange-600">외출</p>
                    <p className="text-sm font-semibold text-orange-800">
                      {outingStats.count}회 / {outingStats.total_minutes}분
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 공부 계획 목록 */}
            {planner?.study_plans && planner.study_plans.length > 0 ? (
              <div className="space-y-2">
                {planner.study_plans.map((plan) => (
                  <Card key={plan.id} className={plan.completed ? 'bg-green-50 border-green-200' : ''}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            plan.completed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300'
                          }`}
                        >
                          {plan.completed && <Check className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="secondary"
                              style={plan.subject_color ? {
                                backgroundColor: plan.subject_color + '20',
                                color: plan.subject_color,
                                borderColor: plan.subject_color,
                              } : undefined}
                              className="text-xs"
                            >
                              {plan.subject}
                            </Badge>
                          </div>
                          {plan.description && (
                            <p className={`text-sm ${plan.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {plan.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-30" />
                <p className="text-sm">오늘 작성된 공부 계획이 없습니다</p>
              </div>
            )}

            {/* 메모 */}
            {planner?.notes && (
              <Card className="bg-gray-50">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground mb-1">메모</p>
                  <p className="text-sm whitespace-pre-wrap">{planner.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* 선생님 피드백 입력 */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">선생님 피드백</p>
                {feedback && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeleteFeedback}
                    disabled={saving}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 h-7 px-2"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    삭제
                  </Button>
                )}
              </div>
              <Textarea
                placeholder="학생에게 전달할 피드백을 입력하세요..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={3}
                className="resize-none"
              />
              {feedback && (
                <p className="text-xs text-muted-foreground mt-1">
                  마지막 수정: {new Date(feedback.updated_at).toLocaleString('ko-KR')}
                  {feedback.teacher_name && ` (${feedback.teacher_name})`}
                </p>
              )}
              <div className="flex justify-end mt-2">
                <Button
                  size="sm"
                  onClick={handleSaveFeedback}
                  disabled={saving || !feedbackText.trim()}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  {feedback ? '피드백 수정' : '피드백 저장'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
