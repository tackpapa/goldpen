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
import { LogOut, User, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

export function AdminHeader() {
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()
  const [userName, setUserName] = useState<string>('Super Admin')
  const [userEmail, setUserEmail] = useState<string>('')

  useEffect(() => {
    const loadUserInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        setUserEmail(user.email || '')

        const { data: userData } = await supabase
          .from('users')
          .select('name')
          .eq('id', user.id)
          .single()

        if (userData?.name) {
          setUserName(userData.name)
        }
      }
    }

    loadUserInfo()
  }, [supabase])

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
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 to-blue-600">
              <Shield className="h-4 w-4 md:h-5 md:w-5 text-white" />
            </div>
            <h1 className="text-lg md:text-xl font-bold hidden sm:block">GoldPen Super Admin</h1>
          </div>

          {/* Greeting */}
          <div className="hidden md:block text-sm font-medium text-muted-foreground">
            슈퍼 관리자님 안녕하세요!
          </div>
        </div>

        {/* User Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 md:h-10 md:w-10 rounded-full">
              <Avatar className="h-8 w-8 md:h-10 md:w-10">
                <AvatarImage src="/avatars/admin.svg" alt="Super Admin" />
                <AvatarFallback className="bg-gradient-to-br from-purple-600 to-blue-600 text-white">
                  <Shield className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {userEmail}
                </p>
                <p className="text-xs leading-none text-purple-600 font-medium mt-1">
                  Super Admin
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/admin/settings')}>
              <User className="mr-2 h-4 w-4" />
              <span>프로필</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>로그아웃</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
