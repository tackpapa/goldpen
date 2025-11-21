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
  ArrowDown,
  Sun,
  Moon,
  Coffee
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
  icon: typeof Sun
}

interface DayOfWeekStat {
  day: string
  seconds: number
  count: number
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
  const [yesterdayStats, setYesterdayStats] = useState<SubjectStatistics[]>([])
  const [weeklyData, setWeeklyData] = useState<DailyRecord[]>([])
  const [monthlyData, setMonthlyData] = useState<DailyRecord[]>([])
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [yesterdayTotal, setYesterdayTotal] = useState(0)
  const [streak, setStreak] = useState(0)
  const [maxStreak, setMaxStreak] = useState(0)
  const [personalBest, setPersonalBest] = useState(0)

  useEffect(() => {
    loadData()
  }, [studentId])

  const loadData = async () => {
    if (!studentId) return

    const today = new Date().toISOString().split('T')[0]

    // Fetch today's statistics from DB
    try {
      const response = await fetch(`/api/daily-study-stats?studentId=${studentId}&date=${today}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        const stats = data.stats || []
        setTodayStats(stats)
        const total = stats.reduce((sum: number, stat: any) => sum + stat.total_seconds, 0)
        setTotalSeconds(total)
      }
    } catch (error) {
      console.error('Failed to fetch today stats:', error)
      // Fallback to localStorage
      const savedStats = localStorage.getItem(`subject-stats-${studentId}-${today}`)
      if (savedStats) {
        const stats = JSON.parse(savedStats)
        setTodayStats(stats)
        const total = stats.reduce((sum: number, stat: SubjectStatistics) => sum + stat.total_seconds, 0)
        setTotalSeconds(total)
      }
    }

    // Fetch yesterday's statistics
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]

    try {
      const response = await fetch(`/api/daily-study-stats?studentId=${studentId}&date=${yesterdayStr}`, {
        credentials: 'include',
      })
      if (response.ok) {
        const data = await response.json()
        const stats = data.stats || []
        setYesterdayStats(stats)
        const total = stats.reduce((sum: number, stat: any) => sum + stat.total_seconds, 0)
        setYesterdayTotal(total)
      }
    } catch (error) {
      console.error('Failed to fetch yesterday stats:', error)
    }

    // Load weekly data (last 7 days) - keep localStorage for now as fallback
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

    // Load monthly data (last 30 days) for averages
    const monthData: DailyRecord[] = []
    let maxDaily = 0
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]

      const dayStats = localStorage.getItem(`subject-stats-${studentId}-${dateStr}`)
      if (dayStats) {
        const stats = JSON.parse(dayStats)
        const total = stats.reduce((sum: number, stat: SubjectStatistics) => sum + stat.total_seconds, 0)
        maxDaily = Math.max(maxDaily, total)
        monthData.push({
          date: dateStr,
          totalSeconds: total,
          subjects: stats
        })
      } else {
        monthData.push({
          date: dateStr,
          totalSeconds: 0,
          subjects: []
        })
      }
    }
    setMonthlyData(monthData)
    setPersonalBest(maxDaily)

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

  const formatCompactTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`
    }
    return `${minutes}m`
  }

  const getWeeklyComparison = (): WeeklyComparison => {
    const thisWeekSeconds = weeklyData.reduce((sum, day) => sum + day.totalSeconds, 0)

    // Get last week data
    let lastWeekSeconds = 0
    for (let i = 7; i < 14; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayStats = localStorage.getItem(`subject-stats-${studentId}-${dateStr}`)
      if (dayStats) {
        const stats = JSON.parse(dayStats)
        lastWeekSeconds += stats.reduce((sum: number, stat: SubjectStatistics) => sum + stat.total_seconds, 0)
      }
    }

    const change = thisWeekSeconds - lastWeekSeconds
    const changePercent = lastWeekSeconds > 0 ? ((change / lastWeekSeconds) * 100) : 0

    return {
      thisWeek: thisWeekSeconds,
      lastWeek: lastWeekSeconds,
      change,
      changePercent
    }
  }

  const getAverage7Days = () => {
    const total = weeklyData.reduce((sum, day) => sum + day.totalSeconds, 0)
    return Math.floor(total / 7)
  }

  const getAverage30Days = () => {
    const daysWithData = monthlyData.filter(d => d.totalSeconds > 0)
    if (daysWithData.length === 0) return 0
    const total = monthlyData.reduce((sum, day) => sum + day.totalSeconds, 0)
    return Math.floor(total / daysWithData.length)
  }

  const getTimeSlotData = (): TimeSlotData[] => {
    // 오전 (00:00~12:00), 오후 (12:01~18:00), 밤 (18:01~24:00)
    // TODO: Replace with actual session data from DB
    const mockDistribution = [0.35, 0.40, 0.25]
    return [
      { slot: '00-12', label: '오전', totalSeconds: totalSeconds * mockDistribution[0], icon: Sun },
      { slot: '12-18', label: '오후', totalSeconds: totalSeconds * mockDistribution[1], icon: Coffee },
      { slot: '18-24', label: '밤', totalSeconds: totalSeconds * mockDistribution[2], icon: Moon },
    ]
  }

  const getDayOfWeekData = (): DayOfWeekStat[] => {
    const dayMap: { [key: string]: { seconds: number, count: number } } = {
      '월': { seconds: 0, count: 0 },
      '화': { seconds: 0, count: 0 },
      '수': { seconds: 0, count: 0 },
      '목': { seconds: 0, count: 0 },
      '금': { seconds: 0, count: 0 },
      '토': { seconds: 0, count: 0 },
      '일': { seconds: 0, count: 0 }
    }

    // Collect last 4 weeks of data
    for (let i = 0; i < 28; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayName = ['일', '월', '화', '수', '목', '금', '토'][date.getDay()]

      const dayStats = localStorage.getItem(`subject-stats-${studentId}-${dateStr}`)
      if (dayStats) {
        const stats = JSON.parse(dayStats)
        const total = stats.reduce((sum: number, stat: SubjectStatistics) => sum + stat.total_seconds, 0)
        if (total > 0) {
          dayMap[dayName].seconds += total
          dayMap[dayName].count += 1
        }
      }
    }

    return Object.entries(dayMap).map(([day, data]) => ({
      day,
      seconds: data.count > 0 ? Math.floor(data.seconds / data.count) : 0,
      count: data.count
    }))
  }

  const getAchievements = (): Achievement[] => {
    const mostStudiedSubject = todayStats.reduce((max, stat) =>
      stat.total_seconds > (max?.total_seconds || 0) ? stat : max,
      null as SubjectStatistics | null
    )

    return [
      {
        id: '3h-club',
        title: '3시간 클럽',
        description: '하루 순공 3시간 달성',
        icon: 'trophy',
        unlocked: totalSeconds >= 3 * 3600,
      },
      {
        id: '7-day-streak',
        title: '7일 연속',
        description: '7일 연속 공부',
        icon: 'flame',
        unlocked: streak >= 7,
      },
      {
        id: '10h-subject',
        title: '과목 10시간',
        description: '특정 과목 주간 10시간 달성',
        icon: 'star',
        unlocked: mostStudiedSubject ? mostStudiedSubject.total_seconds >= 10 * 3600 : false,
      },
      {
        id: 'perfect-week',
        title: '완벽한 주',
        description: '주간 목표 100% 달성',
        icon: 'target',
        unlocked: getWeeklyComparison().thisWeek >= 20 * 3600,
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

  const getBestDayOfWeek = () => {
    const days = getDayOfWeekData()
    return days.reduce((prev, current) =>
      prev.seconds > current.seconds ? prev : current
    )
  }

  const weeklyComparison = getWeeklyComparison()
  const avg7Days = getAverage7Days()
  const avg30Days = getAverage30Days()
  const mostStudied = getMostStudiedSubject()
  const bestTimeSlot = getBestTimeSlot()
  const bestDay = getBestDayOfWeek()
  const achievements = getAchievements()
  const { hours: totalHours, minutes: totalMinutes } = formatTime(totalSeconds)
  const sortedStats = [...todayStats].sort((a, b) => b.total_seconds - a.total_seconds)
  const timeSlots = getTimeSlotData()
  const maxTimeSlot = Math.max(...timeSlots.map(t => t.totalSeconds), 1)
  const dayOfWeekData = getDayOfWeekData()
  const maxDaySeconds = Math.max(...dayOfWeekData.map(d => d.seconds), 1)
  const yesterdayChange = totalSeconds - yesterdayTotal
  const yesterdayChangePercent = yesterdayTotal > 0 ? ((yesterdayChange / yesterdayTotal) * 100) : 0

  return (
    <div className="space-y-4 pb-8">
      {/* Hero 카드 - 오늘 통계 + 핵심 지표 */}
      <Card className="bg-gradient-to-br from-orange-400 via-pink-500 to-purple-600 border-0 overflow-hidden relative">
        <CardContent className="p-5">
          <div className="absolute top-0 left-0 right-0 h-20 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 400 60" preserveAspectRatio="none">
              <path d="M0,30 Q100,10 200,30 T400,30 L400,0 L0,0 Z" fill="white" />
            </svg>
          </div>

          <div className="relative space-y-3">
            {/* 메인 타이틀 + 오늘 순공시간 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-lg font-medium mb-1">오늘의 순공시간</p>
                <div className="flex items-baseline gap-2">
                  <h1 className="text-white text-6xl font-bold tracking-tight">
                    {totalHours > 0 ? `${totalHours}.${Math.floor(totalMinutes / 6)}` : totalMinutes}
                  </h1>
                  <span className="text-white/90 text-3xl font-semibold">
                    {totalHours > 0 ? '시간' : '분'}
                  </span>
                </div>
              </div>

              {/* 우측: 최고기록 대비 + 어제 대비 */}
              <div className="text-right space-y-1">
                <div>
                  <p className="text-white/80 text-base">최고기록 대비</p>
                  <p className="text-white text-4xl font-bold">
                    {personalBest > 0 ? ((totalSeconds / personalBest) * 100).toFixed(0) : 0}%
                  </p>
                </div>
                <div className="flex items-center justify-end gap-1">
                  {yesterdayChange >= 0 ? (
                    <ArrowUp className="h-5 w-5 text-white" />
                  ) : (
                    <ArrowDown className="h-5 w-5 text-white" />
                  )}
                  <span className="text-white text-xl font-semibold">
                    어제 {Math.abs(yesterdayChange) > 0 ? formatCompactTime(Math.abs(yesterdayChange)) : '0m'}
                  </span>
                </div>
              </div>
            </div>

            {/* 핵심 지표 그리드 */}
            <div className="grid grid-cols-5 gap-2">
              <div className="px-2 py-1 rounded bg-white/20 backdrop-blur-sm text-center">
                <p className="text-white/80 text-sm">연속</p>
                <p className="text-white text-2xl font-bold">{streak}일</p>
              </div>

              <div className="px-2 py-1 rounded bg-white/20 backdrop-blur-sm text-center">
                <p className="text-white/80 text-sm">주간</p>
                <div className="flex items-center justify-center gap-1">
                  {weeklyComparison.change >= 0 ? (
                    <ArrowUp className="h-4 w-4 text-white" />
                  ) : (
                    <ArrowDown className="h-4 w-4 text-white" />
                  )}
                  <p className="text-white text-2xl font-bold">
                    {weeklyComparison.changePercent.toFixed(0)}%
                  </p>
                </div>
              </div>

              <div className="px-2 py-1 rounded bg-white/20 backdrop-blur-sm text-center">
                <p className="text-white/80 text-sm">7일평균</p>
                <p className="text-white text-2xl font-bold">{formatCompactTime(avg7Days)}</p>
              </div>

              <div className="px-2 py-1 rounded bg-white/20 backdrop-blur-sm text-center">
                <p className="text-white/80 text-sm">30일평균</p>
                <p className="text-white text-2xl font-bold">{formatCompactTime(avg30Days)}</p>
              </div>

              <div className="px-2 py-1 rounded bg-white/20 backdrop-blur-sm text-center">
                <p className="text-white/80 text-sm">최장</p>
                <p className="text-white text-2xl font-bold">{maxStreak}일</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 압축 인사이트 카드 */}
      {(mostStudied || bestTimeSlot || bestDay.seconds > 0) && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4 space-y-2">
            {mostStudied && (
              <div className="flex items-center gap-3">
                <Trophy className="h-6 w-6 text-orange-500 flex-shrink-0" />
                <p className="text-lg font-medium text-gray-700 flex-1">
                  <span className="font-bold">{mostStudied.subject_name}</span>를 가장 많이 공부했어요
                  <span className="text-blue-600 font-bold ml-2">
                    ({formatTimeString(mostStudied.total_seconds)})
                  </span>
                </p>
              </div>
            )}
            {bestTimeSlot && bestTimeSlot.totalSeconds > 0 && (
              <div className="flex items-center gap-3">
                <Clock className="h-6 w-6 text-purple-500 flex-shrink-0" />
                <p className="text-lg font-medium text-gray-700 flex-1">
                  가장 집중되는 시간대는 <span className="font-bold">{bestTimeSlot.label}시간</span>
                  <span className="text-purple-600 font-bold ml-2">
                    ({formatCompactTime(bestTimeSlot.totalSeconds)})
                  </span>
                </p>
              </div>
            )}
            {bestDay.seconds > 0 && (
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-green-500 flex-shrink-0" />
                <p className="text-lg font-medium text-gray-700 flex-1">
                  <span className="font-bold">{bestDay.day}요일</span>에 평균적으로 가장 많이 공부해요
                  <span className="text-green-600 font-bold ml-2">
                    ({formatCompactTime(bestDay.seconds)})
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 요일별 평균 + 시간대별 패턴 */}
      <Card>
        <CardHeader className="pb-3 px-5 pt-4">
          <CardTitle className="text-2xl font-semibold">학습 패턴</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4 space-y-4">
          {/* 요일별 평균 */}
          <div>
            <p className="text-base font-semibold text-gray-600 mb-2">요일별 평균</p>
            <div className="grid grid-cols-7 gap-1">
              {dayOfWeekData.map((day) => {
                const barHeight = (day.seconds / maxDaySeconds) * 100

                return (
                  <div key={day.day} className="flex flex-col items-center">
                    <div className="w-full h-20 bg-gray-100 rounded flex items-end justify-center overflow-hidden">
                      <div
                        className="w-full rounded-t bg-blue-400 transition-all duration-500"
                        style={{ height: `${barHeight}%` }}
                      />
                    </div>
                    <span className="text-base font-semibold text-gray-700 mt-1">{day.day}</span>
                    <span className="text-sm text-gray-500">
                      {day.seconds > 0 ? formatCompactTime(day.seconds) : '-'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 시간대별 분포 */}
          <div className="pt-3 border-t">
            <p className="text-base font-semibold text-gray-600 mb-2">시간대별 분포</p>
            <div className="grid grid-cols-3 gap-2">
              {timeSlots.map((slot) => {
                const Icon = slot.icon
                const percentage = totalSeconds > 0 ? (slot.totalSeconds / totalSeconds) * 100 : 0

                return (
                  <div key={slot.slot} className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded">
                    <Icon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium text-gray-700">{slot.label}</p>
                      <div className="flex items-center gap-1">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-bold text-gray-600">{percentage.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 과목별 시간통계 */}
      {sortedStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3 px-5 pt-4">
            <CardTitle className="text-2xl font-semibold">과목별 학습시간</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="space-y-3">
              {sortedStats.map((stat, index) => {
                const maxSeconds = sortedStats[0]?.total_seconds || 1
                const percentage = (stat.total_seconds / maxSeconds) * 100

                return (
                  <div key={stat.subject_id || index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stat.subject_color || '#4A90E2' }}
                        />
                        <span className="font-medium text-gray-700">{stat.subject_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">{stat.session_count}회</span>
                        <span className="font-bold text-gray-800">
                          {formatTimeString(stat.total_seconds)}
                        </span>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: stat.subject_color || '#4A90E2',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* 총계 */}
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <span className="font-semibold text-gray-600">총 학습시간</span>
              <span className="text-xl font-bold text-blue-600">
                {formatTimeString(totalSeconds)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 업적 & 목표 */}
      <Card>
        <CardHeader className="pb-3 px-5 pt-4">
          <CardTitle className="text-2xl font-semibold">업적 & 목표</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-4 space-y-4">
          {/* 업적 그리드 */}
          <div className="grid grid-cols-4 gap-2">
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
                  className={`p-2 rounded border transition-all ${
                    achievement.unlocked
                      ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-300'
                      : 'bg-gray-50 border-gray-200 opacity-40'
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      achievement.unlocked ? 'bg-yellow-400' : 'bg-gray-300'
                    }`}>
                      <Icon className={`h-6 w-6 ${achievement.unlocked ? 'text-yellow-900' : 'text-gray-500'}`} />
                    </div>
                    <p className="text-sm font-bold leading-tight mt-1">{achievement.title}</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 주간 목표 진행 */}
          <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded border border-purple-200">
            <div className="flex items-center justify-between mb-1">
              <span className="text-base font-semibold text-purple-900">주간 목표 (20시간)</span>
              <span className="text-base font-bold text-purple-700">
                {formatCompactTime(weeklyComparison.thisWeek)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-3 bg-purple-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((weeklyComparison.thisWeek / (20 * 3600)) * 100, 100)}%` }}
                />
              </div>
              <span className="text-lg font-bold text-purple-700">
                {((weeklyComparison.thisWeek / (20 * 3600)) * 100).toFixed(0)}%
              </span>
            </div>
          </div>

          {/* 이번 주 vs 지난 주 비교 */}
          <div className="flex items-center justify-between text-base pt-2 border-t">
            <div className="text-center flex-1">
              <p className="text-gray-500 mb-1">지난주</p>
              <p className="font-bold text-gray-700 text-lg">{formatCompactTime(weeklyComparison.lastWeek)}</p>
            </div>
            <div className="flex items-center gap-1">
              {weeklyComparison.change >= 0 ? (
                <ArrowUp className="h-6 w-6 text-green-500" />
              ) : (
                <ArrowDown className="h-6 w-6 text-red-500" />
              )}
              <span className={`font-bold text-lg ${weeklyComparison.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCompactTime(Math.abs(weeklyComparison.change))}
              </span>
            </div>
            <div className="text-center flex-1">
              <p className="text-gray-500 mb-1">이번주</p>
              <p className="font-bold text-blue-700 text-lg">{formatCompactTime(weeklyComparison.thisWeek)}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
