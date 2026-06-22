import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runAgent, RateLimitError } from '@/lib/gemini'
import { getTicketFullContext, getSimilarResolutions, checkSLAStatus, getEmployeeTicketPattern } from '@/lib/agent-tools/assist-tools'
import { AgentType } from '@/generated/prisma/client'

const SYSTEM_PROMPT = `You are an AI assistant helping a support agent respond to a ticket. Based on the ticket context, similar resolutions, and SLA status:
1. Generate a professional, empathetic draft reply
2. Suggest the best action (RESOLVE, NEEDS_INFO, ESCALATE, SCHEDULE_CALL)
3. Highlight any SLA warnings or repeat issues
Respond with JSON: {"draft":"...","suggestedAction":"NEEDS_INFO","actionReason":"...","slaWarning":"...or null","repeatIssueNote":"...or null"}`

const tools = [
  { name: 'getTicketFullContext', description: 'Get full ticket details, comments, and employee info', parameters: { type: 'object', properties: { ticketId: { type: 'string' } }, required: ['ticketId'] } },
  { name: 'getSimilarResolutions', description: 'Find similar resolved tickets with resolutions', parameters: { type: 'object', properties: { description: { type: 'string' }, department: { type: 'string' }, limit: { type: 'number' } }, required: ['description', 'department'] } },
  { name: 'checkSLAStatus', description: 'Check if SLA has been breached', parameters: { type: 'object', properties: { urgency: { type: 'string' }, createdAt: { type: 'string' }, lastActivityAt: { type: 'string' } }, required: ['urgency', 'createdAt', 'lastActivityAt'] } },
  { name: 'getEmployeeTicketPattern', description: 'Get employee ticket history and patterns', parameters: { type: 'object', properties: { userId: { type: 'string' } }, required: ['userId'] } },
]

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any)?.role
  if (!['AGENT', 'ADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  try {
    const { ticketId } = await req.json()
    if (!ticketId) return NextResponse.json({ error: 'ticketId required' }, { status: 400 })
    const { result } = await runAgent({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: `Generate a draft reply for ticket ID: ${ticketId}`,
      tools,
      toolHandlers: {
        getTicketFullContext: (args: any) => getTicketFullContext(args),
        getSimilarResolutions: (args: any) => getSimilarResolutions(args),
        checkSLAStatus: (args: any) => checkSLAStatus(args),
        getEmployeeTicketPattern: (args: any) => getEmployeeTicketPattern(args),
      },
      agentType: AgentType.ASSIST, ticketId, userId: session.user.id,
    })
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('Assist agent error:', e)
    if (e instanceof RateLimitError) {
      return NextResponse.json({ error: e.message }, { status: 429 })
    }
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  }
}
