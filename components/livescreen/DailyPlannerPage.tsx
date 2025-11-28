'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ArrowLeft, Plus, Trash2, CheckCircle2, Circle, Moon, DoorOpen } from 'lucide-react'
import type { DailyPlanner, StudyPlan, Subject, SleepRecord, OutingRecord } from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'

// 초를 시:분:초 형식으로 변환
function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}시간 ${m}분`
  if (m > 0) return `${m}분 ${s}초`
  return `${s}초`
}

interface PlannerFeedback {
  id: string
  feedback: string
  teacher_name?: string
  updated_at: string
}

interface DailyPlannerPageProps {
  studentId: string
  orgId?: string
  seatNumber: number
  subjects?: Subject[]  // 과목 타이머에서 전달받은 과목들
  existingPlanner?: DailyPlanner
  onSave: (planner: DailyPlanner) => void
  onBack: () => void
  onCompletedSubjectsChange?: (completedIds: Set<string>) => void  // 완료된 과목 ID 변경 콜백
  onSubjectDeleted?: (subjectId: string) => void  // 과목 삭제 시 콜백
  containerRef?: React.RefObject<HTMLDivElement>
  // Props for parent-level data loading
  initialPlanner?: DailyPlanner | null
  dataLoaded?: boolean
  isVisible?: boolean  // 탭 진입 시 데이터 갱신용
}

export function DailyPlannerPage({
  studentId,
  orgId,
  seatNumber,
  subjects = [],
  existingPlanner,
  onSave,
  onBack,
  onCompletedSubjectsChange,
  onSubjectDeleted,
  containerRef,
  initialPlanner,
  dataLoaded: parentDataLoaded,
  isVisible = true,
}: DailyPlannerPageProps) {
  // Use initialPlanner from parent if available, otherwise existingPlanner
  const effectivePlanner = initialPlanner ?? existingPlanner
  const [plans, setPlans] = useState<StudyPlan[]>(
    effectivePlanner?.study_plans || []
  )
  const [notes, setNotes] = useState(effectivePlanner?.notes || '')
  const [newPlanSubject, setNewPlanSubject] = useState('')
  const [plannerId, setPlannerId] = useState<string | null>(effectivePlanner?.id || null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoaded, setIsLoaded] = useState(parentDataLoaded ?? false)
  const [showSaved, setShowSaved] = useState(false)
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null)

  // Sleep & Outing stats
  const [sleepRecords, setSleepRecords] = useState<SleepRecord[]>([])
  const [outingRecords, setOutingRecords] = useState<OutingRecord[]>([])
  const [statsLoaded, setStatsLoaded] = useState(false)

  // Teacher feedback
  const [feedback, setFeedback] = useState<PlannerFeedback | null>(null)

  // Auto-save debounce refs
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const pendingPlansRef = useRef<StudyPlan[]>(plans)
  const pendingNotesRef = useRef<string>(notes)

  // Update refs when state changes
  useEffect(() => {
    pendingPlansRef.current = plans
  }, [plans])

  useEffect(() => {
    pendingNotesRef.current = notes
  }, [notes])

  // Notify parent about completed subject IDs
  useEffect(() => {
    if (onCompletedSubjectsChange) {
      const completedIds = new Set(
        plans
          .filter(p => p.completed && p.subject_id)
          .map(p => p.subject_id!)
      )
      onCompletedSubjectsChange(completedIds)
    }
  }, [plans, onCompletedSubjectsChange])

  // Sync with parent data when props change
  useEffect(() => {
    if (parentDataLoaded !== undefined) setIsLoaded(parentDataLoaded)
  }, [parentDataLoaded])

  // Load sleep & outing stats + feedback (탭 진입 시마다 갱신)
  useEffect(() => {
    if (!studentId || !isVisible) return

    const loadStats = async () => {
      const supabase = createClient()
      const today = new Date().toISOString().split('T')[0]

      // Load sleep records
      const { data: sleepData } = await supabase
        .from('sleep_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('date', today)
        .order('sleep_time', { ascending: true })

      // Load outing records
      const { data: outingData } = await supabase
        .from('outing_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('date', today)
        .order('outing_time', { ascending: true })

      setSleepRecords((sleepData || []) as SleepRecord[])
      setOutingRecords((outingData || []) as OutingRecord[])
      setStatsLoaded(true)

      // Load teacher feedback - orgId가 없으면 개발 환경에서 demo orgId 사용
      const effectiveOrgId = orgId || (process.env.NODE_ENV !== 'production'
        ? (process.env.NEXT_PUBLIC_DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000')
        : null)

      if (effectiveOrgId) {
        const feedbackUrl = `/api/planner-feedback?service=1&orgId=${effectiveOrgId}&studentId=${studentId}`
        console.log('🔄 [DailyPlannerPage] Refreshing feedback (isVisible changed)')
        try {
          const feedbackRes = await fetch(feedbackUrl)
          if (feedbackRes.ok) {
            const feedbackData = await feedbackRes.json() as { feedback?: PlannerFeedback }
            setFeedback(feedbackData.feedback || null)
          }
        } catch (error) {
          console.error('Failed to load feedback:', error)
        }
      }
    }

    loadStats()
  }, [studentId, orgId, isVisible])

  // Merge subjects with existing planner (no fetch needed if initialPlanner provided)
  useEffect(() => {
    if (!studentId) return

    // If parent already loaded data, just merge with subjects
    if (initialPlanner !== undefined) {
      const dbPlans = initialPlanner?.study_plans || []
      const dbNotes = initialPlanner?.notes || ''
      const dbPlannerId = initialPlanner?.id || null

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

      setPlannerId(dbPlannerId)
      setPlans(mergedPlans)
      setNotes(dbNotes)
      setIsLoaded(true)

      if (newPlansFromSubjects.length > 0) {
        savePlannerToDB(mergedPlans, dbNotes)
      }
      return
    }

    // Fallback: Fetch from DB if no initialPlanner provided
    const fetchAndMerge = async () => {
      try {
        const response = await fetch(`/api/daily-planners?studentId=${studentId}`, {
          credentials: 'include',
        })
        let dbPlans: StudyPlan[] = []
        let dbNotes = ''
        let dbPlannerId: string | null = null

        if (response.ok) {
          const data = await response.json() as { planner?: DailyPlanner }
          if (data.planner) {
            dbPlannerId = data.planner.id
            dbPlans = data.planner.study_plans || []
            dbNotes = data.planner.notes || ''
          }
        }

        // Merge subjects with DB plans
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

        setPlannerId(dbPlannerId)
        setPlans(mergedPlans)
        setNotes(dbNotes)
        setIsLoaded(true)

        // Save merged plans to DB if new subjects were added
        if (newPlansFromSubjects.length > 0) {
          savePlannerToDB(mergedPlans, dbNotes)
        }
      } catch (error) {
        console.error('Failed to fetch planner:', error)
        setIsLoaded(true)
      }
    }

    fetchAndMerge()
  }, [studentId, subjects, initialPlanner])

  // Track which plan is being edited
  const editingPlanIdRef = useRef<string | null>(null)

  // Debounced auto-save (2 seconds of inactivity)
  const scheduleAutoSave = useCallback((planId?: string) => {
    if (planId) editingPlanIdRef.current = planId
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    saveTimeoutRef.current = setTimeout(() => {
      savePlannerToDB(pendingPlansRef.current, pendingNotesRef.current, editingPlanIdRef.current)
    }, 2000)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  const savePlannerToDB = async (updatedPlans: StudyPlan[], updatedNotes: string, editedPlanId?: string | null) => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/daily-planners', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          seatNumber,
          studyPlans: updatedPlans,
          notes: updatedNotes,
        }),
      })

      if (response.ok) {
        const data = await response.json() as { planner: DailyPlanner }
        setPlannerId(data.planner.id)
        // Show "자동저장됨" next to the edited plan for 2 seconds
        if (editedPlanId) {
          setSavedPlanId(editedPlanId)
          setTimeout(() => setSavedPlanId(null), 2000)
        }
      }
    } catch (error) {
      console.error('Failed to save planner:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddPlan = async () => {
    if (!newPlanSubject.trim()) return

    const newPlan: StudyPlan = {
      id: `plan-${Date.now()}`,
      subject: newPlanSubject.trim(),
      description: '',
      completed: false,
    }

    const updatedPlans = [...plans, newPlan]
    setPlans(updatedPlans)
    setNewPlanSubject('')

    await savePlannerToDB(updatedPlans, notes)

    const planner: DailyPlanner = {
      id: plannerId || `planner-${Date.now()}`,
      created_at: new Date().toISOString(),
      student_id: studentId,
      seat_number: seatNumber,
      date: new Date().toISOString().split('T')[0],
      study_plans: updatedPlans,
      notes,
    }
    onSave(planner)
  }

  // 태스크 시작하기
  const handleStartTask = async (planId: string) => {
    const now = new Date().toISOString()
    const updatedPlans = plans.map((p) =>
      p.id === planId ? { ...p, started_at: now } : p
    )
    setPlans(updatedPlans)
    await savePlannerToDB(updatedPlans, notes)
  }

  // 태스크 완료하기
  const handleCompleteTask = async (planId: string) => {
    const plan = plans.find(p => p.id === planId)
    if (!plan) return

    const now = new Date()
    const completedAt = now.toISOString()
    let elapsedSeconds = 0

    if (plan.started_at) {
      elapsedSeconds = Math.floor((now.getTime() - new Date(plan.started_at).getTime()) / 1000)
    }

    const updatedPlans = plans.map((p) =>
      p.id === planId
        ? { ...p, completed: true, completed_at: completedAt, elapsed_seconds: elapsedSeconds }
        : p
    )
    setPlans(updatedPlans)

    // Save to DB
    if (plannerId) {
      try {
        await fetch('/api/daily-planners', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            plannerId,
            taskId: planId,
            completed: true,
            completedAt,
            elapsedSeconds,
          }),
        })
      } catch (error) {
        console.error('Failed to complete task:', error)
      }
    } else {
      await savePlannerToDB(updatedPlans, notes)
    }
  }

  // 태스크 완료 취소하기
  const handleUncompleteTask = async (planId: string) => {
    const updatedPlans = plans.map((p) =>
      p.id === planId
        ? { ...p, completed: false, completed_at: undefined, elapsed_seconds: undefined }
        : p
    )
    setPlans(updatedPlans)
    await savePlannerToDB(updatedPlans, notes)
  }

  const handleDeletePlan = async (planId: string) => {
    // 삭제할 플랜 찾기
    const planToDelete = plans.find((plan) => plan.id === planId)
    const subjectId = planToDelete?.subject_id

    // 플래너에서 삭제
    const updatedPlans = plans.filter((plan) => plan.id !== planId)
    setPlans(updatedPlans)
    await savePlannerToDB(updatedPlans, notes)

    // subject_id가 있으면 subjects 테이블에서도 삭제 (soft delete)
    if (subjectId) {
      const effectiveOrgId = orgId || (process.env.NODE_ENV !== 'production'
        ? (process.env.NEXT_PUBLIC_DEMO_ORG_ID || 'dddd0000-0000-0000-0000-000000000000')
        : null)

      try {
        await fetch(`/api/subjects?id=${subjectId}&service=1&orgId=${effectiveOrgId}`, {
          method: 'DELETE',
        })
        // 부모 컴포넌트에 삭제된 과목 알림
        onSubjectDeleted?.(subjectId)
      } catch (error) {
        console.error('Failed to delete subject:', error)
      }
    }
  }

  const completedCount = plans.filter((p) => p.completed).length
  const totalCount = plans.length
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Calculate sleep stats
  const sleepCount = sleepRecords.length
  const totalSleepMinutes = sleepRecords.reduce((acc, record) => {
    return acc + (record.duration_minutes || 0)
  }, 0)

  // Calculate outing stats
  const outingCount = outingRecords.length
  const totalOutingMinutes = outingRecords.reduce((acc, record) => {
    return acc + ((record as any).duration_minutes || 0)
  }, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <h1 className="text-xl font-bold">오늘의 공부 계획</h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                {completedCount}/{totalCount} 완료
              </p>
              {totalCount > 0 && (
                <div className="flex items-center gap-1">
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-green-600">{completionRate}%</span>
                </div>
              )}
            </div>
          </div>
          {isSaving && (
            <span className="text-xs text-muted-foreground animate-pulse">저장 중...</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-6">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
          {/* Teacher Feedback Alert */}
          {feedback && (
            <Card className="bg-red-50 border-red-300 border-2">
              <CardContent className="p-4">
                <p className="text-sm font-semibold text-red-700 mb-1">
                  선생님 피드백
                </p>
                <p className="text-base text-red-800 whitespace-pre-wrap">{feedback.feedback}</p>
                <p className="text-xs text-red-400 mt-2">
                  {new Date(feedback.updated_at).toLocaleString('ko-KR')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Sleep & Outing Stats */}
          {statsLoaded && (sleepCount > 0 || outingCount > 0) && (
            <div className="grid grid-cols-2 gap-3">
              {/* Sleep Stats */}
              <Card className="bg-indigo-50 border-indigo-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <Moon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="text-sm text-indigo-600 font-medium">잠자기</p>
                      <p className="text-lg font-bold text-indigo-900">
                        {sleepCount}회 / {totalSleepMinutes}분
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Outing Stats */}
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                      <DoorOpen className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-orange-600 font-medium">외출</p>
                      <p className="text-lg font-bold text-orange-900">
                        {outingCount}회 / {totalOutingMinutes}분
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Add New Plan - Top */}
          <div className="flex gap-2">
            <Input
              placeholder="새 과목 추가 (예: 국어, 영어, 수학)"
              value={newPlanSubject}
              onChange={(e) => setNewPlanSubject(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newPlanSubject.trim()) {
                  handleAddPlan()
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={handleAddPlan}
              disabled={!newPlanSubject.trim()}
              size="icon"
              className="shrink-0"
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {/* Study Plans List - Main Focus */}
          <div className="space-y-3">
            {!isLoaded ? (
              // Skeleton loading
              <>
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-gray-200" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 bg-gray-200 rounded w-24" />
                          <div className="h-9 bg-gray-100 rounded w-full" />
                        </div>
                        <div className="w-8 h-8 bg-gray-100 rounded" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            ) : plans.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <p>아직 계획이 없습니다</p>
                  <p className="text-sm mt-1">위에서 새 과목을 추가하거나,</p>
                  <p className="text-sm">타이머 탭에서 과목을 추가하면 자동으로 연동됩니다!</p>
                </CardContent>
              </Card>
            ) : (
              plans.map((plan) => (
                <Card
                  key={plan.id}
                  className={`transition-all duration-200 relative ${
                    plan.completed
                      ? 'bg-green-50 border-green-300 shadow-sm'
                      : 'bg-white hover:shadow-md'
                  }`}
                >
                  {/* Delete Button - Top Right */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeletePlan(plan.id)}
                    className="absolute top-2 right-2 h-7 w-7 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" />
                  </Button>

                  <CardContent className="p-4 pr-10">
                    <div className="flex items-start gap-4">
                      {/* Check Button */}
                      <button
                        onClick={() => {
                          if (plan.completed) {
                            handleUncompleteTask(plan.id)
                          } else {
                            handleCompleteTask(plan.id)
                          }
                        }}
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
                          plan.completed
                            ? 'bg-green-500 text-white'
                            : 'border-2 border-gray-300 text-gray-300 hover:border-green-400 hover:text-green-400'
                        }`}
                      >
                        {plan.completed ? (
                          <CheckCircle2 className="h-6 w-6" />
                        ) : (
                          <Circle className="h-6 w-6" />
                        )}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {plan.subject_color && (
                            <div
                              className="w-3 h-3 rounded-full flex-shrink-0"
                              style={{ backgroundColor: plan.subject_color }}
                            />
                          )}
                          <h4
                            className={`font-semibold text-lg ${
                              plan.completed
                                ? 'line-through text-muted-foreground'
                                : ''
                            }`}
                          >
                            {plan.subject}
                          </h4>
                          {savedPlanId === plan.id && (
                            <span className="text-xs text-green-600 ml-2">자동저장됨</span>
                          )}
                        </div>
                        <Input
                          placeholder="내용을 입력하면 자동 저장됩니다.."
                          value={plan.description || ''}
                          onChange={(e) => {
                            const updatedPlans = plans.map((p) =>
                              p.id === plan.id ? { ...p, description: e.target.value } : p
                            )
                            setPlans(updatedPlans)
                            scheduleAutoSave(plan.id)
                          }}
                          className={`mt-2 text-sm ${plan.completed ? 'line-through text-muted-foreground' : ''}`}
                          disabled={plan.completed}
                        />
                        {/* 완료 정보: 시간 + 소요시간 */}
                        {plan.completed && plan.completed_at && (
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-xs text-green-600">
                              {new Date(plan.completed_at).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}에 완료
                            </p>
                            {plan.elapsed_seconds !== undefined && plan.elapsed_seconds > 0 && (
                              <p className="text-xs text-blue-600">
                                {formatDuration(plan.elapsed_seconds)} 소요
                              </p>
                            )}
                          </div>
                        )}
                      </div>
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
                onChange={(e) => {
                  setNotes(e.target.value)
                  scheduleAutoSave()
                }}
                rows={5}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Bottom navigation spacer */}
          <div className="h-20" />
        </div>
      </div>
    </div>
  )
}
