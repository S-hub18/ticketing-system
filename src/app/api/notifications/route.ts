import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { ticket: { select: { title: true } } },
  })
  const unreadCount = await prisma.notification.count({ where: { userId: session.user.id, isRead: false } })
  return NextResponse.json({ notifications, unreadCount })
}
