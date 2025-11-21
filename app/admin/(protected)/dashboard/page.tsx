'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, Users, TrendingUp, Activity } from 'lucide-react'

interface Stats {
  totalOrganizations: number
  activeOrganizations: number
  totalUsers: number
  recentOrganizations: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalUsers: 0,
    recentOrganizations: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadStats = async () => {
      try {
        const response = await fetch('/api/admin/stats/overview', { credentials: 'include' })
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to load stats:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadStats()
  }, [])

  const statCards = [
    {
      title: '전체 조직',
      value: stats.totalOrganizations,
      icon: Building2,
      description: '등록된 모든 조직',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: '활성 조직',
      value: stats.activeOrganizations,
      icon: Activity,
      description: '현재 운영 중',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: '전체 사용자',
      value: stats.totalUsers,
      icon: Users,
      description: '모든 조직 포함',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: '최근 가입',
      value: stats.recentOrganizations,
      icon: TrendingUp,
      description: '지난 7일',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ]

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">대시보드</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent className="animate-pulse">
                <div className="h-8 bg-muted rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">대시보드</h1>
        <p className="text-muted-foreground">
          GoldPen 플랫폼의 전체 현황을 한눈에 확인하세요
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {card.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${card.bgColor}`}>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>조직 타입별 분포</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              차트 구현 예정 (recharts)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>최근 가입 조직</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              테이블 구현 예정
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
