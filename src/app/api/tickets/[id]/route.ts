import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canTransition } from '@/lib/ticket-helpers'
import { createNotification } from '@/lib/notifications'
import { TicketStatus, TicketUrgency, Department } from '@/generated/prisma/client'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const role = (session.user as any)?.role
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      comments: {
        where: role === 'EMPLOYEE' ? { isInternal: false } : {},
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, name: true, role: true } } },
      },
      history: { orderBy: { createdAt: 'asc' }, include: { changedBy: { select: { name: true } } } },
      attachments: true,
    },
  })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (role === 'EMPLOYEE' && ticket.createdById !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return NextResponse.json(ticket)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const role = (session.user as any)?.role
  const body = await req.json()
  const ticket = await prisma.ticket.findUnique({ where: { id } })
  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const updates: any = { updatedAt: new Date(), lastActivityAt: new Date() }
  const historyEntries: any[] = []
  if (body.status && body.status !== ticket.status) {
    if (!canTransition(ticket.status, body.status as TicketStatus)) {
      return NextResponse.json({ error: `Cannot transition from ${ticket.status} to ${body.status}` }, { status: 400 })
    }
    updates.status = body.status as TicketStatus
    if (body.status === 'RESOLVED') updates.resolvedAt = new Date()
    if (body.status === 'CLOSED') updates.closedAt = new Date()
    historyEntries.push({ ticketId: id, changedById: session.user.id, field: 'status', oldValue: ticket.status, newValue: body.status, note: body.note })
    await createNotification({ userId: ticket.createdById, ticketId: id, type: 'TICKET_STATUS_CHANGED', title: 'Your ticket was updated', body: `Ticket moved to ${body.status}` })
  }
  if (body.urgency) updates.urgency = body.urgency as TicketUrgency
  if (body.department) updates.department = body.department as Department
  if (body.assignedToId !== undefined) {
    updates.assignedToId = body.assignedToId
    if (body.assignedToId) historyEntries.push({ ticketId: id, changedById: session.user.id, field: 'assignedTo', newValue: body.assignedToId })
  }
  const updated = await prisma.ticket.update({ where: { id }, data: updates, include: { createdBy: { select: { name: true } }, assignedTo: { select: { name: true } } } })
  if (historyEntries.length > 0) await prisma.ticketHistory.createMany({ data: historyEntries })
  return NextResponse.json(updated)
}
