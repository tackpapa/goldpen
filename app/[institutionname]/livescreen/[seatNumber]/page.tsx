'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  FileText,
  DoorOpen,
  Moon,
  MoonStar,
  ArrowLeft,
  Trophy,
  Clock,
  BarChart3,
} from 'lucide-react'
import { SubjectTimer } from '@/components/livescreen/SubjectTimer'
import { DailyPlannerModal } from '@/components/livescreen/DailyPlannerModal'
import { DailyPlannerPage } from '@/components/livescreen/DailyPlannerPage'
import { OutingModal } from '@/components/livescreen/OutingModal'
import { StudyTimeRankingDisplay } from '@/components/livescreen/StudyTimeRanking'
import { SleepTimer } from '@/components/livescreen/SleepTimer'
import { StudyStatistics } from '@/components/livescreen/StudyStatistics'
import { OutingScreen } from '@/components/livescreen/OutingScreen'
import { useLivescreenState } from '@/hooks/use-livescreen-state'
import type {
  DailyPlanner,
  OutingRecord,
  SleepRecord,
  LiveScreenState,
  StudyTimeRanking,
  CallRecord,
} from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'

interface PageProps {
  params: {
    institutionname: string
    seatNumber: string
  }
}

export default function LiveScreenPage({ params }: PageProps) {
  const { institutionname, seatNumber } = params
  const { toast } = useToast()

  // State
  const [studentId] = useState('student-1') // TODO: Get from auth/seat assignment
  const [studentName] = useState('김민준') // TODO: Get from database
  const [isPlannerOpen, setIsPlannerOpen] = useState(false)
  const [isOutingModalOpen, setIsOutingModalOpen] = useState(false)
  const [dailyPlanner, setDailyPlanner] = useState<DailyPlanner | null>(null)

  // Use Supabase Realtime hook for live screen state
  const {
    state: screenState,
    currentSleep,
    currentOuting,
    loading: stateLoading,
    startSleep,
    endSleep,
    startOuting,
    endOuting,
  } = useLivescreenState(studentId, parseInt(seatNumber))

  const [sleepRemainingSeconds, setSleepRemainingSeconds] = useState(0)
  const [activeView, setActiveView] = useState<'timer' | 'planner' | 'planner-edit' | 'ranking' | 'stats'>('timer')
  const [studyTimeMinutes, setStudyTimeMinutes] = useState(0)
  const [currentCall, setCurrentCall] = useState<CallRecord | null>(null)
  const [managerCallModalOpen, setManagerCallModalOpen] = useState(false)

  // Mock ranking data
  const [rankings] = useState<{
    daily: StudyTimeRanking[]
    weekly: StudyTimeRanking[]
    monthly: StudyTimeRanking[]
  }>({
    daily: [
      { student_id: 'student-1', student_name: '김철수', surname: '김**', total_minutes: 480, rank: 1, period_type: 'daily', period: '2025-01-19' },
      { student_id: 'student-2', student_name: '이영희', surname: '이**', total_minutes: 420, rank: 2, period_type: 'daily', period: '2025-01-19' },
      { student_id: 'student-3', student_name: '박민수', surname: '박**', total_minutes: 360, rank: 3, period_type: 'daily', period: '2025-01-19' },
      { student_id: studentId, student_name: studentName, surname: '김**', total_minutes: studyTimeMinutes, rank: 4, period_type: 'daily', period: '2025-01-19' },
      { student_id: 'student-4', student_name: '최수진', surname: '최**', total_minutes: 300, rank: 5, period_type: 'daily', period: '2025-01-19' },
    ],
    weekly: [
      { student_id: 'student-1', student_name: '김철수', surname: '김**', total_minutes: 2400, rank: 1, period_type: 'weekly', period: '2025-W03' },
      { student_id: 'student-2', student_name: '이영희', surname: '이**', total_minutes: 2100, rank: 2, period_type: 'weekly', period: '2025-W03' },
      { student_id: studentId, student_name: studentName, surname: '김**', total_minutes: studyTimeMinutes, rank: 3, period_type: 'weekly', period: '2025-W03' },
      { student_id: 'student-3', student_name: '박민수', surname: '박**', total_minutes: 1800, rank: 4, period_type: 'weekly', period: '2025-W03' },
    ],
    monthly: [
      { student_id: 'student-2', student_name: '이영희', surname: '이**', total_minutes: 9600, rank: 1, period_type: 'monthly', period: '2025-01' },
      { student_id: 'student-1', student_name: '김철수', surname: '김**', total_minutes: 9000, rank: 2, period_type: 'monthly', period: '2025-01' },
      { student_id: 'student-3', student_name: '박민수', surname: '박**', total_minutes: 8400, rank: 3, period_type: 'monthly', period: '2025-01' },
      { student_id: studentId, student_name: studentName, surname: '김**', total_minutes: studyTimeMinutes, rank: 5, period_type: 'monthly', period: '2025-01' },
    ],
  })

  // Load planner from localStorage on mount (keep this for now until planner is migrated)
  useEffect(() => {
    const savedPlanner = localStorage.getItem(`daily-planner-${studentId}-${new Date().toISOString().split('T')[0]}`)
    if (savedPlanner) {
      setDailyPlanner(JSON.parse(savedPlanner))
    }

    // Initialize dummy data if no subjects exist
    const savedSubjects = localStorage.getItem(`subjects-${studentId}`)
    if (!savedSubjects) {
      const dummySubjects = [
        { id: 'subject-1', created_at: new Date().toISOString(), student_id: studentId, name: '국어', color: '#FF6B35', order: 0 },
        { id: 'subject-2', created_at: new Date().toISOString(), student_id: studentId, name: '영어', color: '#F7931E', order: 1 },
        { id: 'subject-3', created_at: new Date().toISOString(), student_id: studentId, name: '수학', color: '#4A90E2', order: 2 },
        { id: 'subject-4', created_at: new Date().toISOString(), student_id: studentId, name: '과학', color: '#50C878', order: 3 },
        { id: 'subject-5', created_at: new Date().toISOString(), student_id: studentId, name: '사회', color: '#9B59B6', order: 4 },
      ]
      localStorage.setItem(`subjects-${studentId}`, JSON.stringify(dummySubjects))

      // Add dummy statistics
      const today = new Date().toISOString().split('T')[0]
      const dummyStats = [
        { subject_id: 'subject-1', subject_name: '국어', subject_color: '#FF6B35', total_seconds: 5400, session_count: 3, date: today },
        { subject_id: 'subject-2', subject_name: '영어', subject_color: '#F7931E', total_seconds: 7200, session_count: 4, date: today },
        { subject_id: 'subject-3', subject_name: '수학', subject_color: '#4A90E2', total_seconds: 9000, session_count: 5, date: today },
        { subject_id: 'subject-4', subject_name: '과학', subject_color: '#50C878', total_seconds: 3600, session_count: 2, date: today },
        { subject_id: 'subject-5', subject_name: '사회', subject_color: '#9B59B6', total_seconds: 4500, session_count: 3, date: today },
      ]
      localStorage.setItem(`subject-stats-${studentId}-${today}`, JSON.stringify(dummyStats))
    }
  }, [studentId, seatNumber])

  // Sleep countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (currentSleep) {
      const updateCountdown = () => {
        const sleepTime = new Date(currentSleep.sleep_time).getTime()
        const now = Date.now()
        const elapsed = Math.floor((now - sleepTime) / 1000)
        const remaining = Math.max(0, (15 * 60) - elapsed)
        setSleepRemainingSeconds(remaining)
      }

      updateCountdown()
      interval = setInterval(updateCountdown, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [currentSleep])

  // Subscribe to call_records for this student
  useEffect(() => {
    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    // Initial fetch
    const fetchCurrentCall = async () => {
      console.log('Fetching current call for:', { studentId, seatNumber, today })
      const { data, error } = await supabase
        .from('call_records')
        .select('*')
        .eq('student_id', studentId)
        .eq('seat_number', parseInt(seatNumber))
        .eq('date', today)
        .eq('status', 'calling')
        .order('call_time', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Error fetching call record:', error)
        return
      }

      console.log('Current call fetched:', data)
      setCurrentCall(data)
    }

    fetchCurrentCall()

    // Subscribe to changes
    const channel = supabase
      .channel(`call-${studentId}-${seatNumber}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_records',
          filter: `student_id=eq.${studentId}`,
        },
        (payload) => {
          console.log('Call record change:', payload)
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as CallRecord
            // Check if this call is for this seat and today
            if (
              record.seat_number === parseInt(seatNumber) &&
              record.date === today &&
              record.status === 'calling'
            ) {
              setCurrentCall(record)
            } else if (record.status === 'acknowledged') {
              setCurrentCall(null)
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Call subscription status:', status)
      })

    return () => {
      channel.unsubscribe()
    }
  }, [studentId, seatNumber])

  // Handlers
  const handleSavePlanner = (planner: DailyPlanner) => {
    setDailyPlanner(planner)
    localStorage.setItem(`daily-planner-${studentId}-${planner.date}`, JSON.stringify(planner))
    setActiveView('planner')
  }

  const handleOutingStart = async (record: OutingRecord) => {
    try {
      await startOuting(record.reason || '')
      toast({
        title: '외출 시작',
        description: '외출이 시작되었습니다.',
      })
    } catch (error) {
      console.error('Outing start error:', error)
      toast({
        title: '외출 시작 실패',
        description: error instanceof Error ? error.message : '외출을 시작할 수 없습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleReturnFromOuting = async () => {
    if (currentOuting) {
      try {
        await endOuting()
        toast({
          title: '복귀 완료',
          description: '외출에서 돌아왔습니다. 공부 화이팅!',
        })
      } catch (error) {
        toast({
          title: '복귀 실패',
          description: '복귀 처리 중 오류가 발생했습니다.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleSleepStart = async () => {
    // 임시로 2회 제한 제거
    // if (screenState.sleep_count >= 2) {
    //   toast({
    //     title: '오늘은 더 잘 수 없습니다',
    //     variant: 'destructive',
    //     duration: 3000,
    //   })
    //   return
    // }

    try {
      await startSleep()
      toast({
        title: '수면 시작',
        description: `잠자기 ${screenState.sleep_count + 1}회 사용 (최대 15분)`,
      })

      // Auto-wake after 15 minutes
      setTimeout(() => {
        handleWakeUp(true)
      }, 15 * 60 * 1000) // 15 minutes
    } catch (error) {
      console.error('Sleep start error:', error)
      toast({
        title: '수면 시작 실패',
        description: error instanceof Error ? error.message : '수면을 시작할 수 없습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleWakeUp = async (isAutoWake = false) => {
    if (currentSleep) {
      try {
        const sleepTime = new Date(currentSleep.sleep_time)
        const wakeTime = new Date()
        const durationMinutes = Math.floor((wakeTime.getTime() - sleepTime.getTime()) / (1000 * 60))

        await endSleep()

        toast({
          title: isAutoWake ? '자동 기상' : '기상 완료',
          description: isAutoWake
            ? '15분이 지나 자동으로 기상했습니다.'
            : `${durationMinutes}분 동안 휴식했습니다.`,
        })
      } catch (error) {
        toast({
          title: '기상 실패',
          description: '기상 처리 중 오류가 발생했습니다.',
          variant: 'destructive',
        })
      }
    }
  }

  const handleAcknowledgeCall = async () => {
    if (!currentCall) return

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('call_records')
        .update({
          acknowledged_time: new Date().toISOString(),
          status: 'acknowledged',
        })
        .eq('id', currentCall.id)

      if (error) throw error

      setCurrentCall(null)
      toast({
        title: '응답 완료',
        description: '카운터로 이동해주세요.',
      })
    } catch (error) {
      console.error('Error acknowledging call:', error)
      toast({
        title: '응답 실패',
        description: '다시 시도해주세요.',
        variant: 'destructive',
      })
    }
  }

  // Handle manager call
  const handleCallManager = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const supabase = createClient()

      const insertData = {
        student_id: studentId,
        seat_number: parseInt(seatNumber),
        student_name: studentName,
        date: today,
        call_time: new Date().toISOString(),
        status: 'calling' as const,
      }

      console.log('[Manager Call] 📞 Inserting manager call:', insertData)

      const { data, error } = await supabase
        .from('manager_calls')
        .insert(insertData)
        .select()

      if (error) {
        console.error('[Manager Call] ❌ Insert error:', error)
        throw error
      }

      console.log('[Manager Call] ✅ Insert successful:', data)

      setManagerCallModalOpen(false)
      toast({
        title: '매니저 호출',
        description: '매니저가 곧 도착합니다.',
      })
    } catch (error) {
      console.error('[Manager Call] ❌ Error calling manager:', error)
      toast({
        title: '호출 실패',
        description: '다시 시도해주세요.',
        variant: 'destructive',
      })
    }
  }

  const sleepButtonDisabled = screenState.sleep_count >= 2 || currentSleep !== null

  return (
    <>
      {/* Full Screen Sleep Timer */}
      {currentSleep && (
        <SleepTimer
          remainingSeconds={sleepRemainingSeconds}
          onWakeUp={() => handleWakeUp(false)}
        />
      )}

      {/* Full Screen Outing Display */}
      {currentOuting && screenState.is_out && (
        <OutingScreen
          outingTime={currentOuting.outing_time}
          reason={currentOuting.reason}
          onReturn={handleReturnFromOuting}
        />
      )}

      {/* Full Screen Call Notification */}
      {currentCall && (
        <div className="fixed inset-0 z-50 bg-red-500 flex items-center justify-center">
          <div className="text-center space-y-8 p-8">
            <div className="space-y-4">
              <h1 className="text-6xl md:text-8xl font-bold text-white animate-pulse">
                {currentCall.message}
              </h1>
              <p className="text-2xl md:text-3xl text-white/90">
                선생님이 호출하셨습니다
              </p>
            </div>
            <Button
              size="lg"
              variant="secondary"
              className="text-2xl md:text-3xl px-12 py-8 h-auto"
              onClick={handleAcknowledgeCall}
            >
              OK
            </Button>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 flex flex-col">
        {/* Compact Header */}
        <div className="max-w-7xl mx-auto w-full px-3 pt-2 pb-1 flex-shrink-0">
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardHeader className="p-2.5">
              <div className="flex items-center justify-between gap-2">
                {/* Left: Back button + Student info */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.history.back()}
                    className="h-7 w-7 flex-shrink-0"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </Button>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5 flex-shrink-0">
                      {seatNumber}번
                    </Badge>
                    <div className="min-w-0">
                      <CardTitle className="text-base md:text-lg truncate">{studentName} 님</CardTitle>
                    </div>
                  </div>
                </div>

                {/* Right: Manager Call Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setManagerCallModalOpen(true)}
                  className="flex-shrink-0"
                >
                  매니저호출
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto w-full px-3 md:px-4 flex-1 flex flex-col overflow-hidden pb-20">
        {activeView === 'timer' && (
          <div className="flex-1 flex flex-col min-h-0">
            <SubjectTimer studentId={studentId} />
          </div>
        )}

        {activeView === 'planner-edit' && (
          <DailyPlannerPage
            studentId={studentId}
            seatNumber={parseInt(seatNumber)}
            existingPlanner={dailyPlanner || undefined}
            onSave={(planner) => {
              setDailyPlanner(planner)
              setActiveView('planner')
              toast({
                title: '플래너 저장 완료',
                description: '오늘의 공부 계획이 저장되었습니다.',
              })
            }}
            onBack={() => {
              if (dailyPlanner) {
                setActiveView('planner')
              } else {
                setActiveView('timer')
              }
            }}
          />
        )}

        {activeView === 'planner' && dailyPlanner && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  오늘의 공부 계획
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveView('planner-edit')}
                >
                  수정
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dailyPlanner.study_plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      plan.completed
                        ? 'bg-green-50 border-green-200'
                        : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex-1">
                      <p
                        className={`font-semibold ${
                          plan.completed ? 'line-through text-muted-foreground' : ''
                        }`}
                      >
                        {plan.subject}
                      </p>
                      <p
                        className={`text-sm ${
                          plan.completed ? 'line-through text-muted-foreground' : ''
                        }`}
                      >
                        {plan.description}
                      </p>
                    </div>
                    {plan.completed && (
                      <Badge variant="default" className="bg-green-500">
                        완료
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {activeView === 'ranking' && (
          <StudyTimeRankingDisplay
            studentId={studentId}
            rankings={rankings}
            myTotalMinutes={{
              daily: studyTimeMinutes,
              weekly: studyTimeMinutes,
              monthly: studyTimeMinutes,
            }}
          />
        )}

        {activeView === 'stats' && (
          <StudyStatistics studentId={studentId} />
        )}
      </div>

      {/* Bottom Navigation - Fixed */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-40">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-6 gap-1 p-2">
            {/* Timer */}
            <Button
              variant={activeView === 'timer' ? 'default' : 'ghost'}
              onClick={() => setActiveView('timer')}
              className="h-16 flex flex-col gap-1"
            >
              <Clock className="h-5 w-5" />
              <span className="text-xs">타이머</span>
            </Button>

            {/* Daily Planner */}
            <Button
              variant={activeView === 'planner' || activeView === 'planner-edit' ? 'default' : 'ghost'}
              onClick={() => {
                if (!dailyPlanner) {
                  setActiveView('planner-edit')
                } else {
                  setActiveView('planner')
                }
              }}
              className="h-16 flex flex-col gap-1 relative"
            >
              <FileText className="h-5 w-5" />
              <span className="text-xs">플래너</span>
              {dailyPlanner && (
                <Badge variant="secondary" className="absolute top-1 right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {dailyPlanner.study_plans.filter(p => p.completed).length}
                </Badge>
              )}
            </Button>

            {/* Outing */}
            {!screenState.is_out ? (
              <Button
                variant="ghost"
                onClick={() => setIsOutingModalOpen(true)}
                className="h-16 flex flex-col gap-1"
              >
                <DoorOpen className="h-5 w-5" />
                <span className="text-xs">외출</span>
              </Button>
            ) : (
              <Button
                variant="default"
                onClick={handleReturnFromOuting}
                className="h-16 flex flex-col gap-1"
              >
                <DoorOpen className="h-5 w-5" />
                <span className="text-xs">복귀</span>
              </Button>
            )}

            {/* Sleep */}
            {!currentSleep ? (
              <Button
                variant="ghost"
                onClick={handleSleepStart}
                className="h-16 flex flex-col gap-1 relative"
              >
                <Moon className="h-5 w-5" />
                <span className="text-xs">잠자기</span>
                <Badge variant="secondary" className="absolute top-1 right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {screenState.sleep_count}
                </Badge>
              </Button>
            ) : (
              <Button
                variant="default"
                onClick={() => handleWakeUp(false)}
                className="h-16 flex flex-col gap-0 bg-blue-500 hover:bg-blue-600"
              >
                <MoonStar className="h-5 w-5" />
                <span className="text-sm font-bold">
                  {Math.floor(sleepRemainingSeconds / 60)}:{String(sleepRemainingSeconds % 60).padStart(2, '0')}
                </span>
              </Button>
            )}

            {/* Ranking */}
            <Button
              variant={activeView === 'ranking' ? 'default' : 'ghost'}
              onClick={() => setActiveView('ranking')}
              className="h-16 flex flex-col gap-1"
            >
              <Trophy className="h-5 w-5" />
              <span className="text-xs">랭킹</span>
            </Button>

            {/* Statistics */}
            <Button
              variant={activeView === 'stats' ? 'default' : 'ghost'}
              onClick={() => setActiveView('stats')}
              className="h-16 flex flex-col gap-1"
            >
              <BarChart3 className="h-5 w-5" />
              <span className="text-xs">통계</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DailyPlannerModal
        open={isPlannerOpen}
        onOpenChange={setIsPlannerOpen}
        studentId={studentId}
        seatNumber={parseInt(seatNumber)}
        existingPlanner={dailyPlanner || undefined}
        onSave={handleSavePlanner}
      />

      <OutingModal
        open={isOutingModalOpen}
        onOpenChange={setIsOutingModalOpen}
        studentId={studentId}
        seatNumber={parseInt(seatNumber)}
        onOutingStart={handleOutingStart}
      />

      {/* Manager Call Confirmation Modal */}
      <Dialog open={managerCallModalOpen} onOpenChange={setManagerCallModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>매니저 호출</DialogTitle>
            <DialogDescription>
              매니저를 부르시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setManagerCallModalOpen(false)}>
              No
            </Button>
            <Button onClick={handleCallManager}>
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}
