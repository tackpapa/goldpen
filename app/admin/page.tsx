'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Shield } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

const adminLoginSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

type AdminLoginFormData = z.infer<typeof adminLoginSchema>

export default function AdminLoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
  })

  const onSubmit = async (data: AdminLoginFormData) => {
    setIsLoading(true)
    try {
      const result = await login(data.email, data.password)

      if (!result.success) {
        toast({
          title: '로그인 실패',
          description: result.error || '로그인 중 오류가 발생했습니다',
          variant: 'destructive',
        })
        return
      }

      // Only allow super_admin role
      if (result.user?.role !== 'super_admin') {
        toast({
          title: '접근 권한 없음',
          description: '관리자 계정만 접근할 수 있습니다',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: '로그인 성공',
        description: '관리자 대시보드로 이동합니다',
      })

      window.location.href = '/admin/dashboard'
    } catch (error) {
      toast({
        title: '오류 발생',
        description: '다시 시도해주세요.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-blue-600">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">관리자 로그인</CardTitle>
          <CardDescription className="text-center">
            GoldPen 시스템 관리자 전용 로그인
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">관리자 이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@goldpen.kr"
                {...register('email')}
                disabled={isLoading}
                autoComplete="email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isLoading}
                autoComplete="current-password"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              관리자 로그인
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground text-center">
              조직 사용자이신가요?{' '}
              <button
                onClick={() => router.push('/login')}
                className="text-primary hover:underline font-medium"
              >
                일반 로그인
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
