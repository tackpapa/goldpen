'use client'

import { useState, useEffect } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LogOut, Menu, Wallet, Plus } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/auth-context'
import { MobileSidebar } from './MobileSidebar'

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { toast } = useToast()
  const { user, logout, isLoading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [creditBalance, setCreditBalance] = useState<number | null>(null)
  const [isChargeModalOpen, setIsChargeModalOpen] = useState(false)

  // URL에서 institution 이름 추출
  const institutionName = pathname?.split('/')[1] || 'goldpen'

  // 충전금 잔액 조회
  useEffect(() => {
    const fetchCreditBalance = async () => {
      if (!institutionName) return
      try {
        const res = await fetch(`/api/settings?orgSlug=${institutionName}`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json() as { credit_balance?: number }
          setCreditBalance(data.credit_balance ?? 0)
        }
      } catch (error) {
        console.error('Failed to fetch credit balance:', error)
      }
    }
    fetchCreditBalance()
  }, [institutionName])

  // useAuth에서 사용자 정보 가져오기
  const userRole = user?.role || null
  const userName = user?.name || '사용자'
  const userEmail = user?.email || ''

  // 역할 한글 표시
  const getRoleLabel = () => {
    switch (userRole) {
      case 'super_admin':
        return '슈퍼관리자'
      case 'owner':
        return '원장'
      case 'manager':
        return '매니저'
      case 'teacher':
        return '강사'
      case 'student':
        return '학생'
      case 'parent':
        return '학부모'
      default:
        return ''
    }
  }

  // Get greeting based on role
  const getGreeting = () => {
    switch (userRole) {
      case 'owner':
      case 'super_admin':
        return '원장님 안녕하세요!'
      case 'manager':
        return '매니저님 안녕하세요!'
      case 'teacher':
        return '강사님 안녕하세요!'
      case 'student':
        return '학생님 안녕하세요!'
      case 'parent':
        return '학부모님 안녕하세요!'
      default:
        return '안녕하세요!'
    }
  }

  const handleLogout = async () => {
    try {
      await logout()
      toast({
        title: '로그아웃 완료',
        description: '성공적으로 로그아웃되었습니다.',
      })
    } catch (error) {
      toast({
        title: '로그아웃 실패',
        description: '다시 시도해주세요.',
        variant: 'destructive',
      })
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 md:h-16 items-center justify-between px-3 md:px-6">
        <div className="flex items-center gap-2 md:gap-4">
          {/* 모바일 햄버거 메뉴 */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">메뉴 열기</span>
          </Button>

          {/* 로고 */}
          <div className="flex items-center gap-2">
            <img
              src="https://ipqhhqduppzvsqwwzjkp.supabase.co/storage/v1/object/public/assets/branding/goldpen-logo.png"
              alt="GoldPen"
              className="h-8 md:h-10 w-auto"
              loading="lazy"
            />
            {/* 브랜드 텍스트 제거 */}
          </div>

          {/* 역할별 인사말 */}
          <div className="hidden md:block text-sm font-medium text-muted-foreground">
            {getGreeting()}
          </div>
        </div>

        {/* 충전금 잔액 & 사용자 프로필 */}
        <div className="flex items-center gap-2 md:gap-4">
          {/* 충전금 잔액 */}
          {creditBalance !== null && (
            <div className="flex items-center gap-1 md:gap-2">
              <div
                className={`flex items-center gap-1 px-2 md:px-3 py-1 md:py-1.5 rounded-lg ${
                  creditBalance < 5000
                    ? 'bg-red-100 dark:bg-red-900/30'
                    : 'bg-muted'
                }`}
                title={creditBalance < 5000 ? '잔액이 부족하면 알림톡 발송에 실패합니다' : undefined}
              >
                <Wallet className={`h-4 w-4 ${creditBalance < 5000 ? 'text-red-500' : 'text-muted-foreground'}`} />
                <span className={`text-xs md:text-sm font-medium ${creditBalance < 5000 ? 'text-red-600 dark:text-red-400' : ''}`}>
                  {creditBalance.toLocaleString()}원
                </span>
              </div>
              <Button
                variant={creditBalance < 5000 ? 'destructive' : 'default'}
                size="sm"
                className="h-7 md:h-8 px-2 md:px-3 text-xs md:text-sm"
                onClick={() => setIsChargeModalOpen(true)}
              >
                <Plus className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                충전
              </Button>
            </div>
          )}

        {/* 사용자 프로필 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 md:h-10 md:w-10 rounded-full">
              <Avatar className="h-8 w-8 md:h-10 md:w-10">
                <AvatarImage src="/avatars/01.svg" alt="User" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="end" forceMount>
            <DropdownMenuLabel className="p-4">
              <div className="flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold leading-none">{userName}</p>
                  {!isLoading && getRoleLabel() && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {getRoleLabel()}
                    </span>
                  )}
                </div>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground">로딩 중...</p>
                ) : (
                  userEmail && (
                    <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
                  )
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="p-3 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>로그아웃</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {/* 모바일 사이드바 */}
      <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />

      {/* 충전 모달 */}
      <Dialog open={isChargeModalOpen} onOpenChange={setIsChargeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>충전금 충전</DialogTitle>
            <DialogDescription>
              알림톡 발송에 사용되는 충전금을 충전합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 text-center text-muted-foreground">
            충전 기능 준비 중입니다.
          </div>
        </DialogContent>
      </Dialog>
    </header>
  )
}
