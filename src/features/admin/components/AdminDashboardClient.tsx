'use client'

import { useState } from 'react'
import { InsightsAgentResult } from '@/types/index'
import { AiInsightsCard } from '@/features/admin/components/AiInsightsCard'
import { VolumeBarChart } from '@/features/admin/components/VolumeBarChart'
import { StatusDonutChart } from '@/features/admin/components/StatusDonutChart'
import { TrendLineChart } from '@/features/admin/components/TrendLineChart'
import { ResolutionHistogram } from '@/features/admin/components/ResolutionHistogram'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  initialInsights?: InsightsAgentResult
  volumeByDay: { date: string; IT: number; HR: number; FINANCE: number; ADMIN: number }[]
  statusBreakdown: { status: string; count: number }[]
  trendByDay: { date: string; open: number; resolved: number; inProgress: number }[]
  resolutionHistogram: { bucket: string; count: number }[]
}

export function AdminDashboardClient({
  initialInsights,
  volumeByDay,
  statusBreakdown,
  trendByDay,
  resolutionHistogram,
}: Props) {
  const [insights, setInsights] = useState<InsightsAgentResult | undefined>(initialInsights)
  const [isLoading, setIsLoading] = useState(false)

  async function handleRefresh() {
    setIsLoading(true)
    try {
      const res = await fetch('/api/ai/insights', { cache: 'no-store' })
      if (res.ok) {
        const data: InsightsAgentResult = await res.json()
        setInsights(data)
      }
    } catch {
      // silently fail — stale data is still useful
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* AI Insights */}
      <AiInsightsCard
        insights={insights}
        isLoading={isLoading}
        onRefresh={handleRefresh}
      />

      {/* Row 1: Volume + Status donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border border-[#e7e5e4] shadow-none lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#0c0a09]">
              Ticket Volume by Department
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VolumeBarChart data={volumeByDay} />
          </CardContent>
        </Card>

        <Card className="border border-[#e7e5e4] shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#0c0a09]">
              Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusDonutChart data={statusBreakdown} />
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Trend + Resolution histogram */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border border-[#e7e5e4] shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#0c0a09]">
              Open / In Progress / Resolved Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLineChart data={trendByDay} />
          </CardContent>
        </Card>

        <Card className="border border-[#e7e5e4] shadow-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#0c0a09]">
              Resolution Time Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResolutionHistogram data={resolutionHistogram} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
