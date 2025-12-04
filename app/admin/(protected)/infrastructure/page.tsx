'use client'

export const runtime = 'edge'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Database,
  HardDrive,
  Users,
  Building2,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Server,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface InfraMetrics {
  current: {
    tenants: number
    users: number
    students: number
    totalRecords: number
    estimatedDbSizeMB: number
    estimatedStorageMB: number
    estimatedConcurrentUsers: number
  }
  limits: {
    dbConnections: number
    dbPoolSize: number
    dbStorage: number
    fileStorage: number
    workersRequests: number
    queueMessages: number
    tenantsWithQueue: number
  }
  usage: {
    tenantsQueue: number
    dbConnections: number
    dbStorage: number
    fileStorage: number
  }
  alerts: {
    tenantsQueue: 'safe' | 'warning' | 'danger' | 'critical'
    dbConnections: 'safe' | 'warning' | 'danger' | 'critical'
    dbStorage: 'safe' | 'warning' | 'danger' | 'critical'
    fileStorage: 'safe' | 'warning' | 'danger' | 'critical'
  }
  recommendations: string[]
}

const alertColors = {
  safe: 'bg-green-500',
  warning: 'bg-yellow-500',
  danger: 'bg-orange-500',
  critical: 'bg-red-500',
}

const alertBadgeVariants = {
  safe: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  danger: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
}

const alertLabels = {
  safe: '안전',
  warning: '주의',
  danger: '경고',
  critical: '위험',
}

function AlertIcon({ level }: { level: 'safe' | 'warning' | 'danger' | 'critical' }) {
  if (level === 'safe') return <CheckCircle2 className="h-4 w-4 text-green-600" />
  if (level === 'warning') return <AlertTriangle className="h-4 w-4 text-yellow-600" />
  if (level === 'danger') return <AlertTriangle className="h-4 w-4 text-orange-600" />
  return <XCircle className="h-4 w-4 text-red-600" />
}

function MetricCard({
  title,
  description,
  icon: Icon,
  current,
  limit,
  unit,
  usage,
  alert,
}: {
  title: string
  description: string
  icon: any
  current: number
  limit: number
  unit: string
  usage: number
  alert: 'safe' | 'warning' | 'danger' | 'critical'
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <CardDescription className="text-xs">{description}</CardDescription>
            </div>
          </div>
          <Badge className={cn('text-xs', alertBadgeVariants[alert])}>
            <AlertIcon level={alert} />
            <span className="ml-1">{alertLabels[alert]}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">
              {current.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
            </span>
            <span className="text-sm text-muted-foreground">
              / {limit.toLocaleString()} {unit}
            </span>
          </div>
          <Progress
            value={Math.min(usage, 100)}
            className="h-2"
            // @ts-ignore - custom indicator color
            indicatorClassName={alertColors[alert]}
          />
          <p className="text-xs text-muted-foreground text-right">{usage}% 사용중</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function InfrastructurePage() {
  const [metrics, setMetrics] = useState<InfraMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const loadMetrics = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/infrastructure', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json() as InfraMetrics
        setMetrics(data)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Failed to load infrastructure metrics:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMetrics()
  }, [])

  if (isLoading || !metrics) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">인프라 현황</h1>
          <p className="text-muted-foreground">시스템 리소스 사용량 모니터링</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="animate-pulse">
                <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-2 bg-muted rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">인프라 현황</h1>
          <p className="text-muted-foreground">
            시스템 리소스 사용량 모니터링 및 확장 시점 알림
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              마지막 업데이트: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={loadMetrics} disabled={isLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
            새로고침
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-100">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">총 Tenant</p>
                <p className="text-2xl font-bold">{metrics.current.tenants}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-purple-100">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">총 사용자</p>
                <p className="text-2xl font-bold">{metrics.current.users}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-green-100">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">총 학생</p>
                <p className="text-2xl font-bold">{metrics.current.students}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-orange-100">
                <Database className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">총 레코드</p>
                <p className="text-2xl font-bold">{metrics.current.totalRecords.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Capacity Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">용량 및 한계</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            title="Tenant 수 (Queue 기반)"
            description="Queue 아키텍처로 확장 가능한 tenant 수"
            icon={Zap}
            current={metrics.current.tenants}
            limit={metrics.limits.tenantsWithQueue}
            unit="개"
            usage={metrics.usage.tenantsQueue}
            alert={metrics.alerts.tenantsQueue}
          />
          <MetricCard
            title="DB 동시 연결"
            description="Supabase Pooler 동시 연결 수"
            icon={Server}
            current={metrics.current.estimatedConcurrentUsers}
            limit={metrics.limits.dbConnections}
            unit="연결"
            usage={metrics.usage.dbConnections}
            alert={metrics.alerts.dbConnections}
          />
          <MetricCard
            title="DB 저장공간"
            description="PostgreSQL 데이터베이스 용량"
            icon={Database}
            current={metrics.current.estimatedDbSizeMB}
            limit={metrics.limits.dbStorage}
            unit="MB"
            usage={metrics.usage.dbStorage}
            alert={metrics.alerts.dbStorage}
          />
          <MetricCard
            title="파일 스토리지"
            description="Supabase Storage 용량"
            icon={HardDrive}
            current={metrics.current.estimatedStorageMB}
            limit={metrics.limits.fileStorage}
            unit="MB"
            usage={metrics.usage.fileStorage}
            alert={metrics.alerts.fileStorage}
          />
        </div>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            권장 조치 사항
          </CardTitle>
          <CardDescription>
            현재 인프라 상태에 따른 권장 조치입니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {metrics.recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-2">
                {rec.includes('양호') ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
                )}
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Architecture Info */}
      <Card>
        <CardHeader>
          <CardTitle>현재 아키텍처</CardTitle>
          <CardDescription>골드펜 인프라 구성</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <h4 className="font-medium">프론트엔드</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Cloudflare Pages (Next.js 15)</li>
                <li>- Edge Runtime</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">백엔드</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Cloudflare Workers (Cron + Queue)</li>
                <li>- Cloudflare Queues (출결 알림)</li>
                <li>- Supabase PostgreSQL</li>
                <li>- Supabase Auth & Storage</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">현재 플랜</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- Cloudflare Pro</li>
                <li>- Supabase Pro (Micro compute)</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-medium">확장 계획</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- DB 인스턴스 업그레이드 (300+ tenant)</li>
                <li>- DB 샤딩 / Read Replica (400+ tenant)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
