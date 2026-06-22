'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface VolumeByDayRow {
  date: string
  IT: number
  HR: number
  FINANCE: number
  ADMIN: number
}

interface VolumeBarChartProps {
  data: VolumeByDayRow[]
}

const DEPT_COLORS = {
  IT: '#3b82f6',
  HR: '#8b5cf6',
  FINANCE: '#22c55e',
  ADMIN: '#f59e0b',
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export function VolumeBarChart({ data }: VolumeBarChartProps) {
  const formatted = data.map((row) => ({ ...row, date: formatDate(row.date) }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={formatted}
        margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
        barCategoryGap="30%"
        barGap={2}
      >
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#78716c' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#78716c' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            background: '#fff',
            border: '1px solid #e7e5e4',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        {(Object.keys(DEPT_COLORS) as Array<keyof typeof DEPT_COLORS>).map((dept) => (
          <Bar key={dept} dataKey={dept} fill={DEPT_COLORS[dept]} radius={[2, 2, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
