import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runAgent } from '@/lib/gemini'
import { getStaleTicketContext, getAgentAvailability, findAlternativeAgent, getSimilarResolvedTickets } from '@/lib/agent-tools/escalation-tools'
import { AgentType } from '@/generated/prisma/client'

const SYSTEM_PROMPT = `You are an escalation AI agent. Analyze the stale ticket and determine the best action:
- REASSIGN: if assigned agent is unavailable, find a better agent
- NOTIFY: send a follow-up message to the current agent
- CLOSE: if ticket seems resolved or abandoned
Respond with JSON: {"action":"REASSIGN","escalationMessage":"...","suggestedAssigneeId":"...or null","reasoning":"..."}`

const tools = [
  { name: 'getStaleTicketContext', description: 'Get full context for a stale ticket', parameters: { type: 'object', properties: { ticketId: { type: 'string' } }, required: ['ticketId'] } },
  { name: 'getAgentAvailability', description: 'Check if an agent is available', parameters: { type: 'object', properties: { agentId: { type: 'string' } }, required: ['agentId'] } },
  { name: 'findAlternativeAgent', description: 'Find an alternative agent in a department', parameters: { type: 'object', properties: { department: { type: 'string' }, excludeAgentId: { type: 'string' } }, required: ['department', 'excludeAgentId'] } },
  { name: 'getSimilarResolvedTickets', description: 'Get similar resolved tickets for context', parameters: { type: 'object', properties: { description: { type: 'string' }, department: { type: 'string' } }, required: ['description', 'department'] } },
]

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  const session = await auth()
  if (!secret && !session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { ticketId } = await req.json()
    if (!ticketId) return NextResponse.json({ error: 'ticketId required' }, { status: 400 })
    const { result } = await runAgent({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: `Analyze stale ticket ID: ${ticketId} and determine escalation action`,
      tools,
      toolHandlers: {
        getStaleTicketContext: (args: any) => getStaleTicketContext(args),
        getAgentAvailability: (args: any) => getAgentAvailability(args),
        findAlternativeAgent: (args: any) => findAlternativeAgent(args),
        getSimilarResolvedTickets: (args: any) => getSimilarResolvedTickets(args),
      },
      agentType: AgentType.ESCALATION, ticketId,
    })
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('Escalation agent error:', e)
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  }
}
