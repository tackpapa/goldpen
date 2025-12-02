'use client'

export const runtime = 'edge'
import { useEffect, useState } from 'react'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Plus, Package, Users, Building2, MessageSquare, Send } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Separator } from '@/components/ui/separator'

interface Plan {
  id: string
  name: string
  code: string
  description: string | null
  price_monthly: number
  price_yearly: number
  max_users: number
  max_students: number
  max_teachers: number
  max_classes: number
  features: string[]
  is_active: boolean
  sort_order: number
  organization_count: number
}

interface MessagePricing {
  id: string
  message_type: string
  price: number
  cost: number
  description: string
  is_active: boolean
}

const messageTypeLabels: Record<string, { label: string; icon: 'sms' | 'kakao' }> = {
  sms: { label: 'SMS 문자', icon: 'sms' },
  kakao_alimtalk: { label: '카카오 알림톡', icon: 'kakao' },
}

const defaultFeatures = [
  'attendance',
  'students',
  'classes',
  'billing',
  'reports',
  'kakao_alimtalk',
  'api_access',
  'custom_branding',
  'dedicated_support',
]

const featureLabels: Record<string, string> = {
  attendance: '출결 관리',
  students: '학생 관리',
  classes: '반 관리',
  billing: '결제 관리',
  reports: '리포트',
  kakao_alimtalk: '카카오 알림톡',
  api_access: 'API 접근',
  custom_branding: '커스텀 브랜딩',
  dedicated_support: '전담 지원',
}

export default function PlansPage() {
  const { toast } = useToast()
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)

  // 메시지 비용 설정 state
  const [messagePricing, setMessagePricing] = useState<MessagePricing[]>([])
  const [editingPrice, setEditingPrice] = useState<{ type: string; price: number; cost: number } | null>(null)
  const [isSavingPrice, setIsSavingPrice] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    max_users: 5,
    max_students: 30,
    max_teachers: 3,
    max_classes: 5,
    features: [] as string[],
    is_active: true,
    sort_order: 0,
  })

  const columns: ColumnDef<Plan>[] = [
    {
      accessorKey: 'name',
      header: '플랜명',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue('name')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'code',
      header: '코드',
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue('code')}</Badge>
      ),
    },
    {
      accessorKey: 'price_monthly',
      header: '월 요금',
      cell: ({ row }) => {
        const price = row.getValue('price_monthly') as number
        return (
          <div>
            {price === 0 ? '무료' : `${price.toLocaleString()}원`}
          </div>
        )
      },
    },
    {
      accessorKey: 'max_students',
      header: '최대 학생',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Users className="h-4 w-4 text-muted-foreground" />
          {row.getValue('max_students')}명
        </div>
      ),
    },
    {
      accessorKey: 'organization_count',
      header: '사용 기관',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          {row.getValue('organization_count')}개
        </div>
      ),
    },
    {
      accessorKey: 'is_active',
      header: '상태',
      cell: ({ row }) => (
        <Badge className={row.getValue('is_active') ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
          {row.getValue('is_active') ? '활성' : '비활성'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const plan = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEdit(plan)}>
                수정
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDelete(plan.id)}
                className="text-red-600"
                disabled={plan.organization_count > 0}
              >
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: plans,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  useEffect(() => {
    loadPlans()
    loadMessagePricing()
  }, [])

  const loadMessagePricing = async () => {
    try {
      const response = await fetch('/api/admin/message-pricing')
      if (response.ok) {
        const data = await response.json() as { pricing?: MessagePricing[] }
        setMessagePricing(data.pricing || [])
      }
    } catch (error) {
      console.error('Failed to load message pricing:', error)
    }
  }

  const handleSavePrice = async (messageType: string, price: number, cost: number) => {
    try {
      setIsSavingPrice(true)
      const response = await fetch('/api/admin/message-pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message_type: messageType, price, cost }),
      })

      if (response.ok) {
        toast({ title: '메시지 비용이 저장되었습니다' })
        setEditingPrice(null)
        loadMessagePricing()
      } else {
        const data = await response.json() as { error?: string }
        toast({ title: data.error || '저장 실패', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Failed to save price:', error)
      toast({ title: '저장 중 오류 발생', variant: 'destructive' })
    } finally {
      setIsSavingPrice(false)
    }
  }

  const loadPlans = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/admin/plans?includeInactive=true')
      if (response.ok) {
        const data = await response.json() as { plans?: any[] }
        setPlans(data.plans || [])
      }
    } catch (error) {
      console.error('Failed to load plans:', error)
      toast({ title: '플랜 목록 로딩 실패', variant: 'destructive' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan)
    setFormData({
      name: plan.name,
      code: plan.code,
      description: plan.description || '',
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly,
      max_users: plan.max_users,
      max_students: plan.max_students,
      max_teachers: plan.max_teachers,
      max_classes: plan.max_classes,
      features: Array.isArray(plan.features) ? plan.features : [],
      is_active: plan.is_active,
      sort_order: plan.sort_order,
    })
    setIsDialogOpen(true)
  }

  const handleCreate = () => {
    setEditingPlan(null)
    setFormData({
      name: '',
      code: '',
      description: '',
      price_monthly: 0,
      price_yearly: 0,
      max_users: 5,
      max_students: 30,
      max_teachers: 3,
      max_classes: 5,
      features: [],
      is_active: true,
      sort_order: plans.length + 1,
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      const url = editingPlan
        ? `/api/admin/plans/${editingPlan.id}`
        : '/api/admin/plans'
      const method = editingPlan ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({ title: editingPlan ? '플랜 수정 완료' : '플랜 생성 완료' })
        setIsDialogOpen(false)
        loadPlans()
      } else {
        const data = await response.json() as { error?: string }
        toast({ title: data.error || '저장 실패', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Failed to save plan:', error)
      toast({ title: '저장 중 오류 발생', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('정말로 이 플랜을 삭제하시겠습니까?')) return

    try {
      const response = await fetch(`/api/admin/plans/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({ title: '플랜 삭제 완료' })
        loadPlans()
      } else {
        const data = await response.json() as { error?: string }
        toast({ title: data.error || '삭제 실패', variant: 'destructive' })
      }
    } catch (error) {
      console.error('Failed to delete plan:', error)
      toast({ title: '삭제 중 오류 발생', variant: 'destructive' })
    }
  }

  const toggleFeature = (feature: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter((f) => f !== feature)
        : [...prev.features, feature],
    }))
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">구독 플랜 관리</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">구독 플랜 관리</h1>
          <p className="text-muted-foreground">
            {plans.length}개의 플랜을 관리하고 있습니다
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleCreate}>
              <Plus className="mr-2 h-4 w-4" />
              플랜 추가
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? '플랜 수정' : '새 플랜 추가'}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">플랜명</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">코드</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price_monthly">월 요금 (원)</Label>
                  <Input
                    id="price_monthly"
                    type="number"
                    value={formData.price_monthly}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_monthly: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="price_yearly">연 요금 (원)</Label>
                  <Input
                    id="price_yearly"
                    type="number"
                    value={formData.price_yearly}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        price_yearly: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="max_users">최대 사용자</Label>
                  <Input
                    id="max_users"
                    type="number"
                    value={formData.max_users}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_users: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_students">최대 학생</Label>
                  <Input
                    id="max_students"
                    type="number"
                    value={formData.max_students}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_students: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_teachers">최대 강사</Label>
                  <Input
                    id="max_teachers"
                    type="number"
                    value={formData.max_teachers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_teachers: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_classes">최대 반</Label>
                  <Input
                    id="max_classes"
                    type="number"
                    value={formData.max_classes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_classes: parseInt(e.target.value) || 1,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>포함 기능</Label>
                <div className="grid grid-cols-3 gap-2">
                  {defaultFeatures.map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-muted"
                      onClick={() => toggleFeature(feature)}
                    >
                      <Switch
                        checked={formData.features.includes(feature)}
                        onCheckedChange={() => toggleFeature(feature)}
                      />
                      <span className="text-sm">{featureLabels[feature]}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
                <Label htmlFor="is_active">활성화</Label>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                취소
              </Button>
              <Button onClick={handleSubmit}>저장</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {plans.map((plan) => (
          <Card key={plan.id} className={!plan.is_active ? 'opacity-60' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center justify-between">
                {plan.name}
                <Badge variant="outline">{plan.code}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                {plan.price_monthly === 0
                  ? '무료'
                  : `${plan.price_monthly.toLocaleString()}원/월`}
              </div>
              <div className="text-sm text-muted-foreground mb-4">
                {plan.description}
              </div>
              <div className="space-y-1 text-sm">
                <div>학생 {plan.max_students}명</div>
                <div>강사 {plan.max_teachers}명</div>
                <div>반 {plan.max_classes}개</div>
              </div>
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-medium mb-2">
                  사용 기관: {plan.organization_count}개
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 메시지 비용 설정 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            메시지 발송 비용 설정
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            문자/카카오톡 발송 시 기관 충전금에서 차감되는 건당 비용을 설정합니다
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* SMS 그룹 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <MessageSquare className="h-4 w-4" />
                SMS 문자
              </div>
              {messagePricing
                .filter(p => p.message_type === 'sms')
                .map(pricing => (
                  <div
                    key={pricing.id}
                    className="p-3 border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">
                          {messageTypeLabels[pricing.message_type]?.label || pricing.message_type}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pricing.description}
                        </div>
                      </div>
                      {editingPrice?.type !== pricing.message_type && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingPrice({
                            type: pricing.message_type,
                            price: pricing.price,
                            cost: pricing.cost || 0
                          })}
                        >
                          수정
                        </Button>
                      )}
                    </div>
                    {editingPrice?.type === pricing.message_type ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="w-12 text-sm">판매가</Label>
                          <Input
                            type="number"
                            className="w-24 h-8 text-right"
                            value={editingPrice.price}
                            onChange={(e) => setEditingPrice({
                              ...editingPrice,
                              price: parseInt(e.target.value) || 0
                            })}
                            min={0}
                          />
                          <span className="text-sm">원</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="w-12 text-sm">원가</Label>
                          <Input
                            type="number"
                            className="w-24 h-8 text-right"
                            value={editingPrice.cost}
                            onChange={(e) => setEditingPrice({
                              ...editingPrice,
                              cost: parseInt(e.target.value) || 0
                            })}
                            min={0}
                          />
                          <span className="text-sm">원</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="w-12">수익</span>
                          <span className={`font-medium ${editingPrice.price - editingPrice.cost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(editingPrice.price - editingPrice.cost).toLocaleString()}원
                          </span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingPrice(null)}
                            disabled={isSavingPrice}
                          >
                            취소
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSavePrice(editingPrice.type, editingPrice.price, editingPrice.cost)}
                            disabled={isSavingPrice}
                          >
                            저장
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">판매가</span>
                          <div className="font-bold text-lg">{pricing.price.toLocaleString()}원</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">원가</span>
                          <div className="font-medium">{(pricing.cost || 0).toLocaleString()}원</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">수익</span>
                          <div className={`font-medium ${pricing.price - (pricing.cost || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(pricing.price - (pricing.cost || 0)).toLocaleString()}원
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* 카카오 그룹 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Send className="h-4 w-4" />
                카카오 알림톡
              </div>
              {messagePricing
                .filter(p => p.message_type === 'kakao_alimtalk')
                .map(pricing => (
                  <div
                    key={pricing.id}
                    className="p-3 border rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="font-medium">
                          {messageTypeLabels[pricing.message_type]?.label || pricing.message_type}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {pricing.description}
                        </div>
                      </div>
                      {editingPrice?.type !== pricing.message_type && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingPrice({
                            type: pricing.message_type,
                            price: pricing.price,
                            cost: pricing.cost || 0
                          })}
                        >
                          수정
                        </Button>
                      )}
                    </div>
                    {editingPrice?.type === pricing.message_type ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="w-12 text-sm">판매가</Label>
                          <Input
                            type="number"
                            className="w-24 h-8 text-right"
                            value={editingPrice.price}
                            onChange={(e) => setEditingPrice({
                              ...editingPrice,
                              price: parseInt(e.target.value) || 0
                            })}
                            min={0}
                          />
                          <span className="text-sm">원</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Label className="w-12 text-sm">원가</Label>
                          <Input
                            type="number"
                            className="w-24 h-8 text-right"
                            value={editingPrice.cost}
                            onChange={(e) => setEditingPrice({
                              ...editingPrice,
                              cost: parseInt(e.target.value) || 0
                            })}
                            min={0}
                          />
                          <span className="text-sm">원</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="w-12">수익</span>
                          <span className={`font-medium ${editingPrice.price - editingPrice.cost >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(editingPrice.price - editingPrice.cost).toLocaleString()}원
                          </span>
                        </div>
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingPrice(null)}
                            disabled={isSavingPrice}
                          >
                            취소
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSavePrice(editingPrice.type, editingPrice.price, editingPrice.cost)}
                            disabled={isSavingPrice}
                          >
                            저장
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">판매가</span>
                          <div className="font-bold text-lg">{pricing.price.toLocaleString()}원</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">원가</span>
                          <div className="font-medium">{(pricing.cost || 0).toLocaleString()}원</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">수익</span>
                          <div className={`font-medium ${pricing.price - (pricing.cost || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(pricing.price - (pricing.cost || 0)).toLocaleString()}원
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
            </div>

            {/* 안내 */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="text-sm font-medium">비용 설정 안내</div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>판매가</strong>: 기관 충전금에서 차감되는 금액</li>
                <li>• <strong>원가</strong>: 실제 발송 비용 (통신사/카카오)</li>
                <li>• <strong>수익</strong>: 판매가 - 원가 (건당 마진)</li>
              </ul>
              <Separator className="my-2" />
              <div className="text-sm font-medium">메시지 종류</div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>SMS</strong>: 일반 문자 메시지</li>
                <li>• <strong>카카오 알림톡</strong>: 템플릿 기반 정보성 메시지</li>
              </ul>
            </div>
          </div>

          {messagePricing.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>메시지 비용 데이터가 없습니다.</p>
              <p className="text-sm mt-2">데이터베이스에 message_pricing 테이블을 생성해주세요.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>플랜 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      플랜이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
