import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any)?.role
  if (!['AGENT', 'ADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const ticket = await prisma.ticket.findUnique({ where: { id } })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updated = await prisma.ticket.update({
    where: { id },
    data: { assignedToId: session.user.id, status: 'IN_PROGRESS', lastActivityAt: new Date() },
    include: { createdBy: { select: { name: true } }, assignedTo: { select: { name: true } } },
  })
  await prisma.ticketHistory.create({ data: { ticketId: id, changedById: session.user.id, field: 'assignedTo', newValue: session.user.id, note: 'Claimed by agent' } })
  await createNotification({ userId: ticket.createdById, ticketId: id, type: 'TICKET_ASSIGNED', title: 'Ticket assigned to agent', body: `${session.user.name ?? 'An agent'} is now handling your ticket` })
  return NextResponse.json(updated)
}
