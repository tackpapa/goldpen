'use client'

import { useMemo } from 'react'
import type { Teacher } from '@/lib/types/database'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, School, GraduationCap } from 'lucide-react'

interface AssignedStudentsTabProps {
  teacher: Teacher
  students?: Array<{
    id: string
    name: string
    grade?: string | null
    school?: string | null
  }> | null
}

export function AssignedStudentsTab({ teacher, students }: AssignedStudentsTabProps) {
  const assignedStudents = useMemo(() => {
    if (students && students.length > 0) {
      return students
    }
    // fallback to assigned_students ids but no details
    return (teacher.assigned_students || []).map((id) => ({
      id,
      name: `학생 ${id}`,
      grade: '',
      school: '',
    }))
  }, [students, teacher.assigned_students])

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">총 배정 학생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignedStudents.length}명</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">중학생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assignedStudents.filter((s) => (s.grade || '').startsWith('중')).length}명
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">고등학생</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assignedStudents.filter((s) => (s.grade || '').startsWith('고')).length}명
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      <Card>
        <CardHeader>
          <CardTitle>배정된 학생 목록</CardTitle>
          <CardDescription>현재 담당하고 있는 학생들입니다</CardDescription>
        </CardHeader>
        <CardContent>
          {assignedStudents.length > 0 ? (
            <div className="space-y-3">
              {assignedStudents.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded">
                      <GraduationCap className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{student.name}</p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <School className="h-3 w-3" />
                        <span>{student.school || '학교 정보 없음'}</span>
                      </div>
                    </div>
                  </div>
                  <Badge variant="secondary">{student.grade || '학년 정보 없음'}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>배정된 학생이 없습니다</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
