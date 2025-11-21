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
import { Button } from '@/components/ui/button'
import { LogOut, User, Settings, Menu } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { MobileSidebar } from './MobileSidebar'

export function Header() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>('사용자')
  const [userEmail, setUserEmail] = useState<string>('')

  // Get user info from Supabase Auth and localStorage
  useEffect(() => {
    const loadUserInfo = async () => {
      // Supabase Auth에서 이메일 가져오기
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
      }

      // localStorage에서 역할/이름 가져오기
      if (typeof window !== 'undefined') {
        const role = localStorage.getItem('userRole')
        const name = localStorage.getItem('userName') || '사용자'
        setUserRole(role)
        setUserName(name)
      }
    }
    loadUserInfo()
  }, [])

  // Get greeting based on role
  const getGreeting = () => {
    if (!userRole) return `${userName}님 안녕하세요!`

    switch (userRole) {
      case 'admin':
        return `원장님 안녕하세요!`
      case 'teacher':
        return `${userName} 강사님 안녕하세요!`
      case 'staff':
        return `${userName} 매니저님 안녕하세요!`
      default:
        return `${userName}님 안녕하세요!`
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      toast({
        title: '로그아웃 완료',
        description: '성공적으로 로그아웃되었습니다.',
      })
      router.push('/login')
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
            <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-md bg-primary">
              <span className="text-base md:text-lg font-bold text-primary-foreground">C</span>
            </div>
            <h1 className="text-lg md:text-xl font-bold hidden sm:block">GoldPen</h1>
          </div>

          {/* 역할별 인사말 */}
          <div className="hidden md:block text-sm font-medium text-muted-foreground">
            {getGreeting()}
          </div>
        </div>

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
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {userEmail || '로딩 중...'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings' as any)}>
              <User className="mr-2 h-4 w-4" />
              <span>프로필</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/dashboard/settings' as any)}>
              <Settings className="mr-2 h-4 w-4" />
              <span>설정</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>로그아웃</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* 모바일 사이드바 */}
      <MobileSidebar open={mobileMenuOpen} onOpenChange={setMobileMenuOpen} />
    </header>
  )
}
