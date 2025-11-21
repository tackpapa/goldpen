'use client'

import { useState } from 'react'
import type { Student } from '@/lib/types/database'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { User, Calendar, CreditCard, History, ClipboardCheck, FileText, RefreshCw } from 'lucide-react'
import { BasicInfoTab } from './BasicInfoTab'
import { AttendanceScheduleTab } from './AttendanceScheduleTab'
import { PaymentTab } from './PaymentTab'
import { PaymentHistoryTab } from './PaymentHistoryTab'
import { ClassCreditsTab } from './ClassCreditsTab'
import { StudyRoomTab } from './StudyRoomTab'
import { AttendanceHistoryTab } from './AttendanceHistoryTab'
import { StudentFilesTab } from './StudentFilesTab'
import { useStudentModalData } from '@/hooks/use-student-modal-data'

interface StudentDetailModalProps {
  student: Student | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: (student: Student) => void
}

export function StudentDetailModal({
  student,
  open,
  onOpenChange,
  onUpdate,
}: StudentDetailModalProps) {
  const [activeTab, setActiveTab] = useState('info')

  // Fetch all modal data when modal is open
  const { data: modalData, loading, refetch } = useStudentModalData(
    open && student ? student.id : null
  )

  // 결제 완료 후 데이터 리프레시 및 결제내역 탭으로 이동
  const handlePaymentComplete = () => {
    refetch()
    setActiveTab('payment-history')
  }

  // API에서 가져온 최신 학생 데이터 또는 prop으로 받은 데이터 사용
  const currentStudent = modalData?.student || student

  if (!student) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col fixed top-[5vh] translate-y-0">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-2xl">{currentStudent.name}</DialogTitle>
              <Badge variant={currentStudent.status === 'active' ? 'default' : 'secondary'}>
                {currentStudent.status === 'active' ? '재학' : currentStudent.status === 'graduated' ? '졸업' : '휴학'}
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
          <TabsList className="grid grid-cols-8 w-full">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">기본 정보</span>
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">학생 자료</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">출근 스케줄</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">출결 내역</span>
            </TabsTrigger>
            <TabsTrigger value="payment" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="hidden sm:inline">결제 관리</span>
            </TabsTrigger>
            <TabsTrigger value="payment-history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">결제 내역</span>
            </TabsTrigger>
            <TabsTrigger value="class-credits" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">수업 크레딧</span>
            </TabsTrigger>
            <TabsTrigger value="study-room" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">독서실 이용</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            {/* Tab 1: 기본 정보 */}
            <TabsContent value="info" className="mt-0">
              <BasicInfoTab
                student={currentStudent}
                onUpdate={onUpdate}
                services={modalData?.services}
                enrollments={modalData?.enrollments}
                loading={loading}
                onRefresh={refetch}
              />
            </TabsContent>

            {/* Tab 2: 학생 자료 */}
            <TabsContent value="files" className="mt-0">
              <StudentFilesTab student={currentStudent} onUpdate={onUpdate} onRefresh={refetch} />
            </TabsContent>

            {/* Tab 3: 출근 스케줄 */}
            <TabsContent value="schedule" className="mt-0">
              <AttendanceScheduleTab
                student={currentStudent}
                schedules={modalData?.schedules}
                loading={loading}
                onRefresh={refetch}
              />
            </TabsContent>

            {/* Tab 4: 출결 내역 */}
            <TabsContent value="attendance" className="mt-0">
              <AttendanceHistoryTab
                student={currentStudent}
                attendance={modalData?.attendance}
                loading={loading}
              />
            </TabsContent>

            {/* Tab 5: 결제 */}
            <TabsContent value="payment" className="mt-0">
              <PaymentTab
                student={currentStudent}
                subscriptions={modalData?.subscriptions}
                activeSubscription={modalData?.activeSubscription}
                loading={loading}
                onPaymentComplete={handlePaymentComplete}
              />
            </TabsContent>

            {/* Tab 6: 결제 내역 */}
            <TabsContent value="payment-history" className="mt-0">
              <PaymentHistoryTab
                student={currentStudent}
                payments={modalData?.payments}
                loading={loading}
              />
            </TabsContent>

            {/* Tab 7: 수업 크레딧 */}
            <TabsContent value="class-credits" className="mt-0">
              <ClassCreditsTab
                student={currentStudent}
                credits={modalData?.credits}
                creditUsages={modalData?.creditUsages}
                loading={loading}
              />
            </TabsContent>

            {/* Tab 8: 독서실 이용 */}
            <TabsContent value="study-room" className="mt-0">
              <StudyRoomTab
                student={currentStudent}
                passes={modalData?.passes}
                activePass={modalData?.activePass}
                usages={modalData?.usages}
                loading={loading}
              />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
