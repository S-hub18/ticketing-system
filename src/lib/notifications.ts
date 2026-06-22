import { prisma } from '@/lib/prisma'
import { NotificationType } from '@/generated/prisma/client'

interface NotifyParams {
  userId: string
  ticketId?: string
  type: NotificationType
  title: string
  body: string
}

export async function createNotification(params: NotifyParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      ticketId: params.ticketId,
      type: params.type,
      title: params.title,
      body: params.body,
    },
  })
}

export async function notifyAgentsInDepartment(
  department: string,
  ticketId: string,
  type: NotificationType,
  title: string,
  body: string
) {
  const agents = await prisma.user.findMany({
    where: {
      role: { in: ['AGENT', 'ADMIN'] },
      isActive: true,
      agentDepartments: { some: { department: department as any } },
    },
  })
  await Promise.all(
    agents.map((agent) =>
      createNotification({ userId: agent.id, ticketId, type, title, body })
    )
  )
}
