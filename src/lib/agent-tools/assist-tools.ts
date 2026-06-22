import { prisma } from "@/lib/prisma"
import { getSLAHours } from "@/lib/ticket-helpers"

export async function getTicketFullContext(args: { ticketId: string }) {
  const ticket = await prisma.ticket.findUnique({
    where: { id: args.ticketId },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true } },
      comments: {
        where: { isInternal: false },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { author: { select: { name: true } } },
      },
    },
  })
  if (!ticket) return { error: "Ticket not found" }
  return {
    ticket: { id: ticket.id, title: ticket.title, description: ticket.description, status: ticket.status, urgency: ticket.urgency, department: ticket.department },
    employee: ticket.createdBy,
    comments: ticket.comments.map((c) => ({ body: c.body, author: c.author.name, createdAt: c.createdAt })),
  }
}

export async function getSimilarResolutions(args: { description: string; department: string; limit?: number }) {
  const tickets = await prisma.ticket.findMany({
    where: { department: args.department as any, status: { in: ["RESOLVED", "CLOSED"] } },
    take: args.limit ?? 3,
    orderBy: { resolvedAt: "desc" },
    include: { comments: { where: { isInternal: false }, orderBy: { createdAt: "desc" }, take: 1 } },
  })
  return tickets.map((t) => ({
    ticketId: t.id, title: t.title,
    resolution: t.comments[0]?.body?.slice(0, 300),
    resolvedAt: t.resolvedAt,
  }))
}

export async function checkSLAStatus(args: { urgency: string; createdAt: string; lastActivityAt: string }) {
  const slaHours = getSLAHours(args.urgency as any)
  const ageHours = (Date.now() - new Date(args.lastActivityAt).getTime()) / 3600000
  const hoursRemaining = slaHours - ageHours
  return { slaBreached: hoursRemaining < 0, hoursRemaining: Math.round(hoursRemaining) }
}

export async function getEmployeeTicketPattern(args: { userId: string }) {
  const tickets = await prisma.ticket.findMany({
    where: { createdById: args.userId },
    orderBy: { createdAt: "desc" },
  })
  const deptCounts: Record<string, number> = {}
  tickets.forEach((t) => { deptCounts[t.department] = (deptCounts[t.department] ?? 0) + 1 })
  return {
    totalTickets: tickets.length,
    commonCategories: Object.entries(deptCounts).map(([dept, count]) => ({ dept, count })),
    repeatIssues: tickets.slice(0, 3).map((t) => t.title),
  }
}
