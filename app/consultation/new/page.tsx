'use client'

export const runtime = 'edge'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ConsultationSchema, type ConsultationInput } from '@/lib/validations/student'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export default function NewConsultationPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ConsultationInput>({
    resolver: zodResolver(ConsultationSchema),
  })

  const onSubmit = async (data: ConsultationInput) => {
    setIsLoading(true)
    try {
      // TODO: Supabase에 저장
      console.log('상담 신청 데이터:', data)

      toast({
        title: '상담 신청 완료',
        description: '상담 신청이 접수되었습니다. 곧 연락드리겠습니다.',
      })

      reset()
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
    <div className="flex min-h-screen items-center justify-center bg-muted/50 py-12">
      <div className="w-full max-w-2xl px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
                <span className="text-2xl font-bold text-primary-foreground">C</span>
              </div>
            </div>
            <CardTitle className="text-2xl text-center">상담 신청</CardTitle>
            <CardDescription className="text-center">
              무료 상담을 신청하고 맞춤형 학습 계획을 받아보세요
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="student_name">학생 이름 *</Label>
                  <Input
                    id="student_name"
                    {...register('student_name')}
                    disabled={isLoading}
                  />
                  {errors.student_name && (
                    <p className="text-sm text-destructive">{errors.student_name.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="student_grade">학년</Label>
                  <Input
                    id="student_grade"
                    type="number"
                    placeholder="1-12"
                    {...register('student_grade', { valueAsNumber: true })}
                    disabled={isLoading}
                  />
                  {errors.student_grade && (
                    <p className="text-sm text-destructive">{errors.student_grade.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent_name">학부모 이름 *</Label>
                <Input
                  id="parent_name"
                  {...register('parent_name')}
                  disabled={isLoading}
                />
                {errors.parent_name && (
                  <p className="text-sm text-destructive">{errors.parent_name.message}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="parent_phone">연락처 *</Label>
                  <Input
                    id="parent_phone"
                    placeholder="010-0000-0000"
                    {...register('parent_phone')}
                    disabled={isLoading}
                  />
                  {errors.parent_phone && (
                    <p className="text-sm text-destructive">{errors.parent_phone.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parent_email">이메일</Label>
                  <Input
                    id="parent_email"
                    type="email"
                    placeholder="email@example.com"
                    {...register('parent_email')}
                    disabled={isLoading}
                  />
                  {errors.parent_email && (
                    <p className="text-sm text-destructive">{errors.parent_email.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goals">학습 목표 및 문의사항</Label>
                <Textarea
                  id="goals"
                  placeholder="예: 수학 성적 향상, 영어 회화 실력 향상 등"
                  rows={4}
                  {...register('goals')}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred_times">희망 상담 시간</Label>
                <Input
                  id="preferred_times"
                  placeholder="예: 평일 오후 2-4시"
                  {...register('preferred_times')}
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                상담 신청하기
              </Button>
            </form>
          </CardContent>
          <CardFooter className="text-center text-sm text-muted-foreground">
            신청하신 내용은 안전하게 보관되며, 상담 목적으로만 사용됩니다.
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
