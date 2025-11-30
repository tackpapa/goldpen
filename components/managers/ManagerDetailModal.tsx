'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { User, DollarSign, History, RefreshCw } from 'lucide-react'
import { BasicInfoTab } from './BasicInfoTab'
import { SalaryTab } from './SalaryTab'
import { ActivityTab } from './ActivityTab'
import { useToast } from '@/hooks/use-toast'

export interface Manager {
  id: string
  org_id: string
  user_id: string
  name: string
  email: string
  phone: string
  status: 'active' | 'inactive'
  employment_type: 'full_time' | 'part_time' | 'contract'
  salary_type: 'monthly' | 'hourly'
  salary_amount: number
  payment_day: number | null
  hire_date: string
  notes: string | null
  created_at: string
  updated_at: string
}

interface ManagerDetailModalProps {
  manager: Manager | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: (manager: Manager) => void
  institutionName: string
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

export function ManagerDetailModal({
  manager,
  open,
  onOpenChange,
  onUpdate,
  institutionName,
}: ManagerDetailModalProps) {
  const [activeTab, setActiveTab] = useState('info')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const hasManager = Boolean(manager)

  const safeManager: Manager = hasManager
    ? manager!
    : {
        id: '',
        org_id: '',
        user_id: '',
        name: '',
        email: '',
        phone: '',
        status: 'inactive',
        employment_type: 'full_time',
        salary_type: 'monthly',
        salary_amount: 0,
        payment_day: 25,
        hire_date: '',
        notes: null,
        created_at: '',
        updated_at: '',
      }

  const statusKey = normalizeStatus(safeManager.status)

  if (!hasManager) return null

  const handleUpdateBasic = async (updatedManager: Manager) => {
    try {
      setLoading(true)
      const payload = {
        name: updatedManager.name,
        phone: updatedManager.phone,
        status: updatedManager.status,
        email: updatedManager.email,
        employment_type: updatedManager.employment_type,
        salary_type: updatedManager.salary_type,
        salary_amount: updatedManager.salary_amount,
        payment_day: updatedManager.payment_day,
        hire_date: updatedManager.hire_date,
        notes: updatedManager.notes,
      }

      const response = await fetch(`/api/managers/${manager?.id}?orgSlug=${institutionName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = (await response.json()) as any
      if (!response.ok) throw new Error(result.error || '매니저 정보 업데이트 실패')

      toast({
        title: '저장 완료',
        description: '매니저 정보가 업데이트되었습니다.',
      })
      onUpdate?.(result.manager || updatedManager)
    } catch (err) {
      console.error('[ManagerDetailModal] update error', err)
      toast({
        title: '저장 실패',
        description: err instanceof Error ? err.message : '알 수 없는 오류',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    // 나중에 refetch 구현
    toast({
      title: '새로고침',
      description: '데이터를 새로고침했습니다.',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col top-[5vh] translate-y-0">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-2xl">{safeManager.name}</DialogTitle>
              <Badge variant={statusMap[statusKey].variant}>
                {statusMap[statusKey].label}
              </Badge>
              <button
                onClick={handleRefresh}
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
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">활동 이력</span>
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            {/* Tab 1: 기본 정보 */}
            <TabsContent value="info" className="mt-0">
              <BasicInfoTab manager={safeManager} onUpdate={handleUpdateBasic} />
            </TabsContent>

            {/* Tab 2: 급여 관리 */}
            <TabsContent value="salary" className="mt-0">
              <SalaryTab manager={safeManager} />
            </TabsContent>

            {/* Tab 3: 활동 이력 */}
            <TabsContent value="activity" className="mt-0">
              <ActivityTab manager={safeManager} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
