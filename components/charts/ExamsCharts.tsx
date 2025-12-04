'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface ScoreDistributionData {
  range: string
  count: number
}

interface ExamsChartsProps {
  scoreDistribution: ScoreDistributionData[]
}

export function ExamsCharts({ scoreDistribution }: ExamsChartsProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={scoreDistribution}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="range" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
