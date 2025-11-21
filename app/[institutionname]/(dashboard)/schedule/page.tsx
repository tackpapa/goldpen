'use client'



import React, { useState, useEffect } from 'react'
import { usePageAccess } from '@/hooks/use-page-access'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar, Clock, BookOpen, Users, MapPin, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfWeek, addDays, addWeeks, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'

// API 응답 타입 (Supabase join 결과)
interface ScheduleApiResponse {
  id: string
  org_id: string
  class_id: string
  teacher_id: string | null
  room_id: string
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  start_time: string
  end_time: string
  status: string
  notes?: string
  classes?: { name: string; teacher_id?: string | null } | null
  rooms?: { name: string } | null
  teacher?: { name: string } | null
}

// 컴포넌트 내부에서 사용할 정규화된 타입
interface Schedule {
  id: string
  org_id: string
  class_id: string
  teacher_id: string | null
  room_id: string
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  start_time: string
  end_time: string
  status: string
  notes?: string
  class_name: string
  teacher_name: string
  room: string
  subject: string
}

// API 응답을 정규화된 Schedule로 변환
function normalizeSchedule(raw: ScheduleApiResponse): Schedule {
  return {
    id: raw.id,
    org_id: raw.org_id,
    class_id: raw.class_id,
    teacher_id: raw.teacher_id,
    room_id: raw.room_id,
    day_of_week: raw.day_of_week,
    start_time: raw.start_time.substring(0, 5), // HH:MM 형식으로 정규화
    end_time: raw.end_time.substring(0, 5),
    status: raw.status,
    notes: raw.notes,
    class_name: raw.classes?.name || '미지정',
    teacher_name: raw.teacher?.name || '미지정',
    room: raw.rooms?.name || '미지정',
    subject: raw.classes?.name?.split(' ')[0] || '기타', // 클래스명 첫 단어를 과목으로 사용
  }
}

// Room color mapping
const roomColors: Record<string, { bg: string; text: string; border: string }> = {
  '201호': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  '202호': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  '203호': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  '실험실': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  '특강실': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
}

const dayOfWeekMap = {
  monday: { label: '월', index: 0 },
  tuesday: { label: '화', index: 1 },
  wednesday: { label: '수', index: 2 },
  thursday: { label: '목', index: 3 },
  friday: { label: '금', index: 4 },
  saturday: { label: '토', index: 5 },
  sunday: { label: '일', index: 6 },
}

const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
  '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30'
]

export default function SchedulePage() {
  usePageAccess('schedule')

  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filterTeacher, setFilterTeacher] = useState<string>('all')
  const [filterClass, setFilterClass] = useState<string>('all')
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [schedules, setSchedules] = useState<Schedule[]>([])

  // Fetch schedules from API
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const response = await fetch('/api/schedules', { credentials: 'include' })
        const data = await response.json() as { schedules?: ScheduleApiResponse[]; error?: string }
        if (response.ok && data.schedules) {
          const normalized = data.schedules.map(normalizeSchedule)
          setSchedules(normalized)
        }
      } catch {
        console.error('Failed to fetch schedules')
      }
    }
    fetchSchedules()
  }, [])

  const handleScheduleClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setIsDialogOpen(true)
  }

  const getRoomColor = (roomName: string) => {
    return roomColors[roomName] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
  }

  // Filter schedules based on selected filters
  const getFilteredSchedules = () => {
    let filtered = schedules

    if (filterTeacher !== 'all') {
      filtered = filtered.filter(s => s.teacher_id === filterTeacher)
    }

    if (filterClass !== 'all') {
      filtered = filtered.filter(s => s.class_id === filterClass)
    }

    return filtered
  }

  const filteredSchedules = getFilteredSchedules()

  // Get schedules for a specific day
  const getSchedulesForDay = (dayOfWeek: keyof typeof dayOfWeekMap) => {
    return filteredSchedules.filter(s => s.day_of_week === dayOfWeek)
  }

  // 시간이 겹치는 스케줄들에 column 할당 (greedy 알고리즘)
  const assignColumns = (daySchedules: Schedule[]) => {
    if (daySchedules.length === 0) return { columns: new Map<string, number>(), maxColumns: 1 }

    const sorted = [...daySchedules].sort((a, b) => {
      const aStart = timeSlots.indexOf(a.start_time)
      const bStart = timeSlots.indexOf(b.start_time)
      return aStart - bStart
    })

    const columns = new Map<string, number>()
    const columnEndTimes: number[] = []

    for (const schedule of sorted) {
      const startIdx = timeSlots.indexOf(schedule.start_time)
      let endIdx = timeSlots.indexOf(schedule.end_time)
      if (endIdx === -1) endIdx = timeSlots.length

      let col = 0
      while (col < columnEndTimes.length && columnEndTimes[col] > startIdx) {
        col++
      }

      columns.set(schedule.id, col)
      columnEndTimes[col] = endIdx
    }

    return { columns, maxColumns: Math.max(1, columnEndTimes.length) }
  }

  // Weekly timetable navigation
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const handlePrevWeek = () => setCurrentWeek(subWeeks(currentWeek, 1))
  const handleNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1))
  const handleToday = () => setCurrentWeek(new Date())

  // Monthly calendar
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const handlePrevMonth = () => setCurrentMonth(addWeeks(currentMonth, -4))
  const handleNextMonth = () => setCurrentMonth(addWeeks(currentMonth, 4))

  // Get schedules for a specific date in monthly view
  const getSchedulesForDate = (date: Date) => {
    const dayOfWeek = format(date, 'EEEE').toLowerCase() as keyof typeof dayOfWeekMap
    const dayKey = Object.keys(dayOfWeekMap).find(
      key => dayOfWeekMap[key as keyof typeof dayOfWeekMap].index === date.getDay() - 1 ||
             (date.getDay() === 0 && key === 'sunday')
    ) as keyof typeof dayOfWeekMap | undefined

    if (!dayKey) return []
    return filteredSchedules.filter(s => s.day_of_week === dayKey)
  }

  // Teachers and classes for filters (unique by id)
  const teacherMap = new Map<string, { id: string; name: string }>()
  const classMap = new Map<string, { id: string; name: string }>()

  schedules.forEach(s => {
    if (s.teacher_id && !teacherMap.has(s.teacher_id)) {
      teacherMap.set(s.teacher_id, { id: s.teacher_id, name: s.teacher_name })
    }
    if (s.class_id && !classMap.has(s.class_id)) {
      classMap.set(s.class_id, { id: s.class_id, name: s.class_name })
    }
  })

  const teachers = Array.from(teacherMap.values())
  const classes = Array.from(classMap.values())

  // Statistics (전체 기준, 필터와 무관, null 제외)
  const totalSchedules = schedules.length
  const totalTeachers = new Set(schedules.map(s => s.teacher_id).filter(Boolean)).size
  const totalClasses = new Set(schedules.map(s => s.class_id).filter(Boolean)).size

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">강사 시간표</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          주간 시간표와 월간 일정을 확인합니다
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 수업</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSchedules}개</div>
            <p className="text-xs text-muted-foreground">주간 수업 수</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">강사</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeachers}명</div>
            <p className="text-xs text-muted-foreground">수업 진행 강사</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">운영 반</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClasses}개</div>
            <p className="text-xs text-muted-foreground">전체 운영 반</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="weekly" className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="weekly">주간 시간표</TabsTrigger>
            <TabsTrigger value="monthly">월간 캘린더</TabsTrigger>
            <TabsTrigger value="teacher">강사별 시간표</TabsTrigger>
          </TabsList>

        </div>

        {/* Weekly Timetable Tab */}
        <TabsContent value="weekly" className="space-y-4">
          {/* 반 선택 버튼들 */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterClass === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterClass('all')}
            >
              전체
            </Button>
            {classes.map((cls) => (
              <Button
                key={cls.id}
                variant={filterClass === cls.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterClass(filterClass === cls.id ? 'all' : cls.id)}
              >
                {cls.name}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>주간 시간표</CardTitle>
                  <CardDescription>
                    {format(weekStart, 'yyyy년 M월 d일', { locale: ko })} - {format(addDays(weekStart, 6), 'M월 d일', { locale: ko })}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrevWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleToday}>
                    오늘
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                {(() => {
                  const CELL_HEIGHT = 50

                  return (
                    <div className="min-w-[900px] flex">
                      {/* 시간 컬럼 */}
                      <div className="w-14 flex-shrink-0">
                        <div className="h-10 p-2 text-sm font-medium text-muted-foreground">시간</div>
                        {timeSlots.map(time => (
                          <div
                            key={time}
                            className="text-xs text-muted-foreground px-2 border-t flex items-start pt-1"
                            style={{ height: `${CELL_HEIGHT}px` }}
                          >
                            {time}
                          </div>
                        ))}
                      </div>

                      {/* 각 요일 컬럼 */}
                      {weekDays.map((day, index) => {
                        const dayKey = Object.keys(dayOfWeekMap).find(
                          key => dayOfWeekMap[key as keyof typeof dayOfWeekMap].index === day.getDay() - 1 ||
                                 (day.getDay() === 0 && key === 'sunday')
                        ) as keyof typeof dayOfWeekMap

                        const isToday = isSameDay(day, new Date())
                        const daySchedules = dayKey ? getSchedulesForDay(dayKey) : []
                        const { columns, maxColumns } = assignColumns(daySchedules)

                        return (
                          <div key={index} className="border-l" style={{ width: `${maxColumns * 83}px`, flexShrink: 0 }}>
                            {/* 요일 헤더 */}
                            <div className={cn(
                              "h-10 p-2 text-center font-medium text-sm",
                              isToday && "bg-primary text-primary-foreground rounded-lg"
                            )}>
                              {dayKey && dayOfWeekMap[dayKey].label} {format(day, 'd', { locale: ko })}
                            </div>

                            {/* 스케줄 영역 */}
                            <div
                              className="relative"
                              style={{ height: `${timeSlots.length * CELL_HEIGHT}px` }}
                            >
                              {/* 시간 그리드 라인 */}
                              {timeSlots.map((time, idx) => (
                                <div
                                  key={time}
                                  className="absolute w-full border-t"
                                  style={{ top: `${idx * CELL_HEIGHT}px`, height: `${CELL_HEIGHT}px` }}
                                />
                              ))}

                              {/* 스케줄 카드들 */}
                              {daySchedules.map(schedule => {
                                const startIdx = timeSlots.indexOf(schedule.start_time)
                                let endIdx = timeSlots.indexOf(schedule.end_time)

                                if (startIdx === -1) return null
                                if (endIdx === -1) endIdx = timeSlots.length

                                const top = startIdx * CELL_HEIGHT
                                const height = Math.max(1, endIdx - startIdx) * CELL_HEIGHT

                                const col = columns.get(schedule.id) ?? 0
                                const widthPercent = 100 / maxColumns
                                const leftPercent = col * widthPercent

                                return (
                                  <div
                                    key={schedule.id}
                                    className="absolute p-0.5 cursor-pointer"
                                    style={{
                                      top: `${top}px`,
                                      height: `${height}px`,
                                      left: `${leftPercent}%`,
                                      width: `${widthPercent}%`
                                    }}
                                    onClick={() => handleScheduleClick(schedule)}
                                  >
                                    <div className={cn(
                                      "h-full p-2 rounded flex flex-col justify-center overflow-hidden hover:shadow-md transition-shadow",
                                      getRoomColor(schedule.room).bg,
                                      getRoomColor(schedule.room).border
                                    )}>
                                      <div className={cn("font-bold text-sm leading-tight", getRoomColor(schedule.room).text)}>
                                        {schedule.class_name}
                                      </div>
                                      <div className="text-xs text-muted-foreground leading-tight">
                                        {schedule.teacher_name}
                                      </div>
                                      <div className="text-xs text-muted-foreground leading-tight">
                                        {schedule.room}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Calendar Tab */}
        <TabsContent value="monthly" className="space-y-4">
          {/* 반 선택 버튼들 */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterClass === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterClass('all')}
            >
              전체
            </Button>
            {classes.map((cls) => (
              <Button
                key={cls.id}
                variant={filterClass === cls.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterClass(filterClass === cls.id ? 'all' : cls.id)}
              >
                {cls.name}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>월간 캘린더</CardTitle>
                  <CardDescription>
                    {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {/* Day headers */}
                {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
                  <div key={day} className="text-center font-medium text-sm text-muted-foreground p-2">
                    {day}
                  </div>
                ))}

                {/* Calendar days */}
                {/* Add empty cells for days before month starts */}
                {Array.from({ length: (monthStart.getDay() + 6) % 7 }).map((_, i) => (
                  <div key={`empty-${i}`} className="min-h-[100px] border rounded-lg p-2 bg-muted/20" />
                ))}

                {/* Actual month days */}
                {monthDays.map((day) => {
                  const schedulesForDay = getSchedulesForDate(day)
                  const isToday = isSameDay(day, new Date())

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "min-h-[100px] border rounded-lg p-2 hover:bg-muted/50 transition-colors",
                        isToday && "border-primary border-2"
                      )}
                    >
                      <div className={cn(
                        "text-sm font-medium mb-2",
                        isToday && "text-primary"
                      )}>
                        {format(day, 'd')}
                      </div>
                      <div className="space-y-1">
                        {[...schedulesForDay].sort((a, b) => a.start_time.localeCompare(b.start_time)).map((schedule) => (
                          <div
                            key={schedule.id}
                            onClick={() => handleScheduleClick(schedule)}
                            className={cn(
                              "text-xs p-1 rounded cursor-pointer hover:shadow-sm transition-shadow truncate",
                              getRoomColor(schedule.room).bg,
                              getRoomColor(schedule.room).text
                            )}
                          >
                            {schedule.start_time} {schedule.class_name}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teacher Schedule Tab */}
        <TabsContent value="teacher" className="space-y-4">
          {/* 강사 선택 버튼들 */}
          <div className="flex flex-wrap gap-2">
            {teachers.map((teacher) => (
              <Button
                key={teacher.id}
                variant={filterTeacher === teacher.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterTeacher(filterTeacher === teacher.id ? 'all' : teacher.id)}
              >
                {teacher.name}
              </Button>
            ))}
          </div>

          {/* 선택된 강사의 시간표 */}
          {filterTeacher !== 'all' && (() => {
            const selectedTeacher = teachers.find(t => t.id === filterTeacher)
            const teacherSchedules = schedules.filter(s => s.teacher_id === filterTeacher)
            const CELL_HEIGHT = 50
            const dayKeys = Object.keys(dayOfWeekMap)

            if (!selectedTeacher) return null

            return (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {(selectedTeacher.name || '').split('').slice(0, 2).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{selectedTeacher.name || '미지정'}</CardTitle>
                      <CardDescription>
                        주간 {teacherSchedules.length}개 수업
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <div className="min-w-[700px] flex">
                      {/* 시간 컬럼 */}
                      <div className="w-14 flex-shrink-0">
                        <div className="h-10 p-2 text-sm font-medium text-muted-foreground">시간</div>
                        {timeSlots.map(time => (
                          <div
                            key={time}
                            className="text-xs text-muted-foreground px-2 border-t flex items-start pt-1"
                            style={{ height: `${CELL_HEIGHT}px` }}
                          >
                            {time}
                          </div>
                        ))}
                      </div>

                      {/* 각 요일 컬럼 */}
                      {dayKeys.map(dayKey => {
                        const day = dayOfWeekMap[dayKey as keyof typeof dayOfWeekMap]
                        const daySchedules = teacherSchedules.filter(s => s.day_of_week === dayKey)
                        const { columns, maxColumns } = assignColumns(daySchedules)

                        return (
                          <div key={dayKey} className="border-l" style={{ width: `${maxColumns * 83}px`, flexShrink: 0 }}>
                            <div className="h-10 p-2 text-center font-medium text-sm">
                              {day.label}
                            </div>

                            <div
                              className="relative"
                              style={{ height: `${timeSlots.length * CELL_HEIGHT}px` }}
                            >
                              {timeSlots.map((time, idx) => (
                                <div
                                  key={time}
                                  className="absolute w-full border-t"
                                  style={{ top: `${idx * CELL_HEIGHT}px`, height: `${CELL_HEIGHT}px` }}
                                />
                              ))}

                              {daySchedules.map(schedule => {
                                const startIdx = timeSlots.indexOf(schedule.start_time)
                                let endIdx = timeSlots.indexOf(schedule.end_time)

                                if (startIdx === -1) return null
                                if (endIdx === -1) endIdx = timeSlots.length

                                const top = startIdx * CELL_HEIGHT
                                const height = Math.max(1, endIdx - startIdx) * CELL_HEIGHT

                                const col = columns.get(schedule.id) ?? 0
                                const widthPercent = 100 / maxColumns
                                const leftPercent = col * widthPercent

                                return (
                                  <div
                                    key={schedule.id}
                                    className="absolute p-0.5 cursor-pointer"
                                    style={{
                                      top: `${top}px`,
                                      height: `${height}px`,
                                      left: `${leftPercent}%`,
                                      width: `${widthPercent}%`
                                    }}
                                    onClick={() => handleScheduleClick(schedule)}
                                  >
                                    <div className={cn(
                                      "h-full p-2 rounded flex flex-col justify-center overflow-hidden hover:shadow-md transition-shadow",
                                      getRoomColor(schedule.room).bg,
                                      getRoomColor(schedule.room).border
                                    )}>
                                      <div className={cn("font-bold text-sm leading-tight", getRoomColor(schedule.room).text)}>
                                        {schedule.class_name}
                                      </div>
                                      <div className="text-xs text-muted-foreground leading-tight">
                                        {schedule.room}
                                      </div>
                                      <div className="text-xs text-muted-foreground leading-tight">
                                        {schedule.start_time}-{schedule.end_time}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })()}

          {/* 강사 선택 안내 */}
          {filterTeacher === 'all' && (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                위에서 강사를 선택하면 해당 강사의 시간표가 표시됩니다.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Schedule Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>수업 상세 정보</DialogTitle>
            <DialogDescription>
              수업 일정과 정보를 확인합니다
            </DialogDescription>
          </DialogHeader>

          {selectedSchedule && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Badge className={cn(
                  getRoomColor(selectedSchedule.room).bg,
                  getRoomColor(selectedSchedule.room).text,
                  "border",
                  getRoomColor(selectedSchedule.room).border
                )}>
                  {selectedSchedule.subject}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <BookOpen className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">반 이름</div>
                    <div className="font-medium">{selectedSchedule.class_name}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">담당 강사</div>
                    <div className="font-medium">{selectedSchedule.teacher_name}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">요일</div>
                    <div className="font-medium">
                      {dayOfWeekMap[selectedSchedule.day_of_week].label}요일
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">시간</div>
                    <div className="font-medium">
                      {selectedSchedule.start_time} - {selectedSchedule.end_time}
                    </div>
                  </div>
                </div>

                {selectedSchedule.room && (
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">강의실</div>
                      <div className="font-medium">{selectedSchedule.room}</div>
                    </div>
                  </div>
                )}

                {selectedSchedule.notes && (
                  <div className="flex items-start gap-3">
                    <BookOpen className="h-5 w-5 text-muted-foreground mt-1" />
                    <div>
                      <div className="text-sm text-muted-foreground">메모</div>
                      <div className="font-medium">{selectedSchedule.notes}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
