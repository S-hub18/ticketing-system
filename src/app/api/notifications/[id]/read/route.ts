import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  // Scope to the session user so one user can't mark another's notifications read
  await prisma.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { isRead: true },
  })
  return NextResponse.json({ success: true })
}
