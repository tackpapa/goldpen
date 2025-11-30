'use client'

export const runtime = 'edge'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, Building2, Mail, Shield } from 'lucide-react'

interface InvitationInfo {
  email: string
  role: string
  expires_at: string
  created_at: string
}

interface OrganizationInfo {
  name: string
  slug: string
}

type InviteStatus = 'loading' | 'valid' | 'invalid' | 'expired' | 'accepted' | 'success'

const roleLabels: Record<string, string> = {
  owner: '관리자',
  manager: '매니저',
  teacher: '강사'
}

export default function InviteAcceptPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string

  const [status, setStatus] = useState<InviteStatus>('loading')
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null)
  const [error, setError] = useState<string>('')

  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // 초대 정보 로드
  useEffect(() => {
    const loadInvitation = async () => {
      try {
        const response = await fetch(`/api/settings/invitations/accept?token=${token}`)
        const data = await response.json()

        if (!response.ok) {
          if (data.status === 'accepted') {
            setStatus('accepted')
            setError('이미 수락된 초대입니다')
          } else if (data.status === 'expired') {
            setStatus('expired')
            setError('만료된 초대입니다')
          } else {
            setStatus('invalid')
            setError(data.error || '유효하지 않은 초대입니다')
          }
          return
        }

        setInvitation(data.invitation)
        setOrganization(data.organization)
        setStatus('valid')
      } catch (err) {
        console.error('초대 정보 로드 실패:', err)
        setStatus('invalid')
        setError('초대 정보를 불러올 수 없습니다')
      }
    }

    if (token) {
      loadInvitation()
    }
  }, [token])

  // 초대 수락 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    // 유효성 검사
    if (!name.trim()) {
      setFormError('이름을 입력해주세요')
      return
    }

    if (password.length < 6) {
      setFormError('비밀번호는 최소 6자 이상이어야 합니다')
      return
    }

    if (password !== confirmPassword) {
      setFormError('비밀번호가 일치하지 않습니다')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/settings/invitations/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, name, password })
      })

      const data = await response.json()

      if (!response.ok) {
        setFormError(data.error || '초대 수락 실패')
        setIsSubmitting(false)
        return
      }

      setStatus('success')

      // 3초 후 로그인 페이지로 리다이렉트
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    } catch (err) {
      console.error('초대 수락 실패:', err)
      setFormError('서버 오류가 발생했습니다')
      setIsSubmitting(false)
    }
  }

  // 로딩 상태
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">초대 정보를 확인하는 중...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // 에러 상태 (만료, 이미 수락됨, 유효하지 않음)
  if (status === 'invalid' || status === 'expired' || status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle>
              {status === 'expired' ? '초대가 만료되었습니다' :
               status === 'accepted' ? '이미 처리된 초대입니다' :
               '유효하지 않은 초대'}
            </CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => router.push('/login')}>
              로그인 페이지로 이동
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // 성공 상태
  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle>가입이 완료되었습니다!</CardTitle>
            <CardDescription>
              {organization?.name}에 성공적으로 가입되었습니다.<br />
              잠시 후 로그인 페이지로 이동합니다...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // 유효한 초대 - 수락 폼
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">초대 수락</CardTitle>
          <CardDescription>
            계정을 생성하여 팀에 합류하세요
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 초대 정보 */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">기관</p>
                <p className="font-medium">{organization?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">이메일</p>
                <p className="font-medium">{invitation?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">역할</p>
                <p className="font-medium">{roleLabels[invitation?.role || ''] || invitation?.role}</p>
              </div>
            </div>
          </div>

          {/* 가입 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                type="text"
                placeholder="홍길동"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">비밀번호 *</Label>
              <Input
                id="password"
                type="password"
                placeholder="최소 6자 이상"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인 *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="비밀번호를 다시 입력하세요"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : (
                '초대 수락 및 가입'
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            이미 계정이 있으신가요?{' '}
            <Button variant="link" className="p-0 h-auto" onClick={() => router.push('/login')}>
              로그인
            </Button>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
