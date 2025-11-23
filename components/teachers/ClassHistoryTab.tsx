'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import type { Teacher } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Loader2 } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface ClassHistoryTabProps {
  teacher: Teacher
}

interface Lesson {
  id: string
  date: string
  subject: string
  class_name?: string
  lesson_time?: string
  student_count?: number
  duration_minutes: number
  duration_hours: number
  content: string
  attendance_count?: number
  homework?: string
  created_at: string
}

interface LessonsResponse {
  lessons: Lesson[]
  pagination: {
    limit: number
    offset: number
    total: number
    has_more: boolean
  }
}

export function ClassHistoryTab({ teacher }: ClassHistoryTabProps) {
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)
  const observerTarget = useRef<HTMLDivElement>(null)
  const ITEMS_PER_PAGE = 10

  const fetchLessons = async (offset: number = 0, append: boolean = false) => {
    try {
      if (append) {
        setLoadingMore(true)
      } else {
        setLoading(true)
      }
      setError(null)

      const response = await fetch(
        `/api/teachers/${teacher.id}/lessons?limit=${ITEMS_PER_PAGE}&offset=${offset}`
      )
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || '수업 이력 조회 실패')
      }

      const data = await response.json()

      if (append) {
        setLessons(prev => [...prev, ...data.lessons])
      } else {
        setLessons(data.lessons)
      }

      setTotal(data.pagination.total)
      setHasMore(data.pagination.has_more)
    } catch (err) {
      console.error('[ClassHistoryTab] Error fetching lessons:', err)
      setError(err instanceof Error ? err.message : '알 수 없는 오류')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    if (teacher.id) {
      fetchLessons(0, false)
    }
  }, [teacher.id])

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchLessons(lessons.length, true)
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [lessons.length, hasMore, loadingMore, loading])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">수업 이력 로딩 중...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="text-destructive mb-2">❌ 오류: {error}</p>
        <p className="text-sm text-muted-foreground">수업 이력을 불러올 수 없습니다.</p>
      </div>
    )
  }

  const totalHours = lessons.reduce((sum, l) => sum + l.duration_hours, 0)

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-primary/5">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-sm text-muted-foreground">전체 수업 횟수</p>
              <p className="text-2xl font-bold text-primary">{total}회</p>
            </div>
            <div className="text-center border-x">
              <p className="text-sm text-muted-foreground">총 수업 시간</p>
              <p className="text-2xl font-bold text-primary">
                {Math.round(totalHours * 10) / 10}시간
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-muted-foreground">최근 수업</p>
              <p className="text-lg font-semibold">
                {lessons[0]?.date || '-'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lessons List */}
      <Card>
        <CardHeader>
          <CardTitle>수업 이력</CardTitle>
          <CardDescription>수업일지가 작성된 수업 목록 (스크롤하여 더 보기)</CardDescription>
        </CardHeader>
        <CardContent>
          {lessons.length === 0 && !loading ? (
            <div className="text-center py-12">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">아직 작성된 수업일지가 없습니다.</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>날짜</TableHead>
                      <TableHead>반</TableHead>
                      <TableHead>과목</TableHead>
                      <TableHead>수업시간</TableHead>
                      <TableHead>학생수</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lessons.map((lesson) => {
                      return (
                        <TableRow key={lesson.id}>
                          <TableCell className="font-medium">{lesson.date}</TableCell>
                          <TableCell>{lesson.class_name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{lesson.subject}</Badge>
                          </TableCell>
                          <TableCell>
                            {lesson.duration_hours}시간
                          </TableCell>
                          <TableCell>{lesson.student_count || 0}명</TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>

                {/* Infinite Scroll Trigger */}
                <div ref={observerTarget} className="h-4" />

                {/* Loading More Indicator */}
                {loadingMore && (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    <span className="ml-2 text-sm text-muted-foreground">더 불러오는 중...</span>
                  </div>
                )}

                {/* No More Data */}
                {!hasMore && lessons.length > 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    모든 수업 이력을 불러왔습니다. (총 {total}건)
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
