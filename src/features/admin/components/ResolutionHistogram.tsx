'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

interface HistogramRow {
  bucket: string
  count: number
}

interface ResolutionHistogramProps {
  data: HistogramRow[]
}

// Ordered buckets so they always display left-to-right correctly
const BUCKET_ORDER = ['<1h', '1-4h', '4-24h', '1-3d', '>3d']

const BAR_COLOR = '#3b82f6'

export function ResolutionHistogram({ data }: ResolutionHistogramProps) {
  // Re-sort to canonical bucket order regardless of API response order
  const sorted = BUCKET_ORDER.map(
    (bucket) => data.find((d) => d.bucket === bucket) ?? { bucket, count: 0 },
  )

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={sorted}
        margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
        barCategoryGap="35%"
      >
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 11, fill: '#78716c' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#78716c' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip
          cursor={{ fill: '#f5f5f4' }}
          contentStyle={{
            background: '#fff',
            border: '1px solid #e7e5e4',
            borderRadius: 8,
            fontSize: 12,
          }}
          formatter={(value: any) => [value, "Tickets"] as any}
        />
        <Bar dataKey="count" name="Tickets" radius={[4, 4, 0, 0]}>
          {sorted.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={BAR_COLOR} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
