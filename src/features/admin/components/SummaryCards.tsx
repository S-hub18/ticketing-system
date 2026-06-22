import Link from 'next/link'
import { ArrowUp, ArrowDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface SummaryCardsProps {
  data: {
    open: number
    inProgress: number
    resolvedToday: number
    criticalUnattended: number
    avgResolutionHours: number
  }
  trends?: {
    resolvedToday: number
    avgResolutionHours: number
  }
}

interface Trend {
  delta: number
  unit?: string
  higherIsBetter: boolean
}

interface KpiCardProps {
  label: string
  value: string | number
  danger?: boolean
  sub?: string
  trend?: Trend
}

function TrendArrow({ delta, unit = '', higherIsBetter }: Trend) {
  if (!delta) {
    return <span className="text-[11px] text-[#a8a29e]">no change</span>
  }
  const up = delta > 0
  const good = up === higherIsBetter
  const Arrow = up ? ArrowUp : ArrowDown
  const sign = up ? '+' : '−'
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-medium ${good ? 'text-green-600' : 'text-red-500'}`}>
      <Arrow className="h-3 w-3" />
      {sign}{Math.abs(delta)}{unit} vs prev
    </span>
  )
}

function KpiCard({ label, value, danger = false, sub, trend }: KpiCardProps) {
  return (
    <Card
      className={`border shadow-none flex-1 min-w-0 ${
        danger ? 'border-red-200 bg-red-50' : 'border-[#e7e5e4] bg-white'
      }`}
    >
      <CardContent className="p-4">
        <p className={`text-xs font-medium mb-1 ${danger ? 'text-red-500' : 'text-[#78716c]'}`}>
          {label}
        </p>
        <p
          className={`text-2xl font-bold leading-none ${
            danger ? 'text-red-600' : 'text-[#0c0a09]'
          }`}
        >
          {value}
        </p>
        {trend ? (
          <p className="mt-1">
            <TrendArrow {...trend} />
          </p>
        ) : sub ? (
          <p className={`text-[11px] mt-1 ${danger ? 'text-red-400' : 'text-[#a8a29e]'}`}>
            {sub}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function SummaryCards({ data, trends }: SummaryCardsProps) {
  const { open, inProgress, resolvedToday, criticalUnattended, avgResolutionHours } = data

  return (
    <div className="flex gap-3 flex-wrap">
      <KpiCard label="Open" value={open} sub="awaiting action" />
      <KpiCard label="In Progress" value={inProgress} sub="being handled" />
      <KpiCard
        label="Resolved Today"
        value={resolvedToday}
        sub="resolved in last 24h"
        trend={trends ? { delta: trends.resolvedToday, higherIsBetter: true } : undefined}
      />
      <KpiCard
        label="Avg Resolution"
        value={`${avgResolutionHours}h`}
        sub="mean time to resolve"
        trend={trends ? { delta: trends.avgResolutionHours, unit: 'h', higherIsBetter: false } : undefined}
      />
      {criticalUnattended > 0 ? (
        <Link href="/admin/tickets?urgency=CRITICAL" className="flex-1 min-w-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400">
          <KpiCard
            label="Critical Unattended"
            value={criticalUnattended}
            danger
            sub="view critical tickets →"
          />
        </Link>
      ) : (
        <KpiCard label="Critical Unattended" value={criticalUnattended} sub="all clear" />
      )}
    </div>
  )
}
