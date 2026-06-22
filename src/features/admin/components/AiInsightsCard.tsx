'use client'

import { InsightsAgentResult } from '@/types/index'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface AiInsightsCardProps {
  insights?: InsightsAgentResult
  isLoading: boolean
  onRefresh: () => void
}

const TYPE_ICON: Record<string, string> = {
  anomaly: '📈',
  win: '✅',
  bottleneck: '🚧',
  trend: '📉',
}

const TYPE_BG: Record<string, string> = {
  anomaly: 'bg-orange-50 border-orange-100',
  win: 'bg-green-50 border-green-100',
  bottleneck: 'bg-red-50 border-red-100',
  trend: 'bg-blue-50 border-blue-100',
}

const TYPE_TITLE_COLOR: Record<string, string> = {
  anomaly: 'text-orange-700',
  win: 'text-green-700',
  bottleneck: 'text-red-700',
  trend: 'text-blue-700',
}

export function AiInsightsCard({ insights, isLoading, onRefresh }: AiInsightsCardProps) {
  return (
    <Card className="border border-[#e7e5e4] shadow-none">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🤖</span>
          <CardTitle className="text-sm font-semibold text-[#0c0a09]">AI Insights</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
          className="h-7 px-2 text-[#78716c] hover:text-[#0c0a09] text-base"
          title="Refresh insights"
        >
          <span className={isLoading ? 'animate-spin inline-block' : 'inline-block'}>↻</span>
        </Button>
      </CardHeader>

      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : !insights ? (
          <p className="text-sm text-[#78716c]">No insights available. Click ↻ to generate.</p>
        ) : (
          <>
            {/* Summary */}
            <p className="text-sm text-[#44403c] leading-relaxed">{insights.summary}</p>

            {/* Individual insight cards */}
            {insights.insights.length > 0 && (
              <div className="space-y-2 pt-1">
                {insights.insights.map((insight, i) => (
                  <div
                    key={i}
                    className={`rounded-lg border p-3 ${TYPE_BG[insight.type] ?? 'bg-gray-50 border-gray-100'}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base leading-none mt-0.5">
                        {TYPE_ICON[insight.type] ?? '💡'}
                      </span>
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p
                          className={`text-xs font-semibold leading-snug ${
                            TYPE_TITLE_COLOR[insight.type] ?? 'text-gray-700'
                          }`}
                        >
                          {insight.title}
                        </p>
                        <p className="text-xs text-[#57534e] leading-snug">{insight.detail}</p>
                        {insight.action && (
                          <p className="text-xs text-[#78716c] italic leading-snug">
                            → {insight.action}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Generated at timestamp */}
            <p className="text-[10px] text-[#a8a29e] pt-1">
              Generated{' '}
              {new Date(insights.generatedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
