'use client'

import type { Teacher } from '@/lib/types/database'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { User, Users, Calendar, DollarSign, History } from 'lucide-react'
import { BasicInfoTab } from './BasicInfoTab'
import { AssignedStudentsTab } from './AssignedStudentsTab'
import { ScheduleTab } from './ScheduleTab'
import { SalaryTab } from './SalaryTab'
import { ClassHistoryTab } from './ClassHistoryTab'

interface TeacherDetailModalProps {
  teacher: Teacher | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: (teacher: Teacher) => void
}

const statusMap = {
  active: { label: '재직', variant: 'default' as const },
  inactive: { label: '휴직', variant: 'secondary' as const },
}

export function TeacherDetailModal({
  teacher,
  open,
  onOpenChange,
  onUpdate,
}: TeacherDetailModalProps) {
  if (!teacher) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-2xl">{teacher.name}</DialogTitle>
              <Badge variant={statusMap[teacher.status].variant}>
                {statusMap[teacher.status].label}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              {teacher.subjects.join(', ')}
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="info" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">기본 정보</span>
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">배정 학생</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">수업 스케줄</span>
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
              <BasicInfoTab teacher={teacher} onUpdate={onUpdate} />
            </TabsContent>

            {/* Tab 2: 배정 학생 */}
            <TabsContent value="students" className="mt-0">
              <AssignedStudentsTab teacher={teacher} />
            </TabsContent>

            {/* Tab 3: 수업 스케줄 */}
            <TabsContent value="schedule" className="mt-0">
              <ScheduleTab teacher={teacher} />
            </TabsContent>

            {/* Tab 4: 급여 관리 */}
            <TabsContent value="salary" className="mt-0">
              <SalaryTab teacher={teacher} />
            </TabsContent>

            {/* Tab 5: 수업 이력 */}
            <TabsContent value="history" className="mt-0">
              <ClassHistoryTab teacher={teacher} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
