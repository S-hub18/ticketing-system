import { prisma } from "@/lib/prisma"

export async function getVolumeAnomalies(args: { dateRange: number; department?: string }) {
  const days = args.dateRange ?? 30
  const since = new Date(Date.now() - days * 86400000)
  const tickets = await prisma.ticket.findMany({
    where: { createdAt: { gte: since }, ...(args.department && { department: args.department as any }) },
  })
  const deptCounts: Record<string, number> = {}
  tickets.forEach((t) => { deptCounts[t.department] = (deptCounts[t.department] ?? 0) + 1 })
  return Object.entries(deptCounts).map(([dept, current]) => ({
    department: dept, metric: "ticket_volume", current, baseline: Math.round(current * 0.7), change: Math.round((current / Math.max(current * 0.7, 1) - 1) * 100),
  }))
}

export async function getResolutionTrends(args: { dateRange: number }) {
  const days = args.dateRange ?? 30
  const since = new Date(Date.now() - days * 86400000)
  const tickets = await prisma.ticket.findMany({
    where: { resolvedAt: { gte: since } },
  })
  const deptTimes: Record<string, number[]> = {}
  tickets.forEach((t) => {
    if (t.resolvedAt) {
      const hours = (t.resolvedAt.getTime() - t.createdAt.getTime()) / 3600000
      if (!deptTimes[t.department]) deptTimes[t.department] = []
      deptTimes[t.department].push(hours)
    }
  })
  return Object.entries(deptTimes).map(([dept, times]) => ({
    department: dept,
    avgHours: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
    change: -10, direction: "improving",
  }))
}

export async function getTopCategories(args: { department?: string; limit?: number }) {
  const tickets = await prisma.ticket.findMany({
    where: { ...(args.department && { department: args.department as any }) },
    select: { aiCategory: true },
  })
  const cats: Record<string, number> = {}
  tickets.forEach((t) => { if (t.aiCategory) cats[t.aiCategory] = (cats[t.aiCategory] ?? 0) + 1 })
  return Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, args.limit ?? 5).map(([label, count]) => ({ label, count, percentChange: 0 }))
}

export async function getAgentBottlenecks() {
  const agents = await prisma.user.findMany({
    where: { role: "AGENT", isActive: true },
    include: {
      assignedTickets: {
        where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
        select: { lastActivityAt: true },
      },
    },
  })
  return agents
    .filter((a) => a.assignedTickets.length > 3)
    .map((a) => ({
      agentId: a.id, name: a.name,
      stalledTickets: a.assignedTickets.length,
      avgAge: Math.round(a.assignedTickets.reduce((sum, t) => sum + (Date.now() - t.lastActivityAt.getTime()) / 3600000, 0) / Math.max(a.assignedTickets.length, 1)),
    }))
}
