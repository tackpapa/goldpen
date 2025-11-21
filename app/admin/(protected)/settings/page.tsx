'use client'

import { useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Setting {
  key: string
  value: string | number | boolean
  description: string
  category: string
}

export default function SettingsPage() {
  // Mock 데이터 (추후 API 연동)
  const [settings] = useState<Setting[]>([
    // General
    { key: 'site_name', value: 'GoldPen', description: '사이트 이름', category: 'general' },
    { key: 'support_email', value: 'support@goldpen.kr', description: '지원 이메일', category: 'general' },
    { key: 'max_upload_size_mb', value: 10, description: '최대 업로드 크기 (MB)', category: 'general' },

    // Email
    { key: 'smtp_host', value: 'smtp.sendgrid.net', description: 'SMTP 호스트', category: 'email' },
    { key: 'smtp_port', value: 587, description: 'SMTP 포트', category: 'email' },
    { key: 'email_from', value: 'noreply@goldpen.kr', description: '발신 이메일', category: 'email' },

    // Security
    { key: 'session_timeout_minutes', value: 60, description: '세션 타임아웃 (분)', category: 'security' },
    { key: 'password_min_length', value: 8, description: '최소 비밀번호 길이', category: 'security' },
    { key: 'require_2fa', value: false, description: '2FA 필수 여부', category: 'security' },

    // Features
    { key: 'enable_ai_reports', value: true, description: 'AI 리포트 기능', category: 'features' },
    { key: 'enable_kakao_notifications', value: true, description: '카카오 알림', category: 'features' },
    { key: 'enable_calendar_sync', value: true, description: '캘린더 동기화', category: 'features' },
  ])

  const categoryLabels: Record<string, string> = {
    general: '일반',
    email: '이메일',
    security: '보안',
    features: '기능',
  }

  const getSettingsByCategory = (category: string) => {
    return settings.filter((s) => s.category === category)
  }

  const renderValue = (value: string | number | boolean) => {
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'}>
          {value ? '활성화' : '비활성화'}
        </Badge>
      )
    }
    if (typeof value === 'number') {
      return <span className="font-mono">{value}</span>
    }
    return <span>{value}</span>
  }

  const SettingsTable = ({ category }: { category: string }) => {
    const categorySettings = getSettingsByCategory(category)

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">설정 키</TableHead>
            <TableHead className="w-[200px]">값</TableHead>
            <TableHead>설명</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categorySettings.map((setting) => (
            <TableRow key={setting.key}>
              <TableCell className="font-mono text-sm">{setting.key}</TableCell>
              <TableCell>{renderValue(setting.value)}</TableCell>
              <TableCell className="text-muted-foreground">{setting.description}</TableCell>
            </TableRow>
          ))}
          {categorySettings.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                설정이 없습니다.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">시스템 설정</h1>
        <p className="text-muted-foreground">
          시스템 전체 설정을 관리합니다 (읽기 전용)
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">일반</TabsTrigger>
          <TabsTrigger value="email">이메일</TabsTrigger>
          <TabsTrigger value="security">보안</TabsTrigger>
          <TabsTrigger value="features">기능</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>일반 설정</CardTitle>
              <CardDescription>
                사이트 기본 설정을 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsTable category="general" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>이메일 설정</CardTitle>
              <CardDescription>
                SMTP 및 이메일 발송 설정을 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsTable category="email" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>보안 설정</CardTitle>
              <CardDescription>
                시스템 보안 및 인증 설정을 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsTable category="security" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>기능 설정</CardTitle>
              <CardDescription>
                시스템 기능 활성화/비활성화를 관리합니다
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsTable category="features" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="text-yellow-800">알림</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-yellow-700">
          현재 읽기 전용 모드입니다. 설정 수정 기능은 추후 추가될 예정입니다.
        </CardContent>
      </Card>
    </div>
  )
}
