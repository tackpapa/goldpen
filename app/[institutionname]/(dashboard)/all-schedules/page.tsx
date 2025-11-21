'use client'

export const runtime = 'edge'
import React, { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { usePageAccess } from '@/hooks/use-page-access'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DoorOpen, Users, Calendar, BookOpen, Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { getInstitutionHref } from '@/lib/utils/route'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// API에서 가져올 스케줄 타입
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
  notes?: string
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

// Room color mapping
const roomColors: Record<string, { bg: string; text: string; border: string }> = {
  '201호': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  '202호': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  '203호': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  '실험실': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  '특강실': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
}

export default function AllSchedulesPage() {
  usePageAccess('all-schedules')

  const params = useParams()
  const institutionName = params.institutionname as string
  const [schedules, setSchedules] = useState<ScheduleData[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [filterRoom, setFilterRoom] = useState<string>('all')
  const [filterTeacher, setFilterTeacher] = useState<string>('all')

  // API에서 데이터 fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [schedulesRes, roomsRes, teachersRes] = await Promise.all([
          fetch('/api/schedules', { credentials: 'include' }),
          fetch('/api/rooms', { credentials: 'include' }),
          fetch('/api/teachers', { credentials: 'include', credentials: 'include' }),
        ])

        const schedulesData = await schedulesRes.json()
        const roomsData = await roomsRes.json()
        const teachersData = await teachersRes.json()

        if (schedulesData.schedules) setSchedules(schedulesData.schedules)
        if (roomsData.rooms) setRooms(roomsData.rooms)
        if (teachersData.teachers) setTeachers(teachersData.teachers)
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const getRoomColor = (roomName: string) => {
    return roomColors[roomName] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' }
  }

  // Filter schedules
  const getFilteredSchedules = () => {
    let filtered = schedules

    if (filterRoom !== 'all') {
      filtered = filtered.filter(s => s.room_id === filterRoom)
    }

    if (filterTeacher !== 'all') {
      // teacher_id 또는 classes.teacher_id로 필터링
      filtered = filtered.filter(s =>
        s.teacher_id === filterTeacher || s.classes?.teacher_id === filterTeacher
      )
    }

    return filtered
  }

  const filteredSchedules = getFilteredSchedules()

  // Statistics
  const totalSchedules = filteredSchedules.length
  const activeRooms = rooms.filter(r => r.status === 'available' || r.status === 'active').length
  const uniqueTeachers = new Set(filteredSchedules.map(s => s.teacher_id).filter(Boolean)).size

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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">전체 스케줄</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            모든 교실의 수업 스케줄을 한눈에 확인합니다
          </p>
        </div>
        <Link href={getInstitutionHref('/rooms', institutionName)} className="w-full sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto">
            <BookOpen className="mr-2 h-4 w-4" />
            스케줄 등록하기
          </Button>
        </Link>
      </div>

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
                {rooms.map((room) => (
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
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Overall Schedule Grid */}
      <Card>
        <CardHeader>
          <CardTitle>주간 스케줄 ({filteredSchedules.length}개 수업)</CardTitle>
          <CardDescription>
            전체 교실의 통합 스케줄 · 교실별 색상 코딩
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            {(() => {
              const CELL_HEIGHT = 50
              const dayKeys = Object.keys(dayOfWeekMap)

              // 시간이 겹치는 스케줄들에 column 할당 (greedy 알고리즘)
              const assignColumns = (daySchedules: typeof filteredSchedules) => {
                if (daySchedules.length === 0) return { columns: new Map<string, number>(), maxColumns: 1 }

                // 시작시간 순 정렬
                const sorted = [...daySchedules].sort((a, b) => {
                  const aStart = timeSlots.indexOf(a.start_time.substring(0, 5))
                  const bStart = timeSlots.indexOf(b.start_time.substring(0, 5))
                  return aStart - bStart
                })

                const columns = new Map<string, number>()
                const columnEndTimes: number[] = [] // 각 column의 끝 시간 인덱스

                for (const schedule of sorted) {
                  const startIdx = timeSlots.indexOf(schedule.start_time.substring(0, 5))
                  let endIdx = timeSlots.indexOf(schedule.end_time.substring(0, 5))
                  if (endIdx === -1) endIdx = timeSlots.length

                  // 사용 가능한 가장 왼쪽 column 찾기
                  let col = 0
                  while (col < columnEndTimes.length && columnEndTimes[col] > startIdx) {
                    col++
                  }

                  columns.set(schedule.id, col)
                  columnEndTimes[col] = endIdx
                }

                return { columns, maxColumns: Math.max(1, columnEndTimes.length) }
              }

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
                  {dayKeys.map(dayKey => {
                    const day = dayOfWeekMap[dayKey as keyof typeof dayOfWeekMap]
                    const daySchedules = filteredSchedules.filter(s => s.day_of_week === dayKey)
                    const { columns, maxColumns } = assignColumns(daySchedules)

                    return (
                      <div key={dayKey} className="border-l" style={{ width: `${maxColumns * 83}px`, flexShrink: 0 }}>
                        {/* 요일 헤더 */}
                        <div className="h-10 p-2 text-center font-medium text-sm">
                          {day.label}
                        </div>

                        {/* 스케줄 영역 - position relative 컨테이너 */}
                        <div
                          className="relative"
                          style={{ height: `${timeSlots.length * CELL_HEIGHT}px` }}
                        >
                          {/* 시간 그리드 라인 (배경) */}
                          {timeSlots.map((time, idx) => (
                            <div
                              key={time}
                              className="absolute w-full border-t"
                              style={{ top: `${idx * CELL_HEIGHT}px`, height: `${CELL_HEIGHT}px` }}
                            />
                          ))}

                          {/* 스케줄 카드들 - absolute 배치 */}
                          {daySchedules.map(schedule => {
                            const startTime = schedule.start_time.substring(0, 5)
                            const endTime = schedule.end_time.substring(0, 5)
                            const startIdx = timeSlots.indexOf(startTime)
                            let endIdx = timeSlots.indexOf(endTime)

                            // 시작시간이 타임슬롯에 없으면 렌더링 안함
                            if (startIdx === -1) return null
                            // 끝시간이 타임슬롯에 없으면 마지막까지
                            if (endIdx === -1) endIdx = timeSlots.length

                            const top = startIdx * CELL_HEIGHT
                            const height = Math.max(1, endIdx - startIdx) * CELL_HEIGHT

                            // column 기반 위치 계산
                            const col = columns.get(schedule.id) ?? 0
                            const widthPercent = 100 / maxColumns
                            const leftPercent = col * widthPercent

                            const roomName = schedule.rooms?.name || '미지정'
                            const className = schedule.classes?.name || '미지정'
                            const teacherName = schedule.teacher?.name || ''

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
                              >
                                <div className={cn(
                                  "h-full p-2 rounded flex flex-col justify-center overflow-hidden",
                                  getRoomColor(roomName).bg,
                                  getRoomColor(roomName).border
                                )}>
                                  <div className={cn("font-bold text-sm leading-tight", getRoomColor(roomName).text)}>
                                    {roomName}
                                  </div>
                                  <div className={cn("text-xs leading-tight", getRoomColor(roomName).text)}>
                                    {teacherName}
                                  </div>
                                  <div className="text-muted-foreground text-xs leading-tight truncate">
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
              )
            })()}
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
            {rooms.map((room) => (
              <div key={room.id} className="flex items-center gap-2">
                <div
                  className={cn(
                    "w-4 h-4 rounded border-2",
                    getRoomColor(room.name).bg,
                    getRoomColor(room.name).border
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
