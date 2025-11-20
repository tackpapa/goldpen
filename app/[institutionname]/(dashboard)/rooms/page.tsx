'use client'



import { useState, useEffect } from 'react'
import { usePageAccess } from '@/hooks/use-page-access'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getInstitutionHref } from '@/lib/utils/route'
import Link from 'next/link'
import { Grid3x3 } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DoorOpen, Users, Calendar, Clock } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Room, RoomSchedule } from '@/lib/types/database'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

// Mock data - Rooms
const mockRooms: Room[] = [
  { id: 'room-1', created_at: '2025-01-01', org_id: 'org-1', name: '201호', capacity: 15, status: 'active' },
  { id: 'room-2', created_at: '2025-01-01', org_id: 'org-1', name: '202호', capacity: 20, status: 'active' },
  { id: 'room-3', created_at: '2025-01-01', org_id: 'org-1', name: '203호', capacity: 15, status: 'active' },
  { id: 'room-4', created_at: '2025-01-01', org_id: 'org-1', name: '실험실', capacity: 10, status: 'active' },
  { id: 'room-5', created_at: '2025-01-01', org_id: 'org-1', name: '특강실', capacity: 30, status: 'active' },
]

// Mock data - Teachers
const mockTeachers = [
  { id: 'teacher-1', name: '김선생' },
  { id: 'teacher-2', name: '박선생' },
  { id: 'teacher-3', name: '이선생' },
  { id: 'teacher-4', name: '최선생' },
  { id: 'teacher-5', name: '정선생' },
]

// Mock data - Students
const mockStudents = [
  { id: 'student-1', name: '김민준', grade: 3 },
  { id: 'student-2', name: '이서연', grade: 4 },
  { id: 'student-3', name: '박준호', grade: 2 },
  { id: 'student-4', name: '최지우', grade: 5 },
  { id: 'student-5', name: '정하은', grade: 3 },
  { id: 'student-6', name: '강도윤', grade: 6 },
  { id: 'student-7', name: '조시우', grade: 1 },
  { id: 'student-8', name: '윤서준', grade: 4 },
  { id: 'student-9', name: '장서아', grade: 2 },
  { id: 'student-10', name: '임지호', grade: 5 },
]

// Mock data - Room Schedules
const initialSchedules: RoomSchedule[] = [
  {
    id: '1',
    created_at: '2025-01-01',
    room_id: 'room-1',
    room_name: '201호',
    day_of_week: 'monday',
    start_time: '09:00',
    end_time: '11:00',
    teacher_id: 'teacher-1',
    teacher_name: '김선생',
    student_id: 'student-1',
    student_name: '김민준',
    student_grade: 3,
  },
  {
    id: '2',
    created_at: '2025-01-01',
    room_id: 'room-1',
    room_name: '201호',
    day_of_week: 'wednesday',
    start_time: '13:00',
    end_time: '15:00',
    teacher_id: 'teacher-1',
    teacher_name: '김선생',
    student_id: 'student-2',
    student_name: '이서연',
    student_grade: 4,
  },
  {
    id: '3',
    created_at: '2025-01-01',
    room_id: 'room-2',
    room_name: '202호',
    day_of_week: 'monday',
    start_time: '10:00',
    end_time: '12:00',
    teacher_id: 'teacher-2',
    teacher_name: '박선생',
    student_id: 'student-3',
    student_name: '박준호',
    student_grade: 2,
  },
  {
    id: '4',
    created_at: '2025-01-01',
    room_id: 'room-2',
    room_name: '202호',
    day_of_week: 'friday',
    start_time: '14:00',
    end_time: '16:00',
    teacher_id: 'teacher-2',
    teacher_name: '박선생',
    student_id: 'student-4',
    student_name: '최지우',
    student_grade: 5,
  },
  {
    id: '5',
    created_at: '2025-01-01',
    room_id: 'room-3',
    room_name: '203호',
    day_of_week: 'tuesday',
    start_time: '09:00',
    end_time: '11:00',
    teacher_id: 'teacher-3',
    teacher_name: '이선생',
    student_id: 'student-5',
    student_name: '정하은',
    student_grade: 3,
  },
  {
    id: '6',
    created_at: '2025-01-01',
    room_id: 'room-3',
    room_name: '203호',
    day_of_week: 'thursday',
    start_time: '15:00',
    end_time: '17:00',
    teacher_id: 'teacher-3',
    teacher_name: '이선생',
    student_id: 'student-6',
    student_name: '강도윤',
    student_grade: 6,
  },
  {
    id: '7',
    created_at: '2025-01-01',
    room_id: 'room-4',
    room_name: '실험실',
    day_of_week: 'wednesday',
    start_time: '10:00',
    end_time: '12:00',
    teacher_id: 'teacher-4',
    teacher_name: '최선생',
    student_id: 'student-7',
    student_name: '조시우',
    student_grade: 1,
  },
  {
    id: '8',
    created_at: '2025-01-01',
    room_id: 'room-4',
    room_name: '실험실',
    day_of_week: 'saturday',
    start_time: '11:00',
    end_time: '13:00',
    teacher_id: 'teacher-4',
    teacher_name: '최선생',
    student_id: 'student-8',
    student_name: '윤서준',
    student_grade: 4,
  },
  {
    id: '9',
    created_at: '2025-01-01',
    room_id: 'room-5',
    room_name: '특강실',
    day_of_week: 'tuesday',
    start_time: '14:00',
    end_time: '16:00',
    teacher_id: 'teacher-5',
    teacher_name: '정선생',
    student_id: 'student-9',
    student_name: '장서아',
    student_grade: 2,
  },
  {
    id: '10',
    created_at: '2025-01-01',
    room_id: 'room-5',
    room_name: '특강실',
    day_of_week: 'friday',
    start_time: '16:00',
    end_time: '18:00',
    teacher_id: 'teacher-5',
    teacher_name: '정선생',
    student_id: 'student-10',
    student_name: '임지호',
    student_grade: 5,
  },
  {
    id: '11',
    created_at: '2025-01-01',
    room_id: 'room-1',
    room_name: '201호',
    day_of_week: 'friday',
    start_time: '10:00',
    end_time: '12:00',
    teacher_id: 'teacher-1',
    teacher_name: '김선생',
    student_id: 'student-6',
    student_name: '강도윤',
    student_grade: 6,
  },
  {
    id: '12',
    created_at: '2025-01-01',
    room_id: 'room-2',
    room_name: '202호',
    day_of_week: 'thursday',
    start_time: '09:00',
    end_time: '11:00',
    teacher_id: 'teacher-2',
    teacher_name: '박선생',
    student_id: 'student-7',
    student_name: '조시우',
    student_grade: 1,
  },
]

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

// Teacher color mapping
const teacherColors: Record<string, { bg: string; text: string; border: string }> = {
  'teacher-1': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  'teacher-2': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  'teacher-3': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  'teacher-4': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  'teacher-5': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
}

export default function RoomsPage() {
  usePageAccess('rooms')

  const { toast } = useToast()
  const [schedules, setSchedules] = useState<RoomSchedule[]>(initialSchedules)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedCell, setSelectedCell] = useState<{
    roomId: string
    roomName: string
    dayOfWeek: keyof typeof dayOfWeekMap
    startTime: string
  } | null>(null)

  // Form state
  const [teacherId, setTeacherId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [studentSearchQuery, setStudentSearchQuery] = useState('')
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

  // Global mouseup handler for drag
  useEffect(() => {
    const handleGlobalMouseUp = () => {
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
      setTeacherId('')
      setStudentId('')
      setStudentSearchQuery('')
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

  const getTeacherColor = (teacherId: string) => {
    return teacherColors[teacherId] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
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

    // Only allow dragging within same room and same day
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
    setTeacherId('')
    setStudentId('')
    setStudentSearchQuery('')
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
    // If was dragging, ignore click
    if (isDragging) return

    setSelectedCell({ roomId, roomName, dayOfWeek, startTime: time })
    setStartTime(time)

    // Calculate end time (2 hours later)
    const timeIndex = timeSlots.indexOf(time)
    const endTimeIndex = Math.min(timeIndex + 2, timeSlots.length - 1)
    setEndTime(timeSlots[endTimeIndex])

    setTeacherId('')
    setStudentId('')
    setStudentSearchQuery('')
    setIsDialogOpen(true)
  }

  const handleSaveSchedule = () => {
    if (!teacherId || !studentId || !selectedCell) {
      toast({
        title: '필수 정보 누락',
        description: '선생님과 학생을 모두 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    const teacher = mockTeachers.find(t => t.id === teacherId)
    const student = mockStudents.find(s => s.id === studentId)

    if (!teacher || !student) return

    const newSchedule: RoomSchedule = {
      id: `schedule-${Date.now()}`,
      created_at: new Date().toISOString(),
      room_id: selectedCell.roomId,
      room_name: selectedCell.roomName,
      day_of_week: selectedCell.dayOfWeek,
      start_time: startTime,
      end_time: endTime,
      teacher_id: teacherId,
      teacher_name: teacher.name,
      student_id: studentId,
      student_name: student.name,
      student_grade: student.grade,
    }

    setSchedules([...schedules, newSchedule])

    toast({
      title: '스케줄 등록 완료',
      description: `${selectedCell.roomName}에 수업이 등록되었습니다.`,
    })

    setIsDialogOpen(false)
  }

  // Get schedules for specific room and day
  const getSchedulesForCell = (roomId: string, dayOfWeek: keyof typeof dayOfWeekMap, time: string) => {
    return schedules.filter(
      s => s.room_id === roomId && s.day_of_week === dayOfWeek && s.start_time === time
    )
  }

  // Check if this cell is occupied by a schedule (but not the starting cell)
  const isCellOccupied = (roomId: string, dayOfWeek: keyof typeof dayOfWeekMap, time: string): RoomSchedule | null => {
    const timeIndex = timeSlots.indexOf(time)

    for (const schedule of schedules) {
      if (schedule.room_id === roomId && schedule.day_of_week === dayOfWeek) {
        const startIndex = timeSlots.indexOf(schedule.start_time)
        const endIndex = timeSlots.indexOf(schedule.end_time)

        // This cell is in the middle of a schedule (not the start)
        if (timeIndex > startIndex && timeIndex < endIndex) {
          return schedule
        }
      }
    }
    return null
  }

  // Check if cell should be hidden (merged into previous cell)
  const isCellMerged = (roomId: string, dayOfWeek: keyof typeof dayOfWeekMap, time: string): boolean => {
    const timeIndex = timeSlots.indexOf(time)

    for (const schedule of schedules) {
      if (schedule.room_id === roomId && schedule.day_of_week === dayOfWeek) {
        const startIndex = timeSlots.indexOf(schedule.start_time)
        const endIndex = timeSlots.indexOf(schedule.end_time)

        // This cell is merged (not the starting cell)
        if (timeIndex > startIndex && timeIndex < endIndex) {
          return true
        }
      }
    }
    return false
  }

  // Calculate how many rows a schedule spans
  const getScheduleRowSpan = (schedule: RoomSchedule): number => {
    const startIndex = timeSlots.indexOf(schedule.start_time)
    const endIndex = timeSlots.indexOf(schedule.end_time)
    return endIndex - startIndex
  }

  // Filter students by search query
  const filteredStudents = mockStudents.filter(student =>
    studentSearchQuery === '' ||
    student.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    `${student.grade}학년`.includes(studentSearchQuery)
  )

  // Statistics
  const totalSchedules = schedules.length
  const activeRooms = mockRooms.filter(r => r.status === 'active').length
  const totalCapacity = mockRooms.reduce((sum, r) => sum + r.capacity, 0)

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
        <Link href={getInstitutionHref('/all-schedules')}>
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
            <div className="text-2xl font-bold">{mockTeachers.length}명</div>
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
          <Tabs defaultValue={mockRooms[0].id} className="space-y-4">
            <TabsList>
              {mockRooms.map((room) => (
                <TabsTrigger key={room.id} value={room.id}>
                  {room.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {mockRooms.map((room) => (
              <TabsContent key={room.id} value={room.id}>
                <div className="overflow-x-auto">
                  <div className="grid grid-cols-[auto_repeat(7,1fr)] auto-rows-[50px] gap-2 min-w-[900px]">
                    {/* Header */}
                    <div className="font-medium text-sm text-muted-foreground p-2">시간</div>
                    {Object.keys(dayOfWeekMap).map((dayKey) => {
                      const day = dayOfWeekMap[dayKey as keyof typeof dayOfWeekMap]
                      return (
                        <div key={dayKey} className="text-center p-2 font-medium">
                          {day.label}
                        </div>
                      )
                    })}

                    {/* Time slots and cells */}
                    {timeSlots.flatMap((time, timeIdx) => {
                      const cells = []

                      // Time label cell
                      cells.push(
                        <div key={`time-${time}`} className="text-sm text-muted-foreground p-2 flex items-center">
                          {time}
                        </div>
                      )

                      // Day cells
                      Object.keys(dayOfWeekMap).forEach((dayKey) => {
                        const schedulesInCell = getSchedulesForCell(
                          room.id,
                          dayKey as keyof typeof dayOfWeekMap,
                          time
                        )

                        const timeIndex = timeSlots.indexOf(time)
                        const isInDragRange = isCellInDragRange(room.id, dayKey, timeIndex)
                        const isMerged = isCellMerged(room.id, dayKey as keyof typeof dayOfWeekMap, time)

                        // Skip rendering if this cell is merged into a previous cell
                        if (isMerged) {
                          return
                        }

                        const schedule = schedulesInCell[0]
                        const rowSpan = schedule ? getScheduleRowSpan(schedule) : 1

                        cells.push(
                          <div
                            key={`${time}-${dayKey}`}
                            onMouseDown={() =>
                              handleMouseDown(
                                room.id,
                                room.name,
                                dayKey as keyof typeof dayOfWeekMap,
                                time
                              )
                            }
                            onMouseEnter={() =>
                              handleMouseEnter(
                                room.id,
                                dayKey as keyof typeof dayOfWeekMap,
                                time
                              )
                            }
                            onMouseUp={handleMouseUp}
                            onClick={() =>
                              handleCellClick(
                                room.id,
                                room.name,
                                dayKey as keyof typeof dayOfWeekMap,
                                time
                              )
                            }
                            style={
                              rowSpan > 1
                                ? {
                                    gridRow: `span ${rowSpan}`,
                                  }
                                : undefined
                            }
                            className={cn(
                              "border rounded-lg p-1 hover:bg-muted/50 transition-colors cursor-pointer select-none overflow-hidden",
                              isInDragRange && "bg-blue-100 border-blue-400 border-2"
                            )}
                          >
                            {schedulesInCell.length > 0 ? (
                              <div className="pointer-events-none h-full">
                                {schedulesInCell.map((schedule) => {
                                  const teacherColor = getTeacherColor(schedule.teacher_id || '')
                                  return (
                                    <div
                                      key={schedule.id}
                                      className={cn(
                                        "text-[10px] px-1.5 py-1 rounded border-l-2 h-full flex flex-col justify-center gap-0.5",
                                        teacherColor.bg,
                                        teacherColor.border
                                      )}
                                    >
                                      <div className={cn("font-medium leading-tight", teacherColor.text)}>
                                        {schedule.teacher_name}
                                      </div>
                                      <div className="text-muted-foreground text-[9px] leading-tight">
                                        {schedule.student_grade}학년 {schedule.student_name}
                                      </div>
                                      <div className="text-muted-foreground text-[9px] leading-tight">
                                        {schedule.start_time}-{schedule.end_time}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-muted-foreground text-[10px] pointer-events-none">
                                {isInDragRange ? '드래그 중...' : '클릭하여 등록'}
                              </div>
                            )}
                          </div>
                        )
                      })

                      return cells
                    })}
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Schedule Creation Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              <Label htmlFor="teacher">선생님 *</Label>
              <Select value={teacherId} onValueChange={setTeacherId}>
                <SelectTrigger id="teacher">
                  <SelectValue placeholder="선생님을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {mockTeachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="student-search">학생 검색 *</Label>
              <Input
                id="student-search"
                placeholder="이름 또는 학년으로 검색..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>학생 선택</Label>
              <div className="border rounded-lg p-2 max-h-48 overflow-y-auto space-y-1">
                {filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      onClick={() => {
                        setStudentId(student.id)
                        setStudentSearchQuery(`${student.grade}학년 ${student.name}`)
                      }}
                      className={cn(
                        "p-2 rounded cursor-pointer hover:bg-muted transition-colors text-sm",
                        studentId === student.id && "bg-primary text-primary-foreground"
                      )}
                    >
                      {student.grade}학년 {student.name}
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground text-center py-4">
                    검색 결과가 없습니다
                  </div>
                )}
              </div>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveSchedule}>
              등록
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
