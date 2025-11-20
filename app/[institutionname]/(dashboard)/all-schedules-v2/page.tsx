'use client'
export const runtime = 'edge'



import { useState } from 'react'
import { usePageAccess } from '@/hooks/use-page-access'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DoorOpen, Users, Calendar, BookOpen } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Room, RoomSchedule } from '@/lib/types/database'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// Mock data - 동일한 데이터 사용
const mockRooms: Room[] = [
  { id: 'room-1', created_at: '2025-01-01', org_id: 'org-1', name: '201호', capacity: 15, status: 'active' },
  { id: 'room-2', created_at: '2025-01-01', org_id: 'org-1', name: '202호', capacity: 20, status: 'active' },
  { id: 'room-3', created_at: '2025-01-01', org_id: 'org-1', name: '203호', capacity: 15, status: 'active' },
  { id: 'room-4', created_at: '2025-01-01', org_id: 'org-1', name: '실험실', capacity: 10, status: 'active' },
  { id: 'room-5', created_at: '2025-01-01', org_id: 'org-1', name: '특강실', capacity: 30, status: 'active' },
]

const mockTeachers = [
  { id: 'teacher-1', name: '김선생' },
  { id: 'teacher-2', name: '박선생' },
  { id: 'teacher-3', name: '이선생' },
  { id: 'teacher-4', name: '최선생' },
  { id: 'teacher-5', name: '정선생' },
]

// 전체 스케줄 데이터를 import하는 대신 동일하게 복사
const mockSchedules: RoomSchedule[] = [
  { id: '1', created_at: '2025-01-01', room_id: 'room-1', room_name: '201호', day_of_week: 'monday', start_time: '09:00', end_time: '11:00', teacher_id: 'teacher-1', teacher_name: '김선생', student_id: 'student-1', student_name: '김민준', student_grade: 3 },
  { id: '2', created_at: '2025-01-01', room_id: 'room-1', room_name: '201호', day_of_week: 'wednesday', start_time: '13:00', end_time: '15:00', teacher_id: 'teacher-1', teacher_name: '김선생', student_id: 'student-2', student_name: '이서연', student_grade: 4 },
  { id: '3', created_at: '2025-01-01', room_id: 'room-2', room_name: '202호', day_of_week: 'monday', start_time: '10:00', end_time: '12:00', teacher_id: 'teacher-2', teacher_name: '박선생', student_id: 'student-3', student_name: '박준호', student_grade: 2 },
  { id: '4', created_at: '2025-01-01', room_id: 'room-2', room_name: '202호', day_of_week: 'friday', start_time: '14:00', end_time: '16:00', teacher_id: 'teacher-2', teacher_name: '박선생', student_id: 'student-4', student_name: '최지우', student_grade: 5 },
  { id: '5', created_at: '2025-01-01', room_id: 'room-3', room_name: '203호', day_of_week: 'tuesday', start_time: '09:00', end_time: '11:00', teacher_id: 'teacher-3', teacher_name: '이선생', student_id: 'student-5', student_name: '정하은', student_grade: 3 },
  { id: '6', created_at: '2025-01-01', room_id: 'room-3', room_name: '203호', day_of_week: 'thursday', start_time: '15:00', end_time: '17:00', teacher_id: 'teacher-3', teacher_name: '이선생', student_id: 'student-6', student_name: '강도윤', student_grade: 6 },
  { id: '7', created_at: '2025-01-01', room_id: 'room-4', room_name: '실험실', day_of_week: 'wednesday', start_time: '10:00', end_time: '12:00', teacher_id: 'teacher-4', teacher_name: '최선생', student_id: 'student-7', student_name: '조시우', student_grade: 1 },
  { id: '8', created_at: '2025-01-01', room_id: 'room-4', room_name: '실험실', day_of_week: 'saturday', start_time: '11:00', end_time: '13:00', teacher_id: 'teacher-4', teacher_name: '최선생', student_id: 'student-8', student_name: '윤서준', student_grade: 4 },
  { id: '9', created_at: '2025-01-01', room_id: 'room-5', room_name: '특강실', day_of_week: 'tuesday', start_time: '14:00', end_time: '16:00', teacher_id: 'teacher-5', teacher_name: '정선생', student_id: 'student-9', student_name: '장서아', student_grade: 2 },
  { id: '10', created_at: '2025-01-01', room_id: 'room-5', room_name: '특강실', day_of_week: 'friday', start_time: '16:00', end_time: '18:00', teacher_id: 'teacher-5', teacher_name: '정선생', student_id: 'student-10', student_name: '임지호', student_grade: 5 },
  { id: '11', created_at: '2025-01-01', room_id: 'room-1', room_name: '201호', day_of_week: 'friday', start_time: '10:00', end_time: '12:00', teacher_id: 'teacher-1', teacher_name: '김선생', student_id: 'student-6', student_name: '강도윤', student_grade: 6 },
  { id: '12', created_at: '2025-01-01', room_id: 'room-2', room_name: '202호', day_of_week: 'thursday', start_time: '09:00', end_time: '11:00', teacher_id: 'teacher-2', teacher_name: '박선생', student_id: 'student-7', student_name: '조시우', student_grade: 1 },
  // 화요일 13:00 - 5개 교실 모두 수업
  { id: '13', created_at: '2025-01-01', room_id: 'room-1', room_name: '201호', day_of_week: 'tuesday', start_time: '13:00', end_time: '15:00', teacher_id: 'teacher-1', teacher_name: '김선생', student_id: 'student-11', student_name: '한예진', student_grade: 3 },
  { id: '14', created_at: '2025-01-01', room_id: 'room-2', room_name: '202호', day_of_week: 'tuesday', start_time: '13:00', end_time: '15:00', teacher_id: 'teacher-2', teacher_name: '박선생', student_id: 'student-12', student_name: '오민서', student_grade: 4 },
  { id: '15', created_at: '2025-01-01', room_id: 'room-3', room_name: '203호', day_of_week: 'tuesday', start_time: '13:00', end_time: '15:00', teacher_id: 'teacher-3', teacher_name: '이선생', student_id: 'student-13', student_name: '신우진', student_grade: 2 },
  { id: '16', created_at: '2025-01-01', room_id: 'room-4', room_name: '실험실', day_of_week: 'tuesday', start_time: '13:00', end_time: '15:00', teacher_id: 'teacher-4', teacher_name: '최선생', student_id: 'student-14', student_name: '권지안', student_grade: 5 },
  { id: '17', created_at: '2025-01-01', room_id: 'room-5', room_name: '특강실', day_of_week: 'tuesday', start_time: '13:00', end_time: '15:00', teacher_id: 'teacher-5', teacher_name: '정선생', student_id: 'student-15', student_name: '배수빈', student_grade: 6 },
  // 월요일 10:00 - 4개 교실
  { id: '18', created_at: '2025-01-01', room_id: 'room-1', room_name: '201호', day_of_week: 'monday', start_time: '10:00', end_time: '12:00', teacher_id: 'teacher-1', teacher_name: '김선생', student_id: 'student-16', student_name: '송하린', student_grade: 1 },
  { id: '19', created_at: '2025-01-01', room_id: 'room-3', room_name: '203호', day_of_week: 'monday', start_time: '10:00', end_time: '12:00', teacher_id: 'teacher-3', teacher_name: '이선생', student_id: 'student-17', student_name: '안태우', student_grade: 3 },
  { id: '20', created_at: '2025-01-01', room_id: 'room-4', room_name: '실험실', day_of_week: 'monday', start_time: '10:00', end_time: '12:00', teacher_id: 'teacher-4', teacher_name: '최선생', student_id: 'student-18', student_name: '홍다은', student_grade: 4 },
  { id: '21', created_at: '2025-01-01', room_id: 'room-5', room_name: '특강실', day_of_week: 'monday', start_time: '10:00', end_time: '12:00', teacher_id: 'teacher-5', teacher_name: '정선생', student_id: 'student-19', student_name: '구민재', student_grade: 5 },
  // 수요일 14:00 - 4개 교실
  { id: '22', created_at: '2025-01-01', room_id: 'room-1', room_name: '201호', day_of_week: 'wednesday', start_time: '14:00', end_time: '16:00', teacher_id: 'teacher-1', teacher_name: '김선생', student_id: 'student-20', student_name: '남윤아', student_grade: 2 },
  { id: '23', created_at: '2025-01-01', room_id: 'room-2', room_name: '202호', day_of_week: 'wednesday', start_time: '14:00', end_time: '16:00', teacher_id: 'teacher-2', teacher_name: '박선생', student_id: 'student-1', student_name: '김민준', student_grade: 3 },
  { id: '24', created_at: '2025-01-01', room_id: 'room-3', room_name: '203호', day_of_week: 'wednesday', start_time: '14:00', end_time: '16:00', teacher_id: 'teacher-3', teacher_name: '이선생', student_id: 'student-3', student_name: '박준호', student_grade: 2 },
  { id: '25', created_at: '2025-01-01', room_id: 'room-5', room_name: '특강실', day_of_week: 'wednesday', start_time: '14:00', end_time: '16:00', teacher_id: 'teacher-5', teacher_name: '정선생', student_id: 'student-4', student_name: '최지우', student_grade: 5 },
  // 목요일 15:00 - 3개 교실
  { id: '26', created_at: '2025-01-01', room_id: 'room-1', room_name: '201호', day_of_week: 'thursday', start_time: '15:00', end_time: '17:00', teacher_id: 'teacher-1', teacher_name: '김선생', student_id: 'student-5', student_name: '정하은', student_grade: 3 },
  { id: '27', created_at: '2025-01-01', room_id: 'room-2', room_name: '202호', day_of_week: 'thursday', start_time: '15:00', end_time: '17:00', teacher_id: 'teacher-2', teacher_name: '박선생', student_id: 'student-7', student_name: '조시우', student_grade: 1 },
  { id: '28', created_at: '2025-01-01', room_id: 'room-4', room_name: '실험실', day_of_week: 'thursday', start_time: '15:00', end_time: '17:00', teacher_id: 'teacher-4', teacher_name: '최선생', student_id: 'student-8', student_name: '윤서준', student_grade: 4 },
  // 추가 수업들
  { id: '29', created_at: '2025-01-01', room_id: 'room-1', room_name: '201호', day_of_week: 'tuesday', start_time: '10:00', end_time: '12:00', teacher_id: 'teacher-1', teacher_name: '김선생', student_id: 'student-9', student_name: '장서아', student_grade: 2 },
  { id: '30', created_at: '2025-01-01', room_id: 'room-2', room_name: '202호', day_of_week: 'wednesday', start_time: '09:00', end_time: '11:00', teacher_id: 'teacher-2', teacher_name: '박선생', student_id: 'student-10', student_name: '임지호', student_grade: 5 },
  { id: '31', created_at: '2025-01-01', room_id: 'room-3', room_name: '203호', day_of_week: 'friday', start_time: '13:00', end_time: '15:00', teacher_id: 'teacher-3', teacher_name: '이선생', student_id: 'student-11', student_name: '한예진', student_grade: 3 },
  { id: '32', created_at: '2025-01-01', room_id: 'room-4', room_name: '실험실', day_of_week: 'thursday', start_time: '10:00', end_time: '12:00', teacher_id: 'teacher-4', teacher_name: '최선생', student_id: 'student-12', student_name: '오민서', student_grade: 4 },
  { id: '33', created_at: '2025-01-01', room_id: 'room-5', room_name: '특강실', day_of_week: 'monday', start_time: '14:00', end_time: '16:00', teacher_id: 'teacher-5', teacher_name: '정선생', student_id: 'student-13', student_name: '신우진', student_grade: 2 },
  { id: '34', created_at: '2025-01-01', room_id: 'room-1', room_name: '201호', day_of_week: 'saturday', start_time: '09:00', end_time: '11:00', teacher_id: 'teacher-1', teacher_name: '김선생', student_id: 'student-14', student_name: '권지안', student_grade: 5 },
  { id: '35', created_at: '2025-01-01', room_id: 'room-2', room_name: '202호', day_of_week: 'saturday', start_time: '10:00', end_time: '12:00', teacher_id: 'teacher-2', teacher_name: '박선생', student_id: 'student-15', student_name: '배수빈', student_grade: 6 },
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
  '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
]

// Room color mapping
const roomColors: Record<string, { bg: string; text: string; border: string }> = {
  '201호': { bg: 'bg-blue-500', text: 'text-blue-700', border: 'border-blue-500' },
  '202호': { bg: 'bg-green-500', text: 'text-green-700', border: 'border-green-500' },
  '203호': { bg: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-500' },
  '실험실': { bg: 'bg-orange-500', text: 'text-orange-700', border: 'border-orange-500' },
  '특강실': { bg: 'bg-pink-500', text: 'text-pink-700', border: 'border-pink-500' },
}

export default function AllSchedulesV2Page() {
  usePageAccess('all-schedules')

  const [filterRoom, setFilterRoom] = useState<string>('all')
  const [filterTeacher, setFilterTeacher] = useState<string>('all')
  const [hoverCell, setHoverCell] = useState<{ day: string; time: string } | null>(null)

  const getRoomColor = (roomName: string) => {
    return roomColors[roomName] || { bg: 'bg-gray-500', text: 'text-gray-700', border: 'border-gray-500' }
  }

  // Filter schedules
  const getFilteredSchedules = () => {
    let filtered = mockSchedules

    if (filterRoom !== 'all') {
      filtered = filtered.filter(s => s.room_id === filterRoom)
    }

    if (filterTeacher !== 'all') {
      filtered = filtered.filter(s => s.teacher_id === filterTeacher)
    }

    return filtered
  }

  const filteredSchedules = getFilteredSchedules()

  // Get all schedules for a time slot
  const getAllSchedulesForTimeSlot = (dayOfWeek: keyof typeof dayOfWeekMap, time: string) => {
    return filteredSchedules.filter(s => s.day_of_week === dayOfWeek && s.start_time === time)
  }

  // Statistics
  const totalSchedules = filteredSchedules.length
  const activeRooms = mockRooms.filter(r => r.status === 'active').length
  const uniqueTeachers = new Set(filteredSchedules.map(s => s.teacher_id)).size

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">전체 스케줄 (Compact View)</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            색상 블록으로 한눈에 파악하는 스케줄 뷰
          </p>
        </div>
        <Link href="/rooms" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            <BookOpen className="mr-2 h-4 w-4" />
            스케줄 등록하기
          </Button>
        </Link>
      </div>

      {/* View Switcher */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">뷰 옵션</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Link href="/all-schedules">
            <Button variant="outline" size="sm">
              기본 뷰
            </Button>
          </Link>
          <Button variant="default" size="sm">
            Compact 뷰
          </Button>
          <Link href="/all-schedules-v3">
            <Button variant="outline" size="sm">
              Heat Map 뷰
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 수업</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSchedules}개</div>
            <p className="text-xs text-muted-foreground">주간 등록된 수업</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">운영 교실</CardTitle>
            <DoorOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeRooms}개</div>
            <p className="text-xs text-muted-foreground">전체 교실</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">강사</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueTeachers}명</div>
            <p className="text-xs text-muted-foreground">수업 진행 강사</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>필터</CardTitle>
          <CardDescription>교실 또는 강사별로 스케줄을 필터링합니다</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <div className="flex-1">
            <Select value={filterRoom} onValueChange={setFilterRoom}>
              <SelectTrigger>
                <SelectValue placeholder="교실 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 교실</SelectItem>
                {mockRooms.map((room) => (
                  <SelectItem key={room.id} value={room.id}>
                    {room.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <Select value={filterTeacher} onValueChange={setFilterTeacher}>
              <SelectTrigger>
                <SelectValue placeholder="강사 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 강사</SelectItem>
                {mockTeachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Compact Schedule Grid */}
      <Card>
        <CardHeader>
          <CardTitle>주간 스케줄 ({filteredSchedules.length}개 수업)</CardTitle>
          <CardDescription>
            색상 블록 = 교실 · 호버하여 상세 정보 확인
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="grid grid-cols-8 gap-1 min-w-[900px]">
              {/* Header */}
              <div className="font-medium text-sm text-muted-foreground p-2 h-10 flex items-center">시간</div>
              {Object.keys(dayOfWeekMap).map((dayKey) => {
                const day = dayOfWeekMap[dayKey as keyof typeof dayOfWeekMap]
                return (
                  <div key={dayKey} className="text-center p-2 h-10 font-medium flex items-center justify-center">
                    {day.label}
                  </div>
                )
              })}

              {/* Time slots */}
              {timeSlots.map((time) => (
                <>
                  <div key={`time-${time}`} className="text-sm text-muted-foreground p-2 h-[48px] flex items-center font-medium">
                    {time}
                  </div>
                  {Object.keys(dayOfWeekMap).map((dayKey) => {
                    const schedulesInSlot = getAllSchedulesForTimeSlot(
                      dayKey as keyof typeof dayOfWeekMap,
                      time
                    )

                    const isHovered = hoverCell?.day === dayKey && hoverCell?.time === time

                    return (
                      <div
                        key={`${time}-${dayKey}`}
                        className="relative h-[48px] border rounded p-1.5 bg-muted/10 hover:bg-muted/30 transition-colors cursor-pointer"
                        onMouseEnter={() => setHoverCell({ day: dayKey, time })}
                        onMouseLeave={() => setHoverCell(null)}
                      >
                        {schedulesInSlot.length === 0 ? (
                          <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                            -
                          </div>
                        ) : (
                          <div className="flex items-center gap-1">
                            {/* 색상 블록 */}
                            <div className="flex gap-0.5">
                              {schedulesInSlot.slice(0, 5).map((schedule) => (
                                <div
                                  key={schedule.id}
                                  className={cn(
                                    "w-2.5 h-2.5 rounded-sm",
                                    getRoomColor(schedule.room_name).bg
                                  )}
                                  title={schedule.room_name}
                                />
                              ))}
                            </div>
                            {/* 수업 개수 */}
                            <span className="text-xs font-medium">
                              {schedulesInSlot.length}
                            </span>
                          </div>
                        )}

                        {/* Hover Tooltip */}
                        {isHovered && schedulesInSlot.length > 0 && (
                          <div className="absolute z-50 left-0 top-full mt-1 bg-white shadow-lg border rounded-lg p-3 w-64">
                            <div className="text-sm font-medium mb-2">
                              {dayOfWeekMap[dayKey as keyof typeof dayOfWeekMap].label}요일 {time}
                            </div>
                            <div className="space-y-2">
                              {schedulesInSlot.map((schedule) => (
                                <div
                                  key={schedule.id}
                                  className={cn(
                                    "text-xs p-2 rounded border-l-4",
                                    getRoomColor(schedule.room_name).bg.replace('500', '50'),
                                    getRoomColor(schedule.room_name).border
                                  )}
                                >
                                  <div className={cn("font-bold", getRoomColor(schedule.room_name).text)}>
                                    {schedule.room_name}
                                  </div>
                                  <div className="text-muted-foreground mt-0.5">
                                    {schedule.teacher_name}
                                  </div>
                                  <div className="text-muted-foreground">
                                    {schedule.student_grade}학년 {schedule.student_name}
                                  </div>
                                  <div className="text-muted-foreground text-[10px] mt-0.5">
                                    {schedule.start_time}-{schedule.end_time}
                                  </div>
                                </div>
                              ))}
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

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle>교실 범례</CardTitle>
          <CardDescription>색상별 교실 구분</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {mockRooms.map((room) => (
              <div key={room.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-4 h-4 rounded",
                    getRoomColor(room.name).bg
                  )}
                />
                <span className="text-sm font-medium">{room.name}</span>
                <span className="text-xs text-muted-foreground">
                  (수용: {room.capacity}명)
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
