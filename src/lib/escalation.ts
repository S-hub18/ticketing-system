import { prisma } from '@/lib/prisma'

export async function getStaleTickets(hoursThreshold = 48) {
  const cutoff = new Date(Date.now() - hoursThreshold * 60 * 60 * 1000)
  return prisma.ticket.findMany({
    where: {
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      lastActivityAt: { lt: cutoff },
      isEscalated: false,
    },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      comments: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })
}

export async function markEscalated(ticketId: string) {
  return prisma.ticket.update({
    where: { id: ticketId },
    data: { isEscalated: true, escalatedAt: new Date() },
  })
}
