'use client'

import { useState, useEffect } from 'react'
import type { Student, AttendanceSchedule } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AttendanceScheduleTabProps {
  student: Student
  schedules?: any[]
  loading?: boolean
  onRefresh?: () => void
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

export function AttendanceScheduleTab({
  student,
  schedules: initialSchedules = [],
  loading = false,
  onRefresh
}: AttendanceScheduleTabProps) {
  const { toast } = useToast()
  const [schedules, setSchedules] = useState<AttendanceSchedule[]>([])
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (initialSchedules && initialSchedules.length > 0) {
      setSchedules(initialSchedules)
    }
  }, [initialSchedules])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const handleTimeChange = (
    day: typeof DAYS[number]['value'],
    field: 'start_time' | 'end_time',
    value: string
  ) => {
    const existingIndex = schedules.findIndex((s) => s.day_of_week === day)
    const optimistic = [...schedules]

    if (existingIndex >= 0) {
      optimistic[existingIndex] = {
        ...optimistic[existingIndex],
        [field]: value,
        updated_at: new Date().toISOString(),
      }
    } else {
      optimistic.push({
        id: `temp-${Date.now()}-${day}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        student_id: student.id,
        day_of_week: day,
        start_time: field === 'start_time' ? value : '',
        end_time: field === 'end_time' ? value : '',
      })
    }

    setSchedules(optimistic)
    void persistSchedule(day, {
      start_time: field === 'start_time' ? value : (getScheduleForDay(day)?.start_time ?? undefined),
      end_time: field === 'end_time' ? value : (getScheduleForDay(day)?.end_time ?? undefined),
    })
  }

  const handleRemoveSchedule = (day: typeof DAYS[number]['value']) => {
    setSchedules(schedules.filter(s => s.day_of_week !== day))
    void deleteSchedule(day)
  }

  const getScheduleForDay = (day: typeof DAYS[number]['value']) => {
    return schedules.find(s => s.day_of_week === day)
  }

  const asTime = (value?: string) => (value ? value.slice(0, 5) : '')

  const persistSchedule = async (
    day: typeof DAYS[number]['value'],
    times: { start_time?: string; end_time?: string }
  ) => {
    try {
      setSaving(day)
      const res = await fetch(`/api/students/${student.id}/commute-schedules`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekday: day,
          check_in_time: times.start_time ?? null,
          check_out_time: times.end_time ?? null,
        }),
        credentials: 'include',
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { schedule } = await res.json() as { schedule: AttendanceSchedule }
      setSchedules((prev) => {
        const others = prev.filter((s) => s.day_of_week !== day)
        return [...others, schedule].sort((a,b)=> DAYS.findIndex(d=>d.value===a.day_of_week) - DAYS.findIndex(d=>d.value===b.day_of_week))
      })
      toast({ title: '저장 완료', description: `${DAYS.find(d=>d.value===day)?.label}요일 스케줄을 저장했습니다.` })
      onRefresh?.()
    } catch (error: any) {
      console.error('[schedule] save', error)
      toast({ title: '저장 실패', description: '스케줄 저장에 실패했습니다.', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }

  const deleteSchedule = async (day: typeof DAYS[number]['value']) => {
    try {
      setSaving(day)
      const res = await fetch(`/api/students/${student.id}/commute-schedules?weekday=${day}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast({
        title: '삭제 완료',
        description: `${DAYS.find(d => d.value === day)?.label}요일 스케줄이 삭제되었습니다.`,
      })
      onRefresh?.()
    } catch (error: any) {
      console.error('[schedule] delete', error)
      toast({ title: '삭제 실패', description: '스케줄 삭제에 실패했습니다.', variant: 'destructive' })
    } finally {
      setSaving(null)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>등하원 일정</CardTitle>
        <CardDescription>요일별 등원/하원 시간을 설정하세요</CardDescription>
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
                  value={asTime(schedule?.start_time)}
                  onChange={(e) => handleTimeChange(value, 'start_time', e.target.value)}
                  placeholder="시작 시간"
                  disabled={!!saving}
                />
              </div>

              <div>
                <Input
                  type="time"
                  value={asTime(schedule?.end_time)}
                  onChange={(e) => handleTimeChange(value, 'end_time', e.target.value)}
                  placeholder="종료 시간"
                  disabled={!!saving}
                />
              </div>

              <div>
                {schedule && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSchedule(value)}
                    disabled={saving === value}
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
