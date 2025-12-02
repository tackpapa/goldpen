'use client'

export const runtime = 'edge'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'

const DEMO_EMAIL = 'demo@goldpen.kr'
const DEMO_PASSWORD = '12345678'

const loginSchema = z.object({
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function DemoLoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { login } = useAuth()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    },
  })

  // 폼 초기값 설정
  useEffect(() => {
    setValue('email', DEMO_EMAIL)
    setValue('password', DEMO_PASSWORD)
  }, [setValue])

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const result = await login(data.email, data.password)

      if (!result.success) {
        toast({
          title: '로그인 실패',
          description: result.error || '데모 계정 로그인 중 오류가 발생했습니다',
          variant: 'destructive',
        })
        return
      }

      toast({
        title: '데모 로그인 성공',
        description: 'GoldPen 데모 사이트에 오신 것을 환영합니다!',
      })

      // 데모 계정은 goldpen org로 이동
      const orgSlug = result.org?.slug || result.org?.name?.toLowerCase().replace(/\s+/g, '-') || 'goldpen'
      window.location.href = `/${orgSlug}/overview`
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
    <Card className="border-2 border-primary/20">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <img
            src="https://ipqhhqduppzvsqwwzjkp.supabase.co/storage/v1/object/public/assets/branding/goldpen-logo.png"
            alt="GoldPen"
            className="h-12"
          />
        </div>
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-2xl text-center">데모 체험하기</CardTitle>
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <CardDescription className="text-center">
          아래 버튼을 눌러 GoldPen의 모든 기능을 체험해보세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              disabled={isLoading}
              autoComplete="email"
              className="bg-muted"
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
              {...register('password')}
              disabled={isLoading}
              autoComplete="current-password"
              className="bg-muted"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            size="lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                로그인 중...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                데모 사이트 입장하기
              </>
            )}
          </Button>
        </form>
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            데모 계정으로 로그인하면 샘플 데이터가 포함된<br />
            학원 관리 시스템을 체험할 수 있습니다.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
