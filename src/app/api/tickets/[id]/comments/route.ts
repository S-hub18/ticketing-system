import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createNotification } from '@/lib/notifications'
import { AgentSuggestedAction } from '@/generated/prisma/client'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const role = (session.user as any)?.role
  const comments = await prisma.ticketComment.findMany({
    where: { ticketId: id, ...(role === 'EMPLOYEE' ? { isInternal: false } : {}) },
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { id: true, name: true, role: true } } },
  })
  return NextResponse.json(comments)
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const role = (session.user as any)?.role
  const { body, isInternal, isAiDraft, agentSuggestedAction } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Body required' }, { status: 400 })
  if (isInternal && role === 'EMPLOYEE') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const comment = await prisma.ticketComment.create({
    data: {
      ticketId: id, authorId: session.user.id, body,
      isInternal: isInternal ?? false,
      isAiDraft: isAiDraft ?? false,
      agentSuggestedAction: agentSuggestedAction as AgentSuggestedAction ?? null,
    },
    include: { author: { select: { id: true, name: true, role: true } } },
  })
  await prisma.ticket.update({ where: { id }, data: { lastActivityAt: new Date() } })
  if (!isInternal) {
    const ticket = await prisma.ticket.findUnique({ where: { id }, select: { createdById: true, title: true } })
    if (ticket && ticket.createdById !== session.user.id) {
      await createNotification({ userId: ticket.createdById, ticketId: id, type: 'TICKET_COMMENT_ADDED', title: 'New reply on your ticket', body: `${session.user.name ?? 'Agent'} replied to your ticket` })
    }
  }
  return NextResponse.json(comment, { status: 201 })
}
