import { NextRequest, NextResponse } from 'next/server'
import { runAgent } from '@/lib/gemini'
import { searchSimilarTickets, getSelfServiceKnowledge, assessUrgencySignals } from '@/lib/agent-tools/intake-tools'
import { AgentType } from '@/generated/prisma/client'

const SYSTEM_PROMPT = `You are an AI triage agent for an internal support ticketing system. Even from a single short phrase, you MUST determine the department.

Department rules — map common keywords aggressively:
- IT: VPN, laptop, computer, wifi, network, email, software, password, access, login, printer, internet, system, server, app, tool, device, screen, monitor, keyboard, mouse, phone, account locked
- HR: salary, payroll, leave, holiday, vacation, sick, onboarding, contract, policy, benefit, insurance, performance, appraisal, team, manager, harassment, resign, hire, job
- FINANCE: expense, reimbursement, invoice, budget, payment, receipt, purchase, approval, PO, vendor, tax, billing, cost, spend
- ADMIN: desk, chair, office, parking, visitor, badge, facilities, supplies, room, booking, maintenance, cleaning, AC, heating

Always pick the BEST matching department even if uncertain. Use confidence 0.5 for uncertain, 0.9+ for clear matches.
Always respond with valid JSON: {"department":"IT","confidence":0.9,"reasoning":"...","urgencySuggestion":"MEDIUM","urgencySignals":[],"selfServiceAnswer":null,"selfServiceConfidence":0.0,"similarTickets":[]}`

const tools = [
  { name: 'searchSimilarTickets', description: 'Search for similar resolved or open tickets', parameters: { type: 'object', properties: { query: { type: 'string' }, department: { type: 'string' }, limit: { type: 'number' } }, required: ['query'] } },
  { name: 'getSelfServiceKnowledge', description: 'Get self-service knowledge from resolved tickets', parameters: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'assessUrgencySignals', description: 'Assess urgency signals from description text', parameters: { type: 'object', properties: { description: { type: 'string' } }, required: ['description'] } },
]

const toolHandlers = {
  searchSimilarTickets: (args: any) => searchSimilarTickets(args),
  getSelfServiceKnowledge: (args: any) => getSelfServiceKnowledge(args),
  assessUrgencySignals: (args: any) => assessUrgencySignals(args),
}

export async function POST(req: NextRequest) {
  try {
    const { description, title } = await req.json()
    if (!description || description.length < 3) {
      return NextResponse.json({ error: 'Description too short' }, { status: 400 })
    }
    const { result } = await runAgent({
      systemPrompt: SYSTEM_PROMPT,
      userMessage: `Title: ${title ?? ''}\nDescription: ${description}`,
      tools, toolHandlers,
      agentType: AgentType.INTAKE,
    })
    return NextResponse.json(result)
  } catch (e: any) {
    console.error('Intake agent error:', e)
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })
  }
}
