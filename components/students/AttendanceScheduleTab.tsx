'use client'

import { useState, useEffect } from 'react'
import type { Student, AttendanceSchedule } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X, Plus } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AttendanceScheduleTabProps {
  student: Student
}

const DAYS = [
  { value: 'monday', label: '월' },
  { value: 'tuesday', label: '화' },
  { value: 'wednesday', label: '수' },
  { value: 'thursday', label: '목' },
  { value: 'friday', label: '금' },
  { value: 'saturday', label: '토' },
  { value: 'sunday', label: '일' },
] as const

export function AttendanceScheduleTab({ student }: AttendanceScheduleTabProps) {
  const { toast } = useToast()
  const [schedules, setSchedules] = useState<AttendanceSchedule[]>([])

  useEffect(() => {
    // Load schedules from localStorage
    const stored = localStorage.getItem('attendance_schedules')
    if (stored) {
      try {
        const all = JSON.parse(stored) as AttendanceSchedule[]
        setSchedules(all.filter(s => s.student_id === student.id))
      } catch (error) {
        console.error('Failed to load attendance schedules:', error)
      }
    }
  }, [student.id])

  const handleTimeChange = (
    day: typeof DAYS[number]['value'],
    field: 'start_time' | 'end_time',
    value: string
  ) => {
    const stored = localStorage.getItem('attendance_schedules')
    let allSchedules: AttendanceSchedule[] = stored ? JSON.parse(stored) : []

    const existingIndex = allSchedules.findIndex(
      s => s.student_id === student.id && s.day_of_week === day
    )

    if (existingIndex >= 0) {
      // Update existing
      allSchedules[existingIndex] = {
        ...allSchedules[existingIndex],
        [field]: value,
        updated_at: new Date().toISOString(),
      }
    } else {
      // Create new
      const newSchedule: AttendanceSchedule = {
        id: `schedule-${Date.now()}-${day}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        student_id: student.id,
        day_of_week: day,
        start_time: field === 'start_time' ? value : '',
        end_time: field === 'end_time' ? value : '',
      }
      allSchedules.push(newSchedule)
    }

    localStorage.setItem('attendance_schedules', JSON.stringify(allSchedules))
    setSchedules(allSchedules.filter(s => s.student_id === student.id))
  }

  const handleRemoveSchedule = (day: typeof DAYS[number]['value']) => {
    const stored = localStorage.getItem('attendance_schedules')
    if (!stored) return

    let allSchedules: AttendanceSchedule[] = JSON.parse(stored)
    allSchedules = allSchedules.filter(
      s => !(s.student_id === student.id && s.day_of_week === day)
    )

    localStorage.setItem('attendance_schedules', JSON.stringify(allSchedules))
    setSchedules(allSchedules.filter(s => s.student_id === student.id))

    toast({
      title: '삭제 완료',
      description: `${DAYS.find(d => d.value === day)?.label}요일 스케줄이 삭제되었습니다.`,
    })
  }

  const getScheduleForDay = (day: typeof DAYS[number]['value']) => {
    return schedules.find(s => s.day_of_week === day)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>출근 스케줄</CardTitle>
        <CardDescription>요일별 출근 시간을 설정하세요</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {DAYS.map(({ value, label }) => {
          const schedule = getScheduleForDay(value)

          return (
            <div key={value} className="grid grid-cols-[60px_1fr_1fr_40px] gap-3 items-center">
              <Label className="font-medium">{label}요일</Label>

              <div>
                <Input
                  type="time"
                  value={schedule?.start_time || ''}
                  onChange={(e) => handleTimeChange(value, 'start_time', e.target.value)}
                  placeholder="시작 시간"
                />
              </div>

              <div>
                <Input
                  type="time"
                  value={schedule?.end_time || ''}
                  onChange={(e) => handleTimeChange(value, 'end_time', e.target.value)}
                  placeholder="종료 시간"
                />
              </div>

              <div>
                {schedule && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSchedule(value)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )
        })}

        <div className="pt-4 text-sm text-muted-foreground">
          {schedules.length > 0 ? (
            <p>총 {schedules.length}일 스케줄이 등록되어 있습니다.</p>
          ) : (
            <p>등록된 출근 스케줄이 없습니다.</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
