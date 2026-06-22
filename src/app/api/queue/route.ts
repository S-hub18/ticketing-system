import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const URGENCY_ORDER: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = (session.user as any)?.role
  if (!['AGENT', 'ADMIN'].includes(role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { searchParams } = new URL(req.url)
  const dept = searchParams.get('dept')
  const search = searchParams.get('search')
  const assignedToMe = searchParams.get('assigned') === 'me'
  const depts: string[] = role === 'ADMIN' ? ['IT','HR','FINANCE','ADMIN'] : (session.user as any)?.departments ?? []
  const where: any = {
    status: { in: ['OPEN', 'IN_PROGRESS'] },
    department: { in: dept ? [dept] : depts },
    ...(assignedToMe && { assignedToId: session.user.id }),
    ...(search && { OR: [{ title: { contains: search } }, { id: { contains: search } }] }),
  }
  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  })
  const sorted = tickets.sort((a, b) => (URGENCY_ORDER[b.urgency] ?? 0) - (URGENCY_ORDER[a.urgency] ?? 0))
  return NextResponse.json(sorted)
}
