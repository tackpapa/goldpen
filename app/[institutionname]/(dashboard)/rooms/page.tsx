'use client'

export const runtime = 'edge'
import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { usePageAccess } from '@/hooks/use-page-access'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getInstitutionHref } from '@/lib/utils/route'
import Link from 'next/link'
import { Grid3x3, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DoorOpen, Users, Calendar } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface ScheduleData {
  id: string
  org_id: string
  class_id: string
  teacher_id: string | null
  room_id: string
  day_of_week: string
  start_time: string
  end_time: string
  status: string
  classes?: { name: string; teacher_id?: string | null } | null
  rooms?: { name: string } | null
  teacher?: { name: string } | null
}

interface Room {
  id: string
  name: string
  capacity: number
  status: string
}

interface Teacher {
  id: string
  name: string
}

interface ClassOption {
  id: string
  name: string
  teacher_id?: string | null
  teacher_name?: string | null
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

// Teacher color palette
const colorPalette = [
  { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
  { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
]

export default function RoomsPage() {
  usePageAccess('rooms')

  const params = useParams()
  const institutionName = params.institutionname as string
  const { toast } = useToast()

  const [schedules, setSchedules] = useState<ScheduleData[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<string>('')

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{
    roomId: string
    roomName: string
    dayOfWeek: keyof typeof dayOfWeekMap
    startTime: string
  } | null>(null)
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null)

  // Form state
  const [selectedClassId, setSelectedClassId] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{
    roomId: string
    roomName: string
    dayOfWeek: keyof typeof dayOfWeekMap
    timeIndex: number
  } | null>(null)
  const [dragEnd, setDragEnd] = useState<{
    timeIndex: number
  } | null>(null)

  // Teacher color mapping
  const [teacherColorMap, setTeacherColorMap] = useState<Record<string, { bg: string; text: string; border: string }>>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [schedulesRes, roomsRes, teachersRes, classesRes] = await Promise.all([
          fetch('/api/schedules', { credentials: 'include' }),
          fetch('/api/rooms', { credentials: 'include' }),
          fetch('/api/teachers', { credentials: 'include' }),
          fetch('/api/classes', { credentials: 'include' }),
        ])

        interface SchedulesResponse { schedules?: any[] }
        interface RoomsResponse { rooms?: Room[] }
        interface TeachersResponse { teachers?: Teacher[] }
        interface ClassesResponse { classes?: any[] }
        const schedulesData = await schedulesRes.json() as SchedulesResponse
        const roomsData = await roomsRes.json() as RoomsResponse
        const teachersData = await teachersRes.json() as TeachersResponse
        const classesData = await classesRes.json() as ClassesResponse

        if (schedulesData.schedules) setSchedules(schedulesData.schedules)
        if (roomsData.rooms) {
          setRooms(roomsData.rooms)
          if (roomsData.rooms.length > 0) {
            setSelectedTab(roomsData.rooms[0].id)
          }
        }
        if (teachersData.teachers) {
          setTeachers(teachersData.teachers)
          // Build teacher color map
          const colorMap: Record<string, { bg: string; text: string; border: string }> = {}
          teachersData.teachers.forEach((teacher: Teacher, index: number) => {
            colorMap[teacher.id] = colorPalette[index % colorPalette.length]
          })
          setTeacherColorMap(colorMap)
        }
        if (classesData.classes) setClasses(classesData.classes)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Global mouseup handler for drag
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (!isDragging || !dragStart || !dragEnd) {
        setIsDragging(false)
        setDragStart(null)
        setDragEnd(null)
        setSelectedScheduleId(null)
        return
      }

      const minIndex = Math.min(dragStart.timeIndex, dragEnd.timeIndex)
      const maxIndex = Math.max(dragStart.timeIndex, dragEnd.timeIndex)

      const startTimeStr = timeSlots[minIndex]
      const endTimeStr = timeSlots[Math.min(maxIndex + 1, timeSlots.length - 1)]

      setSelectedCell({
        roomId: dragStart.roomId,
        roomName: dragStart.roomName,
        dayOfWeek: dragStart.dayOfWeek,
        startTime: startTimeStr
      })
      setStartTime(startTimeStr)
      setEndTime(endTimeStr)
      setSelectedClassId('')
      setSelectedScheduleId(null)
      setIsDialogOpen(true)

      setIsDragging(false)
      setDragStart(null)
      setDragEnd(null)
    }

    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp)
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [isDragging, dragStart, dragEnd])

  const getTeacherColor = (tid: string | null) => {
    if (!tid) return { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
    return teacherColorMap[tid] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
  }

  const handleMouseDown = (
    roomId: string,
    roomName: string,
    dayOfWeek: keyof typeof dayOfWeekMap,
    time: string
  ) => {
    const timeIndex = timeSlots.indexOf(time)
    setIsDragging(true)
    setDragStart({ roomId, roomName, dayOfWeek, timeIndex })
    setDragEnd({ timeIndex })
  }

  const handleMouseEnter = (
    roomId: string,
    dayOfWeek: keyof typeof dayOfWeekMap,
    time: string
  ) => {
    if (!isDragging || !dragStart) return
    if (dragStart.roomId !== roomId || dragStart.dayOfWeek !== dayOfWeek) return
    const timeIndex = timeSlots.indexOf(time)
    setDragEnd({ timeIndex })
  }

  const handleMouseUp = () => {
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false)
      setDragStart(null)
      setDragEnd(null)
      return
    }

    const minIndex = Math.min(dragStart.timeIndex, dragEnd.timeIndex)
    const maxIndex = Math.max(dragStart.timeIndex, dragEnd.timeIndex)

    const startTimeStr = timeSlots[minIndex]
    const endTimeStr = timeSlots[Math.min(maxIndex + 1, timeSlots.length - 1)]

      setSelectedCell({
        roomId: dragStart.roomId,
        roomName: dragStart.roomName,
        dayOfWeek: dragStart.dayOfWeek,
        startTime: startTimeStr
      })
      setStartTime(startTimeStr)
      setEndTime(endTimeStr)
      setSelectedClassId('')
      setSelectedScheduleId(null)
      setIsDialogOpen(true)

    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }

  const isCellInDragRange = (
    roomId: string,
    dayOfWeek: string,
    timeIndex: number
  ): boolean => {
    if (!isDragging || !dragStart || !dragEnd) return false
    if (dragStart.roomId !== roomId || dragStart.dayOfWeek !== dayOfWeek) return false

    const minIndex = Math.min(dragStart.timeIndex, dragEnd.timeIndex)
    const maxIndex = Math.max(dragStart.timeIndex, dragEnd.timeIndex)

    return timeIndex >= minIndex && timeIndex <= maxIndex
  }

  const handleCellClick = (
    roomId: string,
    roomName: string,
    dayOfWeek: keyof typeof dayOfWeekMap,
    time: string
  ) => {
    if (isDragging) return

    setSelectedCell({ roomId, roomName, dayOfWeek, startTime: time })
    setStartTime(time)

    const timeIndex = timeSlots.indexOf(time)
    // 한 칸(30분) 클릭 시 기본 종료 시간을 +30분으로 설정
    const endTimeIndex = Math.min(timeIndex + 1, timeSlots.length - 1)
    setEndTime(timeSlots[endTimeIndex])

    // If there is an existing schedule in this cell, prefill class/teacher for edit
    const existing = getSchedulesForCell(roomId, dayOfWeek, time)?.[0]
    if (existing) {
      setSelectedClassId(existing.class_id || '')
      // ensure start/end time show actual values
      setStartTime(existing.start_time.substring(0, 5))
      setEndTime(existing.end_time.substring(0, 5))
      setSelectedScheduleId(existing.id)
    } else {
      setSelectedClassId('')
      setSelectedScheduleId(null)
    }
    setIsDialogOpen(true)
  }

  const handleSaveSchedule = async () => {
    if (!selectedCell || !selectedClassId) {
      toast({
        title: '필수 정보 누락',
        description: '반을 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    const selectedClass = classes.find((c) => c.id === selectedClassId)

    try {
      const isUpdate = Boolean(selectedScheduleId)
      const prev = schedules
      const optimisticId = selectedScheduleId || crypto.randomUUID()
      const optimisticSchedule = {
        id: optimisticId,
        room_id: selectedCell.roomId,
        teacher_id: selectedClass?.teacher_id || null,
        class_id: selectedClassId,
        day_of_week: selectedCell.dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        status: 'active',
        classes: selectedClass ? { name: selectedClass.name, teacher_id: selectedClass.teacher_id } : null,
        teacher: selectedClass?.teacher_id
          ? { name: teachers.find((t) => t.id === selectedClass.teacher_id)?.name || '미지정' }
          : null,
        rooms: rooms.find((r) => r.id === selectedCell.roomId)
          ? { name: rooms.find((r) => r.id === selectedCell.roomId)?.name || '' }
          : null,
      }

      // Optimistic apply
      if (isUpdate) {
        setSchedules(prev.map((s) => (s.id === selectedScheduleId ? { ...s, ...optimisticSchedule } : s)))
      } else {
        setSchedules([...prev, optimisticSchedule as any])
      }
      setIsDialogOpen(false)

      const response = await fetch('/api/schedules', {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: selectedScheduleId || undefined,
          room_id: selectedCell.roomId,
          teacher_id: selectedClass?.teacher_id || null,
          class_id: selectedClassId,
          day_of_week: selectedCell.dayOfWeek,
          start_time: startTime,
          end_time: endTime,
          status: 'active',
        }),
      })

      interface ScheduleApiResponse {
        error?: string
        schedules?: any[]
      }
      const data = await response.json() as ScheduleApiResponse

      if (!response.ok) {
        // rollback
        setSchedules(prev)
        toast({
          title: '등록 실패',
          description: data.error || '스케줄 등록에 실패했습니다.',
          variant: 'destructive',
        })
        return
      }

      // Sync with server result
      const refreshRes = await fetch('/api/schedules', { credentials: 'include' })
      const refreshData = await refreshRes.json() as ScheduleApiResponse
      if (refreshData.schedules) {
        setSchedules(refreshData.schedules)
      }

      toast({
        title: '스케줄 등록 완료',
        description: `${selectedCell.roomName}에 수업이 등록되었습니다.`,
      })

      setSelectedScheduleId(null)
    } catch (error) {
      // rollback
      const refreshRes = await fetch('/api/schedules', { credentials: 'include' })
      const refreshData = await refreshRes.json() as { schedules?: any[] }
      if (refreshData.schedules) setSchedules(refreshData.schedules)
      console.error('Schedule creation error:', error)
      toast({
        title: '오류 발생',
        description: '스케줄 등록 중 오류가 발생했습니다.',
        variant: 'destructive',
      })
    }
  }

  // Get schedules for specific room and day (시작 셀)
  const getSchedulesForCell = (roomId: string, dayOfWeek: keyof typeof dayOfWeekMap, time: string) => {
    return schedules.filter(s => {
      const scheduleTime = s.start_time.substring(0, 5)
      return s.room_id === roomId && s.day_of_week === dayOfWeek && scheduleTime === time
    })
  }

  // 시간이 겹치는 스케줄들에 column 할당 (greedy 알고리즘)
  const assignColumns = (daySchedules: ScheduleData[]) => {
    if (daySchedules.length === 0) return { columns: new Map<string, number>(), maxColumns: 1 }

    const sorted = [...daySchedules].sort((a, b) => {
      const aStart = timeSlots.indexOf(a.start_time.substring(0, 5))
      const bStart = timeSlots.indexOf(b.start_time.substring(0, 5))
      return aStart - bStart
    })

    const columns = new Map<string, number>()
    const columnEndTimes: number[] = []

    for (const schedule of sorted) {
      const startIdx = timeSlots.indexOf(schedule.start_time.substring(0, 5))
      let endIdx = timeSlots.indexOf(schedule.end_time.substring(0, 5))
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

  // Filter students by search query
  // Statistics
  const totalSchedules = schedules.length
  // status 값이 없거나 알 수 없는 경우도 운영 교실로 집계
  const activeRooms = rooms.filter(r =>
    r.status === undefined || r.status === null || r.status === '' ||
    r.status === 'available' || r.status === 'active'
  ).length
  const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">교실 스케쥴</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            교실별 스케줄을 확인하고 관리합니다
          </p>
        </div>
        <Link href={getInstitutionHref('/all-schedules', institutionName)}>
          <Button variant="outline" className="w-full sm:w-auto">
            <Grid3x3 className="mr-2 h-4 w-4" />
            전체 스케줄 보기
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">운영 교실</CardTitle>
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRooms}개</div>
            <p className="text-xs text-muted-foreground">전체 수용 인원: {totalCapacity}명</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">등록된 수업</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSchedules}개</div>
            <p className="text-xs text-muted-foreground">주간 수업</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">강사</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.length}명</div>
            <p className="text-xs text-muted-foreground">전체 강사</p>
          </CardContent>
        </Card>
      </div>

      {/* Room Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>교실별 스케줄</CardTitle>
          <CardDescription>
            각 교실의 주간 스케줄을 관리합니다 (셀을 클릭하여 수업 등록)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rooms.length > 0 && (
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
              <TabsList>
                {rooms.map((room) => (
                  <TabsTrigger key={room.id} value={room.id}>
                    {room.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {rooms.map((room) => {
                const CELL_HEIGHT = 50
                const dayKeys = Object.keys(dayOfWeekMap)

                return (
                  <TabsContent key={room.id} value={room.id}>
                    <div className="overflow-x-auto">
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
                        {dayKeys.map(dayKey => {
                          const day = dayOfWeekMap[dayKey as keyof typeof dayOfWeekMap]
                          const daySchedules = schedules.filter(s => s.room_id === room.id && s.day_of_week === dayKey)
                          const { columns, maxColumns } = assignColumns(daySchedules)

                          return (
                            <div key={dayKey} className="border-l" style={{ width: `${maxColumns * 83}px`, flexShrink: 0 }}>
                              {/* 요일 헤더 */}
                              <div className="h-10 p-2 text-center font-medium text-sm">
                                {day.label}
                              </div>

                              {/* 스케줄 영역 */}
                              <div
                                className="relative"
                                style={{ height: `${timeSlots.length * CELL_HEIGHT}px` }}
                              >
                                {/* 시간 그리드 라인 + 드래그/클릭 영역 */}
                                {timeSlots.map((time, idx) => {
                                  const timeIndex = timeSlots.indexOf(time)
                                  const isInDragRange = isCellInDragRange(room.id, dayKey, timeIndex)

                                  return (
                                    <div
                                      key={time}
                                      className={cn(
                                        "absolute w-full border-t cursor-pointer hover:bg-muted/30 transition-colors",
                                        isInDragRange && "bg-blue-100"
                                      )}
                                      style={{ top: `${idx * CELL_HEIGHT}px`, height: `${CELL_HEIGHT}px` }}
                                      onMouseDown={() => handleMouseDown(room.id, room.name, dayKey as keyof typeof dayOfWeekMap, time)}
                                      onMouseEnter={() => handleMouseEnter(room.id, dayKey as keyof typeof dayOfWeekMap, time)}
                                      onMouseUp={handleMouseUp}
                                      onClick={() => handleCellClick(room.id, room.name, dayKey as keyof typeof dayOfWeekMap, time)}
                                    />
                                  )
                                })}

                                {/* 스케줄 카드들 */}
                                {daySchedules.map(schedule => {
                                  const startTime = schedule.start_time.substring(0, 5)
                                  const endTime = schedule.end_time.substring(0, 5)
                                  const startIdx = timeSlots.indexOf(startTime)
                                  let endIdx = timeSlots.indexOf(endTime)

                                  if (startIdx === -1) return null
                                  if (endIdx === -1) endIdx = timeSlots.length

                                  const top = startIdx * CELL_HEIGHT
                                  const height = Math.max(1, endIdx - startIdx) * CELL_HEIGHT

                                  const col = columns.get(schedule.id) ?? 0
                                  const widthPercent = 100 / maxColumns
                                  const leftPercent = col * widthPercent

                                  const teacherColor = getTeacherColor(schedule.teacher_id)
                                  const teacherName = schedule.teacher?.name || ''
                                  const className = schedule.classes?.name || '수업'

                                  return (
                                    <div
                                      key={schedule.id}
                                      className="absolute p-0.5"
                                      style={{
                                        top: `${top}px`,
                                        height: `${height}px`,
                                        left: `${leftPercent}%`,
                                        width: `${widthPercent}%`
                                      }}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setSelectedCell({
                                          roomId: schedule.room_id,
                                          roomName: room.name,
                                          dayOfWeek: schedule.day_of_week as keyof typeof dayOfWeekMap,
                                          startTime: startTime
                                        })
                                        setStartTime(startTime)
                                        setEndTime(endTime)
                                        setSelectedClassId(schedule.class_id || '')
                                        setSelectedScheduleId(schedule.id)
                                        setIsDialogOpen(true)
                                      }}
                                    >
                                      <div className={cn(
                                        "h-full p-2 rounded flex flex-col justify-center overflow-hidden",
                                        teacherColor.bg,
                                        teacherColor.border
                                      )}>
                                        <div className={cn("font-bold text-sm leading-tight", teacherColor.text)}>
                                          {teacherName}
                                        </div>
                                        <div className={cn("text-xs leading-tight", teacherColor.text)}>
                                          {className}
                                        </div>
                                        <div className="text-muted-foreground text-xs leading-tight">
                                          {startTime}-{endTime}
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
                  </TabsContent>
                )
              })}
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Schedule Creation Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          setIsDialogOpen(open)
          if (!open) {
            setSelectedScheduleId(null)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>수업 등록</DialogTitle>
            <DialogDescription>
              {selectedCell && (
                <>
                  {selectedCell.roomName} · {dayOfWeekMap[selectedCell.dayOfWeek].label}요일 · {selectedCell.startTime}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="class">반 *</Label>
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger id="class">
                  <SelectValue placeholder="반을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-time">시작 시간</Label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger id="start-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-time">종료 시간</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger id="end-time">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {timeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
              <div className="flex gap-2">
                {getSchedulesForCell(
                  selectedCell?.roomId || '',
                  selectedCell?.dayOfWeek || 'monday',
                  selectedCell?.startTime || ''
                )?.[0] && selectedScheduleId && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={async () => {
                      if (!selectedScheduleId) return
                      const prev = schedules
                      setSchedules(prev.filter((s) => s.id !== selectedScheduleId))
                      try {
                        const res = await fetch('/api/schedules', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ id: selectedScheduleId }),
                        })
                        const data = await res.json() as { error?: string }
                        if (!res.ok) {
                          setSchedules(prev)
                          toast({
                            title: '삭제 실패',
                            description: data.error || '스케줄 삭제에 실패했습니다.',
                            variant: 'destructive',
                          })
                          return
                        }
                        // refresh
                        const refreshRes = await fetch('/api/schedules', { credentials: 'include' })
                        const refreshData = await refreshRes.json() as { schedules?: any[] }
                        if (refreshData.schedules) setSchedules(refreshData.schedules)
                        toast({ title: '삭제 완료', description: '수업이 삭제되었습니다.' })
                        setSelectedScheduleId(null)
                        setIsDialogOpen(false)
                      } catch (err) {
                        setSchedules(prev)
                        toast({
                          title: '삭제 실패',
                          description: '서버와 통신할 수 없습니다.',
                          variant: 'destructive',
                        })
                      }
                    }}
                  >
                    삭제
                  </Button>
                )}
                <Button onClick={handleSaveSchedule}>
                  등록
                </Button>
              </div>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
