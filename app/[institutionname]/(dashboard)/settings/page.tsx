'use client'

export const runtime = 'edge'


import { useState, useEffect } from 'react'
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
import { navigationItems, getEnabledMenuIds, setEnabledMenuIds } from '@/lib/config/navigation'
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
import type { UserAccount, UserRole, PageId } from '@/lib/types/permissions'
import { accountManager, permissionManager } from '@/lib/utils/permissions'
import { revenueCategoryManager } from '@/lib/utils/revenue-categories'
import { expenseCategoryManager } from '@/lib/utils/expense-categories'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'

// Default empty states
const defaultOrganization: Organization = {
  id: '',
  name: '',
  owner_name: '',
  address: '',
  phone: '',
  email: '',
  logo_url: '',
  settings: {
    auto_sms: false,
    auto_email: false,
    notification_enabled: false,
  },
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


export default function SettingsPage() {
  const { toast } = useToast()
  const [organization, setOrganization] = useState<Organization>(defaultOrganization)
  const [institutionName, setInstitutionName] = useState<string>('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [kakaoTalkUsages, setKakaoTalkUsages] = useState<KakaoTalkUsage[]>([])
  const [serviceUsages, setServiceUsages] = useState<ServiceUsage[]>([])

  // Fetch settings data from API
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings', { credentials: 'include' })
        const data = await response.json() as {
          organization?: Organization
          branches?: Branch[]
          rooms?: Room[]
          kakaoTalkUsages?: KakaoTalkUsage[]
          serviceUsages?: ServiceUsage[]
          error?: string
        }
        if (response.ok) {
          if (data.organization) setOrganization(data.organization)
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

  // Account management state
  const [accounts, setAccounts] = useState<UserAccount[]>([])
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false)
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null)
  const [accountForm, setAccountForm] = useState({
    username: '',
    password: '',
    name: '',
    role: 'staff' as UserRole,
  })

  // Menu visibility state
  const [enabledMenus, setEnabledMenus] = useState<string[]>([])

  // Page permissions state
  const [pagePermissions, setPagePermissions] = useState<Record<string, { staff: boolean; teacher: boolean }>>({})

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

  // Load accounts and menu settings on mount
  useEffect(() => {
    // Set institution name (hardcoded for now)
    setInstitutionName('goldpen')

    const loadedAccounts = accountManager.getAccounts()
    setAccounts(loadedAccounts)

    const enabledIds = getEnabledMenuIds()
    setEnabledMenus(enabledIds)

    // Load page permissions
    const permissions = permissionManager.getPermissions()
    setPagePermissions(permissions)

    // Load revenue categories
    const categories = revenueCategoryManager.getCategories()
    setRevenueCategories(categories)

    // Load expense categories
    const expenseCategs = expenseCategoryManager.getCategories()
    setExpenseCategories(expenseCategs)
  }, [])

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const logoUrl = reader.result as string
        setOrganization({ ...organization, logo_url: logoUrl })
        localStorage.setItem('organization_logo', logoUrl)
        localStorage.setItem('organization_name', organization.name)

        // Dispatch event to update sidebar
        window.dispatchEvent(new Event('organizationSettingsChanged'))

        toast({
          title: '로고 업로드 완료',
          description: '로고가 업로드되었습니다.',
        })
      }
      reader.readAsDataURL(file)
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

  const handleSaveOrganization = () => {
    localStorage.setItem('organization_name', organization.name)

    // Dispatch event to update sidebar
    window.dispatchEvent(new Event('organizationSettingsChanged'))

    toast({
      title: '저장 완료',
      description: '기관 정보가 저장되었습니다.',
    })
  }

  const handleToggleSetting = (key: keyof Organization['settings']) => {
    setOrganization({
      ...organization,
      settings: {
        ...organization.settings,
        [key]: !organization.settings[key],
      },
    })
    toast({
      title: '설정 변경',
      description: `${key === 'auto_sms' ? 'SMS 자동 발송' : key === 'auto_email' ? '이메일 자동 발송' : '알림'} 설정이 변경되었습니다.`,
    })
  }

  const statusMap = {
    active: { label: '활성', variant: 'default' as const },
    inactive: { label: '비활성', variant: 'secondary' as const },
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

  const handleSaveRoom = () => {
    if (!roomForm.name.trim()) {
      toast({
        title: '입력 오류',
        description: '교실명을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    if (editingRoom) {
      // Update existing room
      setRooms(rooms.map(r =>
        r.id === editingRoom.id
          ? { ...r, ...roomForm, notes: roomForm.notes || undefined }
          : r
      ))
      toast({
        title: '교실 수정 완료',
        description: `${roomForm.name} 교실이 수정되었습니다.`,
      })
    } else {
      // Add new room
      const newRoom: Room = {
        id: `room-${Date.now()}`,
        created_at: new Date().toISOString(),
        org_id: 'org-1',
        name: roomForm.name,
        capacity: roomForm.capacity,
        status: 'active',
        notes: roomForm.notes || undefined,
      }
      setRooms([...rooms, newRoom])
      toast({
        title: '교실 추가 완료',
        description: `${roomForm.name} 교실이 추가되었습니다.`,
      })
    }

    setIsRoomDialogOpen(false)
  }

  const handleDeleteRoom = (roomId: string) => {
    const room = rooms.find(r => r.id === roomId)
    setRooms(rooms.filter(r => r.id !== roomId))
    toast({
      title: '교실 삭제 완료',
      description: `${room?.name} 교실이 삭제되었습니다.`,
    })
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

  const handleSaveBranch = () => {
    // Validation
    if (!branchForm.name.trim() || !branchForm.address.trim() || !branchForm.phone.trim()) {
      toast({
        title: '입력 오류',
        description: '모든 필수 항목을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    if (editingBranch) {
      // Update existing branch
      const updatedBranches = branches.map(b =>
        b.id === editingBranch.id
          ? { ...b, ...branchForm }
          : b
      )
      setBranches(updatedBranches)
      toast({
        title: '지점 수정 완료',
        description: `${branchForm.name} 지점이 수정되었습니다.`,
      })
    } else {
      // Add new branch
      const newBranch: Branch = {
        id: Date.now().toString(),
        org_id: organization.id,
        ...branchForm,
      }
      setBranches([...branches, newBranch])
      toast({
        title: '지점 추가 완료',
        description: `${branchForm.name} 지점이 추가되었습니다.`,
      })
    }

    setIsBranchDialogOpen(false)
  }

  const handleDeleteBranch = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId)
    if (confirm(`${branch?.name} 지점을 삭제하시겠습니까?`)) {
      setBranches(branches.filter(b => b.id !== branchId))
      toast({
        title: '지점 삭제 완료',
        description: `${branch?.name} 지점이 삭제되었습니다.`,
      })
    }
  }

  // Account management functions
  const handleAddAccount = () => {
    setEditingAccount(null)
    setAccountForm({ username: '', password: '', name: '', role: 'staff' })
    setIsAccountDialogOpen(true)
  }

  const handleEditAccount = (account: UserAccount) => {
    setEditingAccount(account)
    setAccountForm({
      username: account.username,
      password: account.password,
      name: account.name,
      role: account.role,
    })
    setIsAccountDialogOpen(true)
  }

  const handleSaveAccount = () => {
    // Validation
    if (!accountForm.username.trim() || !accountForm.password.trim() || !accountForm.name.trim()) {
      toast({
        title: '입력 오류',
        description: '모든 필수 항목을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    // Check username uniqueness
    if (accountManager.isUsernameTaken(accountForm.username, editingAccount?.id)) {
      toast({
        title: '중복 오류',
        description: '이미 사용 중인 아이디입니다.',
        variant: 'destructive',
      })
      return
    }

    if (editingAccount) {
      // Update existing account
      accountManager.updateAccount(editingAccount.id, accountForm)
      setAccounts(accountManager.getAccounts())
      toast({
        title: '계정 수정 완료',
        description: `${accountForm.name} 계정이 수정되었습니다.`,
      })
    } else {
      // Add new account
      accountManager.addAccount(accountForm)
      setAccounts(accountManager.getAccounts())
      toast({
        title: '계정 추가 완료',
        description: `${accountForm.name} 계정이 추가되었습니다.`,
      })
    }

    setIsAccountDialogOpen(false)
  }

  const handleDeleteAccount = (accountId: string) => {
    const account = accounts.find(a => a.id === accountId)
    if (confirm(`${account?.name} 계정을 삭제하시겠습니까?`)) {
      accountManager.deleteAccount(accountId)
      setAccounts(accountManager.getAccounts())
      toast({
        title: '계정 삭제 완료',
        description: `${account?.name} 계정이 삭제되었습니다.`,
      })
    }
  }

  // Menu visibility functions
  const handleToggleMenu = (menuId: string) => {
    const newEnabledMenus = enabledMenus.includes(menuId)
      ? enabledMenus.filter(id => id !== menuId)
      : [...enabledMenus, menuId]

    setEnabledMenus(newEnabledMenus)
    setEnabledMenuIds(newEnabledMenus)

    // Dispatch custom event to update sidebars
    window.dispatchEvent(new Event('menuSettingsChanged'))

    const menuName = navigationItems.find(item => item.id === menuId)?.name || menuId
    toast({
      title: '메뉴 설정 변경',
      description: `${menuName} 메뉴가 ${enabledMenus.includes(menuId) ? '비활성화' : '활성화'}되었습니다.`,
    })
  }

  const handleEnableAllMenus = () => {
    const allMenuIds = navigationItems.map(item => item.id)
    setEnabledMenus(allMenuIds)
    setEnabledMenuIds(allMenuIds)
    window.dispatchEvent(new Event('menuSettingsChanged'))
    toast({
      title: '모든 메뉴 활성화',
      description: '모든 메뉴가 활성화되었습니다.',
    })
  }

  const handleDisableAllMenus = () => {
    // Keep only settings menu enabled
    const essentialMenus = ['settings']
    setEnabledMenus(essentialMenus)
    setEnabledMenuIds(essentialMenus)
    window.dispatchEvent(new Event('menuSettingsChanged'))
    toast({
      title: '메뉴 비활성화',
      description: '설정 메뉴를 제외한 모든 메뉴가 비활성화되었습니다.',
    })
  }

  // Page permission handlers
  const handlePermissionChange = (pageId: string, role: 'staff' | 'teacher', checked: boolean) => {
    permissionManager.updatePagePermission(pageId as PageId, role, checked)
    setPagePermissions(prev => ({
      ...prev,
      [pageId]: {
        ...prev[pageId],
        [role]: checked
      }
    }))

    const roleName = role === 'staff' ? '직원' : '강사'
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

  const handleSaveRevenueCategory = () => {
    if (!revenueCategoryForm.name.trim()) {
      toast({
        title: '입력 오류',
        description: '항목명을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    if (revenueCategoryManager.isNameDuplicate(revenueCategoryForm.name, editingRevenueCategory?.id)) {
      toast({
        title: '중복 오류',
        description: '이미 존재하는 항목명입니다.',
        variant: 'destructive',
      })
      return
    }

    if (editingRevenueCategory) {
      revenueCategoryManager.updateCategory(editingRevenueCategory.id, {
        name: revenueCategoryForm.name,
        description: revenueCategoryForm.description || undefined,
      })
      toast({
        title: '수입 항목 수정 완료',
        description: `${revenueCategoryForm.name} 항목이 수정되었습니다.`,
      })
    } else {
      revenueCategoryManager.addCategory({
        name: revenueCategoryForm.name,
        description: revenueCategoryForm.description || undefined,
      })
      toast({
        title: '수입 항목 추가 완료',
        description: `${revenueCategoryForm.name} 항목이 추가되었습니다.`,
      })
    }

    setRevenueCategories(revenueCategoryManager.getCategories())
    setIsRevenueCategoryDialogOpen(false)
  }

  const handleToggleRevenueCategory = (id: string) => {
    revenueCategoryManager.toggleCategory(id)
    setRevenueCategories(revenueCategoryManager.getCategories())

    const category = revenueCategories.find(c => c.id === id)
    toast({
      title: '수입 항목 변경',
      description: `${category?.name} 항목이 ${category?.is_active ? '비활성화' : '활성화'}되었습니다.`,
    })
  }

  const handleDeleteRevenueCategory = (id: string) => {
    const category = revenueCategories.find(c => c.id === id)
    if (confirm(`${category?.name} 항목을 삭제하시겠습니까?`)) {
      revenueCategoryManager.deleteCategory(id)
      setRevenueCategories(revenueCategoryManager.getCategories())
      toast({
        title: '수입 항목 삭제 완료',
        description: `${category?.name} 항목이 삭제되었습니다.`,
      })
    }
  }

  const handleMoveRevenueCategory = (id: string, direction: 'up' | 'down') => {
    const currentIndex = revenueCategories.findIndex(c => c.id === id)
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === revenueCategories.length - 1)
    ) {
      return
    }

    const newCategories = [...revenueCategories]
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    ;[newCategories[currentIndex], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[currentIndex]]

    const newOrder = newCategories.map(c => c.id)
    revenueCategoryManager.reorderCategories(newOrder)
    setRevenueCategories(revenueCategoryManager.getCategories())

    toast({
      title: '순서 변경 완료',
      description: '수입 항목 순서가 변경되었습니다.',
    })
  }

  const handleResetRevenueCategories = () => {
    if (confirm('모든 수입 항목을 기본값으로 초기화하시겠습니까?')) {
      revenueCategoryManager.reset()
      setRevenueCategories(revenueCategoryManager.getCategories())
      toast({
        title: '초기화 완료',
        description: '수입 항목이 기본값으로 초기화되었습니다.',
      })
    }
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

  const handleSaveExpenseCategory = () => {
    if (!expenseCategoryForm.name.trim()) {
      toast({
        title: '입력 오류',
        description: '항목명을 입력해주세요.',
        variant: 'destructive',
      })
      return
    }

    if (expenseCategoryManager.isNameDuplicate(expenseCategoryForm.name, editingExpenseCategory?.id)) {
      toast({
        title: '중복 오류',
        description: '이미 존재하는 항목명입니다.',
        variant: 'destructive',
      })
      return
    }

    if (editingExpenseCategory) {
      expenseCategoryManager.updateCategory(editingExpenseCategory.id, {
        name: expenseCategoryForm.name,
        description: expenseCategoryForm.description || undefined,
        color: expenseCategoryForm.color,
      })
      toast({
        title: '지출 항목 수정 완료',
        description: `${expenseCategoryForm.name} 항목이 수정되었습니다.`,
      })
    } else {
      expenseCategoryManager.addCategory({
        name: expenseCategoryForm.name,
        description: expenseCategoryForm.description || undefined,
        color: expenseCategoryForm.color,
      })
      toast({
        title: '지출 항목 추가 완료',
        description: `${expenseCategoryForm.name} 항목이 추가되었습니다.`,
      })
    }

    setExpenseCategories(expenseCategoryManager.getCategories())
    setIsExpenseCategoryDialogOpen(false)
  }

  const handleToggleExpenseCategory = (id: string) => {
    expenseCategoryManager.toggleCategory(id)
    setExpenseCategories(expenseCategoryManager.getCategories())

    const category = expenseCategories.find(c => c.id === id)
    toast({
      title: '지출 항목 변경',
      description: `${category?.name} 항목이 ${category?.is_active ? '비활성화' : '활성화'}되었습니다.`,
    })
  }

  const handleDeleteExpenseCategory = (id: string) => {
    const category = expenseCategories.find(c => c.id === id)
    if (confirm(`${category?.name} 항목을 삭제하시겠습니까?`)) {
      expenseCategoryManager.deleteCategory(id)
      setExpenseCategories(expenseCategoryManager.getCategories())
      toast({
        title: '지출 항목 삭제 완료',
        description: `${category?.name} 항목이 삭제되었습니다.`,
      })
    }
  }

  const handleMoveExpenseCategory = (id: string, direction: 'up' | 'down') => {
    const currentIndex = expenseCategories.findIndex(c => c.id === id)
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === expenseCategories.length - 1)
    ) {
      return
    }

    const newCategories = [...expenseCategories]
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    ;[newCategories[currentIndex], newCategories[targetIndex]] = [newCategories[targetIndex], newCategories[currentIndex]]

    const newOrder = newCategories.map(c => c.id)
    expenseCategoryManager.reorderCategories(newOrder)
    setExpenseCategories(expenseCategoryManager.getCategories())

    toast({
      title: '순서 변경 완료',
      description: '지출 항목 순서가 변경되었습니다.',
    })
  }

  const handleResetExpenseCategories = () => {
    if (confirm('모든 지출 항목을 기본값으로 초기화하시겠습니까?')) {
      expenseCategoryManager.reset()
      setExpenseCategories(expenseCategoryManager.getCategories())
      toast({
        title: '초기화 완료',
        description: '지출 항목이 기본값으로 초기화되었습니다.',
      })
    }
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
        const status = row.getValue('status') as Room['status']
        const statusInfo = statusMap[status]
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
        const status = row.getValue('status') as Branch['status']
        const statusInfo = statusMap[status]
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
  const accountColumns: ColumnDef<UserAccount>[] = [
    {
      accessorKey: 'username',
      header: '아이디',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium font-mono">{row.getValue('username')}</span>
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
        const roleMap = {
          admin: { label: '원장', variant: 'default' as const, color: 'bg-yellow-100 text-yellow-800' },
          teacher: { label: '강사', variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800' },
          staff: { label: '직원', variant: 'outline' as const, color: 'bg-green-100 text-green-800' },
        }
        const roleInfo = roleMap[role]
        return (
          <Badge className={roleInfo.color}>
            {roleInfo.label}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'createdAt',
      header: '생성일',
      cell: ({ row }) => {
        const date = new Date(row.getValue('createdAt'))
        return date.toLocaleDateString('ko-KR')
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const account = row.original
        // 관리자 계정은 삭제/수정 불가
        const isAdmin = account.role === 'admin'
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
          <TabsTrigger value="automation">자동화</TabsTrigger>
          <TabsTrigger value="notifications">알림</TabsTrigger>
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
                    value={organization.name}
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
                    onChange={(e) =>
                      setOrganization({ ...organization, owner_name: e.target.value })
                    }
                    placeholder="예: 김원장"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="org-phone">전화번호</Label>
                  <Input
                    id="org-phone"
                    value={organization.phone}
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
                    value={organization.email}
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
                  value={organization.address}
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>지점 관리</CardTitle>
                <CardDescription>등록된 지점을 관리하세요</CardDescription>
              </div>
              <Button onClick={handleAddBranch}>
                <Plus className="mr-2 h-4 w-4" />
                지점 추가
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={branchColumns}
                data={branches}
                searchKey="name"
                searchPlaceholder="지점명으로 검색..."
              />
            </CardContent>
          </Card>

          {/* Branch Stats */}
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
                <CardTitle className="text-sm font-medium">활성 지점</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {branches.filter((b) => b.status === 'active').length}개
                </div>
                <p className="text-xs text-muted-foreground">운영 중인 지점</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">비활성 지점</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {branches.filter((b) => b.status === 'inactive').length}개
                </div>
                <p className="text-xs text-muted-foreground">운영 중단 지점</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Rooms Tab */}
        <TabsContent value="rooms" className="space-y-4">
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
                  {rooms.filter((r) => r.status === 'active').length}개
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
        </TabsContent>

        {/* Accounts Tab */}
        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>계정 관리</CardTitle>
                <CardDescription>시스템 사용자 계정을 관리하세요</CardDescription>
              </div>
              <Button onClick={handleAddAccount}>
                <UserPlus className="mr-2 h-4 w-4" />
                계정 추가
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={accountColumns}
                data={accounts}
                searchKey="name"
                searchPlaceholder="이름 또는 아이디로 검색..."
              />
            </CardContent>
          </Card>

          {/* Account Stats */}
          <div className="grid gap-4 md:grid-cols-3">
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
                <CardTitle className="text-sm font-medium">직원 계정</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {accounts.filter((a) => a.role === 'staff').length}개
                </div>
                <p className="text-xs text-muted-foreground">직원 전용 계정</p>
              </CardContent>
            </Card>
          </div>

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

              {revenueCategories.length > 0 && (
                <div className="mt-4 p-3 border border-blue-200 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>참고:</strong> 활성화된 수입 항목만 매출정산 페이지에서 사용할 수 있습니다.
                    순서는 위아래 화살표 버튼으로 조정할 수 있습니다.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

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

          {/* Default Categories Info */}
          <Card>
            <CardHeader>
              <CardTitle>기본 수입 항목</CardTitle>
              <CardDescription>시스템에서 제공하는 기본 수입 항목입니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { name: '수강료', description: '학생 수강료 수입', icon: '📚' },
                  { name: '자릿세', description: '독서실 좌석 이용료', icon: '🪑' },
                  { name: '룸이용료', description: '스터디룸 대여료', icon: '🚪' },
                  { name: '교재판매', description: '교재 및 교구 판매 수입', icon: '📖' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 border rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                    <span className="text-2xl">{item.icon}</span>
                    <div>
                      <p className="font-semibold text-blue-900">{item.name}</p>
                      <p className="text-sm text-blue-700">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expense Management Tab */}
        <TabsContent value="expense" className="space-y-4">
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
                        onClick={() => handleMoveExpenseCategory(index, 'up')}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => handleMoveExpenseCategory(index, 'down')}
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

          {/* Default Categories Info */}
          <Card>
            <CardHeader>
              <CardTitle>기본 지출 항목</CardTitle>
              <CardDescription>시스템에서 제공하는 기본 지출 항목입니다</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { name: '강사 급여', description: '정규직 및 시간강사 급여', icon: '👨‍🏫', color: '#3b82f6' },
                  { name: '임대료', description: '건물/시설 임대료', icon: '🏢', color: '#8b5cf6' },
                  { name: '관리비', description: '전기/수도/인터넷 등', icon: '💡', color: '#ec4899' },
                  { name: '교재/교구', description: '교재 및 교구 구입비', icon: '📚', color: '#f59e0b' },
                  { name: '마케팅', description: '광고/홍보 비용', icon: '📢', color: '#10b981' },
                  { name: '기타', description: '기타 운영 비용', icon: '📦', color: '#6b7280' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 border rounded-lg bg-gradient-to-r from-orange-50 to-red-50">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-orange-900">{item.name}</p>
                        <div
                          className="h-3 w-3 rounded-full border"
                          style={{ backgroundColor: item.color }}
                        />
                      </div>
                      <p className="text-sm text-orange-700">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Menus Tab */}
        <TabsContent value="menus" className="space-y-4">
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

                  const permission = pagePermissions[item.id] || { staff: false, teacher: false }

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
                                id={`staff-${item.id}`}
                                checked={permission.staff}
                                onCheckedChange={(checked) => handlePermissionChange(item.id, 'staff', checked as boolean)}
                                className="h-3.5 w-3.5"
                              />
                              <Label
                                htmlFor={`staff-${item.id}`}
                                className="text-xs font-medium cursor-pointer whitespace-nowrap"
                              >
                                직원 접속 가능
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
        </TabsContent>

        {/* Automation Tab */}
        <TabsContent value="automation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>자동화 설정</CardTitle>
              <CardDescription>자동 메시지 발송을 설정하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>SMS 자동 발송</Label>
                  <p className="text-sm text-muted-foreground">
                    출결, 성적 등의 정보를 SMS로 자동 발송합니다
                  </p>
                </div>
                <Switch
                  checked={organization.settings.auto_sms}
                  onCheckedChange={() => handleToggleSetting('auto_sms')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>이메일 자동 발송</Label>
                  <p className="text-sm text-muted-foreground">
                    월별 리포트를 이메일로 자동 발송합니다
                  </p>
                </div>
                <Switch
                  checked={organization.settings.auto_email}
                  onCheckedChange={() => handleToggleSetting('auto_email')}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>발송 템플릿</CardTitle>
              <CardDescription>자동 발송 메시지 템플릿을 관리하세요</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: '출석 안내', type: 'SMS', status: 'active' },
                  { name: '결석 알림', type: 'SMS', status: 'active' },
                  { name: '성적 발송', type: 'Email', status: 'active' },
                  { name: '월간 리포트', type: 'Email', status: 'inactive' },
                ].map((template, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">{template.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={template.status === 'active' ? 'default' : 'secondary'}
                      >
                        {template.status === 'active' ? '활성' : '비활성'}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>알림 설정</CardTitle>
              <CardDescription>시스템 알림을 설정하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>푸시 알림</Label>
                  <p className="text-sm text-muted-foreground">
                    브라우저 푸시 알림을 받습니다
                  </p>
                </div>
                <Switch
                  checked={organization.settings.notification_enabled}
                  onCheckedChange={() => handleToggleSetting('notification_enabled')}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>알림 항목</CardTitle>
              <CardDescription>받을 알림 유형을 선택하세요</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: '신규 상담 요청', description: '새로운 상담 신청이 있을 때' },
                { label: '학생 결석', description: '학생이 결석했을 때' },
                { label: '결제 완료', description: '학부모가 결제를 완료했을 때' },
                { label: '결제 미납', description: '미납 결제가 발생했을 때' },
                { label: '과제 제출', description: '학생이 과제를 제출했을 때' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>{item.label}</Label>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <Switch defaultChecked={i < 3} />
                </div>
              ))}
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
              {/* 출결 관련 알림 - 학원/공부방 전용 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  출결 알림 <Badge variant="secondary" className="ml-2">학원·공부방 전용</Badge>
                </h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>지각 안내</Label>
                    <p className="text-sm text-muted-foreground">
                      학생이 등록한 스케줄에 맞게 등원하지 않았을 때
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>등원 알림</Label>
                    <p className="text-sm text-muted-foreground">
                      학생이 등원했을 때
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>하원 알림</Label>
                    <p className="text-sm text-muted-foreground">
                      학생이 하원했을 때
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              {/* 출결 관련 알림 - 독서실 전용 */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">
                  출결 알림 <Badge variant="secondary" className="ml-2">독서실 전용</Badge>
                </h3>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>지각 안내</Label>
                    <p className="text-sm text-muted-foreground">
                      학생이 등록한 스케줄에 맞게 입실하지 않았을 때
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>입실 알림</Label>
                    <p className="text-sm text-muted-foreground">
                      학생이 독서실에 입실했을 때
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>퇴실 알림</Label>
                    <p className="text-sm text-muted-foreground">
                      학생이 독서실에서 퇴실했을 때
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>외출 알림</Label>
                    <p className="text-sm text-muted-foreground">
                      학생이 외출했을 때
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>복귀 알림</Label>
                    <p className="text-sm text-muted-foreground">
                      학생이 외출 후 복귀했을 때
                    </p>
                  </div>
                  <Switch defaultChecked />
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
                        매일 설정된 시간에 오늘의 플래너 데이터를 학부모에게 일괄 전송
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        💡 학생이 하루에 여러 번 입실/퇴실해도 플래너는 하루 단위로 유지되며, 설정 시간에 한 번만 전송됩니다
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>

                  <div className="flex items-center gap-4 pt-2 border-t">
                    <Label htmlFor="daily-report-time" className="text-sm whitespace-nowrap">
                      전송 시간
                    </Label>
                    <Select defaultValue="22:00">
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
                      <Label>수업일지 전송 (관리자 승인 후)</Label>
                      <p className="text-sm text-muted-foreground">
                        강사가 수업일지 작성 → 관리자 승인 → 학부모에게 전송
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                    💡 강사가 작성한 수업일지는 관리자가 승인 버튼을 눌러야 학부모에게 발송됩니다
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
                        시험 결과 입력 → 관리자 승인 → 학부모에게 전송
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                    💡 시험 결과는 관리자가 승인 버튼을 눌러야 학부모에게 발송됩니다
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
                      <Label>과제 전송 (관리자 승인 후)</Label>
                      <p className="text-sm text-muted-foreground">
                        과제 등록 → 관리자 승인 → 학부모에게 전송
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                    💡 과제 정보는 관리자가 승인 버튼을 눌러야 학부모에게 발송됩니다
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
                <div className="text-2xl font-bold text-green-600">₩850,000</div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-muted-foreground">
                    충전일: 2025-01-01
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

      {/* Account Dialog */}
      <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount ? '계정 수정' : '계정 추가'}</DialogTitle>
            <DialogDescription>
              계정 정보를 {editingAccount ? '수정' : '입력'}하세요
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account-username">아이디 *</Label>
              <Input
                id="account-username"
                placeholder="예: teacher01"
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
                  <SelectItem value="staff">직원</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                역할에 따라 접근 가능한 페이지가 달라집니다.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAccountDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={handleSaveAccount}>
              {editingAccount ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
