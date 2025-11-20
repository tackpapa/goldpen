'use client'
export const runtime = 'edge'


import { useState } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Schedule } from '@/lib/types/database'
import { format, startOfWeek, addDays, addWeeks, subWeeks, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'

// Mock schedule data
const mockSchedules: Schedule[] = [
  {
    id: '1',
    created_at: '2025-01-01',
    org_id: 'org-1',
    class_id: 'class-1',
    class_name: '수학 특강반',
    teacher_id: 'teacher-1',
    teacher_name: '김선생',
    subject: '수학',
    day_of_week: 'monday',
    start_time: '09:00',
    end_time: '11:00',
    room: '201호',
  },
  {
    id: '2',
    created_at: '2025-01-01',
    org_id: 'org-1',
    class_id: 'class-2',
    class_name: '영어 회화반',
    teacher_id: 'teacher-2',
    teacher_name: '박선생',
    subject: '영어',
    day_of_week: 'monday',
    start_time: '13:00',
    end_time: '15:00',
    room: '202호',
  },
  {
    id: '3',
    created_at: '2025-01-01',
    org_id: 'org-1',
    class_id: 'class-3',
    class_name: '국어 독해반',
    teacher_id: 'teacher-3',
    teacher_name: '이선생',
    subject: '국어',
    day_of_week: 'tuesday',
    start_time: '10:00',
    end_time: '12:00',
    room: '203호',
  },
  {
    id: '4',
    created_at: '2025-01-01',
    org_id: 'org-1',
    class_id: 'class-1',
    class_name: '수학 특강반',
    teacher_id: 'teacher-1',
    teacher_name: '김선생',
    subject: '수학',
    day_of_week: 'wednesday',
    start_time: '09:00',
    end_time: '11:00',
    room: '201호',
  },
  {
    id: '5',
    created_at: '2025-01-01',
    org_id: 'org-1',
    class_id: 'class-2',
    class_name: '영어 회화반',
    teacher_id: 'teacher-2',
    teacher_name: '박선생',
    subject: '영어',
    day_of_week: 'wednesday',
    start_time: '13:00',
    end_time: '15:00',
    room: '202호',
  },
  {
    id: '6',
    created_at: '2025-01-01',
    org_id: 'org-1',
    class_id: 'class-4',
    class_name: '과학 실험반',
    teacher_id: 'teacher-1',
    teacher_name: '김선생',
    subject: '과학',
    day_of_week: 'thursday',
    start_time: '14:00',
    end_time: '16:00',
    room: '실험실',
  },
  {
    id: '7',
    created_at: '2025-01-01',
    org_id: 'org-1',
    class_id: 'class-1',
    class_name: '수학 특강반',
    teacher_id: 'teacher-1',
    teacher_name: '김선생',
    subject: '수학',
    day_of_week: 'friday',
    start_time: '09:00',
    end_time: '11:00',
    room: '201호',
  },
  {
    id: '8',
    created_at: '2025-01-01',
    org_id: 'org-1',
    class_id: 'class-3',
    class_name: '국어 독해반',
    teacher_id: 'teacher-3',
    teacher_name: '이선생',
    subject: '국어',
    day_of_week: 'friday',
    start_time: '14:00',
    end_time: '16:00',
    room: '203호',
  },
  {
    id: '9',
    created_at: '2025-01-01',
    org_id: 'org-1',
    class_id: 'class-5',
    class_name: '영어 문법반',
    teacher_id: 'teacher-2',
    teacher_name: '박선생',
    subject: '영어',
    day_of_week: 'saturday',
    start_time: '10:00',
    end_time: '12:00',
    room: '202호',
  },
  {
    id: '10',
    created_at: '2025-01-01',
    org_id: 'org-1',
    class_id: 'class-6',
    class_name: '물리 심화반',
    teacher_id: 'teacher-4',
    teacher_name: '최선생',
    subject: '물리',
    day_of_week: 'saturday',
    start_time: '14:00',
    end_time: '16:00',
    room: '204호',
  },
]

// Subject color mapping
const subjectColors: Record<string, { bg: string; text: string; border: string }> = {
  '수학': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  '영어': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  '국어': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  '과학': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  '물리': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  '화학': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  '생물': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
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
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
]

export default function SchedulePage() {
  usePageAccess('schedule')

  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [filterType, setFilterType] = useState<'all' | 'teacher' | 'class'>('all')
  const [selectedFilter, setSelectedFilter] = useState<string>('all')
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [currentMonth, setCurrentMonth] = useState(new Date())

  const handleScheduleClick = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setIsDialogOpen(true)
  }

  const getSubjectColor = (subject: string) => {
    return subjectColors[subject] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
  }

  // Filter schedules based on selected filter
  const getFilteredSchedules = () => {
    if (filterType === 'all' || selectedFilter === 'all') {
      return mockSchedules
    }
    if (filterType === 'teacher') {
      return mockSchedules.filter(s => s.teacher_id === selectedFilter)
    }
    if (filterType === 'class') {
      return mockSchedules.filter(s => s.class_id === selectedFilter)
    }
    return mockSchedules
  }

  const filteredSchedules = getFilteredSchedules()

  // Get schedules for a specific day
  const getSchedulesForDay = (dayOfWeek: keyof typeof dayOfWeekMap) => {
    return filteredSchedules.filter(s => s.day_of_week === dayOfWeek)
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

  // Teachers and classes for filters
  const teachers = Array.from(new Set(mockSchedules.map(s => ({ id: s.teacher_id, name: s.teacher_name }))))
  const classes = Array.from(new Set(mockSchedules.map(s => ({ id: s.class_id, name: s.class_name }))))

  // Statistics
  const totalSchedules = filteredSchedules.length
  const totalTeachers = new Set(filteredSchedules.map(s => s.teacher_id)).size
  const totalClasses = new Set(filteredSchedules.map(s => s.class_id)).size

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">강사 시간표</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            주간 시간표와 월간 일정을 확인합니다
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filterType} onValueChange={(value: 'all' | 'teacher' | 'class') => {
            setFilterType(value)
            setSelectedFilter('all')
          }}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="teacher">강사별</SelectItem>
              <SelectItem value="class">반별</SelectItem>
            </SelectContent>
          </Select>

          {filterType === 'teacher' && (
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="강사 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 강사</SelectItem>
                {teachers.map(teacher => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {filterType === 'class' && (
            <Select value={selectedFilter} onValueChange={setSelectedFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="반 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 반</SelectItem>
                {classes.map(cls => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
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
        <TabsList>
          <TabsTrigger value="weekly">주간 시간표</TabsTrigger>
          <TabsTrigger value="monthly">월간 캘린더</TabsTrigger>
          <TabsTrigger value="teacher">강사별 시간표</TabsTrigger>
        </TabsList>

        {/* Weekly Timetable Tab */}
        <TabsContent value="weekly" className="space-y-4">
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
                <div className="grid grid-cols-8 gap-2 min-w-[900px]">
                  {/* Header */}
                  <div className="font-medium text-sm text-muted-foreground p-2">시간</div>
                  {weekDays.map((day, index) => {
                    const dayKey = Object.keys(dayOfWeekMap).find(
                      key => dayOfWeekMap[key as keyof typeof dayOfWeekMap].index === day.getDay() - 1 ||
                             (day.getDay() === 0 && key === 'sunday')
                    ) as keyof typeof dayOfWeekMap
                    const isToday = isSameDay(day, new Date())

                    return (
                      <div
                        key={index}
                        className={cn(
                          "text-center p-2 rounded-lg",
                          isToday && "bg-primary text-primary-foreground font-medium"
                        )}
                      >
                        <div className="text-sm">
                          {dayKey && dayOfWeekMap[dayKey].label}
                        </div>
                        <div className="text-xs">
                          {format(day, 'd', { locale: ko })}
                        </div>
                      </div>
                    )
                  })}

                  {/* Time slots */}
                  {timeSlots.map((time) => (
                    <>
                      <div key={`time-${time}`} className="text-sm text-muted-foreground p-2 flex items-center">
                        {time}
                      </div>
                      {weekDays.map((day, dayIndex) => {
                        const dayKey = Object.keys(dayOfWeekMap).find(
                          key => dayOfWeekMap[key as keyof typeof dayOfWeekMap].index === day.getDay() - 1 ||
                                 (day.getDay() === 0 && key === 'sunday')
                        ) as keyof typeof dayOfWeekMap

                        const schedulesForDay = dayKey ? getSchedulesForDay(dayKey) : []
                        const scheduleInSlot = schedulesForDay.find(s => s.start_time === time)

                        return (
                          <div
                            key={`${time}-${dayIndex}`}
                            className="min-h-[80px] border rounded-lg p-1 hover:bg-muted/50 transition-colors"
                          >
                            {scheduleInSlot && (
                              <div
                                onClick={() => handleScheduleClick(scheduleInSlot)}
                                className={cn(
                                  "h-full rounded border-l-4 p-2 cursor-pointer hover:shadow-md transition-shadow",
                                  getSubjectColor(scheduleInSlot.subject).bg,
                                  getSubjectColor(scheduleInSlot.subject).border
                                )}
                              >
                                <div className={cn("font-medium text-xs", getSubjectColor(scheduleInSlot.subject).text)}>
                                  {scheduleInSlot.class_name}
                                </div>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {scheduleInSlot.teacher_name}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {scheduleInSlot.room}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monthly Calendar Tab */}
        <TabsContent value="monthly" className="space-y-4">
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
                        {schedulesForDay.slice(0, 3).map((schedule) => (
                          <div
                            key={schedule.id}
                            onClick={() => handleScheduleClick(schedule)}
                            className={cn(
                              "text-xs p-1 rounded cursor-pointer hover:shadow-sm transition-shadow truncate",
                              getSubjectColor(schedule.subject).bg,
                              getSubjectColor(schedule.subject).text
                            )}
                          >
                            {schedule.start_time} {schedule.class_name}
                          </div>
                        ))}
                        {schedulesForDay.length > 3 && (
                          <div className="text-xs text-muted-foreground">
                            +{schedulesForDay.length - 3}개 더
                          </div>
                        )}
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
          {teachers.map((teacher) => {
            const teacherSchedules = mockSchedules.filter(s => s.teacher_id === teacher.id)
            const schedulesByDay = Object.keys(dayOfWeekMap).map((dayKey) => ({
              day: dayKey as keyof typeof dayOfWeekMap,
              schedules: teacherSchedules.filter(s => s.day_of_week === dayKey)
            }))

            return (
              <Card key={teacher.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {teacher.name.split('').slice(0, 2).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle>{teacher.name}</CardTitle>
                      <CardDescription>
                        주간 {teacherSchedules.length}개 수업
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-7 gap-2">
                    {schedulesByDay.map(({ day, schedules }) => (
                      <div key={day} className="space-y-2">
                        <div className="text-sm font-medium text-center">
                          {dayOfWeekMap[day].label}
                        </div>
                        <div className="space-y-1 min-h-[100px]">
                          {schedules.map((schedule) => (
                            <div
                              key={schedule.id}
                              onClick={() => handleScheduleClick(schedule)}
                              className={cn(
                                "text-xs p-2 rounded border-l-4 cursor-pointer hover:shadow-md transition-shadow",
                                getSubjectColor(schedule.subject).bg,
                                getSubjectColor(schedule.subject).border
                              )}
                            >
                              <div className={cn("font-medium", getSubjectColor(schedule.subject).text)}>
                                {schedule.start_time}-{schedule.end_time}
                              </div>
                              <div className="text-muted-foreground mt-1">
                                {schedule.class_name}
                              </div>
                              <div className="text-muted-foreground">
                                {schedule.room}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
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
                  getSubjectColor(selectedSchedule.subject).bg,
                  getSubjectColor(selectedSchedule.subject).text,
                  "border",
                  getSubjectColor(selectedSchedule.subject).border
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
