import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { reason } = await req.json()

  if (!reason?.trim()) {
    return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Employees can only reopen their own tickets; agents can reopen any
  const role = (session.user as any).role
  if (role === 'EMPLOYEE' && ticket.createdById !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!['CLOSED', 'RESOLVED'].includes(ticket.status)) {
    return NextResponse.json({ error: `Cannot reopen a ${ticket.status} ticket` }, { status: 400 })
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: { status: 'OPEN', closedAt: null, resolvedAt: null, lastActivityAt: new Date() },
  })

  await prisma.ticketHistory.create({
    data: {
      ticketId: id,
      changedById: session.user.id,
      field: 'status',
      oldValue: ticket.status,
      newValue: 'OPEN',
      note: `Reopened: ${reason.trim()}`,
    },
  })

  // Notify the assigned agent if there is one
  if (ticket.assignedToId) {
    await createNotification({
      userId: ticket.assignedToId,
      ticketId: id,
      type: 'TICKET_REOPENED',
      title: 'Ticket reopened',
      body: `${session.user.name ?? 'Employee'} reopened ticket: ${ticket.title}`,
    })
  }

  return NextResponse.json(updated)
}
