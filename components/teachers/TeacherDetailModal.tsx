'use client'

import type { Teacher } from '@/lib/types/database'
import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { User, Users, Calendar, DollarSign, History, RefreshCw } from 'lucide-react'
import { BasicInfoTab } from './BasicInfoTab'
import { AssignedStudentsTab } from './AssignedStudentsTab'
import { ScheduleTab } from './ScheduleTab'
import { SalaryTab } from './SalaryTab'
import { ClassHistoryTab } from './ClassHistoryTab'
import { useTeacherModalData } from '@/hooks/use-teacher-modal-data'
import { useToast } from '@/hooks/use-toast'

interface TeacherDetailModalProps {
  teacher: Teacher | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: (teacher: Teacher) => void
  students?: Array<{
    id: string
    name: string
    grade?: string | null
    school?: string | null
    status?: string | null
  }>
  classes?: Array<{
    id: string
    name?: string
    subject?: string
    student_count?: number
    day_of_week?: string | null
    start_time?: string | null
    end_time?: string | null
  }>
}

const statusMap = {
  active: { label: '재직', variant: 'default' as const },
  inactive: { label: '휴직', variant: 'secondary' as const },
  unknown: { label: '미정', variant: 'secondary' as const },
}

const normalizeStatus = (status?: string): keyof typeof statusMap => {
  if (!status) return 'unknown'
  const s = status.toString().trim().toLowerCase()
  if (s === 'inactive' || s === '휴직' || s === 'leave' || s === '휴무') return 'inactive'
  if (s === 'active' || s === '재직') return 'active'
  return 'unknown'
}

export function TeacherDetailModal({
  teacher,
  open,
  onOpenChange,
  onUpdate,
  students,
  classes,
}: TeacherDetailModalProps) {
  const [activeTab, setActiveTab] = useState('info')
  const { data: modalData, loading, refetch } = useTeacherModalData(open ? teacher.id : null)
  const { toast } = useToast()

  const hasTeacher = Boolean(teacher)

  const safeTeacher = hasTeacher
    ? teacher
    : ({
        id: '',
        created_at: '',
        updated_at: '',
        org_id: '',
        name: '',
        email: '',
        phone: '',
        subjects: [],
        status: 'inactive',
        employment_type: 'full_time',
        salary_type: 'monthly',
        salary_amount: 0,
        hire_date: '',
        assigned_students: [],
      } as Teacher)

  const currentTeacher = modalData?.teacher || safeTeacher

  const statusKey = normalizeStatus(currentTeacher.status)
  // subjects may come as string, array, or be undefined; normalize to safe list
  const subjectList = Array.isArray(currentTeacher.subjects)
    ? currentTeacher.subjects.filter((s): s is string => Boolean(s))
    : typeof currentTeacher.subjects === 'string'
      ? currentTeacher.subjects
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []

  if (!hasTeacher) return null

  const handleUpdateBasic = async (updatedTeacher: Teacher) => {
    try {
      const payload: any = {
        name: updatedTeacher.name,
        phone: updatedTeacher.phone,
        status: updatedTeacher.status,
        email: updatedTeacher.email,
        subjects: updatedTeacher.subjects ?? [],
        employment_type: updatedTeacher.employment_type,
        salary_type: updatedTeacher.salary_type,
        salary_amount: updatedTeacher.salary_amount,
        hire_date: updatedTeacher.hire_date,
        payment_day: updatedTeacher.payment_day,
        notes: updatedTeacher.notes,
      }

      const response = await fetch(`/api/teachers/${teacher.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || '강사 정보 업데이트 실패')
      // toast 제거: 부모 컴포넌트의 onUpdate에서 처리
      await refetch()
      onUpdate?.(result.teacher || updatedTeacher)
    } catch (err) {
      console.error('[TeacherDetailModal] update error', err)
      toast({
        title: '저장 실패',
        description: err instanceof Error ? err.message : '알 수 없는 오류',
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col top-[5vh] translate-y-0">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-2xl">{currentTeacher.name}</DialogTitle>
              <Badge variant={statusMap[statusKey].variant}>
                {statusMap[statusKey].label}
              </Badge>
              <button
                onClick={() => refetch()}
                disabled={loading}
                className="p-1.5 rounded-md hover:bg-muted transition-colors disabled:opacity-50"
                title="새로고침"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">기본 정보</span>
            </TabsTrigger>
            <TabsTrigger value="salary" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">급여 관리</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">수업 이력</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            {/* Tab 1: 기본 정보 */}
            <TabsContent value="info" className="mt-0">
              <BasicInfoTab teacher={currentTeacher} onUpdate={handleUpdateBasic} />
            </TabsContent>

            {/* Tab 2: 급여 관리 */}
            <TabsContent value="salary" className="mt-0">
              <SalaryTab teacher={currentTeacher} />
            </TabsContent>

            {/* Tab 3: 수업 이력 */}
            <TabsContent value="history" className="mt-0">
              <ClassHistoryTab teacher={currentTeacher} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
