'use client'

// Consultations page with waitlist feature
import { useState } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { usePageAccess } from '@/hooks/use-page-access'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Calendar, Eye, MoreHorizontal, Phone, Mail, Plus, ListPlus, X, Upload, Image as ImageIcon } from 'lucide-react'
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

// Mock data
const mockConsultations: Consultation[] = [
  {
    id: '1',
    created_at: '2025-06-15T10:00:00',
    updated_at: '2025-06-15T10:00:00',
    org_id: 'org-1',
    student_name: '김철수',
    student_grade: 10,
    parent_name: '김학부모',
    parent_phone: '010-1234-5678',
    parent_email: 'parent@example.com',
    goals: '수학 성적 향상',
    preferred_times: '평일 오후 2-4시',
    scheduled_date: '2025-06-20T14:00:00',
    status: 'scheduled',
    notes: '수학 기초가 부족함',
    images: [
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop',
    ],
  },
  {
    id: '2',
    created_at: '2025-06-16T09:00:00',
    updated_at: '2025-06-16T09:00:00',
    org_id: 'org-1',
    student_name: '이영희',
    student_grade: 11,
    parent_name: '이학부모',
    parent_phone: '010-2345-6789',
    parent_email: 'parent2@example.com',
    goals: '영어 회화 실력 향상',
    preferred_times: '주말 오전',
    status: 'new',
    images: [
      'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop',
    ],
  },
  {
    id: '3',
    created_at: '2025-06-10T11:00:00',
    updated_at: '2025-06-10T11:00:00',
    org_id: 'org-1',
    student_name: '박민준',
    student_grade: 9,
    parent_name: '박학부모',
    parent_phone: '010-3456-7890',
    goals: '전반적인 학습 관리',
    scheduled_date: '2025-06-12T15:00:00',
    status: 'enrolled',
    result: '수학, 영어 수강 등록 완료. 주 3회 수업 (월/수/금 오후 4-6시)',
    images: [
      'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=400&h=300&fit=crop',
      'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop',
    ],
  },
  {
    id: '4',
    created_at: '2025-06-14T14:00:00',
    updated_at: '2025-06-14T14:00:00',
    org_id: 'org-1',
    student_name: '최지훈',
    student_grade: 12,
    parent_name: '최학부모',
    parent_phone: '010-4567-8901',
    goals: '대입 준비',
    preferred_times: '평일 저녁',
    scheduled_date: '2025-06-16T18:00:00',
    status: 'rejected',
    notes: '타 학원 등록 결정',
  },
]

export default function ConsultationsPage() {
  usePageAccess('consultations')

  const { toast } = useToast()
  const [consultations, setConsultations] = useState<Consultation[]>(mockConsultations)
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
  const [waitlists, setWaitlists] = useState<Waitlist[]>([
    { id: 'waitlist-1', name: '겨울방학', consultationIds: [] }
  ])
  const [isNewWaitlistDialogOpen, setIsNewWaitlistDialogOpen] = useState(false)
  const [isAddToWaitlistDialogOpen, setIsAddToWaitlistDialogOpen] = useState(false)
  const [selectedConsultationForWaitlist, setSelectedConsultationForWaitlist] = useState<Consultation | null>(null)
  const [selectedWaitlistId, setSelectedWaitlistId] = useState<string>('')
  const [newWaitlistName, setNewWaitlistName] = useState('')

  // Enrollment confirmation modal states
  const [isEnrollmentDialogOpen, setIsEnrollmentDialogOpen] = useState(false)
  const [consultationToEnroll, setConsultationToEnroll] = useState<Consultation | null>(null)

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
        const grade = row.getValue('student_grade') as number
        return grade ? `${grade}학년` : '-'
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
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleViewDetail(consultation)}
            >
              <Eye className="mr-2 h-4 w-4" />
              상세 보기
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedConsultationForWaitlist(consultation)
                setIsAddToWaitlistDialogOpen(true)
              }}
            >
              <ListPlus className="mr-2 h-4 w-4" />
              대기리스트 추가
            </Button>
          </div>
        )
      },
    },
  ]

  const handleViewDetail = (consultation: Consultation) => {
    setSelectedConsultation(consultation)
    setIsDetailDialogOpen(true)
  }

  const handleChangeStatus = (id: string, newStatus: Consultation['status']) => {
    // If changing to 'enrolled', show enrollment confirmation modal
    if (newStatus === 'enrolled') {
      const consultation = consultations.find(c => c.id === id)
      if (consultation) {
        setConsultationToEnroll(consultation)
        setIsEnrollmentDialogOpen(true)
      }
      return
    }

    // For other status changes, update directly
    setConsultations(
      consultations.map((c) =>
        c.id === id ? { ...c, status: newStatus, updated_at: new Date().toISOString() } : c
      )
    )
    toast({
      title: '상태 변경 완료',
      description: `상담 상태가 ${statusMap[newStatus].label}(으)로 변경되었습니다.`,
    })
  }

  const handleConfirmEnrollment = () => {
    if (!consultationToEnroll) return

    const enrollmentDate = new Date().toISOString()

    // Update consultation status and add enrollment date
    setConsultations(
      consultations.map((c) =>
        c.id === consultationToEnroll.id
          ? { ...c, status: 'enrolled', enrolled_date: enrollmentDate, updated_at: enrollmentDate }
          : c
      )
    )

    // Remove from waitlist if present
    setWaitlists(
      waitlists.map((w) => ({
        ...w,
        consultationIds: w.consultationIds.filter(cId => cId !== consultationToEnroll.id)
      }))
    )

    toast({
      title: '✅ 학생 등록 완료',
      description: `${consultationToEnroll.student_name} 학생이 입교 처리되었습니다. 입교 날짜: ${new Date(enrollmentDate).toLocaleDateString('ko-KR')}`,
    })

    setIsEnrollmentDialogOpen(false)
    setConsultationToEnroll(null)
  }

  const handleSaveResult = () => {
    if (!selectedConsultation) return

    setConsultations(
      consultations.map((c) =>
        c.id === selectedConsultation.id ? selectedConsultation : c
      )
    )
    toast({
      title: '저장 완료',
      description: '상담 내용이 저장되었습니다.',
    })
    setIsDetailDialogOpen(false)
  }

  const handleCreateConsultation = () => {
    if (!newConsultation.student_name || !newConsultation.parent_name || !newConsultation.parent_phone) {
      toast({
        title: '입력 오류',
        description: '필수 항목을 모두 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    const consultation: Consultation = {
      id: `new-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      org_id: 'org-1',
      student_name: newConsultation.student_name,
      student_grade: newConsultation.student_grade ? parseInt(newConsultation.student_grade) : undefined,
      parent_name: newConsultation.parent_name,
      parent_phone: newConsultation.parent_phone,
      parent_email: newConsultation.parent_email || undefined,
      goals: newConsultation.goals || undefined,
      preferred_times: newConsultation.preferred_times || undefined,
      notes: newConsultation.notes || undefined,
      images: newConsultation.images.length > 0 ? newConsultation.images : undefined,
      status: 'new',
    }

    setConsultations([consultation, ...consultations])
    toast({
      title: '등록 완료',
      description: `${newConsultation.student_name} 학생의 상담이 등록되었습니다.`,
    })

    // Reset form
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
  }

  const handleCreateWaitlist = () => {
    if (!newWaitlistName.trim()) {
      toast({
        title: '입력 오류',
        description: '대기리스트 이름을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    const newWaitlist: Waitlist = {
      id: `waitlist-${Date.now()}`,
      name: newWaitlistName.trim(),
      consultationIds: [],
    }

    setWaitlists([...waitlists, newWaitlist])
    setNewWaitlistName('')
    setIsNewWaitlistDialogOpen(false)
    toast({
      title: '대기리스트 생성 완료',
      description: `${newWaitlistName} 대기리스트가 생성되었습니다.`,
    })
  }

  const handleAddToWaitlist = () => {
    if (!selectedConsultationForWaitlist || !selectedWaitlistId) {
      toast({
        title: '선택 오류',
        description: '대기리스트를 선택해주세요.',
        variant: 'destructive',
      })
      return
    }

    setWaitlists(
      waitlists.map((wl) =>
        wl.id === selectedWaitlistId
          ? {
              ...wl,
              consultationIds: [...wl.consultationIds, selectedConsultationForWaitlist.id],
            }
          : wl
      )
    )

    // Update consultation status to waitlist
    setConsultations(
      consultations.map((c) =>
        c.id === selectedConsultationForWaitlist.id
          ? { ...c, status: 'waitlist' as Consultation['status'], updated_at: new Date().toISOString() }
          : c
      )
    )

    toast({
      title: '대기리스트 추가 완료',
      description: `${selectedConsultationForWaitlist.student_name} 학생이 대기리스트에 추가되었습니다.`,
    })

    setIsAddToWaitlistDialogOpen(false)
    setSelectedConsultationForWaitlist(null)
    setSelectedWaitlistId('')
  }

  const handleRemoveFromWaitlist = (waitlistId: string, consultationId: string) => {
    setWaitlists(
      waitlists.map((wl) =>
        wl.id === waitlistId
          ? {
              ...wl,
              consultationIds: wl.consultationIds.filter((id) => id !== consultationId),
            }
          : wl
      )
    )

    toast({
      title: '대기리스트 제거',
      description: '대기리스트에서 제거되었습니다.',
    })
  }

  const handleDeleteWaitlist = (waitlistId: string) => {
    setWaitlists(waitlists.filter((wl) => wl.id !== waitlistId))
    toast({
      title: '대기리스트 삭제',
      description: '대기리스트가 삭제되었습니다.',
    })
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
                    <SelectItem value="1">초등 1학년</SelectItem>
                    <SelectItem value="2">초등 2학년</SelectItem>
                    <SelectItem value="3">초등 3학년</SelectItem>
                    <SelectItem value="4">초등 4학년</SelectItem>
                    <SelectItem value="5">초등 5학년</SelectItem>
                    <SelectItem value="6">초등 6학년</SelectItem>
                    <SelectItem value="7">중등 1학년</SelectItem>
                    <SelectItem value="8">중등 2학년</SelectItem>
                    <SelectItem value="9">중등 3학년</SelectItem>
                    <SelectItem value="10">고등 1학년</SelectItem>
                    <SelectItem value="11">고등 2학년</SelectItem>
                    <SelectItem value="12">고등 3학년</SelectItem>
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
                    value={selectedConsultation.student_grade ? `${selectedConsultation.student_grade}학년` : '미입력'}
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
                            {consultation.student_grade
                              ? `${consultation.student_grade}학년`
                              : '학년 미입력'}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">✅ 학생 등록 확인</DialogTitle>
            <DialogDescription>
              입교 처리를 진행하시겠습니까?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">학생 이름</span>
                <span className="font-semibold">{consultationToEnroll?.student_name}</span>
              </div>
              {consultationToEnroll?.student_grade && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">학년</span>
                  <span className="font-medium">{consultationToEnroll.student_grade}학년</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">학부모</span>
                <span className="font-medium">{consultationToEnroll?.parent_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">연락처</span>
                <span className="font-medium">{consultationToEnroll?.parent_phone}</span>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">입교 날짜</span>
                  <span className="font-semibold text-primary">
                    {new Date().toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <strong>안내:</strong> 입교 처리 후 해당 상담은 입교 탭으로 이동되며, 일반 상담 목록에서 제거됩니다.
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
