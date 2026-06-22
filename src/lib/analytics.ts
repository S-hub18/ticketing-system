import { prisma } from '@/lib/prisma'

const DEPARTMENTS = ['IT', 'HR', 'FINANCE', 'ADMIN'] as const
type Dept = (typeof DEPARTMENTS)[number]

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export interface AnalyticsResult {
  summary: {
    open: number
    inProgress: number
    resolved: number
    closed: number
    resolvedToday: number
    criticalUnattended: number
    avgResolutionHours: number
  }
  trends: { resolvedToday: number; avgResolutionHours: number }
  volumeByDay: { date: string; IT: number; HR: number; FINANCE: number; ADMIN: number }[]
  statusBreakdown: { status: string; count: number }[]
  trendByDay: { date: string; open: number; resolved: number; inProgress: number }[]
  resolutionHistogram: { bucket: string; count: number }[]
  staleTickets: {
    id: string
    title: string
    dept: string
    assignedTo: string | null
    status: string
    lastActivityAt: string
    isEscalated: boolean
  }[]
  agentLeaderboard: {
    agentId: string
    name: string
    department: string | null
    resolvedCount: number
    avgResolutionHours: number
  }[]
}

export async function getAnalytics(days: number, dept?: string): Promise<AnalyticsResult> {
  const deptFilter: Dept | undefined =
    dept && (DEPARTMENTS as readonly string[]).includes(dept) ? (dept as Dept) : undefined
  const since = new Date(Date.now() - days * 86400000)
  const where: any = { ...(deptFilter && { department: deptFilter }) }

  const [open, inProgress, resolved, closed, resolvedToday, critical] = await Promise.all([
    prisma.ticket.count({ where: { ...where, status: 'OPEN' } }),
    prisma.ticket.count({ where: { ...where, status: 'IN_PROGRESS' } }),
    prisma.ticket.count({ where: { ...where, status: 'RESOLVED' } }),
    prisma.ticket.count({ where: { ...where, status: 'CLOSED' } }),
    prisma.ticket.count({ where: { ...where, status: 'RESOLVED', resolvedAt: { gte: new Date(Date.now() - 86400000) } } }),
    prisma.ticket.count({ where: { ...where, urgency: 'CRITICAL', status: { in: ['OPEN', 'IN_PROGRESS'] }, assignedToId: null } }),
  ])

  const windowTickets = await prisma.ticket.findMany({
    where: { ...where, createdAt: { gte: since } },
    select: { createdAt: true, department: true, status: true },
  })

  const resolvedTickets = await prisma.ticket.findMany({
    where: { ...where, resolvedAt: { gte: since } },
    select: { createdAt: true, resolvedAt: true },
  })

  const totalHours = resolvedTickets.reduce(
    (sum, t) => sum + (t.resolvedAt ? (t.resolvedAt.getTime() - t.createdAt.getTime()) / 3600000 : 0),
    0,
  )
  const avgResolutionHours = resolvedTickets.length
    ? Math.round((totalHours / resolvedTickets.length) * 10) / 10
    : 0

  const prevWindowStart = new Date(Date.now() - 2 * days * 86400000)
  const [prevResolvedTickets, prevResolvedToday] = await Promise.all([
    prisma.ticket.findMany({
      where: { ...where, resolvedAt: { gte: prevWindowStart, lt: since } },
      select: { createdAt: true, resolvedAt: true },
    }),
    prisma.ticket.count({
      where: {
        ...where,
        status: 'RESOLVED',
        resolvedAt: { gte: new Date(Date.now() - 2 * 86400000), lt: new Date(Date.now() - 86400000) },
      },
    }),
  ])
  const prevTotalHours = prevResolvedTickets.reduce(
    (sum, t) => sum + (t.resolvedAt ? (t.resolvedAt.getTime() - t.createdAt.getTime()) / 3600000 : 0),
    0,
  )
  const prevAvgResolutionHours = prevResolvedTickets.length ? prevTotalHours / prevResolvedTickets.length : 0
  const trends = {
    resolvedToday: resolvedToday - prevResolvedToday,
    avgResolutionHours: prevResolvedTickets.length
      ? Math.round((avgResolutionHours - prevAvgResolutionHours) * 10) / 10
      : 0,
  }

  const dayBuckets: string[] = []
  for (let i = days - 1; i >= 0; i--) {
    dayBuckets.push(dayKey(new Date(Date.now() - i * 86400000)))
  }

  const volumeMap = new Map<string, { IT: number; HR: number; FINANCE: number; ADMIN: number }>()
  for (const day of dayBuckets) volumeMap.set(day, { IT: 0, HR: 0, FINANCE: 0, ADMIN: 0 })
  for (const t of windowTickets) {
    const key = dayKey(t.createdAt)
    const row = volumeMap.get(key)
    if (row && (t.department as Dept) in row) row[t.department as Dept]++
  }
  const volumeByDay = dayBuckets.map((date) => ({ date, ...volumeMap.get(date)! }))

  const trendMap = new Map<string, { open: number; resolved: number; inProgress: number }>()
  for (const day of dayBuckets) trendMap.set(day, { open: 0, resolved: 0, inProgress: 0 })
  for (const t of windowTickets) {
    const row = trendMap.get(dayKey(t.createdAt))
    if (!row) continue
    row.open++
    if (t.status === 'IN_PROGRESS') row.inProgress++
  }
  for (const t of resolvedTickets) {
    if (!t.resolvedAt) continue
    const row = trendMap.get(dayKey(t.resolvedAt))
    if (row) row.resolved++
  }
  const trendByDay = dayBuckets.map((date) => ({ date, ...trendMap.get(date)! }))

  const statusBreakdown = [
    { status: 'OPEN', count: open },
    { status: 'IN_PROGRESS', count: inProgress },
    { status: 'RESOLVED', count: resolved },
    { status: 'CLOSED', count: closed },
  ]

  const buckets = [
    { bucket: '<1h', count: 0 },
    { bucket: '1-4h', count: 0 },
    { bucket: '4-24h', count: 0 },
    { bucket: '1-3d', count: 0 },
    { bucket: '>3d', count: 0 },
  ]
  for (const t of resolvedTickets) {
    if (!t.resolvedAt) continue
    const h = (t.resolvedAt.getTime() - t.createdAt.getTime()) / 3600000
    if (h < 1) buckets[0].count++
    else if (h < 4) buckets[1].count++
    else if (h < 24) buckets[2].count++
    else if (h < 72) buckets[3].count++
    else buckets[4].count++
  }

  const staleTicketsRaw = await prisma.ticket.findMany({
    where: {
      ...where,
      status: { in: ['OPEN', 'IN_PROGRESS'] },
      lastActivityAt: { lt: new Date(Date.now() - 48 * 3600000) },
    },
    include: { assignedTo: { select: { name: true } } },
    orderBy: { lastActivityAt: 'asc' },
  })
  const staleTickets = staleTicketsRaw.map((t) => ({
    id: t.id,
    title: t.title,
    dept: t.department,
    assignedTo: t.assignedTo?.name ?? null,
    status: t.status,
    lastActivityAt: t.lastActivityAt.toISOString(),
    isEscalated: t.isEscalated,
  }))

  const agentStats = await prisma.user.findMany({
    where: { role: 'AGENT', isActive: true },
    include: {
      assignedTickets: { where: { resolvedAt: { gte: since } }, select: { createdAt: true, resolvedAt: true } },
      agentDepartments: { select: { department: true } },
    },
  })
  const agentLeaderboard = agentStats
    .map((a) => {
      const hrs = a.assignedTickets.reduce(
        (s, t) => s + (t.resolvedAt ? (t.resolvedAt.getTime() - t.createdAt.getTime()) / 3600000 : 0),
        0,
      )
      return {
        agentId: a.id,
        name: a.name,
        department: a.agentDepartments[0]?.department ?? null,
        resolvedCount: a.assignedTickets.length,
        avgResolutionHours: a.assignedTickets.length
          ? Math.round((hrs / a.assignedTickets.length) * 10) / 10
          : 0,
      }
    })
    .sort((a, b) => b.resolvedCount - a.resolvedCount)

  return {
    summary: { open, inProgress, resolved, closed, resolvedToday, criticalUnattended: critical, avgResolutionHours },
    trends,
    volumeByDay,
    statusBreakdown,
    trendByDay,
    resolutionHistogram: buckets,
    staleTickets,
    agentLeaderboard,
  }
}
