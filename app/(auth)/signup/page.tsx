'use client'

export const runtime = 'edge'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
// BFF API를 사용하므로 Supabase Client는 더 이상 필요 없음
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail } from 'lucide-react'

const signupSchema = z.object({
  org_slug: z.string()
    .min(2, '기관 아이디는 최소 2자 이상이어야 합니다')
    .regex(/^[a-z0-9-]+$/, '영문 소문자, 숫자, 하이픈(-)만 사용 가능합니다'),
  org_name: z.string().min(1, '기관명을 입력해주세요'),
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다'),
  phone: z.string().min(10, '올바른 전화번호를 입력해주세요').regex(/^[0-9]+$/, '숫자만 입력해주세요'),
  email: z.string().email('올바른 이메일을 입력해주세요'),
  password: z.string().min(8, '비밀번호는 최소 8자 이상이어야 합니다'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword'],
})

type SignupFormData = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupFormData) => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          org_name: data.org_name,
          org_slug: data.org_slug,
          phone: data.phone,
        }),
      })

      interface SignupResponse {
        error?: string
        org?: { name: string }
        emailConfirmationRequired?: boolean
        message?: string
      }
      const result = await response.json() as SignupResponse

      if (!response.ok) {
        toast({
          title: '회원가입 실패',
          description: result.error || '회원가입 중 오류가 발생했습니다',
          variant: 'destructive',
        })
        return
      }

      // 회원가입 성공 - 모달 표시
      setRegisteredEmail(data.email)
      setShowSuccessModal(true)
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

  const handleModalConfirm = () => {
    setShowSuccessModal(false)
    router.push('/login')
  }

  return (
    <>
      {/* 이메일 인증 안내 모달 */}
      <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <Mail className="h-6 w-6 text-green-600" />
            </div>
            <DialogTitle className="text-center">회원가입 완료</DialogTitle>
            <DialogDescription className="text-center space-y-2">
              <p>
                <strong>{registeredEmail}</strong>로 인증 메일을 발송했습니다.
              </p>
              <p>
                이메일을 확인하여 계정을 활성화해주세요.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-center">
            <Button onClick={handleModalConfirm} className="w-full sm:w-auto">
              확인
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <img
            src="https://ipqhhqduppzvsqwwzjkp.supabase.co/storage/v1/object/public/logos/goldpen.png"
            alt="GoldPen"
            className="h-12"
          />
        </div>
        <CardTitle className="text-2xl text-center">회원가입</CardTitle>
        <CardDescription className="text-center">
          계정을 만드세요
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 기관 아이디 */}
          <div className="space-y-2">
            <Label htmlFor="org_slug">기관 아이디 <span className="text-destructive">*</span></Label>
            <Input
              id="org_slug"
              type="text"
              placeholder="goldpen"
              className="placeholder:opacity-50"
              {...register('org_slug')}
              disabled={isLoading}
              required
            />
            <p className="text-xs text-blue-600">
              이 항목은 절대 바꿀수 없는 항목입니다, 영어로 적어주세요
            </p>
            {errors.org_slug && (
              <p className="text-sm text-destructive">{errors.org_slug.message}</p>
            )}
          </div>

          {/* 기관명 (지점명) */}
          <div className="space-y-2">
            <Label htmlFor="org_name">기관명 (지점명) <span className="text-destructive">*</span></Label>
            <Input
              id="org_name"
              type="text"
              placeholder="예: 골드펜 학원"
              className="placeholder:opacity-50"
              {...register('org_name')}
              disabled={isLoading}
              required
            />
            {errors.org_name && (
              <p className="text-sm text-destructive">{errors.org_name.message}</p>
            )}
          </div>

          {/* 원장 이름 */}
          <div className="space-y-2">
            <Label htmlFor="name">원장 이름 <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              type="text"
              placeholder="홍길동"
              className="placeholder:opacity-50"
              {...register('name')}
              disabled={isLoading}
              required
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* 전화번호 */}
          <div className="space-y-2">
            <Label htmlFor="phone">전화번호 <span className="text-destructive">*</span></Label>
            <Input
              id="phone"
              type="tel"
              placeholder="01012345678"
              className="placeholder:opacity-50"
              {...register('phone')}
              disabled={isLoading}
              required
            />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>

          {/* 이메일 */}
          <div className="space-y-2">
            <Label htmlFor="email">이메일 <span className="text-destructive">*</span></Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              className="placeholder:opacity-50"
              {...register('email')}
              disabled={isLoading}
              required
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          {/* 비밀번호 */}
          <div className="space-y-2">
            <Label htmlFor="password">비밀번호 <span className="text-destructive">*</span></Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              className="placeholder:opacity-50"
              {...register('password')}
              disabled={isLoading}
              required
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {/* 비밀번호 확인 */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">비밀번호 확인 <span className="text-destructive">*</span></Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              className="placeholder:opacity-50"
              {...register('confirmPassword')}
              disabled={isLoading}
              required
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            회원가입
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <div className="text-sm text-muted-foreground text-center">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-primary hover:underline">
            로그인
          </Link>
        </div>
      </CardFooter>
    </Card>
    </>
  )
}
