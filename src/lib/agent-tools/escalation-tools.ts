import { prisma } from "@/lib/prisma"

export async function getStaleTicketContext(args: { ticketId: string }) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: args.ticketId },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      createdBy: { select: { id: true, name: true } },
      comments: { orderBy: { createdAt: "desc" }, take: 5, include: { author: { select: { name: true } } } },
    },
  })
  if (!ticket) return { error: "Ticket not found" }
  const ageHours = Math.round((Date.now() - ticket.lastActivityAt.getTime()) / 3600000)
  return { ticket: { ...ticket }, ageHours, lastActivity: ticket.lastActivityAt }
}

export async function getAgentAvailability(args: { agentId: string }) {
  const agent = await prisma.user.findUnique({
    where: { id: args.agentId },
    include: { assignedTickets: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } } },
  })
  if (!agent) return { isActive: false, openTickets: 0 }
  return { isActive: agent.isActive, openTickets: agent.assignedTickets.length }
}

export async function findAlternativeAgent(args: { department: string; excludeAgentId: string }) {
  const agents = await prisma.user.findMany({
    where: {
      role: "AGENT", isActive: true,
      id: { not: args.excludeAgentId },
      agentDepartments: { some: { department: args.department as any } },
    },
    include: { assignedTickets: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } } },
    orderBy: { updatedAt: "desc" },
  })
  return agents.map((a) => ({ id: a.id, name: a.name, openTickets: a.assignedTickets.length })).sort((a, b) => a.openTickets - b.openTickets).slice(0, 3)
}

export async function getSimilarResolvedTickets(args: { description: string; department: string }) {
  const tickets = await prisma.ticket.findMany({
    where: { department: args.department as any, status: { in: ["RESOLVED", "CLOSED"] } },
    take: 3,
    orderBy: { resolvedAt: "desc" },
    include: { comments: { where: { isInternal: false }, orderBy: { createdAt: "desc" }, take: 1 } },
  })
  return tickets.map((t) => ({
    id: t.id, title: t.title,
    resolution: t.comments[0]?.body?.slice(0, 200),
    resolvedAt: t.resolvedAt,
  }))
}
