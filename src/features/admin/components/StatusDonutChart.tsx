'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface StatusRow {
  status: string
  count: number
}

interface StatusDonutChartProps {
  data: StatusRow[]
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#3b82f6',
  IN_PROGRESS: '#f59e0b',
  RESOLVED: '#22c55e',
  CLOSED: '#9ca3af',
}

const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

interface CenterLabelProps {
  cx: number
  cy: number
  total: number
}

function CenterLabel({ cx, cy, total }: CenterLabelProps) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.4em" fontSize={22} fontWeight={700} fill="#0c0a09">
        {total}
      </tspan>
      <tspan x={cx} dy="1.4em" fontSize={11} fill="#78716c">
        total
      </tspan>
    </text>
  )
}

export function StatusDonutChart({ data }: StatusDonutChartProps) {
  const total = data.reduce((sum, row) => sum + row.count, 0)

  const chartData = data.map((row) => ({
    ...row,
    label: STATUS_LABELS[row.status] ?? row.status,
    color: STATUS_COLORS[row.status] ?? '#d4d4d4',
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={72}
          outerRadius={110}
          paddingAngle={2}
          dataKey="count"
          nameKey="label"
          startAngle={90}
          endAngle={-270}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
          ))}
          {/* Render center label via a custom label on the Pie */}
        </Pie>
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          <tspan
            x="50%"
            dy="-0.4em"
            fontSize={22}
            fontWeight={700}
            fill="#0c0a09"
          >
            {total}
          </tspan>
          <tspan
            x="50%"
            dy="1.4em"
            fontSize={11}
            fill="#78716c"
          >
            total
          </tspan>
        </text>
        <Tooltip
          formatter={(value: any, name: any) => [value, name]}
          contentStyle={{
            background: '#fff',
            border: '1px solid #e7e5e4',
            borderRadius: 8,
            fontSize: 12,
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
