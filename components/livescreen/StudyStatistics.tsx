'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  BarChart3,
  Clock,
  TrendingUp,
  TrendingDown,
  Award,
  Target,
  Zap,
  Calendar,
  Trophy,
  Flame,
  Star,
  CheckCircle2,
  ArrowUp,
  ArrowDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Subject, SubjectStatistics } from '@/lib/types/database'

interface StudyStatisticsProps {
  studentId: string
}

interface DailyRecord {
  date: string
  totalSeconds: number
  subjects: SubjectStatistics[]
}

interface WeeklyComparison {
  thisWeek: number
  lastWeek: number
  change: number
  changePercent: number
}

interface TimeSlotData {
  slot: string
  label: string
  totalSeconds: number
}

interface Achievement {
  id: string
  title: string
  description: string
  icon: 'trophy' | 'flame' | 'star' | 'target'
  unlocked: boolean
  date?: string
}

export function StudyStatistics({ studentId }: StudyStatisticsProps) {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [todayStats, setTodayStats] = useState<SubjectStatistics[]>([])
  const [weeklyData, setWeeklyData] = useState<DailyRecord[]>([])
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)

  useEffect(() => {
    loadData()
  }, [studentId])

  const loadData = () => {
    // Load subjects
    const savedSubjects = localStorage.getItem(`subjects-${studentId}`)
    if (savedSubjects) {
      setSubjects(JSON.parse(savedSubjects))
    }

    // Load today's statistics
    const today = new Date().toISOString().split('T')[0]
    const savedStats = localStorage.getItem(`subject-stats-${studentId}-${today}`)
    if (savedStats) {
      const stats = JSON.parse(savedStats)
      setTodayStats(stats)
      const total = stats.reduce((sum: number, stat: SubjectStatistics) => sum + stat.total_seconds, 0)
      setTotalSeconds(total)
    }

    // Load weekly data (last 7 days)
    const weekData: DailyRecord[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayStats = localStorage.getItem(`subject-stats-${studentId}-${dateStr}`)
      if (dayStats) {
        const stats = JSON.parse(dayStats)
        const total = stats.reduce((sum: number, stat: SubjectStatistics) => sum + stat.total_seconds, 0)
        weekData.push({
          date: dateStr,
          totalSeconds: total,
          subjects: stats
        })
      } else {
        weekData.push({
          date: dateStr,
          totalSeconds: 0,
          subjects: []
        })
      }
    }
    setWeeklyData(weekData)

    // Calculate streak
    calculateStreak()
  }

  const calculateStreak = () => {
    let currentStreak = 0
    let maxStreakCount = 0
    let tempStreak = 0

    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayStats = localStorage.getItem(`subject-stats-${studentId}-${dateStr}`)
      if (dayStats) {
        const stats = JSON.parse(dayStats)
        const total = stats.reduce((sum: number, stat: SubjectStatistics) => sum + stat.total_seconds, 0)

        if (total > 0) {
          tempStreak++
          if (i === 0) currentStreak = tempStreak
          maxStreakCount = Math.max(maxStreakCount, tempStreak)
        } else {
          tempStreak = 0
        }
      } else {
        tempStreak = 0
      }
    }

    setStreak(currentStreak)
    setMaxStreak(maxStreakCount)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return { hours, minutes }
  }

  const formatTimeString = (seconds: number) => {
    const { hours, minutes } = formatTime(seconds)
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`
    }
    return `${minutes}분`
  }

  const getWeeklyComparison = (): WeeklyComparison => {
    const thisWeekSeconds = weeklyData.slice(-7).reduce((sum, day) => sum + day.totalSeconds, 0)
    const lastWeekSeconds = weeklyData.slice(-14, -7).reduce((sum, day) => sum + day.totalSeconds, 0) || 1

    const change = thisWeekSeconds - lastWeekSeconds
    const changePercent = ((change / lastWeekSeconds) * 100)

    return {
      thisWeek: thisWeekSeconds,
      lastWeek: lastWeekSeconds,
      change,
      changePercent
    }
  }

  const getAverage7Days = () => {
    const last7Days = weeklyData.slice(-7)
    const total = last7Days.reduce((sum, day) => sum + day.totalSeconds, 0)
    return Math.floor(total / 7)
  }

  const getAverage30Days = () => {
    let total = 0
    let count = 0

    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayStats = localStorage.getItem(`subject-stats-${studentId}-${dateStr}`)
      if (dayStats) {
        const stats = JSON.parse(dayStats)
        total += stats.reduce((sum: number, stat: SubjectStatistics) => sum + stat.total_seconds, 0)
        count++
      }
    }

    return count > 0 ? Math.floor(total / count) : 0
  }

  const getTimeSlotData = (): TimeSlotData[] => {
    // Mock data for now - will be replaced with actual session data
    return [
      { slot: '06-09', label: '아침 (06-09시)', totalSeconds: totalSeconds * 0.1 },
      { slot: '09-12', label: '오전 (09-12시)', totalSeconds: totalSeconds * 0.15 },
      { slot: '12-15', label: '점심 (12-15시)', totalSeconds: totalSeconds * 0.1 },
      { slot: '15-18', label: '오후 (15-18시)', totalSeconds: totalSeconds * 0.2 },
      { slot: '18-21', label: '저녁 (18-21시)', totalSeconds: totalSeconds * 0.25 },
      { slot: '21-24', label: '밤 (21-24시)', totalSeconds: totalSeconds * 0.2 },
    ]
  }

  const getDayOfWeekData = () => {
    const dayMap: { [key: string]: number } = {
      '월': 0, '화': 0, '수': 0, '목': 0, '금': 0, '토': 0, '일': 0
    }

    weeklyData.forEach(day => {
      const date = new Date(day.date)
      const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
      dayMap[dayName] += day.totalSeconds
    })

    return Object.entries(dayMap).map(([day, seconds]) => ({ day, seconds }))
  }

  const getAchievements = (): Achievement[] => {
    return [
      {
        id: '3h-club',
        title: '3시간 클럽',
        description: '하루 순공 3시간 달성',
        icon: 'trophy',
        unlocked: totalSeconds >= 3 * 3600,
        date: totalSeconds >= 3 * 3600 ? new Date().toISOString() : undefined
      },
      {
        id: '7-day-streak',
        title: '1주 연속 정주행',
        description: '7일 연속 공부',
        icon: 'flame',
        unlocked: streak >= 7,
        date: streak >= 7 ? new Date().toISOString() : undefined
      },
      {
        id: '10h-subject',
        title: '과목 마스터',
        description: '특정 과목 10시간 달성',
        icon: 'star',
        unlocked: todayStats.some(s => s.total_seconds >= 10 * 3600),
        date: todayStats.some(s => s.total_seconds >= 10 * 3600) ? new Date().toISOString() : undefined
      },
      {
        id: 'perfect-week',
        title: '완벽한 한 주',
        description: '주간 목표 100% 달성',
        icon: 'target',
        unlocked: getWeeklyComparison().thisWeek >= 20 * 3600,
        date: getWeeklyComparison().thisWeek >= 20 * 3600 ? new Date().toISOString() : undefined
      },
    ]
  }

  const getMostStudiedSubject = () => {
    if (todayStats.length === 0) return null
    return todayStats.reduce((prev, current) =>
      prev.total_seconds > current.total_seconds ? prev : current
    )
  }

  const getBestTimeSlot = () => {
    const slots = getTimeSlotData()
    return slots.reduce((prev, current) =>
      prev.totalSeconds > current.totalSeconds ? prev : current
    )
  }

  const weeklyComparison = getWeeklyComparison()
  const avg7Days = getAverage7Days()
  const avg30Days = getAverage30Days()
  const mostStudied = getMostStudiedSubject()
  const bestTimeSlot = getBestTimeSlot()
  const achievements = getAchievements()
  const { hours: totalHours, minutes: totalMinutes } = formatTime(totalSeconds)
  const sortedStats = [...todayStats].sort((a, b) => b.total_seconds - a.total_seconds)
  const maxSeconds = sortedStats.length > 0 ? sortedStats[0].total_seconds : 1
  const timeSlots = getTimeSlotData()
  const maxTimeSlot = Math.max(...timeSlots.map(t => t.totalSeconds))
  const dayOfWeekData = getDayOfWeekData()
  const maxDaySeconds = Math.max(...dayOfWeekData.map(d => d.seconds))

  return (
    <div className="space-y-2.5 pb-4">
      {/* 통합 Hero 카드 - 모든 핵심 데이터 포함 */}
      <Card className="bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 border-0 overflow-hidden relative">
        <CardContent className="p-3">
          <div className="absolute top-0 left-0 right-0 h-12 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 400 60" preserveAspectRatio="none">
              <path d="M0,30 Q100,10 200,30 T400,30 L400,0 L0,0 Z" fill="white" />
              <path d="M0,40 Q100,20 200,40 T400,40 L400,0 L0,0 Z" fill="white" opacity="0.5" />
            </svg>
          </div>

          <div className="relative space-y-2">
            {/* 메인 순공시간 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-[10px] font-medium mb-0.5">오늘의 순공시간</p>
                <div className="flex items-baseline gap-1.5">
                  <h1 className="text-white text-3xl font-bold tracking-tight">
                    {totalHours > 0 ? `${totalHours}.${Math.floor(totalMinutes / 6)}` : totalMinutes}
                  </h1>
                  <span className="text-white/90 text-lg font-semibold">
                    {totalHours > 0 ? '시간' : '분'}
                  </span>
                </div>
              </div>

              {/* 최고기록 비교 */}
              <div className="text-right">
                <p className="text-white/80 text-[9px]">최고 기록 대비</p>
                <p className="text-white text-2xl font-bold">
                  {maxSeconds > 0 ? ((totalSeconds / maxSeconds) * 100).toFixed(0) : 0}%
                </p>
              </div>
            </div>

            {/* 주요 지표 그리드 */}
            <div className="grid grid-cols-5 gap-1.5">
              {/* 연속일 */}
              <div className="px-1.5 py-1 rounded bg-white/20 backdrop-blur-sm text-center">
                <p className="text-white/80 text-[8px]">연속</p>
                <p className="text-white text-xs font-bold">{streak}일</p>
              </div>

              {/* 주간 변화 */}
              <div className="px-1.5 py-1 rounded bg-white/20 backdrop-blur-sm text-center">
                <p className="text-white/80 text-[8px]">이번주</p>
                <div className="flex items-center justify-center gap-0.5">
                  {weeklyComparison.change >= 0 ? (
                    <ArrowUp className="h-2 w-2 text-white" />
                  ) : (
                    <ArrowDown className="h-2 w-2 text-white" />
                  )}
                  <p className="text-white text-xs font-bold">
                    {weeklyComparison.changePercent.toFixed(0)}%
                  </p>
                </div>
              </div>

              {/* 7일 평균 */}
              <div className="px-1.5 py-1 rounded bg-white/20 backdrop-blur-sm text-center">
                <p className="text-white/80 text-[8px]">7일평균</p>
                <p className="text-white text-xs font-bold">
                  {Math.floor(avg7Days / 3600) > 0
                    ? `${Math.floor(avg7Days / 3600)}h`
                    : `${Math.floor(avg7Days / 60)}m`}
                </p>
              </div>

              {/* 30일 평균 */}
              <div className="px-1.5 py-1 rounded bg-white/20 backdrop-blur-sm text-center">
                <p className="text-white/80 text-[8px]">30일평균</p>
                <p className="text-white text-xs font-bold">
                  {Math.floor(avg30Days / 3600) > 0
                    ? `${Math.floor(avg30Days / 3600)}h`
                    : `${Math.floor(avg30Days / 60)}m`}
                </p>
              </div>

              {/* 과목수 */}
              <div className="px-1.5 py-1 rounded bg-white/20 backdrop-blur-sm text-center">
                <p className="text-white/80 text-[8px]">과목</p>
                <p className="text-white text-xs font-bold">{todayStats.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 통합 그래프 카드 - 주간 추이 + 요일별 평균 */}
      <Card>
        <CardHeader className="pb-2 px-3 pt-2.5">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xs font-semibold">주간 학습 패턴</CardTitle>
            {mostStudied && (
              <div className="flex items-center gap-1">
                <Trophy className="h-3 w-3 text-orange-500" />
                <span className="text-[9px] font-semibold text-gray-700">{mostStudied.subject_name}</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="px-3 pb-2.5">
          {/* 주간 막대 그래프 */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weeklyData.map((day, index) => {
              const date = new Date(day.date)
              const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]
              const isToday = index === weeklyData.length - 1
              const barHeight = weeklyData.length > 0 ? (day.totalSeconds / Math.max(...weeklyData.map(d => d.totalSeconds), 1)) * 100 : 0

              return (
                <div key={day.date} className="flex flex-col items-center">
                  <div className="w-full h-16 bg-gray-100 rounded flex items-end justify-center overflow-hidden">
                    <div
                      className={`w-full rounded-t transition-all duration-500 ${isToday ? 'bg-gradient-to-t from-orange-400 to-pink-500' : 'bg-gray-300'}`}
                      style={{ height: `${barHeight}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-semibold text-gray-700 mt-1">{dayName}</span>
                </div>
              )
            })}
          </div>

          {/* 과목별 분포 (컴팩트) */}
          {sortedStats.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t">
              {sortedStats.slice(0, 3).map((stat) => {
                const percentage = totalSeconds > 0 ? (stat.total_seconds / totalSeconds) * 100 : 0

                return (
                  <div key={stat.subject_id} className="flex items-center gap-1">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: stat.subject_color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-medium truncate">{stat.subject_name}</p>
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: stat.subject_color
                            }}
                          />
                        </div>
                        <span className="text-[8px] font-bold text-gray-600">{percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 통합 업적 카드 - 업적 + 인사이트 */}
      <Card>
        <CardHeader className="pb-2 px-3 pt-2.5">
          <CardTitle className="text-xs font-semibold">업적 & 목표</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-2.5 space-y-2">
          {/* 업적 그리드 (2x2) */}
          <div className="grid grid-cols-4 gap-1.5">
            {achievements.map((achievement) => {
              const Icon = {
                trophy: Trophy,
                flame: Flame,
                star: Star,
                target: Target
              }[achievement.icon]

              return (
                <div
                  key={achievement.id}
                  className={`p-1.5 rounded border transition-all ${
                    achievement.unlocked
                      ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300'
                      : 'bg-gray-50 border-gray-200 opacity-40'
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center ${
                      achievement.unlocked ? 'bg-yellow-400' : 'bg-gray-300'
                    }`}>
                      <Icon className={`h-3.5 w-3.5 ${achievement.unlocked ? 'text-yellow-900' : 'text-gray-500'}`} />
                    </div>
                    <p className="text-[8px] font-bold leading-tight mt-0.5">{achievement.title}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 목표 진행 바 */}
          <div className="p-2 bg-gradient-to-r from-purple-50 to-pink-50 rounded border border-purple-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-semibold text-purple-900">주간 목표 (20시간)</span>
              <span className="text-[9px] font-bold text-purple-700">
                {formatTimeString(weeklyComparison.thisWeek)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-2 bg-purple-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((weeklyComparison.thisWeek / (20 * 3600)) * 100, 100)}%` }}
                />
              </div>
              <span className="text-xs font-bold text-purple-700">
                {((weeklyComparison.thisWeek / (20 * 3600)) * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
