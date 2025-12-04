'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface MonthlyProgressData {
  month: string
  planned: number
  lessons: number
}

interface ComprehensionTrendData {
  week: string
  high: number
  medium: number
  low: number
}

interface LessonsChartsProps {
  monthlyProgressData: MonthlyProgressData[]
  comprehensionTrendData: ComprehensionTrendData[]
}

export function LessonsCharts({ monthlyProgressData, comprehensionTrendData }: LessonsChartsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>월별 수업 진행률</CardTitle>
          <CardDescription>계획 대비 실제 진행된 수업 수</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyProgressData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="planned" fill="#94a3b8" name="계획" />
              <Bar dataKey="lessons" fill="#3b82f6" name="실제" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>주차별 이해도 트렌드</CardTitle>
          <CardDescription>학생들의 이해도 분포 변화</CardDescription>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={comprehensionTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="high" stroke="#22c55e" name="상" strokeWidth={2} />
              <Line type="monotone" dataKey="medium" stroke="#eab308" name="중" strokeWidth={2} />
              <Line type="monotone" dataKey="low" stroke="#ef4444" name="하" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
