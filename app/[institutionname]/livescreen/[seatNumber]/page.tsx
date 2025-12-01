'use client'

export const runtime = 'edge'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  Maximize2,
  Unlock,
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
import { useTheme, type Theme } from '@/hooks/use-theme'
import type {
  DailyPlanner,
  OutingRecord,
  SleepRecord,
  LiveScreenState,
  StudyTimeRanking,
  CallRecord,
  Subject,
  SubjectStatistics,
} from '@/lib/types/database'
import { createClient } from '@/lib/supabase/client'

// 알람 비프음 재생 함수
const playAlarmBeep = () => {
  try {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)()

    // 비프음 1회
    const playBeep = (delay: number = 0) => {
      const oscillator = context.createOscillator()
      const gainNode = context.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(context.destination)
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(800, context.currentTime + delay)
      gainNode.gain.setValueAtTime(0.3, context.currentTime + delay)
      oscillator.start(context.currentTime + delay)
      oscillator.stop(context.currentTime + delay + 0.2)
    }

    // 삑삑 두 번
    playBeep(0)
    playBeep(0.3)

    // 1초 후 다시 삑삑 두 번
    setTimeout(() => {
      playBeep(0)
      playBeep(0.3)
    }, 1000)
  } catch (err) {
    console.error('Failed to play beep:', err)
  }
}

interface PageProps {
  params: {
    institutionname: string
    seatNumber: string
  }
}

export default function LiveScreenPage({ params }: PageProps) {
  const { institutionname, seatNumber } = params
  const { toast } = useToast()

  // State - fetch from seat_assignments
  const [studentId, setStudentId] = useState<string | null>(null)
  const [studentName, setStudentName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [orgId, setOrgId] = useState<string | null>(null)
  const [isPlannerOpen, setIsPlannerOpen] = useState(false)
  const [isOutingModalOpen, setIsOutingModalOpen] = useState(false)
  const [dailyPlanner, setDailyPlanner] = useState<DailyPlanner | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [statistics, setStatistics] = useState<SubjectStatistics[]>([])
  const [completedSubjectIds, setCompletedSubjectIds] = useState<Set<string>>(new Set())
  const [dataLoaded, setDataLoaded] = useState(false)

  // Fetch student info from seat assignment
  useEffect(() => {
    const fetchStudentInfo = async () => {
      try {
        // 항상 orgSlug 사용 (개발/프로덕션 모두)
        const response = await fetch(`/api/seat-assignments?orgSlug=${institutionname}`, { credentials: 'include' })
        if (response.ok) {
          const data = await response.json() as { orgId?: string; assignments?: any[] }
          const assignment = data.assignments?.find((a: any) => a.seatNumber === parseInt(seatNumber))
          if (assignment && assignment.studentId) {
            setStudentId(assignment.studentId)
            setStudentName(assignment.studentName || '학생')
            setOrgId(assignment.orgId || null)
            setAssignmentError(null)
          } else {
            setStudentId(null)
            setStudentName('')
            setOrgId(null)
            setAssignmentError('이 좌석에 배정된 학생이 없습니다. 좌석 배정 후 사용하세요.')
          }
        } else if (response.status === 401) {
          setAssignmentError('인증이 필요합니다. 다시 로그인해 주세요.')
        }
      } catch (error) {
        console.error('Failed to fetch student info:', error)
        setAssignmentError('좌석 정보를 불러올 수 없습니다.')
        setOrgId(null)
      } finally {
        setLoading(false)
      }
    }
    fetchStudentInfo()
  }, [seatNumber, institutionname])

  // Fetch all data when studentId is available
  useEffect(() => {
    if (!studentId || !orgId) return

    const getTodayDate = () => new Date().toISOString().split('T')[0]

    const fetchAllData = async () => {
      try {
        // orgId 포함 (프로덕션 포함 모든 환경에서 필요)
        const orgIdParam = `&orgId=${orgId}`

        const [subjectsRes, statsRes, plannerRes] = await Promise.all([
          fetch(`/api/subjects?studentId=${studentId}${orgIdParam}`, { credentials: 'include' }),
          fetch(`/api/daily-study-stats?studentId=${studentId}&date=${getTodayDate()}${orgIdParam}`, { credentials: 'include' }),
          fetch(`/api/daily-planners?studentId=${studentId}${orgIdParam}`, { credentials: 'include' }),
        ])

        if (subjectsRes.ok) {
          const data = await subjectsRes.json() as { subjects?: Subject[] }
          setSubjects(data.subjects || [])
        }
        if (statsRes.ok) {
          const data = await statsRes.json() as { stats?: SubjectStatistics[] }
          setStatistics(data.stats || [])
        }
        if (plannerRes.ok) {
          const data = await plannerRes.json() as { planner?: DailyPlanner | null }
          setDailyPlanner(data.planner || null)
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setDataLoaded(true)
      }
    }

    fetchAllData()
  }, [studentId, orgId])

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
  } = useLivescreenState(studentId || '', parseInt(seatNumber), orgId)

  const [sleepRemainingSeconds, setSleepRemainingSeconds] = useState(0)
  const [activeView, setActiveView] = useState<'timer' | 'planner' | 'ranking' | 'stats'>('timer')
  const [studyTimeMinutes, setStudyTimeMinutes] = useState(0)
  const [currentCall, setCurrentCall] = useState<CallRecord | null>(null)

  // Theme
  const { theme, setTheme } = useTheme()

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [managerCallModalOpen, setManagerCallModalOpen] = useState(false)
  const [fullscreenPromptOpen, setFullscreenPromptOpen] = useState(false)
  const [isIOSDevice, setIsIOSDevice] = useState(false)
  const [isMobileDevice, setIsMobileDevice] = useState(false)
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null)

  // Ranking data - fetch from DB
  const [rankings, setRankings] = useState<{
    daily: StudyTimeRanking[]
    weekly: StudyTimeRanking[]
    monthly: StudyTimeRanking[]
  }>({ daily: [], weekly: [], monthly: [] })

  // Fetch rankings from DB
  useEffect(() => {
    if (!orgId) return

    const fetchRankings = async () => {
      try {
        // orgId 포함 (프로덕션 포함 모든 환경에서 필요)
        const response = await fetch(`/api/study-time-rankings?orgId=${orgId}`, { credentials: 'include' })
        if (response.ok) {
          const data = await response.json() as { rankings?: { daily: StudyTimeRanking[]; weekly: StudyTimeRanking[]; monthly: StudyTimeRanking[] } }
          setRankings(data.rankings || { daily: [], weekly: [], monthly: [] })
        }
      } catch (error) {
        console.error('Failed to fetch rankings:', error)
      }
    }
    fetchRankings()
  }, [orgId])

  // Removed localStorage planner loading - now fetched from DB in fetchAllData

  // Reset scroll position on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Fullscreen functionality
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreenElement = (
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).webkitCurrentFullScreenElement
      ) as HTMLElement

      const isFullscreen = !!fullscreenElement
      setIsFullscreen(isFullscreen)

      // Update portal container
      setPortalContainer(fullscreenElement || document.body)
    }

    // Initial update
    handleFullscreenChange()

    // Listen to both standard and webkit events
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Detect iOS device and mobile/tablet on mount (client-side only)
  useEffect(() => {
    const checkIsIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOSDevice(checkIsIOS)

    // 모든 모바일/태블릿에서 풀스크린 모달 표시
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent)
    setIsMobileDevice(isMobile)
    if (isMobile) {
      setFullscreenPromptOpen(true)
    }
  }, [])

  // 3초마다 풀스크린 상태 체크해서 모달 표시 (모든 모바일/태블릿)
  useEffect(() => {
    if (!isMobileDevice) return

    const checkFullscreenStatus = () => {
      const isInFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).webkitCurrentFullScreenElement
      )

      // 풀스크린이 아니면 모달 표시
      if (!isInFullscreen) {
        setFullscreenPromptOpen(true)
      }
    }

    // 3초마다 체크
    const interval = setInterval(checkFullscreenStatus, 3000)

    return () => clearInterval(interval)
  }, [isMobileDevice])

  // Check if device is mobile or tablet (not PC)
  const isMobileOrTablet = () => {
    if (typeof window === 'undefined') return false
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(navigator.userAgent)
  }

  // Auto-enter fullscreen every 2 seconds if not in fullscreen (Mobile/Tablet only, excluding iOS)
  useEffect(() => {
    // iOS/iPad는 모달로 처리하므로 자동 진입 건너뜀
    if (isIOSDevice) return

    // PC는 자동 풀스크린 진입 안 함
    if (!isMobileOrTablet()) return

    const checkAndEnterFullscreen = async () => {
      // Check if already in fullscreen (support both standard and webkit)
      const isInFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).webkitCurrentFullScreenElement
      )

      if (!isInFullscreen && containerRef.current) {
        try {
          const element = containerRef.current as any

          // Try standard version (Android)
          if (typeof element.requestFullscreen === 'function') {
            await element.requestFullscreen()
          }
        } catch (error) {
          // Silently fail - requires user interaction
        }
      }
    }

    // Check immediately on mount
    checkAndEnterFullscreen()

    // Then check every 2 seconds (reduced from 5)
    const interval = setInterval(checkAndEnterFullscreen, 2000)

    return () => clearInterval(interval)
  }, [isIOSDevice])

  // 🚀 사용자 터치/클릭 시 풀스크린 재진입 시도 (Mobile/Tablet only)
  useEffect(() => {
    if (isIOSDevice || !isMobileOrTablet()) return

    const handleUserInteraction = async () => {
      const isInFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).webkitCurrentFullScreenElement
      )

      // 풀스크린이 아닐 때만 재진입 시도
      if (!isInFullscreen && containerRef.current) {
        try {
          const element = containerRef.current as any
          if (typeof element.requestFullscreen === 'function') {
            await element.requestFullscreen()
          }
        } catch (error) {
          // Silently fail
        }
      }
    }

    // 터치와 클릭 이벤트 모두 감지
    document.addEventListener('touchstart', handleUserInteraction, { passive: true })
    document.addEventListener('click', handleUserInteraction)

    return () => {
      document.removeEventListener('touchstart', handleUserInteraction)
      document.removeEventListener('click', handleUserInteraction)
    }
  }, [isIOSDevice])

  // Handle fullscreen prompt (iOS/iPad only)
  const handleEnterFullscreenFromPrompt = async (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setFullscreenPromptOpen(false)
    await handleEnterFullscreen()
  }

  const handleEnterFullscreen = async () => {
    try {
      const isInFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).webkitCurrentFullScreenElement
      )

      if (containerRef.current && !isInFullscreen) {
        const element = containerRef.current as any

        // Try webkit prefixed version first (for iPad)
        if (typeof element.webkitRequestFullscreen === 'function') {
          await element.webkitRequestFullscreen()
        }
        // Then try standard version
        else if (typeof element.requestFullscreen === 'function') {
          await element.requestFullscreen()
        }
        setIsFullscreen(true)
      }
    } catch (error) {
      console.error('Failed to enter fullscreen:', error)
    }
  }

  const handleExitFullscreen = async () => {
    try {
      const doc = document as any

      if (doc.exitFullscreen && document.fullscreenElement) {
        await doc.exitFullscreen()
      } else if (doc.webkitExitFullscreen && doc.webkitFullscreenElement) {
        await doc.webkitExitFullscreen()
      }
      setIsFullscreen(false)
    } catch (error) {
      console.error('Failed to exit fullscreen:', error)
    }
  }

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

  // 잠자기 15분 만료 시 알람 비프음 재생
  useEffect(() => {
    if (currentSleep && sleepRemainingSeconds === 0) {
      playAlarmBeep()
    }
  }, [currentSleep, sleepRemainingSeconds])

  // 매니저 호출 수신 시 알람 비프음 재생
  useEffect(() => {
    if (currentCall) {
      playAlarmBeep()
    }
  }, [currentCall])

  // Subscribe to call_records for this student (org 스코프) - orgId state가 있을 때만 구독
  useEffect(() => {
    if (!orgId || !studentId) return // orgId와 studentId가 없으면 구독하지 않음

    const supabase = createClient()
    const today = new Date().toISOString().split('T')[0]

    const fetchCurrentCall = async () => {
      const { data, error } = await supabase
        .from('call_records')
        .select('*')
        .eq('org_id', orgId)
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

      setCurrentCall(data)
    }

    fetchCurrentCall()

    // Realtime 구독 - 필터 없이 모든 이벤트 수신 후 클라이언트에서 필터링
    const channel = supabase
      .channel(`call-${studentId}-${seatNumber}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'call_records',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const record = payload.new as CallRecord
            if (
              record.org_id === orgId &&
              record.student_id === studentId &&
              record.seat_number === parseInt(seatNumber) &&
              record.date === today &&
              record.status === 'calling'
            ) {
              setCurrentCall(record)
            } else if (record.status === 'acknowledged') {
              setCurrentCall(null)
            }
          } else if (payload.eventType === 'DELETE') {
            const record = payload.old as CallRecord
            if (record.student_id === studentId && record.seat_number === parseInt(seatNumber)) {
              setCurrentCall(null)
            }
          }
        }
      )
      .subscribe((status) => {
      })

    return () => {
      channel.unsubscribe()
    }
  }, [orgId, studentId, seatNumber])

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
      if (!orgId || !studentId) {
        toast({ title: '호출 불가', description: '배정된 학생/기관 정보가 없습니다.', variant: 'destructive' })
        return
      }

      const insertData = {
        student_id: studentId,
        seat_number: parseInt(seatNumber),
        student_name: studentName,
        org_id: orgId,
        date: today,
        call_time: new Date().toISOString(),
        status: 'calling' as const,
      }


      const { data, error } = await supabase
        .from('manager_calls')
        .insert(insertData)
        .select()

      if (error) {
        console.error('[Manager Call] ❌ Insert error:', error)
        throw error
      }


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

  if (assignmentError) {
    return (
      <div className="h-screen flex items-center justify-center bg-white text-center p-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">좌석 미배정</h1>
          <p className="text-muted-foreground">{assignmentError}</p>
        </div>
      </div>
    )
  }

  if (assignmentError) {
    return (
      <div className="h-screen flex items-center justify-center bg-white text-center p-8">
        <div>
          <h1 className="text-2xl font-bold mb-2">좌석 미배정</h1>
          <p className="text-muted-foreground">{assignmentError}</p>
        </div>
      </div>
    )
  }

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
      {currentCall && portalContainer && createPortal(
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
        </div>,
        portalContainer
      )}

      <div
        ref={containerRef}
        data-fullscreen-container
        className={`h-screen flex flex-col overflow-y-auto ${
          theme === 'dark'
            ? 'bg-[#0d1117]'
            : theme === 'white'
            ? 'bg-white'
            : 'bg-gradient-to-br from-white to-gray-50'
        }`}
      >
        {/* Compact Header */}
        <div className="max-w-7xl mx-auto w-full px-3 pt-2 pb-1 flex-shrink-0">
          <Card className={`border ${
            theme === 'dark'
              ? 'bg-[#161b22] border-[#30363d]'
              : theme === 'white'
              ? 'bg-white border-gray-200'
              : 'bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20'
          }`}>
            <CardHeader className="p-2.5">
              <div className="flex items-center justify-between gap-2">
                {/* Left: Back button + Student info */}
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {!isFullscreen ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleEnterFullscreen}
                      className={`h-7 w-7 flex-shrink-0 ${
                        theme === 'dark' ? 'text-[#c9d1d9] hover:text-white hover:bg-[#21262d]' : ''
                      }`}
                      title="전체화면 모드"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleExitFullscreen}
                      className={`h-7 w-7 flex-shrink-0 ${
                        theme === 'dark' ? 'text-[#c9d1d9] hover:text-white hover:bg-[#21262d]' : ''
                      }`}
                      title="전체화면 종료"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Badge
                      variant="outline"
                      className={`text-xs px-1.5 py-0.5 flex-shrink-0 ${
                        theme === 'dark'
                          ? 'border-[#30363d] text-[#c9d1d9]'
                          : theme === 'white'
                          ? 'border-gray-300'
                          : ''
                      }`}
                    >
                      {seatNumber}번
                    </Badge>
                    <div className="min-w-0">
                      <CardTitle className={`text-base md:text-lg truncate ${
                        theme === 'dark' ? 'text-[#c9d1d9]' : ''
                      }`}>
                        {studentName} 님
                      </CardTitle>
                    </div>
                  </div>
                </div>

                {/* Center: Theme Toggle Buttons */}
                <div className="flex items-center gap-6 absolute left-1/2 transform -translate-x-1/2">
                  <button
                    onClick={() => setTheme('color')}
                    className={`h-6 w-6 rounded-full transition-all ${
                      theme === 'color'
                        ? 'ring-2 ring-offset-2 ring-primary scale-110'
                        : 'hover:scale-105 opacity-60 hover:opacity-100'
                    }`}
                    style={{ background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 50%, #3B82F6 100%)' }}
                    title="컬러 모드"
                  />
                  <button
                    onClick={() => setTheme('dark')}
                    className={`h-6 w-6 rounded-full bg-gray-800 transition-all ${
                      theme === 'dark'
                        ? 'ring-2 ring-offset-2 ring-gray-600 scale-110'
                        : 'hover:scale-105 opacity-60 hover:opacity-100'
                    }`}
                    title="다크 모드"
                  />
                  <button
                    onClick={() => setTheme('white')}
                    className={`h-6 w-6 rounded-full bg-white border-2 border-gray-300 transition-all ${
                      theme === 'white'
                        ? 'ring-2 ring-offset-2 ring-gray-400 scale-110'
                        : 'hover:scale-105 opacity-60 hover:opacity-100'
                    }`}
                    title="화이트 모드"
                  />
                </div>

                {/* Right: Manager Call Button */}
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setManagerCallModalOpen(true)}
                  className={`flex-shrink-0 ${
                    theme === 'dark'
                      ? 'bg-[#21262d] hover:bg-[#30363d] text-white border-[#30363d]'
                      : theme === 'white'
                      ? 'border-gray-300'
                      : ''
                  }`}
                >
                  🚨 매니저호출
                </Button>
              </div>
            </CardHeader>
          </Card>
        </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto w-full px-3 md:px-4 flex-1 flex flex-col min-h-0 mb-[88px]">
        {activeView === 'timer' && (
          <div className="h-full flex flex-col">
            <SubjectTimer
              studentId={studentId || ''}
              orgId={orgId || undefined}
              orgSlug={institutionname}
              containerRef={containerRef}
              theme={theme}
              onSubjectsChange={setSubjects}
              hiddenSubjectIds={completedSubjectIds}
              initialSubjects={subjects}
              initialStatistics={statistics}
              dataLoaded={dataLoaded}
              onStatisticsChange={setStatistics}
            />
          </div>
        )}

        {activeView === 'planner' && (
          <DailyPlannerPage
            studentId={studentId || ''}
            orgId={orgId || undefined}
            seatNumber={parseInt(seatNumber)}
            subjects={subjects}
            existingPlanner={dailyPlanner || undefined}
            containerRef={containerRef}
            onSave={(planner) => {
              setDailyPlanner(planner)
            }}
            onBack={() => {
              setActiveView('timer')
            }}
            onCompletedSubjectsChange={setCompletedSubjectIds}
            onSubjectDeleted={(subjectId) => {
              // subjects 상태에서 삭제된 과목 제거
              setSubjects(prev => prev.filter(s => s.id !== subjectId))
            }}
            initialPlanner={dailyPlanner}
            dataLoaded={dataLoaded}
            isVisible={activeView === 'planner'}
          />
        )}

        {activeView === 'ranking' && (
          <StudyTimeRankingDisplay
            studentId={studentId || ''}
            rankings={rankings}
            myTotalMinutes={{
              daily: studyTimeMinutes,
              weekly: studyTimeMinutes,
              monthly: studyTimeMinutes,
            }}
          />
        )}

        {activeView === 'stats' && (
          <>
            <StudyStatistics studentId={studentId || ''} orgId={orgId || undefined} orgSlug={institutionname} />
            {/* Spacer for bottom navigation */}
            <div className="h-20" />
          </>
        )}
      </div>

      {/* Bottom Navigation - Fixed */}
      <div className={`fixed bottom-0 left-0 right-0 border-t shadow-lg z-40 ${
        theme === 'dark'
          ? 'bg-[#161b22] border-[#30363d]'
          : 'bg-background border-gray-200'
      }`}>
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-6 gap-1 p-2">
            {/* Timer */}
            <Button
              variant={activeView === 'timer' ? 'default' : 'ghost'}
              onClick={() => setActiveView('timer')}
              className={`h-16 flex flex-col gap-1 ${
                theme === 'dark' && activeView !== 'timer' ? 'text-[#c9d1d9] hover:text-white hover:bg-[#21262d]' : ''
              }`}
            >
              <Clock className="h-5 w-5" />
              <span className="text-xs">타이머</span>
            </Button>

            {/* Daily Planner */}
            <Button
              variant={activeView === 'planner' ? 'default' : 'ghost'}
              onClick={() => setActiveView('planner')}
              className={`h-16 flex flex-col gap-1 relative ${
                theme === 'dark' && activeView !== 'planner' ? 'text-[#c9d1d9] hover:text-white hover:bg-[#21262d]' : ''
              }`}
            >
              <FileText className="h-5 w-5" />
              <span className="text-xs">플래너</span>
              {dailyPlanner && (
                <Badge
                  variant="secondary"
                  className={`absolute top-1 right-1 h-5 w-5 p-0 flex items-center justify-center text-xs ${
                    theme === 'dark' ? 'bg-[#21262d] text-[#c9d1d9] border border-[#30363d]' : ''
                  }`}
                >
                  {dailyPlanner.study_plans.filter(p => p.completed).length}
                </Badge>
              )}
            </Button>

            {/* Outing */}
            {!screenState.is_out ? (
              <Button
                variant="ghost"
                onClick={() => setIsOutingModalOpen(true)}
                className={`h-16 flex flex-col gap-1 ${
                  theme === 'dark' ? 'text-[#c9d1d9] hover:text-white hover:bg-[#21262d]' : ''
                }`}
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
                className={`h-16 flex flex-col gap-1 relative ${
                  theme === 'dark' ? 'text-[#c9d1d9] hover:text-white hover:bg-[#21262d]' : ''
                }`}
              >
                <Moon className="h-5 w-5" />
                <span className="text-xs">잠자기</span>
                <Badge
                  variant="secondary"
                  className={`absolute top-1 right-1 h-5 w-5 p-0 flex items-center justify-center text-xs ${
                    theme === 'dark' ? 'bg-[#21262d] text-[#c9d1d9] border border-[#30363d]' : ''
                  }`}
                >
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
              className={`h-16 flex flex-col gap-1 ${
                theme === 'dark' && activeView !== 'ranking' ? 'text-[#c9d1d9] hover:text-white hover:bg-[#21262d]' : ''
              }`}
            >
              <Trophy className="h-5 w-5" />
              <span className="text-xs">랭킹</span>
            </Button>

            {/* Statistics */}
            <Button
              variant={activeView === 'stats' ? 'default' : 'ghost'}
              onClick={() => setActiveView('stats')}
              className={`h-16 flex flex-col gap-1 ${
                theme === 'dark' && activeView !== 'stats' ? 'text-[#c9d1d9] hover:text-white hover:bg-[#21262d]' : ''
              }`}
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
        studentId={studentId || ''}
        seatNumber={parseInt(seatNumber)}
        existingPlanner={dailyPlanner || undefined}
        onSave={handleSavePlanner}
      />

      <OutingModal
        open={isOutingModalOpen}
        onOpenChange={setIsOutingModalOpen}
        studentId={studentId || ''}
        seatNumber={parseInt(seatNumber)}
        onOutingStart={handleOutingStart}
      />

      {/* Fullscreen Prompt Modal */}
      {fullscreenPromptOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center cursor-pointer"
          onClick={(e) => handleEnterFullscreenFromPrompt(e)}
          onTouchEnd={(e) => handleEnterFullscreenFromPrompt(e)}
        >
          <div className="text-center space-y-4 px-8 pointer-events-none">
            <h2 className="text-3xl md:text-4xl font-bold text-white">풀스크린 모드</h2>
            <p className="text-lg md:text-xl text-white/80">
              최적의 학습 환경을 위해<br />화면을 터치해주세요
            </p>
            <p className="text-sm text-white/60 pt-4">
              👆 화면 아무 곳이나 터치
            </p>
          </div>
        </div>
      )}

      {/* Manager Call Confirmation Modal */}
      <Dialog open={managerCallModalOpen} onOpenChange={setManagerCallModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader className="text-center pb-4">
            <DialogTitle className="text-2xl">매니저 호출</DialogTitle>
            <DialogDescription className="text-base pt-2">
              매니저를 부르시겠습니까?
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setManagerCallModalOpen(false)}
              className="w-[48%] h-16 text-lg font-semibold"
            >
              취소
            </Button>
            <Button
              size="lg"
              onClick={handleCallManager}
              className="w-[48%] h-16 text-lg font-semibold"
            >
              호출하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}
