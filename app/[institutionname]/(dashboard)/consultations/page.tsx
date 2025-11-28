'use client'

export const runtime = 'edge'


// Consultations page with waitlist feature
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { ColumnDef } from '@tanstack/react-table'
import { usePageAccess } from '@/hooks/use-page-access'
import { useConsultations } from '@/lib/swr'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { PageSkeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Calendar, Eye, MoreHorizontal, Phone, Mail, Plus, X, Upload, Image as ImageIcon, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Consultation } from '@/lib/types/database'
import { format } from 'date-fns'

// Waitlist type
interface Waitlist {
  id: string
  name: string
  consultationIds: string[]
}

// Branch type
interface Branch {
  id: string
  name: string
  status: 'active' | 'inactive'
}

// Grade options (학생 등록 모달과 동일)
const gradeOptions = [
  { value: '초1', label: '초1' },
  { value: '초2', label: '초2' },
  { value: '초3', label: '초3' },
  { value: '초4', label: '초4' },
  { value: '초5', label: '초5' },
  { value: '초6', label: '초6' },
  { value: '중1', label: '중1' },
  { value: '중2', label: '중2' },
  { value: '중3', label: '중3' },
  { value: '고1', label: '고1' },
  { value: '고2', label: '고2' },
  { value: '고3', label: '고3' },
  { value: '재수', label: '재수' },
  { value: '삼수', label: '삼수' },
  { value: '사수', label: '사수' },
  { value: 'N수', label: 'N수' },
]

export default function ConsultationsPage() {
  usePageAccess('consultations')
  const params = useParams()
  const institutionName = params.institutionname as string

  const { toast } = useToast()

  // SWR 훅으로 데이터 페칭
  const { consultations: consultationsData, isLoading: consultationsLoading, refresh: refreshConsultations } = useConsultations()

  // 로컬 상태 (수정 시 사용)
  const [localConsultations, setLocalConsultations] = useState<Consultation[] | null>(null)

  // 실제 사용할 데이터
  const consultations = localConsultations ?? consultationsData
  const isLoading = consultationsLoading

  // 로컬 상태 업데이트 함수
  const setConsultations = (updater: Consultation[] | ((prev: Consultation[]) => Consultation[])) => {
    if (typeof updater === 'function') {
      setLocalConsultations(prev => updater(prev ?? consultationsData))
    } else {
      setLocalConsultations(updater)
    }
  }

  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  const [newConsultation, setNewConsultation] = useState({
    student_name: '',
    student_grade: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    goals: '',
    preferred_times: '',
    notes: '',
    images: [] as string[],
  })

  // Waitlist states
  const [waitlists, setWaitlists] = useState<Waitlist[]>([])
  const [isNewWaitlistDialogOpen, setIsNewWaitlistDialogOpen] = useState(false)

  // Branch states
  const [branches, setBranches] = useState<Branch[]>([])

  // 페이지 로드 시 waitlists 가져오기
  useEffect(() => {
    const fetchWaitlists = async () => {
      try {
        const res = await fetch('/api/waitlists', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json() as { waitlists: Waitlist[] }
          setWaitlists(data.waitlists || [])
        }
      } catch (error) {
        console.error('Failed to fetch waitlists:', error)
      }
    }
    fetchWaitlists()
  }, [])

  // 페이지 로드 시 branches 가져오기
  useEffect(() => {
    const fetchBranches = async () => {
      if (!institutionName) return
      try {
        const res = await fetch(`/${institutionName}/settings/branches`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json() as { branches: Branch[] }
          setBranches(data.branches || [])
        }
      } catch (error) {
        console.error('Failed to fetch branches:', error)
      }
    }
    fetchBranches()
  }, [institutionName])
  const [isAddToWaitlistDialogOpen, setIsAddToWaitlistDialogOpen] = useState(false)
  const [selectedConsultationForWaitlist, setSelectedConsultationForWaitlist] = useState<Consultation | null>(null)
  const [selectedWaitlistId, setSelectedWaitlistId] = useState<string>('')
  const [newWaitlistName, setNewWaitlistName] = useState('')

  // Enrollment confirmation modal states
  const [isEnrollmentDialogOpen, setIsEnrollmentDialogOpen] = useState(false)
  const [consultationToEnroll, setConsultationToEnroll] = useState<Consultation | null>(null)
  const [enrollmentForm, setEnrollmentForm] = useState({
    name: '',
    student_code: '',
    branch_name: '본점',
    affiliation: '' as '' | 'academy' | 'study_room' | 'reading_room',
    grade: '',
    school: '',
    phone: '',
    email: '',
    address: '',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
  })

  // 출결코드 자동 생성
  const generateStudentCode = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString()
    setEnrollmentForm({ ...enrollmentForm, student_code: code })
  }

  // consultationToEnroll 변경 시 폼 초기화
  useEffect(() => {
    if (consultationToEnroll) {
      // 지점이 있으면 첫 번째 지점 선택, 없으면 "본점" 기본값
      const activeBranches = branches.filter(b => b.status === 'active')
      const defaultBranch = activeBranches.length > 0 ? activeBranches[0].name : '본점'
      setEnrollmentForm({
        name: consultationToEnroll.student_name || '',
        student_code: '',
        branch_name: defaultBranch,
        affiliation: '' as '' | 'academy' | 'study_room' | 'reading_room',
        grade: consultationToEnroll.student_grade || '',
        school: '',
        phone: '',
        email: '',
        address: '',
        parent_name: consultationToEnroll.parent_name || '',
        parent_phone: consultationToEnroll.parent_phone || '',
        parent_email: consultationToEnroll.parent_email || '',
      })
    }
  }, [consultationToEnroll, branches])

  // 로딩 중일 때 스켈레톤 표시
  if (isLoading) {
    return <PageSkeleton />
  }

  const statusMap = {
    new: { label: '신규', variant: 'default' as const, color: 'bg-blue-100 text-blue-700' },
    scheduled: { label: '예정', variant: 'secondary' as const, color: 'bg-orange-100 text-orange-700' },
    enrolled: { label: '입교', variant: 'outline' as const, color: 'bg-green-100 text-green-700' },
    rejected: { label: '거절', variant: 'destructive' as const, color: 'bg-red-100 text-red-700' },
    on_hold: { label: '보류', variant: 'secondary' as const, color: 'bg-gray-100 text-gray-700' },
    waitlist: { label: '대기리스트', variant: 'secondary' as const, color: 'bg-purple-100 text-purple-700' },
  }

  const columns: ColumnDef<Consultation>[] = [
    {
      accessorKey: 'student_name',
      header: '학생 이름',
      cell: ({ row }) => {
        const consultation = row.original
        return (
          <button
            onClick={() => handleViewDetail(consultation)}
            className="text-primary hover:underline font-medium"
          >
            {consultation.student_name}
          </button>
        )
      },
    },
    {
      accessorKey: 'student_grade',
      header: '학년',
      cell: ({ row }) => {
        const grade = row.getValue('student_grade') as string
        return grade || '-'
      },
    },
    {
      accessorKey: 'parent_name',
      header: '학부모',
    },
    {
      accessorKey: 'parent_phone',
      header: '연락처',
      cell: ({ row }) => {
        const phone = row.getValue('parent_phone') as string
        return (
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{phone}</span>
          </div>
        )
      },
    },
    {
      accessorKey: 'scheduled_date',
      header: '상담 일시',
      cell: ({ row }) => {
        const date = row.getValue('scheduled_date') as string
        return date ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            <span className="text-sm">{format(new Date(date), 'yyyy-MM-dd HH:mm')}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">미정</span>
        )
      },
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => {
        const consultation = row.original
        const status = consultation.status
        const statusInfo = statusMap[status] || statusMap.new
        return (
          <Select
            value={status}
            onValueChange={(value) => handleChangeStatus(consultation.id, value as Consultation['status'])}
          >
            <SelectTrigger className="w-[110px] h-8">
              <SelectValue>
                <span className={`px-2 py-1 rounded text-xs font-medium ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">
                <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                  신규
                </span>
              </SelectItem>
              <SelectItem value="scheduled">
                <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
                  예정
                </span>
              </SelectItem>
              <SelectItem value="enrolled">
                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                  입교
                </span>
              </SelectItem>
              <SelectItem value="rejected">
                <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                  거절
                </span>
              </SelectItem>
              <SelectItem value="on_hold">
                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                  보류
                </span>
              </SelectItem>
              <SelectItem value="waitlist">
                <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                  대기리스트
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        )
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const consultation = row.original
        return (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => handleDeleteConsultation(consultation)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )
      },
    },
  ]

  const handleDeleteConsultation = async (consultation: Consultation) => {
    if (!confirm(`상담 "${consultation.student_name}" 기록을 삭제할까요?`)) return

    // Optimistic: 즉시 UI 업데이트
    const previousConsultations = consultations
    setConsultations((prev) => prev.filter((c) => c.id !== consultation.id))
    toast({ title: '삭제 완료', description: '상담 기록이 삭제되었습니다.' })

    try {
      const res = await fetch(`/api/consultations/${consultation.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        // 롤백
        setConsultations(previousConsultations)
        const err = await res.json().catch(() => ({})) as { error?: string }
        toast({ title: '삭제 실패', description: err.error || '상담 삭제에 실패했습니다.', variant: 'destructive' })
      }
    } catch (error) {
      // 롤백
      setConsultations(previousConsultations)
      toast({ title: '삭제 실패', description: '서버와 통신할 수 없습니다.', variant: 'destructive' })
    }
  }

  const handleViewDetail = (consultation: Consultation) => {
    setSelectedConsultation(consultation)
    setIsDetailDialogOpen(true)
  }

  const handleChangeStatus = async (id: string, newStatus: Consultation['status']) => {
    // If changing to 'enrolled', show enrollment confirmation modal
    if (newStatus === 'enrolled') {
      const consultation = consultations.find(c => c.id === id)
      if (consultation) {
        setConsultationToEnroll(consultation)
        setIsEnrollmentDialogOpen(true)
      }
      return
    }

    // If changing to 'waitlist', show waitlist selection modal
    if (newStatus === 'waitlist') {
      const consultation = consultations.find(c => c.id === id)
      if (consultation) {
        setSelectedConsultationForWaitlist(consultation)
        setIsAddToWaitlistDialogOpen(true)
      }
      return
    }

    // Optimistic: 즉시 UI 업데이트
    const previousConsultations = consultations
    setConsultations(
      consultations.map((c) =>
        c.id === id ? { ...c, status: newStatus, updated_at: new Date().toISOString() } : c
      )
    )
    toast({
      title: '상태 변경 완료',
      description: `상담 상태가 ${statusMap[newStatus].label}(으)로 변경되었습니다.`,
    })

    try {
      const response = await fetch(`/api/consultations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        // 롤백
        setConsultations(previousConsultations)
        const error = await response.json() as { error?: string }
        toast({
          title: '상태 변경 실패',
          description: error.error || '상담 상태 변경에 실패했습니다.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      // 롤백
      setConsultations(previousConsultations)
      toast({
        title: '오류 발생',
        description: '서버와 통신할 수 없습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleConfirmEnrollment = async () => {
    if (!consultationToEnroll) return

    // 필수 필드 검증
    if (!enrollmentForm.name.trim()) {
      toast({ title: '입력 오류', description: '학생 이름은 필수입니다.', variant: 'destructive' })
      return
    }
    if (!enrollmentForm.affiliation) {
      toast({ title: '입력 오류', description: '소속을 선택해주세요.', variant: 'destructive' })
      return
    }
    if (!enrollmentForm.grade) {
      toast({ title: '입력 오류', description: '학년을 선택해주세요.', variant: 'destructive' })
      return
    }
    if (!enrollmentForm.school.trim()) {
      toast({ title: '입력 오류', description: '학교명은 필수입니다.', variant: 'destructive' })
      return
    }
    if (!enrollmentForm.parent_name.trim()) {
      toast({ title: '입력 오류', description: '학부모 이름은 필수입니다.', variant: 'destructive' })
      return
    }
    if (!enrollmentForm.parent_phone.trim()) {
      toast({ title: '입력 오류', description: '학부모 연락처는 필수입니다.', variant: 'destructive' })
      return
    }

    // Optimistic: 즉시 UI 업데이트
    const previousConsultations = consultations
    const previousWaitlists = waitlists

    setConsultations(
      consultations.map((c) =>
        c.id === consultationToEnroll.id
          ? { ...c, status: 'enrolled' as Consultation['status'], enrolled_date: new Date().toISOString(), updated_at: new Date().toISOString() }
          : c
      )
    )
    setWaitlists(
      waitlists.map((w) => ({
        ...w,
        consultationIds: w.consultationIds.filter(cId => cId !== consultationToEnroll.id)
      }))
    )
    setIsEnrollmentDialogOpen(false)
    setConsultationToEnroll(null)

    try {
      // 1. 학생 등록 API 호출
      const studentResponse = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: enrollmentForm.name.trim(),
          student_code: enrollmentForm.student_code || null,
          branch_name: enrollmentForm.branch_name || null,
          affiliation: enrollmentForm.affiliation,
          grade: enrollmentForm.grade,
          school: enrollmentForm.school.trim(),
          phone: enrollmentForm.phone || null,
          email: enrollmentForm.email || null,
          address: enrollmentForm.address || null,
          parent_name: enrollmentForm.parent_name.trim(),
          parent_phone: enrollmentForm.parent_phone.trim(),
          parent_email: enrollmentForm.parent_email || null,
          status: 'active',
          enrolled_date: new Date().toISOString().split('T')[0],
        }),
      })

      if (!studentResponse.ok) {
        const studentError = await studentResponse.json() as { error?: string }
        // 롤백
        setConsultations(previousConsultations)
        setWaitlists(previousWaitlists)
        toast({
          title: '학생 등록 실패',
          description: studentError.error || '학생 등록에 실패했습니다.',
          variant: 'destructive',
        })
        return
      }

      // 2. 상담 상태 변경
      const consultationResponse = await fetch(`/api/consultations/${consultationToEnroll.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: 'enrolled', enrolled_date: new Date().toISOString() }),
      })

      if (!consultationResponse.ok) {
        toast({
          title: '주의',
          description: '학생은 등록되었으나 상담 상태 변경에 실패했습니다.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: '✅ 학생 등록 완료',
          description: `${enrollmentForm.name} 학생이 입교 처리되었습니다.`,
        })
      }
    } catch (error) {
      // 롤백
      setConsultations(previousConsultations)
      setWaitlists(previousWaitlists)
      toast({
        title: '오류 발생',
        description: '서버와 통신할 수 없습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleSaveResult = async () => {
    if (!selectedConsultation) return

    // Optimistic: 즉시 UI 업데이트
    const previousConsultations = consultations
    setConsultations(
      consultations.map((c) =>
        c.id === selectedConsultation.id ? { ...selectedConsultation, updated_at: new Date().toISOString() } : c
      )
    )
    toast({
      title: '저장 완료',
      description: '상담 내용이 저장되었습니다.',
    })
    setIsDetailDialogOpen(false)

    try {
      const response = await fetch(`/api/consultations/${selectedConsultation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(selectedConsultation),
      })

      if (!response.ok) {
        // 롤백
        setConsultations(previousConsultations)
        const error = await response.json() as { error?: string }
        toast({
          title: '저장 실패',
          description: error.error || '상담 내용 저장에 실패했습니다.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      // 롤백
      setConsultations(previousConsultations)
      toast({
        title: '오류 발생',
        description: '서버와 통신할 수 없습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleCreateConsultation = async () => {
    if (!newConsultation.student_name || !newConsultation.parent_name || !newConsultation.parent_phone) {
      toast({
        title: '입력 오류',
        description: '필수 항목을 모두 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    // Optimistic: 임시 ID로 즉시 UI 업데이트
    const tempId = `temp-${Date.now()}`
    const tempConsultation: Consultation = {
      id: tempId,
      org_id: '',
      student_name: newConsultation.student_name,
      student_grade: newConsultation.student_grade || undefined,
      parent_name: newConsultation.parent_name,
      parent_phone: newConsultation.parent_phone,
      parent_email: newConsultation.parent_email || undefined,
      goals: newConsultation.goals || undefined,
      preferred_times: newConsultation.preferred_times || undefined,
      notes: newConsultation.notes || undefined,
      images: newConsultation.images.length > 0 ? newConsultation.images : [],
      status: 'new',
      scheduled_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as Consultation

    const previousConsultations = consultations
    setConsultations([tempConsultation, ...consultations])
    toast({
      title: '등록 완료',
      description: `${newConsultation.student_name} 학생의 상담이 등록되었습니다.`,
    })

    // Reset form and close dialog
    const savedForm = { ...newConsultation }
    setNewConsultation({
      student_name: '',
      student_grade: '',
      parent_name: '',
      parent_phone: '',
      parent_email: '',
      goals: '',
      preferred_times: '',
      notes: '',
      images: [],
    })
    setIsNewDialogOpen(false)

    try {
      const response = await fetch('/api/consultations', {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_name: savedForm.student_name,
          student_grade: savedForm.student_grade || undefined,
          parent_name: savedForm.parent_name,
          parent_phone: savedForm.parent_phone,
          parent_email: savedForm.parent_email || undefined,
          goals: savedForm.goals || undefined,
          preferred_times: savedForm.preferred_times || undefined,
          notes: savedForm.notes || undefined,
          images: savedForm.images.length > 0 ? savedForm.images : undefined,
          status: 'new',
          scheduled_date: new Date().toISOString(),
        }),
      })

      if (response.ok) {
        const result = await response.json() as { consultation: Consultation }
        // 임시 데이터를 실제 데이터로 교체
        setConsultations((prev) =>
          prev.map((c) => (c.id === tempId ? result.consultation : c))
        )
      } else {
        // 롤백
        setConsultations(previousConsultations)
        const error = await response.json() as { error?: string }
        toast({
          title: '등록 실패',
          description: error.error || '상담 등록에 실패했습니다.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      // 롤백
      setConsultations(previousConsultations)
      toast({
        title: '오류 발생',
        description: '서버와 통신할 수 없습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleCreateWaitlist = async () => {
    if (!newWaitlistName.trim()) {
      toast({
        title: '입력 오류',
        description: '대기리스트 이름을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    // Optimistic: 임시 ID로 즉시 UI 업데이트
    const tempId = `temp-${Date.now()}`
    const tempWaitlist: Waitlist = {
      id: tempId,
      name: newWaitlistName.trim(),
      consultationIds: [],
    }
    const savedName = newWaitlistName.trim()
    const previousWaitlists = waitlists

    setWaitlists([...waitlists, tempWaitlist])
    setNewWaitlistName('')
    setIsNewWaitlistDialogOpen(false)
    toast({
      title: '대기리스트 생성 완료',
      description: `${savedName} 대기리스트가 생성되었습니다.`,
    })

    try {
      const response = await fetch('/api/waitlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: savedName }),
      })

      if (response.ok) {
        const data = await response.json() as { waitlist: Waitlist }
        // 임시 데이터를 실제 데이터로 교체
        setWaitlists((prev) =>
          prev.map((w) => (w.id === tempId ? { ...data.waitlist, consultationIds: [] } : w))
        )
      } else {
        // 롤백
        setWaitlists(previousWaitlists)
        const error = await response.json() as { error?: string }
        toast({
          title: '생성 실패',
          description: error.error || '대기리스트 생성에 실패했습니다.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      // 롤백
      setWaitlists(previousWaitlists)
      toast({
        title: '오류 발생',
        description: '서버와 통신할 수 없습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleAddToWaitlist = async () => {
    if (!selectedConsultationForWaitlist || !selectedWaitlistId) {
      toast({
        title: '선택 오류',
        description: '대기리스트를 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    // Optimistic: 즉시 UI 업데이트
    const previousWaitlists = waitlists
    const previousConsultations = consultations
    const consultationId = selectedConsultationForWaitlist.id
    const waitlistId = selectedWaitlistId
    const studentName = selectedConsultationForWaitlist.student_name

    setWaitlists(
      waitlists.map((wl) =>
        wl.id === waitlistId
          ? { ...wl, consultationIds: [...wl.consultationIds, consultationId] }
          : wl
      )
    )
    setConsultations(
      consultations.map((c) =>
        c.id === consultationId
          ? { ...c, status: 'waitlist' as Consultation['status'], updated_at: new Date().toISOString() }
          : c
      )
    )
    toast({
      title: '대기리스트 추가 완료',
      description: `${studentName} 학생이 대기리스트에 추가되었습니다.`,
    })
    setIsAddToWaitlistDialogOpen(false)
    setSelectedConsultationForWaitlist(null)
    setSelectedWaitlistId('')

    try {
      const response = await fetch(`/api/waitlists/${waitlistId}/consultations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ consultation_id: consultationId }),
      })

      if (response.ok) {
        // Update consultation status to 'waitlist' in DB
        await fetch(`/api/consultations/${consultationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ status: 'waitlist' }),
        })
      } else {
        // 롤백
        setWaitlists(previousWaitlists)
        setConsultations(previousConsultations)
        const error = await response.json() as { error?: string }
        toast({
          title: '추가 실패',
          description: error.error || '대기리스트 추가에 실패했습니다.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      // 롤백
      setWaitlists(previousWaitlists)
      setConsultations(previousConsultations)
      toast({
        title: '오류 발생',
        description: '서버와 통신할 수 없습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleRemoveFromWaitlist = async (waitlistId: string, consultationId: string) => {
    // Optimistic: 즉시 UI 업데이트
    const previousWaitlists = waitlists
    setWaitlists(
      waitlists.map((wl) =>
        wl.id === waitlistId
          ? { ...wl, consultationIds: wl.consultationIds.filter((id) => id !== consultationId) }
          : wl
      )
    )
    toast({
      title: '대기리스트 제거',
      description: '대기리스트에서 제거되었습니다.',
    })

    try {
      const response = await fetch(`/api/waitlists/${waitlistId}/consultations`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ consultation_id: consultationId }),
      })

      if (!response.ok) {
        // 롤백
        setWaitlists(previousWaitlists)
        toast({
          title: '제거 실패',
          description: '대기리스트에서 제거에 실패했습니다.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      // 롤백
      setWaitlists(previousWaitlists)
      toast({
        title: '오류 발생',
        description: '서버와 통신할 수 없습니다.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteWaitlist = async (waitlistId: string) => {
    // Optimistic: 즉시 UI 업데이트
    const previousWaitlists = waitlists
    setWaitlists(waitlists.filter((wl) => wl.id !== waitlistId))
    toast({
      title: '대기리스트 삭제',
      description: '대기리스트가 삭제되었습니다.',
    })

    try {
      const response = await fetch(`/api/waitlists/${waitlistId}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        // 롤백
        setWaitlists(previousWaitlists)
        toast({
          title: '삭제 실패',
          description: '대기리스트 삭제에 실패했습니다.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      // 롤백
      setWaitlists(previousWaitlists)
      toast({
        title: '오류 발생',
        description: '서버와 통신할 수 없습니다.',
        variant: 'destructive',
      })
    }
  }

  const filteredConsultations =
    activeTab === 'all'
      ? consultations.filter((c) => c.status !== 'enrolled') // Exclude enrolled from main list
      : consultations.filter((c) => c.status === activeTab)

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">상담 관리</h1>
          <p className="text-sm md:text-base text-muted-foreground">상담 요청을 관리하세요</p>
        </div>
        <Button onClick={() => setIsNewDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          신규 상담 등록
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-1">
          <TabsTrigger value="all">
            전체 ({consultations.filter((c) => c.status !== 'enrolled').length})
          </TabsTrigger>
          <TabsTrigger value="new">
            신규 ({consultations.filter((c) => c.status === 'new').length})
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            예정 ({consultations.filter((c) => c.status === 'scheduled').length})
          </TabsTrigger>
          <TabsTrigger value="enrolled">
            입교 ({consultations.filter((c) => c.status === 'enrolled').length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            거절 ({consultations.filter((c) => c.status === 'rejected').length})
          </TabsTrigger>
          <TabsTrigger value="on_hold">
            보류 ({consultations.filter((c) => c.status === 'on_hold').length})
          </TabsTrigger>
          <TabsTrigger value="waitlist">
            대기리스트 ({consultations.filter((c) => c.status === 'waitlist').length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <DataTable
                columns={columns}
                data={filteredConsultations}
                searchKey="student_name"
                searchPlaceholder="학생 이름으로 검색..."
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* New Consultation Dialog */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>신규 상담 등록</DialogTitle>
            <DialogDescription>새로운 상담을 등록합니다</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Student Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  학생 이름 <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="학생 이름을 입력하세요"
                  value={newConsultation.student_name}
                  onChange={(e) =>
                    setNewConsultation({ ...newConsultation, student_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>학년</Label>
                <Select
                  value={newConsultation.student_grade}
                  onValueChange={(value) =>
                    setNewConsultation({ ...newConsultation, student_grade: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="학년 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map((grade) => (
                      <SelectItem key={grade.value} value={grade.value}>
                        {grade.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Parent Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  학부모 이름 <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="학부모 이름을 입력하세요"
                  value={newConsultation.parent_name}
                  onChange={(e) =>
                    setNewConsultation({ ...newConsultation, parent_name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>
                  연락처 <span className="text-red-500">*</span>
                </Label>
                <Input
                  placeholder="010-1234-5678"
                  value={newConsultation.parent_phone}
                  onChange={(e) =>
                    setNewConsultation({ ...newConsultation, parent_phone: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>이메일</Label>
              <Input
                type="email"
                placeholder="parent@example.com"
                value={newConsultation.parent_email}
                onChange={(e) =>
                  setNewConsultation({ ...newConsultation, parent_email: e.target.value })
                }
              />
            </div>

            {/* Goals */}
            <div className="space-y-2">
              <Label>학습 목표</Label>
              <Textarea
                placeholder="학습 목표를 입력하세요 (예: 수학 성적 향상, 영어 회화 실력 향상 등)"
                value={newConsultation.goals}
                onChange={(e) =>
                  setNewConsultation({ ...newConsultation, goals: e.target.value })
                }
                rows={3}
              />
            </div>

            {/* Preferred Times */}
            <div className="space-y-2">
              <Label>희망 상담 시간</Label>
              <Input
                placeholder="예: 평일 오후 2-4시, 주말 오전"
                value={newConsultation.preferred_times}
                onChange={(e) =>
                  setNewConsultation({ ...newConsultation, preferred_times: e.target.value })
                }
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                placeholder="추가 메모 사항을 입력하세요"
                value={newConsultation.notes}
                onChange={(e) =>
                  setNewConsultation({ ...newConsultation, notes: e.target.value })
                }
                rows={3}
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <Label>이미지 첨부</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    id="consultation-image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      files.forEach((file) => {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                          setNewConsultation((prev) => ({
                            ...prev,
                            images: [...prev.images, reader.result as string],
                          }))
                        }
                        reader.readAsDataURL(file)
                      })
                      e.target.value = '' // Reset input
                    }}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('consultation-image-upload')?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    이미지 추가
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {newConsultation.images.length}개 첨부됨
                  </span>
                </div>

                {/* Image Preview */}
                {newConsultation.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {newConsultation.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Preview ${idx + 1}`}
                          className="h-24 w-full object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setNewConsultation((prev) => ({
                              ...prev,
                              images: prev.images.filter((_, i) => i !== idx),
                            }))
                          }}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreateConsultation}>등록</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>상담 상세</DialogTitle>
            <DialogDescription>상담 정보를 확인하고 관리하세요</DialogDescription>
          </DialogHeader>

          {selectedConsultation && (
            <div className="space-y-4">
              {/* Student Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>학생 이름</Label>
                  <Input value={selectedConsultation.student_name} disabled />
                </div>
                <div className="space-y-2">
                  <Label>학년</Label>
                  <Input
                    value={selectedConsultation.student_grade || '미입력'}
                    disabled
                  />
                </div>
              </div>

              {/* Parent Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>학부모 이름</Label>
                  <Input value={selectedConsultation.parent_name} disabled />
                </div>
                <div className="space-y-2">
                  <Label>연락처</Label>
                  <div className="flex items-center gap-2">
                    <Input value={selectedConsultation.parent_phone} disabled />
                    <Button size="sm" variant="outline">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {selectedConsultation.parent_email && (
                <div className="space-y-2">
                  <Label>이메일</Label>
                  <div className="flex items-center gap-2">
                    <Input value={selectedConsultation.parent_email} disabled />
                    <Button size="sm" variant="outline">
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Goals */}
              {selectedConsultation.goals && (
                <div className="space-y-2">
                  <Label>학습 목표</Label>
                  <Textarea value={selectedConsultation.goals} disabled rows={2} />
                </div>
              )}

              {/* Preferred Times */}
              {selectedConsultation.preferred_times && (
                <div className="space-y-2">
                  <Label>희망 상담 시간</Label>
                  <Input value={selectedConsultation.preferred_times} disabled />
                </div>
              )}

              {/* Status */}
              <div className="space-y-2">
                <Label>상담 상태</Label>
                <Select
                  value={selectedConsultation.status}
                  onValueChange={(value) =>
                    setSelectedConsultation({
                      ...selectedConsultation,
                      status: value as Consultation['status'],
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700">
                        신규
                      </span>
                    </SelectItem>
                    <SelectItem value="scheduled">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-700">
                        예정
                      </span>
                    </SelectItem>
                    <SelectItem value="enrolled">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                        입교
                      </span>
                    </SelectItem>
                    <SelectItem value="rejected">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-700">
                        거절
                      </span>
                    </SelectItem>
                    <SelectItem value="on_hold">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        보류
                      </span>
                    </SelectItem>
                    <SelectItem value="waitlist">
                      <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-700">
                        대기리스트
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Scheduled Date */}
              {selectedConsultation.status !== 'new' && (
                <div className="space-y-2">
                  <Label>상담 일시</Label>
                  <Input
                    type="datetime-local"
                    value={
                      selectedConsultation.scheduled_date
                        ? format(new Date(selectedConsultation.scheduled_date), "yyyy-MM-dd'T'HH:mm")
                        : ''
                    }
                    onChange={(e) =>
                      setSelectedConsultation({
                        ...selectedConsultation,
                        scheduled_date: new Date(e.target.value).toISOString(),
                      })
                    }
                  />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <Label>메모</Label>
                <Textarea
                  value={selectedConsultation.notes || ''}
                  onChange={(e) =>
                    setSelectedConsultation({
                      ...selectedConsultation,
                      notes: e.target.value,
                    })
                  }
                  rows={3}
                  placeholder="상담 관련 메모를 입력하세요"
                />
              </div>

              {/* Attached Images */}
              {selectedConsultation.images && selectedConsultation.images.length > 0 && (
                <div className="space-y-2">
                  <Label>첨부 이미지 ({selectedConsultation.images.length}개)</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {selectedConsultation.images.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={img}
                          alt={`Attachment ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-lg border-2 border-gray-200 cursor-pointer hover:border-primary transition-colors"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            window.open(img, '_blank', 'noopener,noreferrer')
                          }}
                        />
                        <div
                          className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center cursor-pointer"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            window.open(img, '_blank', 'noopener,noreferrer')
                          }}
                        >
                          <Eye className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Result (for enrolled) */}
              {selectedConsultation.status === 'enrolled' && (
                <div className="space-y-2">
                  <Label>상담 결과</Label>
                  <Textarea
                    value={selectedConsultation.result || ''}
                    onChange={(e) =>
                      setSelectedConsultation({
                        ...selectedConsultation,
                        result: e.target.value,
                      })
                    }
                    rows={4}
                    placeholder="입교 결과를 입력하세요 (예: 수강 과목, 수업 일정 등)"
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              닫기
            </Button>
            <Button onClick={handleSaveResult}>저장</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Waitlists Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">대기리스트</h2>
          <Button onClick={() => setIsNewWaitlistDialogOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            대기리스트 생성
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {waitlists.map((waitlist) => {
            const waitlistConsultations = consultations.filter((c) =>
              waitlist.consultationIds.includes(c.id)
            )

            return (
              <Card key={waitlist.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{waitlist.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleDeleteWaitlist(waitlist.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Badge variant="secondary" className="w-fit">
                    {waitlistConsultations.length}명
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  {waitlistConsultations.length > 0 ? (
                    waitlistConsultations.slice(0, 3).map((consultation) => (
                      <div
                        key={consultation.id}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {consultation.student_name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {consultation.student_grade || '학년 미입력'}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-2"
                          onClick={() => handleRemoveFromWaitlist(waitlist.id, consultation.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground text-center py-4">
                      대기 중인 학생이 없습니다
                    </div>
                  )}
                  {waitlistConsultations.length > 3 && (
                    <div className="text-xs text-muted-foreground text-center pt-2">
                      +{waitlistConsultations.length - 3}명 더
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Add to Waitlist Dialog */}
      <Dialog open={isAddToWaitlistDialogOpen} onOpenChange={setIsAddToWaitlistDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>대기리스트에 추가</DialogTitle>
            <DialogDescription>
              {selectedConsultationForWaitlist?.student_name} 학생을 추가할 대기리스트를 선택하세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>대기리스트 선택</Label>
              <Select value={selectedWaitlistId} onValueChange={setSelectedWaitlistId}>
                <SelectTrigger>
                  <SelectValue placeholder="대기리스트를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {waitlists.map((waitlist) => (
                    <SelectItem key={waitlist.id} value={waitlist.id}>
                      {waitlist.name} ({waitlist.consultationIds.length}명)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddToWaitlistDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddToWaitlist}>추가</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Waitlist Dialog */}
      <Dialog open={isNewWaitlistDialogOpen} onOpenChange={setIsNewWaitlistDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>대기리스트 생성</DialogTitle>
            <DialogDescription>새로운 대기리스트를 생성합니다</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>대기리스트 이름</Label>
              <Input
                placeholder="예: 겨울방학, 여름특강 등"
                value={newWaitlistName}
                onChange={(e) => setNewWaitlistName(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewWaitlistDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreateWaitlist}>생성</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enrollment Confirmation Dialog */}
      <Dialog open={isEnrollmentDialogOpen} onOpenChange={setIsEnrollmentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">학생 등록</DialogTitle>
            <DialogDescription>
              학생의 기본 정보와 학부모 정보를 입력해주세요
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Row 1: 학생 이름 + 출결코드 */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  학생 이름 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={enrollmentForm.name}
                  onChange={(e) => setEnrollmentForm({ ...enrollmentForm, name: e.target.value })}
                  placeholder="학생 이름 입력"
                />
              </div>
              <div className="space-y-2">
                <Label>출결코드 (4자리)</Label>
                <div className="flex gap-2">
                  <Input
                    value={enrollmentForm.student_code}
                    onChange={(e) => setEnrollmentForm({ ...enrollmentForm, student_code: e.target.value })}
                    placeholder="비워두면 자동 생성"
                    maxLength={4}
                  />
                  <Button type="button" variant="outline" size="icon" onClick={generateStudentCode}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">학생이 출결 체크 시 사용하는 고유 번호입니다</p>
              </div>
            </div>

            {/* Row 2: 지점 + 소속 */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  지점 <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={enrollmentForm.branch_name}
                  onValueChange={(value) => setEnrollmentForm({ ...enrollmentForm, branch_name: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="지점 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {/* 본점: 항상 고정 (필수) */}
                    <SelectItem value="본점">본점</SelectItem>
                    {/* 설정에서 추가한 지점들 */}
                    {branches.filter(b => b.status === 'active').map((branch) => (
                      <SelectItem key={branch.id} value={branch.name}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  소속(필수) <span className="text-red-500">*</span>
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={enrollmentForm.affiliation === 'academy' ? 'default' : 'outline'}
                    onClick={() => setEnrollmentForm({ ...enrollmentForm, affiliation: 'academy' })}
                    className="flex-1"
                  >
                    학원
                  </Button>
                  <Button
                    type="button"
                    variant={enrollmentForm.affiliation === 'study_room' ? 'default' : 'outline'}
                    onClick={() => setEnrollmentForm({ ...enrollmentForm, affiliation: 'study_room' })}
                    className="flex-1"
                  >
                    공부방
                  </Button>
                  <Button
                    type="button"
                    variant={enrollmentForm.affiliation === 'reading_room' ? 'default' : 'outline'}
                    onClick={() => setEnrollmentForm({ ...enrollmentForm, affiliation: 'reading_room' })}
                    className="flex-1"
                  >
                    독서실
                  </Button>
                </div>
              </div>
            </div>

            {/* Row 3: 학년 + 학교 */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  학년 <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={enrollmentForm.grade}
                  onValueChange={(value) => setEnrollmentForm({ ...enrollmentForm, grade: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="학년을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeOptions.map((grade) => (
                      <SelectItem key={grade.value} value={grade.value}>
                        {grade.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  학교 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={enrollmentForm.school}
                  onChange={(e) => setEnrollmentForm({ ...enrollmentForm, school: e.target.value })}
                  placeholder="예: 서울중학교"
                />
              </div>
            </div>

            {/* Row 4: 학생 연락처 + 학생 이메일 */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>학생 연락처</Label>
                <Input
                  value={enrollmentForm.phone}
                  onChange={(e) => setEnrollmentForm({ ...enrollmentForm, phone: e.target.value })}
                  placeholder="010-1234-5678"
                />
              </div>
              <div className="space-y-2">
                <Label>학생 이메일</Label>
                <Input
                  type="email"
                  value={enrollmentForm.email}
                  onChange={(e) => setEnrollmentForm({ ...enrollmentForm, email: e.target.value })}
                  placeholder="student@example.com"
                />
              </div>
            </div>

            {/* Row 5: 주소 */}
            <div className="space-y-2">
              <Label>주소</Label>
              <Input
                value={enrollmentForm.address}
                onChange={(e) => setEnrollmentForm({ ...enrollmentForm, address: e.target.value })}
                placeholder="주소 입력"
              />
            </div>

            {/* Row 6: 학부모 이름 + 학부모 연락처 */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  학부모 이름 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={enrollmentForm.parent_name}
                  onChange={(e) => setEnrollmentForm({ ...enrollmentForm, parent_name: e.target.value })}
                  placeholder="학부모 이름"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  학부모 연락처 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={enrollmentForm.parent_phone}
                  onChange={(e) => setEnrollmentForm({ ...enrollmentForm, parent_phone: e.target.value })}
                  placeholder="010-1234-5678"
                />
              </div>
            </div>

            {/* Row 7: 학부모 이메일 */}
            <div className="space-y-2">
              <Label>학부모 이메일</Label>
              <Input
                type="email"
                value={enrollmentForm.parent_email}
                onChange={(e) => setEnrollmentForm({ ...enrollmentForm, parent_email: e.target.value })}
                placeholder="parent@example.com"
              />
            </div>

            {/* 안내 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>안내:</strong> 입교 확정 시 학생 목록에 자동 등록되며, 상담은 입교 탭으로 이동됩니다.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEnrollmentDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleConfirmEnrollment} className="bg-green-600 hover:bg-green-700">
              입교 확정
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
