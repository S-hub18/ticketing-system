import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runAgent } from '@/lib/gemini'
import { getVolumeAnomalies, getResolutionTrends, getTopCategories, getAgentBottlenecks } from '@/lib/agent-tools/insights-tools'
import { AgentType } from '@/generated/prisma/client'

const SYSTEM_PROMPT = `You are an analytics AI agent for a support ticketing system. Analyze the metrics and generate actionable insights:
- Identify volume anomalies (spikes/drops)
- Highlight wins (improvements)
- Identify bottlenecks
- Summarize key trends
Respond with JSON: {"summary":"...","insights":[{"type":"anomaly","title":"...","detail":"...","action":"...or null"}],"generatedAt":"ISO timestamp"}`

const tools = [
  { name: 'getVolumeAnomalies', description: 'Get ticket volume anomalies by department', parameters: { type: 'object', properties: { dateRange: { type: 'number' }, department: { type: 'string' } }, required: ['dateRange'] } },
  { name: 'getResolutionTrends', description: 'Get resolution time trends', parameters: { type: 'object', properties: { dateRange: { type: 'number' } }, required: ['dateRange'] } },
  { name: 'getTopCategories', description: 'Get top ticket categories', parameters: { type: 'object', properties: { department: { type: 'string' }, limit: { type: 'number' } } } },
  { name: 'getAgentBottlenecks', description: 'Find agents with stalled tickets', parameters: { type: 'object', properties: {} } },
]

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if ((session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const { result } = await runAgent({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: 'Generate analytics insights for the last 30 days',
      tools,
      toolHandlers: {
        getVolumeAnomalies: (args: any) => getVolumeAnomalies(args),
        getResolutionTrends: (args: any) => getResolutionTrends(args),
        getTopCategories: (args: any) => getTopCategories(args),
        getAgentBottlenecks: () => getAgentBottlenecks(),
      },
      agentType: AgentType.INSIGHTS, userId: session.user.id,
    })
    return NextResponse.json(result, { headers: { 'Cache-Control': 's-maxage=3600, stale-while-revalidate' } })
  } catch (e: any) {
    console.error('Insights agent error:', e)
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  }
}
