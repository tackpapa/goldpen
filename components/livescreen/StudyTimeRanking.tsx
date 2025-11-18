'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Trophy, Medal, Award, Clock } from 'lucide-react'
import type { StudyTimeRanking } from '@/lib/types/database'

interface StudyTimeRankingProps {
  studentId: string
  rankings: {
    daily: StudyTimeRanking[]
    weekly: StudyTimeRanking[]
    monthly: StudyTimeRanking[]
  }
  myTotalMinutes: {
    daily: number
    weekly: number
    monthly: number
  }
}

export function StudyTimeRankingDisplay({
  studentId,
  rankings,
  myTotalMinutes,
}: StudyTimeRankingProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours}시간 ${mins}분`
  }

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />
      default:
        return null
    }
  }

  const getRankBadgeColor = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-yellow-500 text-white'
      case 2:
        return 'bg-gray-400 text-white'
      case 3:
        return 'bg-amber-600 text-white'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const myRank = rankings[selectedPeriod].find(r => r.student_id === studentId)

  const renderRankingList = (rankingList: StudyTimeRanking[]) => {
    // Show top 10
    const topRankings = rankingList.slice(0, 10)

    return (
      <div className="space-y-2">
        {topRankings.map((ranking, index) => {
          const isMe = ranking.student_id === studentId

          return (
            <div
              key={ranking.student_id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                isMe
                  ? 'bg-primary/10 border-primary'
                  : 'bg-muted/30 hover:bg-muted/50'
              }`}
            >
              {/* Rank */}
              <div className="flex items-center justify-center min-w-[60px]">
                {ranking.rank <= 3 ? (
                  <div className="flex items-center gap-1">
                    {getRankIcon(ranking.rank)}
                    <span className="font-bold text-lg">{ranking.rank}</span>
                  </div>
                ) : (
                  <Badge className={getRankBadgeColor(ranking.rank)}>
                    {ranking.rank}위
                  </Badge>
                )}
              </div>

              {/* Student Name */}
              <div className="flex-1">
                <p className={`font-semibold ${isMe ? 'text-primary' : ''}`}>
                  {ranking.surname}
                  {isMe && ' (나)'}
                </p>
              </div>

              {/* Study Time */}
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-mono font-semibold">
                  {formatTime(ranking.total_minutes)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          공부시간 랭킹
        </CardTitle>
        <CardDescription>
          독서실 전체 학생 공부시간 순위
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="daily">일간</TabsTrigger>
            <TabsTrigger value="weekly">주간</TabsTrigger>
            <TabsTrigger value="monthly">월간</TabsTrigger>
          </TabsList>

          {/* My Rank Summary */}
          {myRank && (
            <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">나의 순위</p>
                  <div className="flex items-center gap-2">
                    {myRank.rank <= 3 && getRankIcon(myRank.rank)}
                    <span className="text-2xl font-bold text-primary">
                      {myRank.rank}위
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground mb-1">누적 공부시간</p>
                  <p className="text-xl font-bold">
                    {formatTime(myTotalMinutes[selectedPeriod])}
                  </p>
                </div>
              </div>
            </div>
          )}

          <TabsContent value="daily" className="mt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>오늘의 랭킹 (Top 10)</span>
                <span>총 {rankings.daily.length}명</span>
              </div>
              {renderRankingList(rankings.daily)}
            </div>
          </TabsContent>

          <TabsContent value="weekly" className="mt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>이번 주 랭킹 (Top 10)</span>
                <span>총 {rankings.weekly.length}명</span>
              </div>
              {renderRankingList(rankings.weekly)}
            </div>
          </TabsContent>

          <TabsContent value="monthly" className="mt-0">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                <span>이번 달 랭킹 (Top 10)</span>
                <span>총 {rankings.monthly.length}명</span>
              </div>
              {renderRankingList(rankings.monthly)}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
