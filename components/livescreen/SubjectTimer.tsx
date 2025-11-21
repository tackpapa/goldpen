'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Play, Pause, Plus, Trash2, Edit2 } from 'lucide-react'
import type { Subject, StudySession, SubjectStatistics } from '@/lib/types/database'
import type { Theme } from '@/hooks/use-theme'

interface SubjectTimerProps {
  studentId: string
  containerRef?: React.RefObject<HTMLDivElement>
  theme?: Theme
  onSubjectsChange?: (subjects: Subject[]) => void
  hiddenSubjectIds?: Set<string>
  // Props for parent-level data loading
  initialSubjects?: Subject[]
  initialStatistics?: SubjectStatistics[]
  dataLoaded?: boolean
  onStatisticsChange?: (stats: SubjectStatistics[]) => void
}

const DEFAULT_COLORS = [
  '#FF6B35', // 주황
  '#F7931E', // 노랑
  '#4A90E2', // 파랑
  '#50C878', // 녹색
  '#9B59B6', // 보라
  '#E91E63', // 핑크
  '#00BCD4', // 시안
  '#FF5722', // 딥오렌지
]

export function SubjectTimer({
  studentId,
  containerRef,
  theme = 'color',
  onSubjectsChange,
  hiddenSubjectIds,
  initialSubjects,
  initialStatistics,
  dataLoaded: parentDataLoaded,
  onStatisticsChange,
}: SubjectTimerProps) {
  // State - use initial values from props if provided
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects || [])
  const [activeSession, setActiveSession] = useState<StudySession | null>(null)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [currentSessionSeconds, setCurrentSessionSeconds] = useState(0)
  const [statistics, setStatistics] = useState<SubjectStatistics[]>(initialStatistics || [])

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newSubjectName, setNewSubjectName] = useState('')
  const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0])
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [wasFullscreen, setWasFullscreen] = useState(false)

  // Pomodoro state
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25)
  const [pomodoroSeconds, setPomodoroSeconds] = useState(0)
  const [isPomodoroRunning, setIsPomodoroRunning] = useState(false)
  const [pomodoroTotalSeconds, setPomodoroTotalSeconds] = useState(25 * 60)

  // Prevent double-click
  const [isProcessing, setIsProcessing] = useState(false)

  // Loading state - use parent's dataLoaded if provided
  const [isLoaded, setIsLoaded] = useState(parentDataLoaded ?? false)

  const getTodayDate = () => new Date().toISOString().split('T')[0]

  // Sync with parent data when props change
  useEffect(() => {
    if (initialSubjects) setSubjects(initialSubjects)
  }, [initialSubjects])

  useEffect(() => {
    if (initialStatistics) setStatistics(initialStatistics)
  }, [initialStatistics])

  useEffect(() => {
    if (parentDataLoaded !== undefined) setIsLoaded(parentDataLoaded)
  }, [parentDataLoaded])

  // Only fetch if no initial data provided (fallback)
  useEffect(() => {
    if (initialSubjects !== undefined || !studentId) return

    const fetchData = async () => {
      try {
        const [subjectsRes, statsRes] = await Promise.all([
          fetch(`/api/subjects?studentId=${studentId}`, { credentials: 'include' }),
          fetch(`/api/daily-study-stats?studentId=${studentId}&date=${getTodayDate()}`, { credentials: 'include' })
        ])

        if (subjectsRes.ok) {
          const data = await subjectsRes.json()
          setSubjects(data.subjects || [])
        }
        if (statsRes.ok) {
          const data = await statsRes.json()
          setStatistics(data.stats || [])
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setIsLoaded(true)
      }
    }

    fetchData()
  }, [studentId, initialSubjects])

  // Load active session from localStorage
  useEffect(() => {
    if (!studentId) return
    const savedSession = localStorage.getItem(`active-session-${studentId}`)
    if (savedSession) {
      const session = JSON.parse(savedSession)
      setActiveSession(session)
    }
  }, [studentId])

  // subjects는 DB에서 관리되므로 localStorage 저장 제거

  // Notify parent when subjects change
  useEffect(() => {
    if (subjects.length > 0 && onSubjectsChange) {
      onSubjectsChange(subjects)
    }
  }, [subjects, onSubjectsChange])

  // Timer for active session
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (activeSession) {
      const updateTimer = () => {
        const startTime = new Date(activeSession.start_time).getTime()
        const now = Date.now()
        const elapsed = Math.floor((now - startTime) / 1000)
        setCurrentSessionSeconds(elapsed)
      }

      updateTimer()
      interval = setInterval(updateTimer, 1000)
    } else {
      setCurrentSessionSeconds(0)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [activeSession])

  // Calculate total study time
  useEffect(() => {
    const total = statistics.reduce((sum, stat) => sum + stat.total_seconds, 0)
    setTotalSeconds(total + (activeSession ? currentSessionSeconds : 0))
  }, [statistics, activeSession, currentSessionSeconds])

  // Pomodoro timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null

    if (isPomodoroRunning && pomodoroTotalSeconds > 0) {
      interval = setInterval(() => {
        setPomodoroTotalSeconds((prev) => {
          if (prev <= 1) {
            setIsPomodoroRunning(false)
            // Timer finished - play sound or show notification
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isPomodoroRunning, pomodoroTotalSeconds])

  // Update display time from total seconds
  useEffect(() => {
    setPomodoroMinutes(Math.floor(pomodoroTotalSeconds / 60))
    setPomodoroSeconds(pomodoroTotalSeconds % 60)
  }, [pomodoroTotalSeconds])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
    }
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
  }

  const handleAddSubject = async () => {
    if (!newSubjectName.trim()) return

    try {
      const response = await fetch('/api/subjects', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          name: newSubjectName.trim(),
          color: selectedColor,
          order: subjects.length,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setSubjects([...subjects, data.subject])
      }
    } catch (error) {
      console.error('Failed to add subject:', error)
    }

    setNewSubjectName('')
    setSelectedColor(DEFAULT_COLORS[0])
    setIsAddModalOpen(false)

    // 풀스크린 모드였다면 다시 진입 (사용자 제스처 컨텍스트 유지)
    if (wasFullscreen && containerRef?.current) {
      const container = containerRef.current as any

      // 즉시 실행 (setTimeout 사용 안 함 - 사용자 제스처 컨텍스트 유지)
      try {
        // Try webkit version first (iPad)
        if (typeof container.webkitRequestFullscreen === 'function') {
          await container.webkitRequestFullscreen()
        }
        // Then try standard
        else if (typeof container.requestFullscreen === 'function') {
          await container.requestFullscreen()
        }
      } catch (error) {
        // Silently fail
      }
    }
  }

  const handleOpenAddModal = () => {
    const isInFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).webkitCurrentFullScreenElement
    )
    setWasFullscreen(isInFullscreen)
    setIsAddModalOpen(true)
  }

  const handleCloseAddModal = async () => {
    setIsAddModalOpen(false)
    setNewSubjectName('')
    setSelectedColor(DEFAULT_COLORS[0])

    // 풀스크린 모드였다면 다시 진입 (사용자 제스처 컨텍스트 유지)
    if (wasFullscreen && containerRef?.current) {
      const container = containerRef.current as any

      // 즉시 실행 (setTimeout 사용 안 함 - 사용자 제스처 컨텍스트 유지)
      try {
        // Try webkit version first (iPad)
        if (typeof container.webkitRequestFullscreen === 'function') {
          await container.webkitRequestFullscreen()
        }
        // Then try standard
        else if (typeof container.requestFullscreen === 'function') {
          await container.requestFullscreen()
        }
      } catch (error) {
        // Silently fail
      }
    }
  }

  const handleDeleteSubject = async (subjectId: string) => {
    try {
      const response = await fetch(`/api/subjects?id=${subjectId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        setSubjects(subjects.filter(s => s.id !== subjectId))
      }
    } catch (error) {
      console.error('Failed to delete subject:', error)
    }
  }

  const handleStartSession = async (subject: Subject) => {
    if (isProcessing) return
    setIsProcessing(true)

    try {
      // Optimistic update - create local session immediately
      const localSession: StudySession = {
        id: `session-${Date.now()}`,
        created_at: new Date().toISOString(),
        student_id: studentId,
        subject_id: subject.id,
        subject_name: subject.name,
        date: getTodayDate(),
        start_time: new Date().toISOString(),
        duration_seconds: 0,
        status: 'active',
      }
      setActiveSession(localSession)
      localStorage.setItem(`active-session-${studentId}`, JSON.stringify(localSession))

      // Then sync with DB
      const response = await fetch('/api/study-sessions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          subjectId: subject.id,
          subjectName: subject.name,
          action: 'start',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        const session: StudySession = {
          id: data.session.id,
          created_at: data.session.created_at,
          student_id: studentId,
          subject_id: subject.id,
          subject_name: subject.name,
          date: getTodayDate(),
          start_time: data.session.start_time || localSession.start_time,
          duration_seconds: 0,
          status: 'active',
        }
        setActiveSession(session)
        localStorage.setItem(`active-session-${studentId}`, JSON.stringify(session))
      }
    } catch (error) {
      console.error('Failed to start session:', error)
      // Local session already set, keep it
    } finally {
      setIsProcessing(false)
    }
  }

  const handleStopSession = async () => {
    if (!activeSession || isProcessing) return
    setIsProcessing(true)

    const endTime = new Date()
    const startTime = new Date(activeSession.start_time)
    const durationSeconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000)

    // Update local statistics immediately (optimistic)
    const existingStat = statistics.find(s => s.subject_id === activeSession.subject_id)
    let newStats: SubjectStatistics[]

    if (existingStat) {
      newStats = statistics.map(s =>
        s.subject_id === activeSession.subject_id
          ? {
              ...s,
              total_seconds: s.total_seconds + durationSeconds,
              session_count: s.session_count + 1,
            }
          : s
      )
    } else {
      const subject = subjects.find(s => s.id === activeSession.subject_id)
      newStats = [
        ...statistics,
        {
          subject_id: activeSession.subject_id,
          subject_name: activeSession.subject_name,
          subject_color: subject?.color || '#000000',
          total_seconds: durationSeconds,
          session_count: 1,
          date: getTodayDate(),
        },
      ]
    }

    setStatistics(newStats)
    localStorage.removeItem(`active-session-${studentId}`)
    setActiveSession(null)

    // Then sync with DB
    try {
      await fetch('/api/study-sessions', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          subjectId: activeSession.subject_id,
          subjectName: activeSession.subject_name,
          sessionId: activeSession.id,
          durationSeconds,
          action: 'stop',
        }),
      })
    } catch (error) {
      console.error('Failed to stop session:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const getSubjectStats = (subjectId: string) => {
    const stat = statistics.find(s => s.subject_id === subjectId)

    // Add current session time if this subject is active (check BEFORE returning early!)
    if (activeSession && activeSession.subject_id === subjectId) {
      return {
        total_seconds: (stat?.total_seconds || 0) + currentSessionSeconds,
        session_count: stat?.session_count || 0,
      }
    }

    if (!stat) return { total_seconds: 0, session_count: 0 }

    return stat
  }

  // Pomodoro handlers
  const handlePomodoroStart = () => {
    setIsPomodoroRunning(true)
  }

  const handlePomodoroPause = () => {
    setIsPomodoroRunning(false)
  }

  const handlePomodoroReset = () => {
    setIsPomodoroRunning(false)
    setPomodoroTotalSeconds(25 * 60)
  }

  const handlePomodoroMinutesChange = (minutes: number) => {
    if (minutes >= 1 && minutes <= 60) {
      setPomodoroTotalSeconds(minutes * 60)
    }
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Split Timer Display - Takes up most of the vertical space */}
      <div className="grid grid-cols-2 gap-3 flex-1 min-h-[100px] mb-3">
        {/* Left: Total Study Time */}
        <Card className={`border-0 overflow-hidden relative h-full min-h-0 ${
          theme === 'dark'
            ? 'bg-[#161b22] border border-[#30363d]'
            : theme === 'white'
            ? 'bg-white border-2 border-orange-300'
            : 'bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600'
        }`}>
          <CardContent className="p-6 md:p-8 h-full flex flex-col justify-center">
            {/* Decorative wave pattern */}
            {theme === 'color' && (
              <div className="absolute top-0 left-0 right-0 h-16 opacity-20">
                <svg className="w-full h-full" viewBox="0 0 400 60" preserveAspectRatio="none">
                  <path d="M0,30 Q100,10 200,30 T400,30 L400,0 L0,0 Z" fill="white" />
                  <path d="M0,40 Q100,20 200,40 T400,40 L400,0 L0,0 Z" fill="white" opacity="0.5" />
                </svg>
              </div>
            )}

            <div className="relative text-center">
              <p className={`text-xs sm:text-sm md:text-base font-medium mb-2 sm:mb-3 md:mb-4 ${
                theme === 'dark'
                  ? 'text-[#8b949e]'
                  : theme === 'white'
                  ? 'text-orange-600'
                  : 'text-white/90'
              }`}>
                Total Study Time
              </p>
              <div className="flex items-baseline justify-center gap-1 mb-2 sm:mb-3 md:mb-4">
                <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight ${
                  theme === 'dark'
                    ? 'text-[#c9d1d9]'
                    : theme === 'white'
                    ? 'text-orange-600'
                    : 'text-white'
                }`}>
                  {formatTime(totalSeconds)}
                </h1>
              </div>
              <p className={`text-xs sm:text-sm md:text-base ${
                theme === 'dark'
                  ? 'text-[#8b949e]'
                  : theme === 'white'
                  ? 'text-orange-500'
                  : 'text-white/80'
              }`}>
                순공타임 (실제 공부시간)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Right: Pomodoro Timer */}
        <Card className={`border-0 overflow-hidden relative h-full min-h-0 ${
          theme === 'dark'
            ? 'bg-[#161b22] border border-[#30363d]'
            : theme === 'white'
            ? 'bg-white border-2 border-blue-300'
            : 'bg-gradient-to-br from-blue-400 via-cyan-500 to-teal-600'
        }`}>
          <CardContent className="p-6 md:p-8 h-full flex flex-col justify-center">
            {/* Decorative wave pattern */}
            {theme === 'color' && (
              <div className="absolute top-0 left-0 right-0 h-16 opacity-20">
                <svg className="w-full h-full" viewBox="0 0 400 60" preserveAspectRatio="none">
                  <path d="M0,30 Q100,10 200,30 T400,30 L400,0 L0,0 Z" fill="white" />
                  <path d="M0,40 Q100,20 200,40 T400,40 L400,0 L0,0 Z" fill="white" opacity="0.5" />
                </svg>
              </div>
            )}

            <div className="relative">
              {/* Header */}
              <div className="text-center mb-2 sm:mb-3 md:mb-4">
                <p className={`text-xs sm:text-sm md:text-base font-medium ${
                  theme === 'dark'
                    ? 'text-gray-300'
                    : theme === 'white'
                    ? 'text-blue-600'
                    : 'text-white/90'
                }`}>
                  Pomodoro
                </p>
              </div>

              {/* Timer Display */}
              <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 mb-3 sm:mb-4 md:mb-6">
                {!isPomodoroRunning && (
                  <button
                    onClick={() => handlePomodoroMinutesChange(Math.floor(pomodoroTotalSeconds / 60) - 5)}
                    className={`h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full backdrop-blur-sm flex items-center justify-center text-lg sm:text-xl md:text-2xl font-bold transition-all ${
                      theme === 'dark'
                        ? 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                        : theme === 'white'
                        ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-2 border-blue-300'
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                  >
                    -
                  </button>
                )}
                <h1 className={`text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight font-mono tabular-nums ${
                  theme === 'dark'
                    ? 'text-gray-100'
                    : theme === 'white'
                    ? 'text-blue-600'
                    : 'text-white'
                }`}>
                  {String(pomodoroMinutes).padStart(2, '0')}:{String(pomodoroSeconds).padStart(2, '0')}
                </h1>
                {!isPomodoroRunning && (
                  <button
                    onClick={() => handlePomodoroMinutesChange(Math.floor(pomodoroTotalSeconds / 60) + 5)}
                    className={`h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 rounded-full backdrop-blur-sm flex items-center justify-center text-lg sm:text-xl md:text-2xl font-bold transition-all ${
                      theme === 'dark'
                        ? 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                        : theme === 'white'
                        ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border-2 border-blue-300'
                        : 'bg-white/20 hover:bg-white/30 text-white'
                    }`}
                  >
                    +
                  </button>
                )}
              </div>

              {/* Control Buttons */}
              <div className="flex gap-1 sm:gap-2 justify-center">
                {!isPomodoroRunning ? (
                  <Button
                    onClick={handlePomodoroStart}
                    className={`backdrop-blur-sm h-8 sm:h-10 md:h-12 px-3 sm:px-4 md:px-6 text-xs sm:text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-gray-600 hover:bg-gray-500 border border-gray-500 text-gray-200'
                        : theme === 'white'
                        ? 'bg-blue-500 hover:bg-blue-600 border border-blue-600 text-white'
                        : 'bg-white/20 hover:bg-white/30 border border-white/40 text-white'
                    }`}
                  >
                    <Play className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1 sm:mr-1.5 md:mr-2" />
                    Start
                  </Button>
                ) : (
                  <Button
                    onClick={handlePomodoroPause}
                    className={`backdrop-blur-sm h-8 sm:h-10 md:h-12 px-3 sm:px-4 md:px-6 text-xs sm:text-sm md:text-base ${
                      theme === 'dark'
                        ? 'bg-gray-600 hover:bg-gray-500 border border-gray-500 text-gray-200'
                        : theme === 'white'
                        ? 'bg-blue-500 hover:bg-blue-600 border border-blue-600 text-white'
                        : 'bg-white/20 hover:bg-white/30 border border-white/40 text-white'
                    }`}
                  >
                    <Pause className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 mr-1 sm:mr-1.5 md:mr-2" />
                    Pause
                  </Button>
                )}
                <Button
                  onClick={handlePomodoroReset}
                  variant="ghost"
                  className={`h-8 sm:h-10 md:h-12 px-3 sm:px-4 md:px-6 text-xs sm:text-sm md:text-base ${
                    theme === 'dark'
                      ? 'text-gray-300 hover:text-gray-100 hover:bg-gray-600'
                      : theme === 'white'
                      ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject List - Horizontal Scrollable Cards */}
      <div className="flex gap-4 overflow-x-auto pb-1 snap-x snap-mandatory hide-scrollbar flex-shrink-0">
        {/* Skeleton while loading */}
        {!isLoaded && [1, 2].map((i) => (
          <Card
            key={`skeleton-${i}`}
            className="shadow-lg flex-shrink-0 w-72 h-72 snap-center bg-gray-100 animate-pulse"
          >
            <CardContent className="p-6 h-full flex flex-col justify-between">
              <div className="h-8 bg-gray-200 rounded w-20" />
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-16" />
                <div className="h-12 bg-gray-200 rounded w-32" />
              </div>
              <div className="h-14 bg-gray-200 rounded w-full" />
            </CardContent>
          </Card>
        ))}

        {isLoaded && subjects.filter(s => !hiddenSubjectIds?.has(s.id)).map((subject) => {
          const stats = getSubjectStats(subject.id)
          const isActive = activeSession?.subject_id === subject.id

          return (
            <Card
              key={subject.id}
              className={`shadow-lg flex-shrink-0 w-72 h-72 snap-center relative overflow-hidden ${
                theme === 'white' ? 'bg-white border-4' : 'border-0'
              }`}
              style={{
                background: theme === 'white' ? 'white' : theme === 'dark'
                  ? `linear-gradient(135deg, ${subject.color}40 0%, ${subject.color}60 100%)`
                  : `linear-gradient(135deg, ${subject.color} 0%, ${subject.color}dd 100%)`,
                borderColor: theme === 'white' ? subject.color : undefined,
              }}
            >
              {/* Delete Button - Top Right */}
              <Button
                size="icon"
                variant="ghost"
                className={`absolute top-2 right-2 h-8 w-8 z-10 backdrop-blur-sm ${
                  theme === 'white'
                    ? 'bg-gray-100 hover:bg-gray-200'
                    : 'bg-black/20 hover:bg-black/40'
                }`}
                onClick={() => handleDeleteSubject(subject.id)}
              >
                <Trash2 className={`h-4 w-4 ${
                  theme === 'white' ? 'text-gray-700' : 'text-white'
                }`} />
              </Button>

              <CardContent className="p-6 h-full flex flex-col justify-between">
                {/* Subject Name */}
                <div className="mb-4">
                  <h3
                    className="text-3xl font-bold truncate"
                    style={{
                      color: theme === 'white' ? subject.color : theme === 'dark' ? '#f3f4f6' : 'white',
                    }}
                  >
                    {subject.name}
                  </h3>
                </div>

                {/* Time Display */}
                <div className="mb-6 flex-1 flex flex-col justify-center">
                  <p
                    className="text-sm mb-2"
                    style={{
                      color: theme === 'white' ? `${subject.color}cc` : theme === 'dark' ? '#d1d5db' : 'rgba(255,255,255,0.8)',
                    }}
                  >
                    순공의 {totalSeconds > 0 ? Math.round((stats.total_seconds / totalSeconds) * 100) : 0}%
                  </p>
                  <p
                    className="text-5xl font-bold font-mono tabular-nums"
                    style={{
                      color: theme === 'white' ? subject.color : theme === 'dark' ? '#f3f4f6' : 'white',
                    }}
                  >
                    {formatDuration(stats.total_seconds)}
                  </p>
                </div>

                {/* Play/Pause Button */}
                <Button
                  size="lg"
                  className={`w-full h-14 rounded-xl font-semibold shadow-md backdrop-blur-sm ${
                    theme === 'white'
                      ? 'border-2 hover:opacity-90'
                      : theme === 'dark'
                      ? 'bg-gray-700 hover:bg-gray-600 border border-gray-600'
                      : 'bg-white/20 hover:bg-white/30 border border-white/40'
                  }`}
                  style={{
                    backgroundColor: theme === 'white' ? subject.color : undefined,
                    borderColor: theme === 'white' ? subject.color : undefined,
                  }}
                  disabled={isProcessing}
                  onClick={() => isActive ? handleStopSession() : handleStartSession(subject)}
                >
                  {isActive ? (
                    <>
                      <Pause className={`h-6 w-6 mr-2 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-white'
                      }`} />
                      <span className={`text-lg ${
                        theme === 'dark' ? 'text-gray-200' : 'text-white'
                      }`}>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className={`h-6 w-6 mr-2 ${
                        theme === 'dark' ? 'text-gray-200' : 'text-white'
                      }`} />
                      <span className={`text-lg ${
                        theme === 'dark' ? 'text-gray-200' : 'text-white'
                      }`}>Start</span>
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}

        {/* Add Subject Button */}
        {isLoaded && (
        <Card
          className={`border-2 border-dashed transition-all cursor-pointer flex-shrink-0 w-72 h-72 snap-center ${
            theme === 'dark'
              ? 'border-gray-600 bg-gray-800/50 hover:border-gray-500 hover:bg-gray-700/50'
              : 'border-gray-300 bg-gray-50/50 hover:border-gray-400 hover:bg-gray-100/50'
          }`}
          onClick={async () => {
            // 풀스크린 상태 저장
            const isInFullscreen = !!(
              document.fullscreenElement ||
              (document as any).webkitFullscreenElement ||
              (document as any).webkitCurrentFullScreenElement
            )
            setWasFullscreen(isInFullscreen)

            // 풀스크린이면 즉시 풀스크린 진입 (사용자 제스처 컨텍스트 유지)
            if (isInFullscreen && containerRef?.current) {
              const container = containerRef.current as any
              try {
                if (typeof container.webkitRequestFullscreen === 'function') {
                  await container.webkitRequestFullscreen()
                } else if (typeof container.requestFullscreen === 'function') {
                  await container.requestFullscreen()
                }
              } catch (error) {
                // Silently fail
              }
            }

            // 모달 열기
            setIsAddModalOpen(true)
          }}
        >
          <CardContent className="p-6 h-full flex flex-col items-center justify-center">
            <div className="text-center">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                theme === 'dark'
                  ? 'bg-gray-700'
                  : 'bg-gray-200'
              }`}>
                <Plus className={`h-8 w-8 ${
                  theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                }`} />
              </div>
              <p className={`text-lg font-bold ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                과목 추가하기
              </p>
            </div>
          </CardContent>
        </Card>
        )}
      </div>

      {/* Add Subject Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={(open) => {
        if (open) {
          handleOpenAddModal()
        } else {
          handleCloseAddModal()
        }
      }}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-2xl">과목 추가</DialogTitle>
            <DialogDescription className="text-base pt-1">
              새로운 과목을 추가하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Subject Name */}
            <div className="space-y-3">
              <label className="text-base font-semibold">과목명</label>
              <Input
                placeholder="예: 국어, 영어, 수학"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleAddSubject()
                  }
                }}
                className="h-12 text-base"
              />
            </div>

            {/* Color Selection */}
            <div className="space-y-3">
              <label className="text-base font-semibold">색상 선택</label>
              <div className="grid grid-cols-8 gap-3">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`h-12 w-12 rounded-full transition-all ${
                      selectedColor === color
                        ? 'ring-4 ring-offset-2 ring-gray-400 scale-110'
                        : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              size="lg"
              onClick={handleCloseAddModal}
              className="w-[48%] h-16 text-lg font-semibold"
            >
              취소
            </Button>
            <Button
              size="lg"
              onClick={handleAddSubject}
              disabled={!newSubjectName.trim()}
              style={{ backgroundColor: selectedColor }}
              className="w-[48%] h-16 text-lg font-semibold text-white hover:opacity-90"
            >
              추가하기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
