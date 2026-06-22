import { NextRequest, NextResponse } from 'next/server'
import { getStaleTickets, markEscalated } from '@/lib/escalation'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.INTERNAL_CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const stale = await getStaleTickets(48)
  const escalated: string[] = []
  for (const ticket of stale) {
    try {
      await fetch(`${process.env.NEXTAUTH_URL}/api/ai/escalate-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': process.env.INTERNAL_CRON_SECRET! },
        body: JSON.stringify({ ticketId: ticket.id }),
      })
      await markEscalated(ticket.id)
      escalated.push(ticket.id)
    } catch {}
  }
  return NextResponse.json({ processed: stale.length, escalated })
}
