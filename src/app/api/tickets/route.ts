import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyAgentsInDepartment } from '@/lib/notifications'
import { Department, TicketUrgency } from '@/generated/prisma/client'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id
  const role = (session.user as any)?.role
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const where: any = {}
  if (role === 'EMPLOYEE') where.createdById = userId
  else if (role === 'AGENT') {
    const depts = (session.user as any)?.departments ?? []
    where.department = { in: depts }
  }
  if (status) where.status = status
  const tickets = await prisma.ticket.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(tickets)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const body = await req.json()
    const { title, description, department, urgency, aiCategory, aiCategoryConf, selfServiceAnswer, duplicateShown } = body
    if (!title || !description || !department) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    const ticket = await prisma.ticket.create({
      data: {
        title, description,
        department: department as Department,
        urgency: (urgency ?? 'MEDIUM') as TicketUrgency,
        createdById: session.user.id,
        aiCategory, aiCategoryConf,
        selfServiceAnswer,
        duplicateShown: duplicateShown ?? false,
        lastActivityAt: new Date(),
      },
      include: { createdBy: { select: { id: true, name: true } } },
    })
    await prisma.ticketHistory.create({
      data: { ticketId: ticket.id, changedById: session.user.id, field: 'status', newValue: 'OPEN' },
    })
    await notifyAgentsInDepartment(department, ticket.id, 'TICKET_CREATED', 'New ticket in your queue', `${session.user.name ?? session.user.email} raised: ${title}`)
    // Trigger auto-triage async
    if (process.env.INTERNAL_CRON_SECRET) {
      fetch(`${process.env.NEXTAUTH_URL}/api/ai/triage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': process.env.INTERNAL_CRON_SECRET },
        body: JSON.stringify({ ticketId: ticket.id }),
      }).catch(() => {})
    }
    return NextResponse.json(ticket, { status: 201 })
  } catch (e: any) {
    console.error('Create ticket error:', e)
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
  }
}
