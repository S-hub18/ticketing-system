import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runAgent } from '@/lib/gemini'
import { getAgentWorkload, checkDuplicateTickets, getRequesterHistory, getPriorityScore } from '@/lib/agent-tools/triage-tools'
import { AgentType } from '@/generated/prisma/client'
import { createNotification } from '@/lib/notifications'

const SYSTEM_PROMPT = `You are an auto-triage AI agent. Analyze the ticket and:
1. Determine the best agent to assign based on workload
2. Check for duplicate tickets
3. Score the priority
Respond with JSON: {"suggestedAssigneeId":"...or null","autoAssigned":true,"priorityScore":85,"duplicateTicketId":"...or null","triageNotes":"..."}`

const tools = [
  { name: 'getAgentWorkload', description: 'Get agent workload in a department', parameters: { type: 'object', properties: { department: { type: 'string' } }, required: ['department'] } },
  { name: 'checkDuplicateTickets', description: 'Check for duplicate tickets', parameters: { type: 'object', properties: { description: { type: 'string' }, department: { type: 'string' } }, required: ['description', 'department'] } },
  { name: 'getRequesterHistory', description: 'Get requester ticket history', parameters: { type: 'object', properties: { userId: { type: 'string' } }, required: ['userId'] } },
  { name: 'getPriorityScore', description: 'Get priority score', parameters: { type: 'object', properties: { urgency: { type: 'string' }, department: { type: 'string' } }, required: ['urgency', 'department'] } },
]

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  const isInternal = secret === process.env.INTERNAL_CRON_SECRET
  if (!isInternal) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { ticketId } = await req.json()
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId }, include: { createdBy: true } })
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { result } = await runAgent<any>({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: `Triage ticket: "${ticket.title}". Dept: ${ticket.department}. Urgency: ${ticket.urgency}. Requester: ${ticket.createdById}`,
      tools,
      toolHandlers: {
        getAgentWorkload: (args: any) => getAgentWorkload(args),
        checkDuplicateTickets: (args: any) => checkDuplicateTickets(args),
        getRequesterHistory: (args: any) => getRequesterHistory(args),
        getPriorityScore: (args: any) => getPriorityScore(args),
      },
      agentType: AgentType.TRIAGE, ticketId,
    })
    if (result.autoAssigned && result.suggestedAssigneeId) {
      await prisma.ticket.update({ where: { id: ticketId }, data: { assignedToId: result.suggestedAssigneeId, status: 'IN_PROGRESS', lastActivityAt: new Date() } })
      await prisma.ticketHistory.create({ data: { ticketId, changedById: result.suggestedAssigneeId, field: 'assignedTo', newValue: result.suggestedAssigneeId, note: result.triageNotes } })
      await createNotification({ userId: result.suggestedAssigneeId, ticketId, type: 'TICKET_ASSIGNED', title: 'Ticket assigned to you', body: `${ticket.title} has been auto-assigned to you` })
    }
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('Triage agent error:', e)
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  }
}
