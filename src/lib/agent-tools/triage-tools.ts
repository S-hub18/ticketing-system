import { prisma } from "@/lib/prisma"

export async function getAgentWorkload(args: { department: string }) {
  const agents = await prisma.user.findMany({
    where: { role: "AGENT", isActive: true, agentDepartments: { some: { department: args.department as any } } },
    include: {
      assignedTickets: { where: { status: { in: ["OPEN", "IN_PROGRESS"] } } },
      _count: { select: { assignedTickets: true } },
    },
  })
  return agents.map((a) => ({ id: a.id, name: a.name, openTickets: a.assignedTickets.length }))
}

export async function checkDuplicateTickets(args: { description: string; department: string }) {
  const tickets = await prisma.ticket.findMany({
    where: {
      department: args.department as any,
      status: { in: ["OPEN", "IN_PROGRESS"] },
      title: { contains: args.description.split(" ")[0] },
    },
    take: 3,
    include: { assignedTo: { select: { name: true } } },
  })
  return tickets.map((t) => ({ id: t.id, title: t.title, status: t.status, assignedTo: t.assignedTo?.name }))
}

export async function getRequesterHistory(args: { userId: string }) {
  const tickets = await prisma.ticket.findMany({
    where: { createdById: args.userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  return { previousTickets: tickets.map((t) => ({ id: t.id, title: t.title, status: t.status })), totalCount: tickets.length }
}

export async function getPriorityScore(args: { urgency: string; department: string }) {
  const scores: Record<string, number> = { CRITICAL: 100, HIGH: 75, MEDIUM: 50, LOW: 25 }
  const score = scores[args.urgency] ?? 50
  return { score, reasoning: `Urgency ${args.urgency} in ${args.department} dept` }
}
