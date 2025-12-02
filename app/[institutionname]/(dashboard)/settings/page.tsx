'use client'

export const runtime = 'edge'


import { useState, useEffect, useRef, useCallback } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTable } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Building2, Plus, Edit, Trash2, DoorOpen, UserPlus, Shield, Menu, ShieldCheck, DollarSign, GripVertical, ArrowUp, ArrowDown, RotateCcw, ChevronUp, ChevronDown, Upload, X, Image as ImageIcon, MessageSquare, CreditCard, Wallet as WalletIcon, Check, Zap, Crown } from 'lucide-react'
import { navigationItems } from '@/lib/config/navigation'
import { useMenuSettings } from '@/lib/hooks/useMenuSettings'
import { usePageAccess } from '@/hooks/use-page-access'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Organization, Branch, Room, RevenueCategory, ExpenseCategory } from '@/lib/types/database'
import type { UserRole, PageId } from '@/lib/types/permissions'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'

// Default empty states
const defaultOrganization: Organization = {
  id: '',
  name: '',
  owner_id: '',
  owner_name: '',
  address: '',
  phone: '',
  email: '',
  logo_url: '',
  slug: '',
  status: 'active',
  settings: {
    auto_sms: false,
    auto_email: false,
    notification_enabled: false,
    use_sms: false,
    use_kakao: false,
  },
  created_at: '',
  updated_at: '',
}

// Service Usage Data Types
interface KakaoTalkUsage {
  id: string
  date: string
  type: string
  studentName: string
  message: string
  cost: number
  status: 'success' | 'failed'
}

interface ServiceUsage {
  id: string
  date: string
  type: string
  description: string
  cost: number
}

// API 응답 타입
interface ApiResponse {
  error?: string
  url?: string
  path?: string
  organization?: Organization
  [key: string]: unknown
}

export default function SettingsPage() {
  // 설정 페이지 접근 권한 체크 (owner만 접근 가능)
  usePageAccess('settings')

  const { toast } = useToast()
  const [organization, setOrganization] = useState<Organization>(defaultOrganization)
  const [institutionName, setInstitutionName] = useState<string>('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [kakaoTalkUsages, setKakaoTalkUsages] = useState<KakaoTalkUsage[]>([])
  const [serviceUsages, setServiceUsages] = useState<ServiceUsage[]>([])

  // URL에서 slug 추출
  const slug = typeof window !== 'undefined'
    ? window.location.pathname.split('/').filter(Boolean)[0] || 'goldpen'
    : 'goldpen'

  // 메뉴 설정 훅 사용
  const { saveSettings: saveMenuSettingsToDb } = useMenuSettings({ orgSlug: slug })

  // Fetch settings data from API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`/api/settings?orgSlug=${slug}`, { credentials: 'include' })
        const data = await response.json() as {
          organization?: Organization
          branches?: Branch[]
          rooms?: Room[]
          kakaoTalkUsages?: KakaoTalkUsage[]
          serviceUsages?: ServiceUsage[]
          error?: string
        }
        if (response.ok) {
          if (data.organization) {
            const org = data.organization as Organization
            setOrganization({
              ...defaultOrganization,
              ...org,
              settings: {
                ...defaultOrganization.settings,
                ...(org.settings || {}),
              },
            })
          }
          if (data.branches) setBranches(data.branches)
          if (data.rooms) setRooms(data.rooms)
          if (data.kakaoTalkUsages) setKakaoTalkUsages(data.kakaoTalkUsages)
          if (data.serviceUsages) setServiceUsages(data.serviceUsages)
        }
      } catch {
        console.error('Failed to fetch settings')
      }
    }
    fetchSettings()
  }, [])
  const [isBranchDialogOpen, setIsBranchDialogOpen] = useState(false)
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null)
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    phone: '',
    manager_name: '',
    status: 'active' as Branch['status'],
  })

  // Room management state
  const [rooms, setRooms] = useState<Room[]>([])
  const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [roomForm, setRoomForm] = useState({
    name: '',
    capacity: 10,
    notes: '',
  })

  // 메시지 템플릿 state - 학부모용 (통합)
  const DEFAULT_TEMPLATES_PARENT: Record<string, string> = {
    // 출결 알림 (통합)
    'late': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 예정 시간({{예정시간}})에 아직 도착하지 않아 안내드립니다. 혹시 다른 일정이 있으시거나 오는 중이시라면 괜찮습니다. 확인되시면 편하게 연락 주세요.',
    'absent': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 오늘 예정된 일정에 출석하지 않아 결석 처리되었습니다. 사유 확인이 필요하시면 연락 부탁드립니다.',
    'checkin': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 안전하게 도착했습니다. 오늘도 알찬 시간 보낼 수 있도록 최선을 다하겠습니다. 좋은 하루 되세요!',
    'checkout': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 일과를 마치고 귀가했습니다. 오늘도 열심히 참여해 주었습니다. 안전하게 귀가하길 바랍니다.',
    // 스터디카페 전용
    'study_out': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 잠시 외출했습니다. 곧 돌아와서 다시 학습할 예정입니다.',
    'study_return': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생이 {{시간}}에 외출에서 복귀했습니다. 다시 열심히 공부하고 있습니다.',
    // 학습 알림
    'daily_report': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생의 {{날짜}} 학습 현황을 전해드립니다.\n\n오늘 총 {{총학습시간}} 동안 열심히 공부했고, {{완료과목}} 과목을 완료했습니다. 꾸준히 노력하는 모습이 대견합니다. 앞으로도 응원 부탁드립니다!',
    // 수업일지
    'lesson_report': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생의 수업일지가 도착했습니다.\n\n{{과목}} 수업 ({{강사명}} 선생님)\n오늘 배운 내용: {{수업내용}}\n\n오늘도 열심히 참여해 주었습니다. 궁금하신 점은 편하게 연락 주세요!',
    // 시험 결과
    'exam_result': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생의 시험 결과를 안내드립니다.\n\n{{시험명}}: {{점수}}점\n\n열심히 준비한 만큼 좋은 결과로 이어지길 바랍니다. 궁금하신 점은 편하게 연락 주세요!',
    // 과제 관련
    'assignment_new': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생에게 새로운 과제가 등록되었습니다.\n\n과제: {{과제명}}\n마감일: {{마감일}}\n\n차근차근 준비하면 충분히 잘 해낼 수 있습니다. 화이팅!',
    'assignment_remind': '{{기관명}}입니다, 학부모님.\n\n{{학생명}} 학생의 과제 마감일이 다가왔습니다.\n\n과제: {{과제명}}\n마감일: {{마감일}}\n\n제출 전 한 번 더 검토해 보도록 안내해 주시면 감사하겠습니다.',
  }

  // 메시지 템플릿 - 학생용 (통합)
  const DEFAULT_TEMPLATES_STUDENT: Record<string, string> = {
    // 출결 알림 (통합)
    'late': '{{기관명}}입니다.\n\n{{학생명}}님, 예정 시간({{예정시간}})이 지났는데 아직 도착하지 않았네요. 오는 중이라면 안전하게 와주세요! 다른 일정이 있으면 미리 연락 부탁해요.',
    'absent': '{{기관명}}입니다.\n\n{{학생명}}님, 오늘 예정된 일정에 출석하지 않아 결석 처리되었어요. 사정이 있었다면 연락 부탁해요!',
    'checkin': '{{기관명}}입니다.\n\n{{학생명}}님, {{시간}}에 도착 완료! 오늘도 알찬 시간 함께해요. 화이팅!',
    'checkout': '{{기관명}}입니다.\n\n{{학생명}}님, {{시간}}에 귀가했습니다. 오늘도 수고했어요! 안전하게 집에 가세요.',
    // 스터디카페 전용
    'study_out': '{{기관명}}입니다.\n\n{{학생명}}님, {{시간}}에 외출 체크되었어요. 잠깐 쉬고 와서 다시 집중해봐요!',
    'study_return': '{{기관명}}입니다.\n\n{{학생명}}님, {{시간}}에 복귀 완료! 다시 집중 모드 시작해볼까요? 화이팅!',
    // 학습 알림
    'daily_report': '{{기관명}}입니다.\n\n{{학생명}}님, {{날짜}} 학습 현황이에요.\n\n오늘 총 {{총학습시간}} 동안 공부하고, {{완료과목}} 과목을 완료했어요. 꾸준히 잘하고 있어요! 내일도 화이팅!',
    // 수업일지
    'lesson_report': '{{기관명}}입니다.\n\n{{학생명}}님, 오늘 수업일지가 도착했어요.\n\n{{과목}} 수업 ({{강사명}} 선생님)\n오늘 배운 내용: {{수업내용}}\n\n오늘도 열심히 참여해 줘서 고마워요! 다음 수업도 기대할게요!',
    // 시험 결과
    'exam_result': '{{기관명}}입니다.\n\n{{학생명}}님, 시험 결과가 나왔어요.\n\n{{시험명}}: {{점수}}점\n\n열심히 준비한 거 알아요. 결과에 상관없이 계속 성장하고 있어요! 다음에도 화이팅!',
    // 과제 관련
    'assignment_new': '{{기관명}}입니다.\n\n{{학생명}}님, 새로운 과제가 등록되었어요!\n\n과제: {{과제명}}\n마감일: {{마감일}}\n\n차근차근 하면 충분히 할 수 있어요. 화이팅!',
    'assignment_remind': '{{기관명}}입니다.\n\n{{학생명}}님, 과제 마감일이 다가왔어요!\n\n과제: {{과제명}}\n마감일: {{마감일}}\n\n마무리 잘 하고 있죠? 끝까지 화이팅! 제출 전에 한 번 더 검토해 보면 더 좋아요.',
  }

  const [messageTemplatesParent, setMessageTemplatesParent] = useState<Record<string, string>>(DEFAULT_TEMPLATES_PARENT)
  const [messageTemplatesStudent, setMessageTemplatesStudent] = useState<Record<string, string>>(DEFAULT_TEMPLATES_STUDENT)
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)
  const [editingTemplateKey, setEditingTemplateKey] = useState<string | null>(null)
  const [editingTemplateTarget, setEditingTemplateTarget] = useState<'parent' | 'student'>('parent')
  const [editingTemplateValue, setEditingTemplateValue] = useState('')
  // 각 알림별 수신자 설정 (parent: 학부모, student: 학생, both: 둘 다) - 통합
  const [notificationTargets, setNotificationTargets] = useState<Record<string, 'parent' | 'student' | 'both'>>({
    'late': 'parent',
    'absent': 'parent',
    'checkin': 'parent',
    'checkout': 'parent',
    'study_out': 'parent',
    'study_return': 'parent',
    'daily_report': 'parent',
    'lesson_report': 'parent',
    'exam_result': 'parent',
    'assignment_new': 'parent',
    'assignment_remind': 'parent',
  })
  // 일일 학습 리포트 발송 시간 (기본값: 22:00)
  const [dailyReportTime, setDailyReportTime] = useState('22:00')

  const TEMPLATE_LABELS: Record<string, string> = {
    'late': '지각 알림',
    'absent': '결석 알림',
    'checkin': '입실/등원 알림',
    'checkout': '퇴실/하원 알림',
    'study_out': '외출 알림',
    'study_return': '복귀 알림',
    'daily_report': '당일 학습 진행 결과',
    'lesson_report': '수업일지 전송',
    'exam_result': '시험 결과 전송',
    'assignment_new': '새 과제 등록',
    'assignment_remind': '과제 마감 알림',
  }

  const handleOpenTemplateModal = (key: string, target: 'parent' | 'student') => {
    setEditingTemplateKey(key)
    setEditingTemplateTarget(target)
    if (target === 'parent') {
      setEditingTemplateValue(messageTemplatesParent[key] || DEFAULT_TEMPLATES_PARENT[key] || '')
    } else {
      setEditingTemplateValue(messageTemplatesStudent[key] || DEFAULT_TEMPLATES_STUDENT[key] || '')
    }
    setIsTemplateModalOpen(true)
  }

  const handleSaveTemplate = async () => {
    if (!editingTemplateKey) return

    if (editingTemplateTarget === 'parent') {
      const nextTemplates = { ...messageTemplatesParent, [editingTemplateKey]: editingTemplateValue }
      setMessageTemplatesParent(nextTemplates)
      const nextSettings = { ...organization.settings, messageTemplatesParent: nextTemplates }
      setOrganization({ ...organization, settings: nextSettings })
      await persistOrganization({ settings: nextSettings })
    } else {
      const nextTemplates = { ...messageTemplatesStudent, [editingTemplateKey]: editingTemplateValue }
      setMessageTemplatesStudent(nextTemplates)
      const nextSettings = { ...organization.settings, messageTemplatesStudent: nextTemplates }
      setOrganization({ ...organization, settings: nextSettings })
      await persistOrganization({ settings: nextSettings })
    }

    setIsTemplateModalOpen(false)
    toast({ title: '저장 완료', description: `${editingTemplateTarget === 'parent' ? '학부모' : '학생'}용 메시지 템플릿이 저장되었습니다.` })
  }

  // 수신자 타겟 변경 핸들러
  const handleTargetChange = async (key: string, target: 'parent' | 'student' | 'both') => {
    const newTargets = { ...notificationTargets, [key]: target }
    setNotificationTargets(newTargets)
    // DB에 저장
    const nextSettings = { ...organization.settings, notificationTargets: newTargets }
    setOrganization({ ...organization, settings: nextSettings })
    await persistOrganization({ settings: nextSettings })
  }

  // 일일 학습 리포트 발송 시간 변경 핸들러
  const handleDailyReportTimeChange = async (time: string) => {
    setDailyReportTime(time)
    // DB에 저장
    const nextSettings = { ...organization.settings, dailyReportTime: time }
    setOrganization({ ...organization, settings: nextSettings })
    await persistOrganization({ settings: nextSettings })
    toast({ title: '설정 저장', description: `일일 학습 리포트 발송 시간이 ${time.replace(':', '시 ')}분으로 변경되었습니다.` })
  }

  // Account management state
  type Account = {
    id: string
    email: string
    name: string
    role: UserRole
    phone?: string | null
    created_at?: string
    status?: 'active' | 'pending' // 활성 또는 초대 대기
  }

  type Invitation = {
    id: string
    email: string
    role: UserRole
    status: 'pending' | 'accepted' | 'expired'
    created_at: string
    expires_at: string
  }

  const [accounts, setAccounts] = useState<Account[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'teacher' as UserRole,
  })
  const [isInviting, setIsInviting] = useState(false)
  const [accountForm, setAccountForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'manager' as UserRole, // 기본값: manager (staff 통합)
  })

  // Menu visibility state
  const [enabledMenus, setEnabledMenus] = useState<string[]>([])
  const [menuOrder, setMenuOrder] = useState<string[]>([])

  // Page permissions state
  const [pagePermissions, setPagePermissions] = useState<Record<string, { manager: boolean; teacher: boolean }>>({})
  // useRef로 최신 상태 추적 (race condition 방지)
  const pagePermissionsRef = useRef(pagePermissions)
  const permissionSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  // pagePermissions 변경 시 ref 동기화
  useEffect(() => {
    pagePermissionsRef.current = pagePermissions
  }, [pagePermissions])

  // Service plan view state
  const [showPricingPlans, setShowPricingPlans] = useState(false)

  // Revenue categories state
  const [revenueCategories, setRevenueCategories] = useState<RevenueCategory[]>([])
  const [isRevenueCategoryDialogOpen, setIsRevenueCategoryDialogOpen] = useState(false)
  const [editingRevenueCategory, setEditingRevenueCategory] = useState<RevenueCategory | null>(null)
  const [revenueCategoryForm, setRevenueCategoryForm] = useState({
    name: '',
    description: '',
  })

  // Expense categories state
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([])
  const [isExpenseCategoryDialogOpen, setIsExpenseCategoryDialogOpen] = useState(false)
  const [editingExpenseCategory, setEditingExpenseCategory] = useState<ExpenseCategory | null>(null)
  const [expenseCategoryForm, setExpenseCategoryForm] = useState({
    name: '',
    description: '',
    color: '#6b7280',
  })

  // 기관 슬러그는 위에서 이미 정의됨 (라인 107)
  const basePath = `/api/settings`
  const withSlug = (path: string) => (path.includes('?') ? `${path}&orgSlug=${slug}` : `${path}?orgSlug=${slug}`)

  const fetchJson = async <T,>(path: string, init?: RequestInit): Promise<T> => {
    const res = await fetch(path, { credentials: 'include', ...init })
    const data = await res.json() as T & { error?: string }
    if (!res.ok) {
      throw new Error(data.error || '요청 실패')
    }
    return data as T
  }

  const loadAll = async () => {
    try {
      // slug는 URL에서 추출한 값 사용 (하드코딩 제거)
      setInstitutionName(slug)
      const [orgRes, roomsRes, branchesRes] = await Promise.all([
        fetchJson<{ organization?: Organization }>(withSlug(basePath)),
        fetchJson<{ rooms?: Room[] }>('/api/rooms').catch(() => ({ rooms: [] })),
        fetchJson<{ branches?: Branch[] }>(withSlug(`${basePath}/branches`)).catch(() => ({ branches: [] })),
      ])

      if (orgRes.organization) {
        setOrganization({
          ...defaultOrganization,
          ...orgRes.organization,
          settings: {
            ...defaultOrganization.settings,
            ...(orgRes.organization.settings || {}),
          },
        })
        const orgSettings = (orgRes.organization.settings || {}) as Record<string, unknown>
        setEnabledMenus((orgSettings.enabledMenus as string[]) || navigationItems.map((i) => i.id))
        setMenuOrder((orgSettings.menuOrder as string[]) || navigationItems.map((i) => i.id))
        // 메시지 템플릿 로드 (DB에 저장된 값이 있으면 사용, 없으면 기본값 유지)
        if (orgSettings.messageTemplatesParent) {
          setMessageTemplatesParent({ ...DEFAULT_TEMPLATES_PARENT, ...(orgSettings.messageTemplatesParent as Record<string, string>) })
        }
        if (orgSettings.messageTemplatesStudent) {
          setMessageTemplatesStudent({ ...DEFAULT_TEMPLATES_STUDENT, ...(orgSettings.messageTemplatesStudent as Record<string, string>) })
        }
        if (orgSettings.notificationTargets) {
          setNotificationTargets(prev => ({ ...prev, ...(orgSettings.notificationTargets as Record<string, "parent" | "student" | "both">) }))
        }
        // 일일 학습 리포트 발송 시간 로드
        if (orgSettings.dailyReportTime) {
          setDailyReportTime(orgSettings.dailyReportTime as string)
        }
      }
      setBranches(branchesRes.branches || [])
      setRooms(roomsRes.rooms || [])

      // 페이지 권한 로드 (API에서 가져오기)
      const pagePermRes = await fetchJson<{ permissions: Record<string, { manager: boolean; teacher: boolean }> }>(
        withSlug(`${basePath}/page-permissions`)
      ).catch(() => ({ permissions: {} }))
      setPagePermissions(pagePermRes.permissions || {})

      // 즉시 수입/지출 카테고리, 계정, 사용량 로드
      const [rev, exp, acc] = await Promise.all([
        fetchJson<{ categories: any[] }>(withSlug(`${basePath}/revenue-categories`)).catch(() => ({ categories: [] })),
        fetchJson<{ categories: any[] }>(withSlug(`${basePath}/expense-categories`)).catch(() => ({ categories: [] })),
        fetchJson<{ accounts: Account[] }>(withSlug(`${basePath}/user-accounts`)).catch(() => ({ accounts: [] })),
      ])
      setRevenueCategories(rev.categories || [])
      setExpenseCategories(exp.categories || [])
      setAccounts(acc.accounts || [])
      setKakaoTalkUsages([])
      setServiceUsages([])
    } catch (e) {
      console.error('설정 로드 실패', e)
      toast({
        title: '설정 로드 실패',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      })
    }
  }

  // Load accounts and menu settings on mount
  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const form = new FormData()
      form.append('file', file)
      try {
        const res = await fetch(`/api/settings/logo?orgSlug=${slug}`, {
          method: 'POST',
          credentials: 'include',
          body: form,
        })
        const data = await res.json() as ApiResponse
        if (!res.ok) throw new Error(data.error || '로고 업로드 실패')

        const logoUrl = (data.url || data.path) as string
        setOrganization((prev) => ({ ...prev, logo_url: logoUrl }))
        localStorage.setItem('organization_logo', logoUrl)
        localStorage.setItem('organization_name', organization.name)

        window.dispatchEvent(new Event('organizationSettingsChanged'))
        toast({ title: '로고 업로드 완료', description: '로고가 저장되었습니다.' })
      } catch (err) {
        toast({
          title: '로고 업로드 실패',
          description: err instanceof Error ? err.message : undefined,
          variant: 'destructive',
        })
      }
    }
  }

  const handleRemoveLogo = () => {
    setOrganization({ ...organization, logo_url: '' })
    localStorage.removeItem('organization_logo')

    // Dispatch event to update sidebar
    window.dispatchEvent(new Event('organizationSettingsChanged'))

    toast({
      title: '로고 삭제 완료',
      description: '로고가 삭제되었습니다.',
    })
  }

  const persistOrganization = async (payload: Partial<Organization>) => {
    const res = await fetch(withSlug(basePath), {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: payload.name,
        owner_name: payload.owner_name,
        address: payload.address,
        phone: payload.phone,
        email: payload.email,
        logo_url: payload.logo_url,
        settings: payload.settings,
      }),
    })
    const data = await res.json() as ApiResponse
    if (!res.ok) throw new Error(data.error || '저장 실패')
    if (data.organization) {
      setOrganization({
        ...defaultOrganization,
        ...data.organization,
        settings: {
          ...defaultOrganization.settings,
          ...(data.organization.settings || {}),
        },
      })
    }
  }

  const handleSaveOrganization = async () => {
    try {
      await persistOrganization({
        name: organization.name,
        owner_name: organization.owner_name,
        address: organization.address,
        phone: organization.phone,
        email: organization.email,
        logo_url: organization.logo_url,
        settings: organization.settings,
      })
      window.dispatchEvent(new Event('organizationSettingsChanged'))
      toast({ title: '저장 완료', description: '기관 정보가 저장되었습니다.' })
    } catch (e) {
      toast({ title: '저장 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const handleToggleSetting = async (key: keyof Organization['settings']) => {
    const nextSettings = {
      ...organization.settings,
      [key]: !organization.settings[key],
    }
    setOrganization({ ...organization, settings: nextSettings })
    try {
      await persistOrganization({ settings: nextSettings })
    } catch (e) {
      // ignore rollback for now
    }
    const settingLabels: Record<string, string> = {
      auto_sms: 'SMS 자동 발송',
      auto_email: '이메일 자동 발송',
      use_sms: 'SMS 사용',
      use_kakao: '카카오메세지 사용',
      notification_enabled: '알림',
    }
    toast({
      title: '설정 변경',
      description: `${settingLabels[key] || key} 설정이 변경되었습니다.`,
    })
  }

  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
    active: { label: '활성', variant: 'default' },
    available: { label: '사용 가능', variant: 'default' },
    inactive: { label: '비활성', variant: 'secondary' },
    maintenance: { label: '점검 중', variant: 'outline' },
  }

  const handleAddRoom = () => {
    setEditingRoom(null)
    setRoomForm({ name: '', capacity: 10, notes: '' })
    setIsRoomDialogOpen(true)
  }

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room)
    setRoomForm({ name: room.name, capacity: room.capacity, notes: room.notes || '' })
    setIsRoomDialogOpen(true)
  }

  const handleSaveRoom = async () => {
    if (!roomForm.name.trim()) {
      toast({ title: '입력 오류', description: '교실명을 입력해주세요.', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch(`/api/rooms?orgSlug=${slug}`, {
        method: editingRoom ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRoom?.id,
          name: roomForm.name,
          capacity: roomForm.capacity,
          status: editingRoom?.status || 'available',
          notes: roomForm.notes || null,
        }),
      })
      const data = await res.json() as ApiResponse
      if (!res.ok) throw new Error(data.error || '교실 저장 실패')
      await loadAll()
      toast({
        title: editingRoom ? '교실 수정 완료' : '교실 추가 완료',
        description: `${roomForm.name} 교실이 ${editingRoom ? '수정' : '추가'}되었습니다.`,
      })
      setIsRoomDialogOpen(false)
    } catch (e) {
      toast({ title: '교실 저장 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const handleDeleteRoom = async (roomId: string) => {
    const room = rooms.find(r => r.id === roomId)
    if (!confirm(`${room?.name} 교실을 삭제하시겠습니까?`)) return
    try {
      const res = await fetch(`/api/rooms?orgSlug=${slug}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: roomId }),
      })
      const data = await res.json() as ApiResponse
      if (!res.ok) throw new Error(data.error || '교실 삭제 실패')
      await loadAll()
      toast({ title: '교실 삭제 완료', description: `${room?.name} 교실이 삭제되었습니다.` })
    } catch (e) {
      toast({ title: '교실 삭제 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  // Branch management functions
  const handleAddBranch = () => {
    setEditingBranch(null)
    setBranchForm({ name: '', address: '', phone: '', manager_name: '', status: 'active' })
    setIsBranchDialogOpen(true)
  }

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch)
    setBranchForm({
      name: branch.name,
      address: branch.address,
      phone: branch.phone,
      manager_name: branch.manager_name,
      status: branch.status,
    })
    setIsBranchDialogOpen(true)
  }

  const handleSaveBranch = async () => {
    if (!branchForm.name.trim() || !branchForm.address.trim() || !branchForm.phone.trim()) {
      toast({ title: '입력 오류', description: '모든 필수 항목을 입력해주세요.', variant: 'destructive' })
      return
    }
    try {
      const res = await fetch(withSlug(`${basePath}/branches`), {
        method: editingBranch ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(editingBranch ? { id: editingBranch.id } : {}), ...branchForm }),
      })
      const data = await res.json() as ApiResponse
      if (!res.ok) throw new Error(data.error || '지점 저장 실패')
      await loadAll()
      toast({
        title: editingBranch ? '지점 수정 완료' : '지점 추가 완료',
        description: `${branchForm.name} 지점이 ${editingBranch ? '수정' : '추가'}되었습니다.`,
      })
      setIsBranchDialogOpen(false)
    } catch (e) {
      toast({ title: '지점 저장 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const handleDeleteBranch = async (branchId: string) => {
    const branch = branches.find(b => b.id === branchId)
    if (!confirm(`${branch?.name} 지점을 삭제하시겠습니까?`)) return
    try {
      const res = await fetch(withSlug(`${basePath}/branches`), {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: branchId }),
      })
      const data = await res.json() as ApiResponse
      if (!res.ok) throw new Error(data.error || '지점 삭제 실패')
      await loadAll()
      toast({ title: '지점 삭제 완료', description: `${branch?.name} 지점이 삭제되었습니다.` })
    } catch (e) {
      toast({ title: '지점 삭제 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  // Account management functions
  const handleOpenInviteDialog = () => {
    setInviteForm({ email: '', role: 'teacher' })
    setIsInviteDialogOpen(true)
  }

  const handleSendInvite = async () => {
    if (!inviteForm.email.trim()) {
      toast({ title: '입력 오류', description: '이메일을 입력해주세요.', variant: 'destructive' })
      return
    }
    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(inviteForm.email)) {
      toast({ title: '입력 오류', description: '올바른 이메일 형식을 입력해주세요.', variant: 'destructive' })
      return
    }
    setIsInviting(true)
    try {
      const res = await fetch(withSlug(`${basePath}/invitations`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteForm.email,
          role: inviteForm.role,
        }),
      })
      const data = await res.json() as ApiResponse
      if (!res.ok) throw new Error(data.error || '초대 전송 실패')
      await loadInvitations()
      toast({
        title: '초대 전송 완료',
        description: `${inviteForm.email}로 초대 메일이 전송되었습니다.`,
      })
      setIsInviteDialogOpen(false)
    } catch (e) {
      toast({ title: '초대 전송 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    } finally {
      setIsInviting(false)
    }
  }

  const loadInvitations = async () => {
    try {
      const res = await fetchJson<{ invitations: Invitation[] }>(withSlug(`${basePath}/invitations`)).catch(() => ({ invitations: [] }))
      setInvitations(res.invitations || [])
    } catch {
      setInvitations([])
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    const invitation = invitations.find(i => i.id === invitationId)
    if (!confirm(`${invitation?.email}에 대한 초대를 취소하시겠습니까?`)) return
    try {
      const res = await fetch(withSlug(`${basePath}/invitations`), {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invitationId }),
      })
      const data = await res.json() as ApiResponse
      if (!res.ok) throw new Error(data.error || '초대 취소 실패')
      await loadInvitations()
      toast({ title: '초대 취소 완료', description: `${invitation?.email}에 대한 초대가 취소되었습니다.` })
    } catch (e) {
      toast({ title: '초대 취소 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const handleResendInvitation = async (invitationId: string) => {
    const invitation = invitations.find(i => i.id === invitationId)
    try {
      const res = await fetch(withSlug(`${basePath}/invitations/resend`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invitationId }),
      })
      const data = await res.json() as ApiResponse
      if (!res.ok) throw new Error(data.error || '초대 재전송 실패')
      await loadInvitations()
      toast({ title: '초대 재전송 완료', description: `${invitation?.email}로 초대 메일이 재전송되었습니다.` })
    } catch (e) {
      toast({ title: '초대 재전송 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const handleAddAccount = () => {
    setEditingAccount(null)
    setAccountForm({ username: '', password: '', name: '', role: 'manager' })
    setIsAccountDialogOpen(true)
  }

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account as any)
    setAccountForm({
      username: account.email,
      password: '',
      name: account.name,
      role: account.role,
    })
    setIsAccountDialogOpen(true)
  }

  const handleSaveAccount = async () => {
    if (!accountForm.username.trim() || !accountForm.name.trim()) {
      toast({ title: '입력 오류', description: '모든 필수 항목을 입력해주세요.', variant: 'destructive' })
      return
    }
    try {
    const res = await fetch(withSlug(`${basePath}/accounts`), {
        method: editingAccount ? 'PATCH' : 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingAccount?.id,
          email: accountForm.username,
          password: accountForm.password || undefined,
          name: accountForm.name,
          role: accountForm.role,
        }),
      })
      const data = await res.json() as ApiResponse
      if (!res.ok) throw new Error(data.error || '계정 저장 실패')
      await loadAll()
      toast({
        title: editingAccount ? '계정 수정 완료' : '계정 추가 완료',
        description: `${accountForm.name} 계정이 ${editingAccount ? '수정' : '추가'}되었습니다.`,
      })
      setIsAccountDialogOpen(false)
    } catch (e) {
      toast({ title: '계정 저장 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    if (!confirm(`${account?.name} 계정을 삭제하시겠습니까?`)) return
    try {
    const res = await fetch(withSlug(`${basePath}/accounts`), {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: accountId }),
      })
      const data = await res.json() as ApiResponse
      if (!res.ok) throw new Error(data.error || '계정 삭제 실패')
      await loadAll()
      toast({ title: '계정 삭제 완료', description: `${account?.name} 계정이 삭제되었습니다.` })
    } catch (e) {
      toast({ title: '계정 삭제 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  // Menu visibility functions
  const saveMenuSettings = async (menus: string[], order?: string[]) => {
    setEnabledMenus(menus)
    if (order) setMenuOrder(order)

    // DB에 즉시 반영하여 사이드바가 바로 갱신되도록 함
    await saveMenuSettingsToDb(menus, order || menuOrder)
    const nextSettings = {
      ...(organization.settings || {}),
      enabledMenus: menus,
      menuOrder: order || menuOrder,
    }
    setOrganization({ ...organization, settings: nextSettings })
    try {
      await persistOrganization({ settings: nextSettings })
      window.dispatchEvent(new Event('menuSettingsChanged'))
    } catch (_) {}
  }

  const handleToggleMenu = (menuId: string) => {
    const newEnabledMenus = enabledMenus.includes(menuId)
      ? enabledMenus.filter(id => id !== menuId)
      : [...enabledMenus, menuId]

    saveMenuSettings(newEnabledMenus)

    const menuName = navigationItems.find(item => item.id === menuId)?.name || menuId
    toast({
      title: '메뉴 설정 변경',
      description: `${menuName} 메뉴가 ${enabledMenus.includes(menuId) ? '비활성화' : '활성화'}되었습니다.`,
    })
  }

  const handleEnableAllMenus = () => {
    const allMenuIds = navigationItems.map(item => item.id)
    saveMenuSettings(allMenuIds)
    toast({
      title: '모든 메뉴 활성화',
      description: '모든 메뉴가 활성화되었습니다.',
    })
  }

  const handleDisableAllMenus = () => {
    const essentialMenus = ['settings']
    saveMenuSettings(essentialMenus)
    toast({
      title: '메뉴 비활성화',
      description: '설정 메뉴를 제외한 모든 메뉴가 비활성화되었습니다.',
    })
  }

  // Page permission handlers - debounced save 함수
  const savePermissionsToServer = useCallback(async () => {
    try {
      const currentPermissions = pagePermissionsRef.current
      const payload = Object.entries(currentPermissions).map(([pid, val]) => ({
        page_id: pid,
        manager: val.manager,
        teacher: val.teacher,
      }))
      await fetch(withSlug(`${basePath}/page-permissions`), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: payload }),
      })
    } catch (_) {}
  }, [basePath, slug])

  const handlePermissionChange = (pageId: string, role: 'manager' | 'teacher', checked: boolean) => {
    // 1. UI 즉시 업데이트 (optimistic)
    const next = {
      ...pagePermissionsRef.current,
      [pageId]: {
        ...(pagePermissionsRef.current[pageId] || { manager: false, teacher: false }),
        [role]: checked,
      },
    }
    setPagePermissions(next)
    pagePermissionsRef.current = next // ref도 즉시 업데이트

    // 2. 기존 타이머 취소
    if (permissionSaveTimerRef.current) {
      clearTimeout(permissionSaveTimerRef.current)
    }

    // 3. 300ms 후 최신 상태로 API 호출 (debounce)
    permissionSaveTimerRef.current = setTimeout(() => {
      savePermissionsToServer()
    }, 300)

    // 4. 토스트 즉시 표시
    const roleName = role === 'manager' ? '매니저' : '강사'
    toast({
      title: '권한 설정 변경',
      description: `${pageId} 페이지의 ${roleName} 접속 권한이 ${checked ? '활성화' : '비활성화'}되었습니다.`,
    })
  }

  // Revenue category handlers
  const handleAddRevenueCategory = () => {
    setEditingRevenueCategory(null)
    setRevenueCategoryForm({ name: '', description: '' })
    setIsRevenueCategoryDialogOpen(true)
  }

  const handleEditRevenueCategory = (category: RevenueCategory) => {
    setEditingRevenueCategory(category)
    setRevenueCategoryForm({ name: category.name, description: category.description || '' })
    setIsRevenueCategoryDialogOpen(true)
  }

  const refreshRevenueCategories = async () => {
    const data = await fetchJson<{ categories: any[] }>(withSlug(`${basePath}/revenue-categories`)).catch(() => ({ categories: [] }))
    setRevenueCategories(data.categories || [])
  }

  const handleSaveRevenueCategory = async () => {
    if (!revenueCategoryForm.name.trim()) {
      toast({ title: '입력 오류', description: '항목명을 입력해주세요.', variant: 'destructive' })
      return
    }
    try {
      const method = editingRevenueCategory ? 'PATCH' : 'POST'
      await fetch(withSlug(`${basePath}/revenue-categories`), {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingRevenueCategory?.id,
          name: revenueCategoryForm.name,
          description: revenueCategoryForm.description || null,
          order: editingRevenueCategory?.order,
          is_active: editingRevenueCategory?.is_active ?? true,
        }),
      })
      await refreshRevenueCategories()
      toast({
        title: editingRevenueCategory ? '수입 항목 수정 완료' : '수입 항목 추가 완료',
        description: `${revenueCategoryForm.name} 항목이 ${editingRevenueCategory ? '수정' : '추가'}되었습니다.`,
      })
      setIsRevenueCategoryDialogOpen(false)
    } catch (e) {
      toast({ title: '수입 항목 저장 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const handleToggleRevenueCategory = async (id: string) => {
    const category = revenueCategories.find(c => c.id === id)
    if (!category) return
    try {
      await fetch(withSlug(`${basePath}/revenue-categories`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...category, is_active: !category.is_active }),
      })
      await refreshRevenueCategories()
      toast({
        title: '수입 항목 변경',
        description: `${category.name} 항목이 ${category.is_active ? '비활성화' : '활성화'}되었습니다.`,
      })
    } catch (e) {
      toast({ title: '수입 항목 변경 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const handleDeleteRevenueCategory = async (id: string) => {
    const category = revenueCategories.find(c => c.id === id)
    if (!confirm(`${category?.name} 항목을 삭제하시겠습니까?`)) return
    try {
      await fetch(withSlug(`${basePath}/revenue-categories`), {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await refreshRevenueCategories()
      toast({ title: '수입 항목 삭제 완료', description: `${category?.name} 항목이 삭제되었습니다.` })
    } catch (e) {
      toast({ title: '수입 항목 삭제 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const handleMoveRevenueCategory = async (id: string, direction: 'up' | 'down') => {
    const idx = revenueCategories.findIndex(c => c.id === id)
    if (idx < 0) return
    const target = direction === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= revenueCategories.length) return
    const newCategories = [...revenueCategories]
    ;[newCategories[idx], newCategories[target]] = [newCategories[target], newCategories[idx]]
    // update order in DB
    try {
      await Promise.all(
        newCategories.map((c, idx) =>
          fetch(withSlug(`${basePath}/revenue-categories`), {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: c.id, order: idx }),
          })
        )
      )
      setRevenueCategories(newCategories.map((c, idx) => ({ ...c, order: idx })))
      toast({ title: '순서 변경 완료', description: '수입 항목 순서가 변경되었습니다.' })
    } catch (e) {
      toast({ title: '순서 변경 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const handleResetRevenueCategories = async () => {
    await refreshRevenueCategories()
    toast({ title: '초기화 완료', description: '수입 항목을 다시 불러왔습니다.' })
  }

  // Expense category handlers
  const handleAddExpenseCategory = () => {
    setEditingExpenseCategory(null)
    setExpenseCategoryForm({ name: '', description: '', color: '#6b7280' })
    setIsExpenseCategoryDialogOpen(true)
  }

  const handleEditExpenseCategory = (category: ExpenseCategory) => {
    setEditingExpenseCategory(category)
    setExpenseCategoryForm({
      name: category.name,
      description: category.description || '',
      color: category.color
    })
    setIsExpenseCategoryDialogOpen(true)
  }

  const refreshExpenseCategories = async () => {
    const data = await fetchJson<{ categories: any[] }>(withSlug(`${basePath}/expense-categories`))
    setExpenseCategories(data.categories || [])
  }

  const handleSaveExpenseCategory = async () => {
    if (!expenseCategoryForm.name.trim()) {
      toast({ title: '입력 오류', description: '항목명을 입력해주세요.', variant: 'destructive' })
      return
    }
    try {
      const method = editingExpenseCategory ? 'PATCH' : 'POST'
      await fetch(withSlug(`${basePath}/expense-categories`), {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingExpenseCategory?.id,
          name: expenseCategoryForm.name,
          description: expenseCategoryForm.description || null,
          color: expenseCategoryForm.color,
          order: editingExpenseCategory?.order,
          is_active: editingExpenseCategory?.is_active ?? true,
        }),
      })
      await refreshExpenseCategories()
      toast({
        title: editingExpenseCategory ? '지출 항목 수정 완료' : '지출 항목 추가 완료',
        description: `${expenseCategoryForm.name} 항목이 ${editingExpenseCategory ? '수정' : '추가'}되었습니다.`,
      })
      setIsExpenseCategoryDialogOpen(false)
    } catch (e) {
      toast({ title: '지출 항목 저장 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const handleToggleExpenseCategory = async (id: string) => {
    const category = expenseCategories.find(c => c.id === id)
    if (!category) return
    try {
      await fetch(withSlug(`${basePath}/expense-categories`), {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...category, is_active: !category.is_active }),
      })
      await refreshExpenseCategories()
      toast({
        title: '지출 항목 변경',
        description: `${category.name} 항목이 ${category.is_active ? '비활성화' : '활성화'}되었습니다.`,
      })
    } catch (e) {
      toast({ title: '지출 항목 변경 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const handleDeleteExpenseCategory = async (id: string) => {
    const category = expenseCategories.find(c => c.id === id)
    if (!confirm(`${category?.name} 항목을 삭제하시겠습니까?`)) return
    try {
      await fetch(withSlug(`${basePath}/expense-categories`), {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      await refreshExpenseCategories()
      toast({ title: '지출 항목 삭제 완료', description: `${category?.name} 항목이 삭제되었습니다.` })
    } catch (e) {
      toast({ title: '지출 항목 삭제 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const handleMoveExpenseCategory = async (id: string, direction: 'up' | 'down') => {
    const idx = expenseCategories.findIndex(c => c.id === id)
    if (idx < 0) return
    const target = direction === 'up' ? idx - 1 : idx + 1
    if (target < 0 || target >= expenseCategories.length) return
    const newCategories = [...expenseCategories]
    ;[newCategories[idx], newCategories[target]] = [newCategories[target], newCategories[idx]]
    try {
      await Promise.all(
        newCategories.map((c, idx) =>
          fetch(withSlug(`${basePath}/expense-categories`), {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: c.id, order: idx }),
          })
        )
      )
      setExpenseCategories(newCategories.map((c, idx) => ({ ...c, order: idx })))
      toast({ title: '순서 변경 완료', description: '지출 항목 순서가 변경되었습니다.' })
    } catch (e) {
      toast({ title: '순서 변경 실패', description: e instanceof Error ? e.message : undefined, variant: 'destructive' })
    }
  }

  const handleResetExpenseCategories = async () => {
    await refreshExpenseCategories()
    toast({ title: '초기화 완료', description: '지출 항목을 다시 불러왔습니다.' })
  }

  const roomColumns: ColumnDef<Room>[] = [
    {
      accessorKey: 'name',
      header: '교실명',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <DoorOpen className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue('name')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'capacity',
      header: '수용 인원',
      cell: ({ row }) => `${row.getValue('capacity')}명`,
    },
    {
      accessorKey: 'notes',
      header: '비고',
      cell: ({ row }) => row.getValue('notes') || '-',
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => {
        const status = (row.getValue('status') as Room['status']) ?? 'active'
        const statusInfo = statusMap[status] ?? { label: '미정', variant: 'outline' }
        return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const room = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditRoom(room)}>
                <Edit className="mr-2 h-4 w-4" />
                수정
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteRoom(room.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const branchColumns: ColumnDef<Branch>[] = [
    {
      accessorKey: 'name',
      header: '지점명',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue('name')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'address',
      header: '주소',
    },
    {
      accessorKey: 'phone',
      header: '전화번호',
    },
    {
      accessorKey: 'manager_name',
      header: '담당자',
    },
    {
      accessorKey: 'status',
      header: '상태',
      cell: ({ row }) => {
        const status = (row.getValue('status') as Branch['status']) ?? 'active'
        const statusInfo = statusMap[status] ?? { label: '미정', variant: 'outline' }
        return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const branch = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditBranch(branch)}>
                <Edit className="mr-2 h-4 w-4" />
                수정
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleDeleteBranch(branch.id)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  // Account columns
  const accountColumns: ColumnDef<Account>[] = [
    {
      accessorKey: 'email',
      header: '아이디',
      filterFn: (row, id, value) => {
        const term = String(value || '').toLowerCase()
        if (!term) return true
        const email = String(row.getValue('email') || '').toLowerCase()
        const name = String(row.getValue('name') || '').toLowerCase()
        return email.includes(term) || name.includes(term)
      },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium font-mono">{row.getValue('email')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'name',
      header: '이름',
    },
    {
      accessorKey: 'role',
      header: '역할',
      cell: ({ row }) => {
        const role = row.getValue('role') as UserRole
        const roleMap: Record<string, { label: string; color: string }> = {
          owner: { label: '원장', color: 'bg-yellow-100 text-yellow-800' },
          manager: { label: '매니저', color: 'bg-blue-100 text-blue-800' },
          teacher: { label: '강사', color: 'bg-green-100 text-green-800' },
          super_admin: { label: '슈퍼관리자', color: 'bg-purple-100 text-purple-800' },
        }
        const roleInfo = roleMap[role] ?? { label: role || '미정', color: 'bg-slate-100 text-slate-800' }
        return (
          <Badge className={roleInfo.color}>
            {roleInfo.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: '입사일',
      cell: ({ row }) => {
        const value = row.getValue('createdAt')
        if (!value) return '-'
        const date = new Date(value as string)
        if (isNaN(date.getTime())) return '-'
        return date.toLocaleDateString('ko-KR')
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const account = row.original
        // 관리자 계정은 삭제/수정 불가
        const isAdmin = account.role === 'owner'
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleEditAccount(account)}>
                <Edit className="mr-2 h-4 w-4" />
                수정
              </DropdownMenuItem>
              {!isAdmin && (
                <DropdownMenuItem
                  onClick={() => handleDeleteAccount(account.id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">설정</h1>
        <p className="text-muted-foreground">시스템 설정을 관리하세요</p>
      </div>

      <Tabs defaultValue="organization">
        <TabsList>
          <TabsTrigger value="organization">기관 정보</TabsTrigger>
          <TabsTrigger value="branches">지점 관리</TabsTrigger>
          <TabsTrigger value="rooms">교실 관리</TabsTrigger>
          <TabsTrigger value="accounts">계정 관리</TabsTrigger>
          <TabsTrigger value="revenue">수입관리</TabsTrigger>
          <TabsTrigger value="expense">지출관리</TabsTrigger>
          <TabsTrigger value="menus">메뉴 관리</TabsTrigger>
          <TabsTrigger value="kakaotalk">알림톡 설정</TabsTrigger>
          <TabsTrigger value="billing">서비스 이용내역</TabsTrigger>
        </TabsList>

        {/* Organization Info Tab */}
        <TabsContent value="organization" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>기관 정보</CardTitle>
              <CardDescription>기관의 기본 정보를 설정하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Logo Upload Section */}
              <div className="space-y-2">
                <Label>기관 로고</Label>
                <div className="flex items-start gap-4">
                  {/* Logo Preview */}
                  <div className="flex-shrink-0">
                    {organization.logo_url ? (
                      <div className="relative group">
                        <img
                          src={organization.logo_url}
                          alt="Organization Logo"
                          className="h-24 w-24 object-contain rounded-lg border-2 border-gray-200"
                        />
                        <button
                          onClick={handleRemoveLogo}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="h-24 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                        <ImageIcon className="h-8 w-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Upload Button */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        id="logo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        onClick={() => document.getElementById('logo-upload')?.click()}
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {organization.logo_url ? '로고 변경' : '로고 업로드'}
                      </Button>
                      {organization.logo_url && (
                        <Button variant="destructive" onClick={handleRemoveLogo}>
                          <X className="mr-2 h-4 w-4" />
                          로고 삭제
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      권장 크기: 200x200px, 최대 2MB (PNG, JPG, SVG)
                    </p>
                  </div>
                </div>
              </div>

              {/* Institution ID (Read-only) */}
              <div className="space-y-2">
                <Label htmlFor="institution-id">기관 아이디</Label>
                <Input
                  id="institution-id"
                  value={institutionName}
                  disabled
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground">
                  이 아이디는 URL에 사용되며 변경할 수 없습니다
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-name">기관명 (지점명)</Label>
                  <Input
                    id="org-name"
                    value={organization.name || ''}
                    onChange={(e) =>
                      setOrganization({ ...organization, name: e.target.value })
                    }
                    placeholder="예: 서울 학원 강남점"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="owner-name">원장 이름</Label>
                  <Input
                    id="owner-name"
                    value={organization.owner_name || ''}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">가입 시 등록된 이름입니다</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-phone">전화번호</Label>
                  <Input
                    id="org-phone"
                    value={organization.phone || ''}
                    onChange={(e) =>
                      setOrganization({ ...organization, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-email">이메일</Label>
                  <Input
                    id="org-email"
                    type="email"
                    value={organization.email || ''}
                    onChange={(e) =>
                      setOrganization({ ...organization, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="org-address">주소</Label>
                <Input
                  id="org-address"
                  value={organization.address || ''}
                  onChange={(e) =>
                    setOrganization({ ...organization, address: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveOrganization}>저장</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>지점 관리</CardTitle>
              <CardDescription>등록된 지점을 관리하세요</CardDescription>
            </div>
            <Button onClick={handleAddBranch}>
              <Plus className="mr-2 h-4 w-4" /> 지점 추가
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 지점</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{branches.length}개</div>
                <p className="text-xs text-muted-foreground">등록된 전체 지점</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">운영 지점</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{branches.filter(b => b.status === 'active').length}개</div>
                <p className="text-xs text-muted-foreground">운영 중 지점</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">비활성 지점</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-muted-foreground">{branches.filter(b => b.status !== 'active').length}개</div>
                <p className="text-xs text-muted-foreground">미운영/중단 지점</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">지점 목록</CardTitle>
              <Button variant="outline" size="sm" onClick={handleAddBranch}>
                <Plus className="mr-2 h-4 w-4" /> 지점 추가
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2">지점명</th>
                      <th className="py-2">주소</th>
                      <th className="py-2">전화번호</th>
                      <th className="py-2">담당자</th>
                      <th className="py-2">상태</th>
                      <th className="py-2 text-right">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((branch) => (
                      <tr key={branch.id} className="border-b last:border-0">
                        <td className="py-2 font-medium">{branch.name}</td>
                        <td className="py-2 text-muted-foreground">{branch.address}</td>
                        <td className="py-2 text-muted-foreground">{branch.phone}</td>
                        <td className="py-2 text-muted-foreground">{branch.manager_name || '-'}</td>
                        <td className="py-2">
                          <Badge variant={branch.status === 'active' ? 'default' : 'secondary'}>
                            {branch.status === 'active' ? '운영중' : '미운영'}
                          </Badge>
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="sm" onClick={() => handleEditBranch(branch)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteBranch(branch.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {branches.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-muted-foreground">
                          등록된 지점이 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rooms Tab */}
        <TabsContent value="rooms" className="space-y-4">
          {/* Room Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 교실</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rooms.length}개</div>
                <p className="text-xs text-muted-foreground">등록된 전체 교실</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">활성 교실</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    rooms.filter((r) => {
                      const s = (r.status || '').toString().toLowerCase()
                      return s === 'active' || s === 'available' || s === '사용 가능'
                    }).length
                  }개
                </div>
                <p className="text-xs text-muted-foreground">운영 중인 교실</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 수용 인원</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {rooms.reduce((sum, r) => sum + r.capacity, 0)}명
                </div>
                <p className="text-xs text-muted-foreground">전체 교실 수용 가능 인원</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>교실 관리</CardTitle>
                <CardDescription>등록된 교실을 관리하세요</CardDescription>
              </div>
              <Button onClick={handleAddRoom}>
                <Plus className="mr-2 h-4 w-4" />
                교실 추가
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={roomColumns}
                data={rooms}
                searchKey="name"
                searchPlaceholder="교실명으로 검색..."
              />
            </CardContent>
          </Card>

        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          {/* Account Stats (탭 바로 아래) */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 계정</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{accounts.length}개</div>
                <p className="text-xs text-muted-foreground">등록된 전체 계정</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">강사 계정</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {accounts.filter((a) => a.role === 'teacher').length}개
                </div>
                <p className="text-xs text-muted-foreground">강사 전용 계정</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">매니저 계정</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {accounts.filter((a) => a.role === 'manager').length}개
                </div>
                <p className="text-xs text-muted-foreground">매니저 전용 계정</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">대기중 초대</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {invitations.filter((i) => i.status === 'pending').length}개
                </div>
                <p className="text-xs text-muted-foreground">승인 대기중인 초대</p>
              </CardContent>
            </Card>
          </div>

          {/* 초대하기 섹션 */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>팀원 초대</CardTitle>
                <CardDescription>이메일로 새로운 팀원을 초대하세요</CardDescription>
              </div>
              <Button onClick={handleOpenInviteDialog}>
                <UserPlus className="mr-2 h-4 w-4" />
                초대하기
              </Button>
            </CardHeader>
            {invitations.length > 0 && (
              <CardContent>
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">대기중인 초대</h4>
                  {invitations.filter(i => i.status === 'pending').map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between p-3 border rounded-lg bg-orange-50 border-orange-200">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                          <UserPlus className="h-4 w-4 text-orange-600" />
                        </div>
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {invitation.role === 'teacher' ? '강사' : invitation.role === 'manager' ? '매니저' : '원장'}
                            {' · '}
                            {new Date(invitation.expires_at) > new Date()
                              ? `${Math.ceil((new Date(invitation.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))}일 후 만료`
                              : '만료됨'
                            }
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleResendInvitation(invitation.id)}>
                          <RotateCcw className="h-4 w-4 mr-1" />
                          재전송
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleCancelInvitation(invitation.id)}>
                          <X className="h-4 w-4 mr-1" />
                          취소
                        </Button>
                      </div>
                    </div>
                  ))}
                  {invitations.filter(i => i.status === 'pending').length === 0 && (
                    <p className="text-sm text-muted-foreground py-2">대기중인 초대가 없습니다.</p>
                  )}
                </div>
              </CardContent>
            )}
          </Card>

          {/* 기존 계정 관리 */}
          <Card>
            <CardHeader>
              <CardTitle>등록된 계정</CardTitle>
              <CardDescription>현재 시스템에 등록된 사용자 계정입니다</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={accountColumns}
                data={accounts}
                searchKey="email"
                searchPlaceholder="이름 또는 이메일로 검색..."
              />
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <CardTitle>계정 역할 설명</CardTitle>
              <CardDescription>각 역할의 권한을 확인하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 border rounded-lg bg-yellow-50 border-yellow-200">
                  <Shield className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-900">원장</p>
                    <p className="text-sm text-yellow-700">
                      모든 기능에 접근 가능하며, 계정 관리 및 페이지 권한 설정이 가능합니다.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg bg-blue-50 border-blue-200">
                  <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900">강사</p>
                    <p className="text-sm text-blue-700">
                      원장이 허용한 페이지에만 접근 가능하며, 수업 관련 기능을 사용할 수 있습니다.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 border rounded-lg bg-green-50 border-green-200">
                  <Shield className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900">직원</p>
                    <p className="text-sm text-green-700">
                      원장이 허용한 페이지에만 접근 가능하며, 기본적인 관리 업무를 수행할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Categories Tab */}
        <TabsContent value="revenue" className="space-y-4">
          {/* Revenue Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 항목</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{revenueCategories.length}개</div>
                <p className="text-xs text-muted-foreground">전체 수입 항목</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">활성 항목</CardTitle>
                <DollarSign className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {revenueCategories.filter(c => c.is_active).length}개
                </div>
                <p className="text-xs text-muted-foreground">사용 가능한 항목</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">비활성 항목</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">
                  {revenueCategories.filter(c => !c.is_active).length}개
                </div>
                <p className="text-xs text-muted-foreground">사용하지 않는 항목</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>수입 항목 관리</CardTitle>
                <CardDescription>
                  매출정산 페이지에서 사용할 수입 항목을 관리하세요
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleResetRevenueCategories}>
                  초기화
                </Button>
                <Button onClick={handleAddRevenueCategory}>
                  <Plus className="mr-2 h-4 w-4" />
                  항목 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {revenueCategories.map((category, index) => (
                  <div
                    key={category.id}
                    className={cn(
                      'flex items-center gap-3 p-4 border rounded-lg transition-colors',
                      category.is_active ? 'bg-background' : 'bg-muted/30'
                    )}
                  >
                    {/* Order controls */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => handleMoveRevenueCategory(category.id, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-5 w-5 p-0"
                        onClick={() => handleMoveRevenueCategory(category.id, 'down')}
                        disabled={index === revenueCategories.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Category info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <DollarSign className={cn(
                        'h-5 w-5 shrink-0',
                        category.is_active ? 'text-green-600' : 'text-muted-foreground'
                      )} />
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'font-medium',
                            category.is_active ? 'text-foreground' : 'text-muted-foreground'
                          )}>
                            {category.name}
                          </span>
                          <Badge variant={category.is_active ? 'default' : 'secondary'}>
                            {category.is_active ? '활성' : '비활성'}
                          </Badge>
                        </div>
                        {category.description && (
                          <span className="text-sm text-muted-foreground truncate">
                            {category.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={category.is_active}
                        onCheckedChange={() => handleToggleRevenueCategory(category.id)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditRevenueCategory(category)}>
                            <Edit className="mr-2 h-4 w-4" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteRevenueCategory(category.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}

                {revenueCategories.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                    <DollarSign className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground mb-2">
                      등록된 수입 항목이 없습니다
                    </p>
                    <Button variant="outline" size="sm" onClick={handleAddRevenueCategory}>
                      <Plus className="mr-2 h-4 w-4" />
                      첫 항목 추가하기
                    </Button>
                  </div>
                )}
              </div>

            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Management Tab */}
        <TabsContent value="expense" className="space-y-4">
          {/* Expense Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 항목</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{expenseCategories.length}개</div>
                <p className="text-xs text-muted-foreground">전체 지출 항목</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">활성 항목</CardTitle>
                <DollarSign className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {expenseCategories.filter(c => c.is_active).length}개
                </div>
                <p className="text-xs text-muted-foreground">사용 가능한 항목</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">비활성 항목</CardTitle>
                <DollarSign className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">
                  {expenseCategories.filter(c => !c.is_active).length}개
                </div>
                <p className="text-xs text-muted-foreground">사용하지 않는 항목</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>지출 항목 관리</CardTitle>
                <CardDescription>
                  매출정산 페이지에서 사용할 지출 항목을 관리합니다. 각 항목의 색상을 지정하여 차트에서 구분할 수 있습니다.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetExpenseCategories}
                  disabled={expenseCategories.length === 0}
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  초기화
                </Button>
                <Button variant="default" size="sm" onClick={handleAddExpenseCategory}>
                  <Plus className="mr-2 h-4 w-4" />
                  항목 추가
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {expenseCategories.map((category, index) => (
                  <div
                    key={category.id}
                    className={cn(
                      'flex items-center gap-4 p-4 border rounded-lg transition-colors',
                      category.is_active ? 'bg-background' : 'bg-muted/30'
                    )}
                  >
                    {/* Order controls */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleMoveExpenseCategory(category.id, 'up')}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleMoveExpenseCategory(category.id, 'down')}
                        disabled={index === expenseCategories.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Color indicator */}
                    <div
                      className="h-8 w-8 rounded-md border-2 shrink-0"
                      style={{ backgroundColor: category.color }}
                    />

                    {/* Category info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <DollarSign className={cn(
                        'h-5 w-5 shrink-0',
                        category.is_active ? 'text-orange-600' : 'text-muted-foreground'
                      )} />
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'font-medium',
                            category.is_active ? 'text-foreground' : 'text-muted-foreground'
                          )}>
                            {category.name}
                          </span>
                          <Badge variant={category.is_active ? 'default' : 'secondary'}>
                            {category.is_active ? '활성' : '비활성'}
                          </Badge>
                        </div>
                        {category.description && (
                          <span className="text-sm text-muted-foreground truncate">
                            {category.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={category.is_active}
                        onCheckedChange={() => handleToggleExpenseCategory(category.id)}
                      />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditExpenseCategory(category)}>
                            <Edit className="mr-2 h-4 w-4" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteExpenseCategory(category.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}

                {expenseCategories.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                    <DollarSign className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
                    <p className="text-sm text-muted-foreground mb-2">
                      등록된 지출 항목이 없습니다
                    </p>
                    <Button variant="outline" size="sm" onClick={handleAddExpenseCategory}>
                      <Plus className="mr-2 h-4 w-4" />
                      첫 항목 추가하기
                    </Button>
                  </div>
                )}
              </div>

              {expenseCategories.length > 0 && (
                <div className="mt-4 p-3 border border-orange-200 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-800">
                    <strong>참고:</strong> 활성화된 지출 항목만 매출정산 페이지에서 사용할 수 있습니다.
                    순서는 위아래 화살표 버튼으로 조정할 수 있으며, 각 항목의 색상은 차트에서 사용됩니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>

        {/* Menus Tab */}
        <TabsContent value="menus" className="space-y-4">
          {/* Menu Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">총 메뉴</CardTitle>
                <Menu className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{navigationItems.length}개</div>
                <p className="text-xs text-muted-foreground">전체 메뉴 개수</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">활성화된 메뉴</CardTitle>
                <Menu className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{enabledMenus.length}개</div>
                <p className="text-xs text-muted-foreground">사이드바에 표시</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">비활성화된 메뉴</CardTitle>
                <Menu className="h-4 w-4 text-gray-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">
                  {navigationItems.length - enabledMenus.length}개
                </div>
                <p className="text-xs text-muted-foreground">사이드바에 숨김</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>메뉴 관리</CardTitle>
                <CardDescription>
                  사이드바에 표시할 메뉴를 선택하세요. 사용하지 않는 메뉴는 비활성화할 수 있습니다.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleDisableAllMenus}>
                  모두 비활성화
                </Button>
                <Button variant="default" size="sm" onClick={handleEnableAllMenus}>
                  모두 활성화
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  const isEnabled = enabledMenus.includes(item.id)
                  const isEssential = item.id === 'settings'

                  const permission = pagePermissions[item.id] || { manager: false, teacher: false }

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        'flex flex-col gap-3 p-4 border rounded-lg transition-colors',
                        isEnabled ? 'bg-background' : 'bg-muted/30'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <Icon className={cn(
                            'h-5 w-5 shrink-0',
                            isEnabled ? 'text-primary' : 'text-muted-foreground'
                          )} />
                          <div className="flex flex-col gap-1 min-w-0">
                            <span className={cn(
                              'font-medium',
                              isEnabled ? 'text-foreground' : 'text-muted-foreground'
                            )}>
                              {item.name}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {item.badges.map((badge) => (
                                <span
                                  key={badge}
                                  className={cn(
                                    'px-1.5 py-0.5 text-[10px] font-medium rounded',
                                    badge === '학원용' && 'bg-blue-50 text-blue-600',
                                    badge === '독서실' && 'bg-green-50 text-green-600',
                                    badge === '공부방' && 'bg-orange-50 text-orange-600'
                                  )}
                                >
                                  {badge}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <Switch
                          checked={isEnabled}
                          onCheckedChange={() => handleToggleMenu(item.id)}
                          disabled={isEssential}
                        />
                      </div>

                      {/* 권한 설정 */}
                      {isEnabled && !isEssential && (
                        <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                            <span className="text-xs font-semibold text-blue-900">접근 권한 설정</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id={`manager-${item.id}`}
                                checked={permission.manager}
                                onCheckedChange={(checked) => handlePermissionChange(item.id, 'manager', checked as boolean)}
                                className="h-3.5 w-3.5"
                              />
                              <Label
                                htmlFor={`manager-${item.id}`}
                                className="text-xs font-medium cursor-pointer whitespace-nowrap"
                              >
                                매니저 접속 가능
                              </Label>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Checkbox
                                id={`teacher-${item.id}`}
                                checked={permission.teacher}
                                onCheckedChange={(checked) => handlePermissionChange(item.id, 'teacher', checked as boolean)}
                                className="h-3.5 w-3.5"
                              />
                              <Label
                                htmlFor={`teacher-${item.id}`}
                                className="text-xs font-medium cursor-pointer whitespace-nowrap"
                              >
                                강사 접속 가능
                              </Label>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              {enabledMenus.length < navigationItems.length && (
                <div className="mt-4 p-3 border border-yellow-200 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>참고:</strong> 비활성화된 메뉴는 사이드바에 표시되지 않습니다. 설정 메뉴는 항상 활성화되어 있습니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>

        {/* KakaoTalk Notification Settings Tab */}
        <TabsContent value="kakaotalk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                알림톡 설정
              </CardTitle>
              <CardDescription>
                학부모에게 자동으로 발송되는 카카오톡 알림을 설정하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 메시지 발송 방식 선택 */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">메시지 발송 방식</Label>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant={organization.settings.use_sms ? 'default' : 'outline'}
                    className="gap-2"
                    onClick={() => {
                      const nextSettings = {
                        ...organization.settings,
                        use_sms: true,
                        use_kakao: false,
                      }
                      setOrganization({ ...organization, settings: nextSettings })
                      persistOrganization({ settings: nextSettings })
                      toast({ title: '설정 변경', description: 'SMS 사용으로 변경되었습니다.' })
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                    SMS 사용하기
                  </Button>
                  <Button
                    type="button"
                    variant={organization.settings.use_kakao ? 'default' : 'outline'}
                    className="gap-2"
                    onClick={() => {
                      const nextSettings = {
                        ...organization.settings,
                        use_sms: false,
                        use_kakao: true,
                      }
                      setOrganization({ ...organization, settings: nextSettings })
                      persistOrganization({ settings: nextSettings })
                      toast({ title: '설정 변경', description: '카카오메세지 사용으로 변경되었습니다.' })
                    }}
                  >
                    <MessageSquare className="h-4 w-4" />
                    카카오메세지 사용하기
                  </Button>
                </div>
              </div>

              {/* 출결 알림 (통합) */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  출결 알림
                </h3>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>지각 알림</Label>
                      <p className="text-sm text-muted-foreground">
                        학생이 등록한 스케줄(수업/commute)에 맞게 도착하지 않았을 때
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">수신자:</span>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant={notificationTargets['late'] === 'parent' || notificationTargets['late'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('late', notificationTargets['late'] === 'both' ? 'student' : notificationTargets['late'] === 'parent' ? 'both' : 'parent')}>학부모</Button>
                        <Button type="button" size="sm" variant={notificationTargets['late'] === 'student' || notificationTargets['late'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('late', notificationTargets['late'] === 'both' ? 'parent' : notificationTargets['late'] === 'student' ? 'both' : 'student')}>학생</Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('late', 'parent')}>학부모 템플릿</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('late', 'student')}>학생 템플릿</Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>결석 알림</Label>
                      <p className="text-sm text-muted-foreground">
                        학생이 예정된 일정에 출석하지 않아 결석 처리되었을 때
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">수신자:</span>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant={notificationTargets['absent'] === 'parent' || notificationTargets['absent'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('absent', notificationTargets['absent'] === 'both' ? 'student' : notificationTargets['absent'] === 'parent' ? 'both' : 'parent')}>학부모</Button>
                        <Button type="button" size="sm" variant={notificationTargets['absent'] === 'student' || notificationTargets['absent'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('absent', notificationTargets['absent'] === 'both' ? 'parent' : notificationTargets['absent'] === 'student' ? 'both' : 'student')}>학생</Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('absent', 'parent')}>학부모 템플릿</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('absent', 'student')}>학생 템플릿</Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>입실/등원 알림</Label>
                      <p className="text-sm text-muted-foreground">
                        학생이 도착했을 때
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">수신자:</span>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant={notificationTargets['checkin'] === 'parent' || notificationTargets['checkin'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('checkin', notificationTargets['checkin'] === 'both' ? 'student' : notificationTargets['checkin'] === 'parent' ? 'both' : 'parent')}>학부모</Button>
                        <Button type="button" size="sm" variant={notificationTargets['checkin'] === 'student' || notificationTargets['checkin'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('checkin', notificationTargets['checkin'] === 'both' ? 'parent' : notificationTargets['checkin'] === 'student' ? 'both' : 'student')}>학생</Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('checkin', 'parent')}>학부모 템플릿</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('checkin', 'student')}>학생 템플릿</Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>퇴실/하원 알림</Label>
                      <p className="text-sm text-muted-foreground">
                        학생이 귀가했을 때
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">수신자:</span>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant={notificationTargets['checkout'] === 'parent' || notificationTargets['checkout'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('checkout', notificationTargets['checkout'] === 'both' ? 'student' : notificationTargets['checkout'] === 'parent' ? 'both' : 'parent')}>학부모</Button>
                        <Button type="button" size="sm" variant={notificationTargets['checkout'] === 'student' || notificationTargets['checkout'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('checkout', notificationTargets['checkout'] === 'both' ? 'parent' : notificationTargets['checkout'] === 'student' ? 'both' : 'student')}>학생</Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('checkout', 'parent')}>학부모 템플릿</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('checkout', 'student')}>학생 템플릿</Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 외출/복귀 알림 - 스터디카페 전용 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  외출/복귀 알림 <Badge variant="secondary" className="ml-2">스터디카페 전용</Badge>
                </h3>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>외출 알림</Label>
                      <p className="text-sm text-muted-foreground">
                        학생이 외출했을 때
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">수신자:</span>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant={notificationTargets['study_out'] === 'parent' || notificationTargets['study_out'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('study_out', notificationTargets['study_out'] === 'both' ? 'student' : notificationTargets['study_out'] === 'parent' ? 'both' : 'parent')}>학부모</Button>
                        <Button type="button" size="sm" variant={notificationTargets['study_out'] === 'student' || notificationTargets['study_out'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('study_out', notificationTargets['study_out'] === 'both' ? 'parent' : notificationTargets['study_out'] === 'student' ? 'both' : 'student')}>학생</Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('study_out', 'parent')}>학부모 템플릿</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('study_out', 'student')}>학생 템플릿</Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>복귀 알림</Label>
                      <p className="text-sm text-muted-foreground">
                        학생이 외출 후 복귀했을 때
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">수신자:</span>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant={notificationTargets['study_return'] === 'parent' || notificationTargets['study_return'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('study_return', notificationTargets['study_return'] === 'both' ? 'student' : notificationTargets['study_return'] === 'parent' ? 'both' : 'parent')}>학부모</Button>
                        <Button type="button" size="sm" variant={notificationTargets['study_return'] === 'student' || notificationTargets['study_return'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('study_return', notificationTargets['study_return'] === 'both' ? 'parent' : notificationTargets['study_return'] === 'student' ? 'both' : 'student')}>학생</Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('study_return', 'parent')}>학부모 템플릿</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('study_return', 'student')}>학생 템플릿</Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 학습 관련 알림 - 독서실 전용 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  학습 알림 <Badge variant="secondary" className="ml-2">독서실 전용</Badge>
                </h3>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5 flex-1">
                      <Label>당일 학습 진행 결과 (일괄 전송)</Label>
                      <p className="text-sm text-muted-foreground">
                        매일 설정된 시간에 오늘의 플래너 데이터를 일괄 전송
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        💡 학생이 하루에 여러 번 입실/퇴실해도 플래너는 하루 단위로 유지되며, 설정 시간에 한 번만 전송됩니다
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">수신자:</span>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant={notificationTargets['daily_report'] === 'parent' || notificationTargets['daily_report'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('daily_report', notificationTargets['daily_report'] === 'both' ? 'student' : notificationTargets['daily_report'] === 'parent' ? 'both' : 'parent')}>학부모</Button>
                        <Button type="button" size="sm" variant={notificationTargets['daily_report'] === 'student' || notificationTargets['daily_report'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('daily_report', notificationTargets['daily_report'] === 'both' ? 'parent' : notificationTargets['daily_report'] === 'student' ? 'both' : 'student')}>학생</Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('daily_report', 'parent')}>학부모 템플릿</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('daily_report', 'student')}>학생 템플릿</Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 pt-2 border-t">
                    <Label htmlFor="daily-report-time" className="text-sm whitespace-nowrap">
                      전송 시간
                    </Label>
                    <Select value={dailyReportTime} onValueChange={handleDailyReportTimeChange}>
                      <SelectTrigger id="daily-report-time" className="w-32">
                        <SelectValue placeholder="시간 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="18:00">오후 6시</SelectItem>
                        <SelectItem value="19:00">오후 7시</SelectItem>
                        <SelectItem value="20:00">오후 8시</SelectItem>
                        <SelectItem value="21:00">오후 9시</SelectItem>
                        <SelectItem value="22:00">오후 10시 (기본)</SelectItem>
                        <SelectItem value="23:00">오후 11시</SelectItem>
                        <SelectItem value="00:00">자정</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      매일 이 시간에 자동으로 전송됩니다
                    </p>
                  </div>
                </div>
              </div>

              {/* 수업일지 알림 - 학원/공부방 전용 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  수업일지 알림 <Badge variant="secondary" className="ml-2">학원·공부방 전용</Badge>
                </h3>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>수업일지 알림톡 기능</Label>
                      <p className="text-sm text-muted-foreground">
                        수업일지 작성 후 AI 생성 알림톡을 학부모에게 발송
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded border border-blue-200">
                    📝 수업일지 작성, AI 피드백 생성, 알림톡 발송은 <strong>수업일지 페이지</strong>에서 진행해주세요.
                  </div>
                </div>
              </div>

              {/* 시험 관리 알림 - 학원/공부방 전용 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  시험 관리 알림 <Badge variant="secondary" className="ml-2">학원·공부방 전용</Badge>
                </h3>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>시험 결과 전송 (관리자 승인 후)</Label>
                      <p className="text-sm text-muted-foreground">
                        시험 결과 입력 → 관리자 승인 → 전송
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">수신자:</span>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant={notificationTargets['exam_result'] === 'parent' || notificationTargets['exam_result'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('exam_result', notificationTargets['exam_result'] === 'both' ? 'student' : notificationTargets['exam_result'] === 'parent' ? 'both' : 'parent')}>학부모</Button>
                        <Button type="button" size="sm" variant={notificationTargets['exam_result'] === 'student' || notificationTargets['exam_result'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('exam_result', notificationTargets['exam_result'] === 'both' ? 'parent' : notificationTargets['exam_result'] === 'student' ? 'both' : 'student')}>학생</Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('exam_result', 'parent')}>학부모 템플릿</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('exam_result', 'student')}>학생 템플릿</Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                    💡 시험 결과는 관리자가 승인 버튼을 눌러야 발송됩니다
                  </div>
                </div>
              </div>

              {/* 과제 관리 알림 - 학원/공부방 전용 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  과제 관리 알림 <Badge variant="secondary" className="ml-2">학원·공부방 전용</Badge>
                </h3>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>새 과제 알림</Label>
                      <p className="text-sm text-muted-foreground">
                        과제 등록 → 관리자 승인 → 전송
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">수신자:</span>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant={notificationTargets['assignment_new'] === 'parent' || notificationTargets['assignment_new'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('assignment_new', notificationTargets['assignment_new'] === 'both' ? 'student' : notificationTargets['assignment_new'] === 'parent' ? 'both' : 'parent')}>학부모</Button>
                        <Button type="button" size="sm" variant={notificationTargets['assignment_new'] === 'student' || notificationTargets['assignment_new'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('assignment_new', notificationTargets['assignment_new'] === 'both' ? 'parent' : notificationTargets['assignment_new'] === 'student' ? 'both' : 'student')}>학생</Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('assignment_new', 'parent')}>학부모 템플릿</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('assignment_new', 'student')}>학생 템플릿</Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>과제 마감 알림</Label>
                      <p className="text-sm text-muted-foreground">
                        마감일 전 자동 발송
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">수신자:</span>
                      <div className="flex gap-1">
                        <Button type="button" size="sm" variant={notificationTargets['assignment_remind'] === 'parent' || notificationTargets['assignment_remind'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('assignment_remind', notificationTargets['assignment_remind'] === 'both' ? 'student' : notificationTargets['assignment_remind'] === 'parent' ? 'both' : 'parent')}>학부모</Button>
                        <Button type="button" size="sm" variant={notificationTargets['assignment_remind'] === 'student' || notificationTargets['assignment_remind'] === 'both' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => handleTargetChange('assignment_remind', notificationTargets['assignment_remind'] === 'both' ? 'parent' : notificationTargets['assignment_remind'] === 'student' ? 'both' : 'student')}>학생</Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('assignment_remind', 'parent')}>학부모 템플릿</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleOpenTemplateModal('assignment_remind', 'student')}>학생 템플릿</Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Billing Tab */}
        <TabsContent value="billing" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">1월 현재 이용료</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₩{(kakaoTalkUsages.reduce((sum, item) => sum + item.cost, 0) + serviceUsages.reduce((sum, item) => sum + item.cost, 0)).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  알림톡: ₩{kakaoTalkUsages.reduce((sum, item) => sum + item.cost, 0).toLocaleString()} / 서비스: ₩{serviceUsages.reduce((sum, item) => sum + item.cost, 0).toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">잔여 충전금</CardTitle>
                <WalletIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-muted-foreground">₩0</div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">
                    충전 내역 없음
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={() => {
                      toast({
                        title: '충전 기능',
                        description: '결제 시스템 연동 예정입니다.',
                      })
                    }}
                  >
                    충전하기
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => setShowPricingPlans(!showPricingPlans)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">서비스 플랜</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">스탠다드</div>
                <p className="text-xs text-muted-foreground mt-1">
                  학생 20~50명 · ₩30,000/월
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full mt-2 text-xs text-muted-foreground"
                >
                  {showPricingPlans ? '접기' : '플랜 상세보기'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Plans - Conditional Rendering */}
          {showPricingPlans && (
            <div className="grid gap-6 md:grid-cols-3">
            {/* Free Plan */}
            <Card className="relative">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Check className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">무료</CardTitle>
                    <CardDescription>시작하기 좋은 플랜</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold">₩0</div>
                  <p className="text-sm text-muted-foreground">/ 월</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>학생 20명까지</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>기본 기능 제공</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>알림톡 별도 과금</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <X className="h-4 w-4" />
                    <span>고급 분석 기능</span>
                  </div>
                </div>
                <Button variant="outline" className="w-full" disabled>
                  현재 플랜
                </Button>
              </CardContent>
            </Card>

            {/* Standard Plan */}
            <Card className="relative border-2 border-primary shadow-lg">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary">추천</Badge>
              </div>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">스탠다드</CardTitle>
                    <CardDescription>성장하는 학원에 최적</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold">₩30,000</div>
                  <p className="text-sm text-muted-foreground">/ 월</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>학생 20~50명</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>모든 기본 기능</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>알림톡 별도 과금</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>고급 분석 기능</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>우선 고객 지원</span>
                  </div>
                </div>
                <Button className="w-full">
                  업그레이드
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className="relative">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Crown className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">프로</CardTitle>
                    <CardDescription>대규모 학원용</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-3xl font-bold">₩60,000</div>
                  <p className="text-sm text-muted-foreground">/ 월</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>학생 50명 이상</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>모든 프리미엄 기능</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>알림톡 별도 과금</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>고급 분석 + AI 인사이트</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>전담 고객 지원</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>맞춤 기능 개발</span>
                  </div>
                </div>
                <Button className="w-full">
                  업그레이드
                </Button>
              </CardContent>
            </Card>
            </div>
          )}

          {/* Usage Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>이용 내역</CardTitle>
                  <CardDescription>알림톡 및 서비스 이용 내역을 확인하세요</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select defaultValue="2025">
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="년도" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025년</SelectItem>
                      <SelectItem value="2024">2024년</SelectItem>
                      <SelectItem value="2023">2023년</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="01">
                    <SelectTrigger className="w-[90px]">
                      <SelectValue placeholder="월" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="01">1월</SelectItem>
                      <SelectItem value="02">2월</SelectItem>
                      <SelectItem value="03">3월</SelectItem>
                      <SelectItem value="04">4월</SelectItem>
                      <SelectItem value="05">5월</SelectItem>
                      <SelectItem value="06">6월</SelectItem>
                      <SelectItem value="07">7월</SelectItem>
                      <SelectItem value="08">8월</SelectItem>
                      <SelectItem value="09">9월</SelectItem>
                      <SelectItem value="10">10월</SelectItem>
                      <SelectItem value="11">11월</SelectItem>
                      <SelectItem value="12">12월</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="kakaotalk-usage">
                <TabsList>
                  <TabsTrigger value="kakaotalk-usage">알림톡 이용내역</TabsTrigger>
                  <TabsTrigger value="service-usage">서비스 이용내역</TabsTrigger>
                </TabsList>

                {/* KakaoTalk Usage History */}
                <TabsContent value="kakaotalk-usage" className="space-y-4">
                  <div className="rounded-md border">
                    <div className="overflow-auto max-h-[600px]">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr className="border-b">
                            <th className="h-10 px-4 text-left align-middle font-medium">발송일시</th>
                            <th className="h-10 px-4 text-left align-middle font-medium">타입</th>
                            <th className="h-10 px-4 text-left align-middle font-medium">학생명</th>
                            <th className="h-10 px-4 text-left align-middle font-medium">메시지</th>
                            <th className="h-10 px-4 text-right align-middle font-medium">비용</th>
                            <th className="h-10 px-4 text-center align-middle font-medium">상태</th>
                          </tr>
                        </thead>
                        <tbody>
                          {kakaoTalkUsages.map((usage) => (
                            <tr key={usage.id} className="border-b hover:bg-muted/50">
                              <td className="p-4 align-middle">{usage.date}</td>
                              <td className="p-4 align-middle">
                                <Badge variant="outline">{usage.type}</Badge>
                              </td>
                              <td className="p-4 align-middle">{usage.studentName}</td>
                              <td className="p-4 align-middle text-muted-foreground max-w-md truncate">
                                {usage.message}
                              </td>
                              <td className="p-4 align-middle text-right">₩{usage.cost.toLocaleString()}</td>
                              <td className="p-4 align-middle text-center">
                                <Badge variant={usage.status === 'success' ? 'default' : 'destructive'}>
                                  {usage.status === 'success' ? '성공' : '실패'}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      총 {kakaoTalkUsages.length}건 · 합계: ₩{kakaoTalkUsages.reduce((sum, item) => sum + item.cost, 0).toLocaleString()}
                    </p>
                  </div>
                </TabsContent>

                {/* Service Usage History */}
                <TabsContent value="service-usage" className="space-y-4">
                  <div className="rounded-md border">
                    <div className="overflow-auto max-h-[600px]">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50 sticky top-0">
                          <tr className="border-b">
                            <th className="h-10 px-4 text-left align-middle font-medium">발생일</th>
                            <th className="h-10 px-4 text-left align-middle font-medium">타입</th>
                            <th className="h-10 px-4 text-left align-middle font-medium">설명</th>
                            <th className="h-10 px-4 text-right align-middle font-medium">비용</th>
                          </tr>
                        </thead>
                        <tbody>
                          {serviceUsages.map((usage) => (
                            <tr key={usage.id} className="border-b hover:bg-muted/50">
                              <td className="p-4 align-middle">{usage.date}</td>
                              <td className="p-4 align-middle">
                                <Badge variant="secondary">{usage.type}</Badge>
                              </td>
                              <td className="p-4 align-middle">{usage.description}</td>
                              <td className="p-4 align-middle text-right">₩{usage.cost.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      총 {serviceUsages.length}건 · 합계: ₩{serviceUsages.reduce((sum, item) => sum + item.cost, 0).toLocaleString()}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Room Add/Edit Dialog */}
      <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRoom ? '교실 수정' : '교실 추가'}</DialogTitle>
            <DialogDescription>
              교실 정보를 {editingRoom ? '수정' : '입력'}하세요
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">교실명 *</Label>
              <Input
                id="room-name"
                placeholder="예: 201호, 실험실"
                value={roomForm.name}
                onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-capacity">수용 인원 *</Label>
              <Input
                id="room-capacity"
                type="number"
                min="1"
                max="100"
                value={roomForm.capacity}
                onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) || 10 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-notes">비고</Label>
              <Input
                id="room-notes"
                placeholder="교실 설명 (선택사항)"
                value={roomForm.notes}
                onChange={(e) => setRoomForm({ ...roomForm, notes: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoomDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveRoom}>
              {editingRoom ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Edit Modal */}
      <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplateTarget === 'parent' ? '학부모' : '학생'} 템플릿 수정
            </DialogTitle>
            <DialogDescription>
              {editingTemplateKey && TEMPLATE_LABELS[editingTemplateKey]} - {editingTemplateTarget === 'parent' ? '학부모에게 전송되는 메시지' : '학생에게 전송되는 메시지'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-content">메시지 템플릿</Label>
              <Textarea
                id="template-content"
                value={editingTemplateValue}
                onChange={(e) => setEditingTemplateValue(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
            </div>
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded space-y-1">
              <p className="font-medium">사용 가능한 변수:</p>
              <p>{'{{기관명}}'} - 기관 이름</p>
              <p>{'{{학생명}}'} - 학생 이름</p>
              <p>{'{{시간}}'} - 이벤트 발생 시간</p>
              <p>{'{{예정시간}}'} - 예정된 시간 (지각 알림용)</p>
              <p>{'{{날짜}}'} - 날짜</p>
              <p>{'{{과목}}'} - 과목명</p>
              <p>{'{{강사명}}'} - 강사 이름</p>
              <p>{'{{수업내용}}'} - 수업 내용</p>
              <p>{'{{시험명}}'} - 시험 이름</p>
              <p>{'{{점수}}'} - 시험 점수</p>
              <p>{'{{과제명}}'} - 과제 이름</p>
              <p>{'{{마감일}}'} - 과제 마감일</p>
              <p>{'{{총학습시간}}'} - 총 학습 시간</p>
              <p>{'{{완료과목}}'} - 완료한 과목</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                if (editingTemplateKey) {
                  if (editingTemplateTarget === 'parent') {
                    setEditingTemplateValue(DEFAULT_TEMPLATES_PARENT[editingTemplateKey] || '')
                  } else {
                    setEditingTemplateValue(DEFAULT_TEMPLATES_STUDENT[editingTemplateKey] || '')
                  }
                }
              }}
            >
              기본값으로 초기화
            </Button>
            <Button variant="outline" onClick={() => setIsTemplateModalOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveTemplate}>
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revenue Category Add/Edit Dialog */}
      <Dialog open={isRevenueCategoryDialogOpen} onOpenChange={setIsRevenueCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRevenueCategory ? '수입 항목 수정' : '수입 항목 추가'}</DialogTitle>
            <DialogDescription>
              수입 항목 정보를 {editingRevenueCategory ? '수정' : '입력'}하세요
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="revenue-name">항목명 *</Label>
              <Input
                id="revenue-name"
                placeholder="예: 수강료, 교재비, 시설이용료"
                value={revenueCategoryForm.name}
                onChange={(e) => setRevenueCategoryForm({ ...revenueCategoryForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="revenue-description">설명</Label>
              <Textarea
                id="revenue-description"
                placeholder="수입 항목에 대한 설명 (선택사항)"
                value={revenueCategoryForm.description}
                onChange={(e) => setRevenueCategoryForm({ ...revenueCategoryForm, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRevenueCategoryDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveRevenueCategory}>
              {editingRevenueCategory ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Expense Category Add/Edit Dialog */}
      <Dialog open={isExpenseCategoryDialogOpen} onOpenChange={setIsExpenseCategoryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingExpenseCategory ? '지출 항목 수정' : '지출 항목 추가'}</DialogTitle>
            <DialogDescription>
              지출 항목 정보를 {editingExpenseCategory ? '수정' : '입력'}하세요
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="expense-name">항목명 *</Label>
              <Input
                id="expense-name"
                placeholder="예: 강사 급여, 임대료, 관리비"
                value={expenseCategoryForm.name}
                onChange={(e) => setExpenseCategoryForm({ ...expenseCategoryForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-description">설명</Label>
              <Textarea
                id="expense-description"
                placeholder="지출 항목에 대한 설명 (선택사항)"
                value={expenseCategoryForm.description}
                onChange={(e) => setExpenseCategoryForm({ ...expenseCategoryForm, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-color">차트 색상 *</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="expense-color"
                  type="color"
                  value={expenseCategoryForm.color}
                  onChange={(e) => setExpenseCategoryForm({ ...expenseCategoryForm, color: e.target.value })}
                  className="h-10 w-20 cursor-pointer"
                />
                <Input
                  type="text"
                  value={expenseCategoryForm.color}
                  onChange={(e) => setExpenseCategoryForm({ ...expenseCategoryForm, color: e.target.value })}
                  placeholder="#6b7280"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                차트에 표시될 색상을 선택하세요 (기본: 회색)
              </p>
            </div>

            {/* Color presets */}
            <div className="space-y-2">
              <Label>색상 프리셋</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: '파랑', color: '#3b82f6' },
                  { name: '보라', color: '#8b5cf6' },
                  { name: '분홍', color: '#ec4899' },
                  { name: '주황', color: '#f59e0b' },
                  { name: '초록', color: '#10b981' },
                  { name: '회색', color: '#6b7280' },
                  { name: '빨강', color: '#ef4444' },
                  { name: '청록', color: '#14b8a6' },
                ].map((preset) => (
                  <button
                    key={preset.color}
                    type="button"
                    onClick={() => setExpenseCategoryForm({ ...expenseCategoryForm, color: preset.color })}
                    className="flex items-center gap-2 px-3 py-1.5 border rounded-md hover:bg-accent transition-colors"
                    style={{
                      borderColor: expenseCategoryForm.color === preset.color ? preset.color : undefined,
                      backgroundColor: expenseCategoryForm.color === preset.color ? `${preset.color}10` : undefined,
                    }}
                  >
                    <div
                      className="h-4 w-4 rounded-full border"
                      style={{ backgroundColor: preset.color }}
                    />
                    <span className="text-sm">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsExpenseCategoryDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveExpenseCategory}>
              {editingExpenseCategory ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Account Add/Edit Dialog */}
      {/* Branch Dialog */}
      <Dialog open={isBranchDialogOpen} onOpenChange={setIsBranchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBranch ? '지점 수정' : '지점 추가'}</DialogTitle>
            <DialogDescription>
              지점 정보를 {editingBranch ? '수정' : '입력'}하세요
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name">지점명 *</Label>
              <Input
                id="branch-name"
                placeholder="예: 강남점"
                value={branchForm.name}
                onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch-address">주소 *</Label>
              <Input
                id="branch-address"
                placeholder="예: 서울시 강남구 테헤란로 123"
                value={branchForm.address}
                onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch-phone">전화번호 *</Label>
              <Input
                id="branch-phone"
                placeholder="예: 02-1234-5678"
                value={branchForm.phone}
                onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch-manager">담당자</Label>
              <Input
                id="branch-manager"
                placeholder="예: 김지점"
                value={branchForm.manager_name}
                onChange={(e) => setBranchForm({ ...branchForm, manager_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="branch-status">상태 *</Label>
              <Select
                value={branchForm.status}
                onValueChange={(value: Branch['status']) => setBranchForm({ ...branchForm, status: value })}
              >
                <SelectTrigger id="branch-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">운영중</SelectItem>
                  <SelectItem value="inactive">미운영</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBranchDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveBranch}>
              {editingBranch ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>팀원 초대</DialogTitle>
            <DialogDescription>
              이메일 주소를 입력하면 초대 메일이 전송됩니다.
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4 py-4"
            onSubmit={(e) => {
              e.preventDefault()
              handleSendInvite()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="invite-email">이메일 *</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="example@email.com"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">역할 *</Label>
              <Select
                value={inviteForm.role}
                onValueChange={(value: UserRole) => setInviteForm({ ...inviteForm, role: value })}
              >
                <SelectTrigger id="invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="teacher">강사</SelectItem>
                  <SelectItem value="manager">매니저</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                역할에 따라 접근 가능한 페이지가 달라집니다.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                취소
              </Button>
              <Button type="submit" disabled={isInviting}>
                {isInviting ? '전송 중...' : '초대 메일 보내기'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Account Dialog */}
      <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount ? '계정 수정' : '계정 추가'}</DialogTitle>
            <DialogDescription>
              계정 정보를 {editingAccount ? '수정' : '입력'}하세요
            </DialogDescription>
          </DialogHeader>

          <form
            className="grid gap-4 py-4"
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault()
              handleSaveAccount()
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="account-username">아이디 *</Label>
              <Input
                id="account-username"
                placeholder="예: teacher01"
                autoComplete="username"
                value={accountForm.username}
                onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                disabled={!!editingAccount}
              />
              {editingAccount && (
                <p className="text-xs text-muted-foreground">아이디는 수정할 수 없습니다.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-password">비밀번호 *</Label>
              <Input
                id="account-password"
                type="password"
                placeholder="비밀번호"
                autoComplete="new-password"
                value={accountForm.password}
                onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-name">이름 *</Label>
              <Input
                id="account-name"
                placeholder="예: 김강사"
                value={accountForm.name}
                onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account-role">역할 *</Label>
              <Select
                value={accountForm.role}
                onValueChange={(value: UserRole) => setAccountForm({ ...accountForm, role: value })}
              >
                <SelectTrigger id="account-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                <SelectItem value="teacher">강사</SelectItem>
                <SelectItem value="manager">매니저</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                역할에 따라 접근 가능한 페이지가 달라집니다.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAccountDialogOpen(false)}>
                취소
              </Button>
              <Button type="submit">
                {editingAccount ? '수정' : '추가'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
