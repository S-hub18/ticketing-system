import { prisma } from "@/lib/prisma"

export async function searchSimilarTickets(args: { query: string; department?: string; limit?: number }) {
  const { query, department, limit = 3 } = args
  const tickets = await prisma.ticket.findMany({
    where: {
      ...(department && { department: department as any }),
      status: { in: ["RESOLVED", "CLOSED"] },
      OR: [
        { title: { contains: query.split(" ")[0] } },
        { description: { contains: query.split(" ")[0] } },
      ],
    },
    take: limit,
    orderBy: { resolvedAt: "desc" },
    include: { comments: { where: { isInternal: false }, orderBy: { createdAt: "desc" }, take: 1 } },
  })
  return tickets.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    resolutionSummary: t.comments[0]?.body?.slice(0, 200),
  }))
}

export async function getSelfServiceKnowledge(args: { query: string }) {
  const { query } = args
  const tickets = await prisma.ticket.findMany({
    where: {
      status: { in: ["RESOLVED", "CLOSED"] },
      OR: [{ title: { contains: query.split(" ")[0] } }],
    },
    take: 3,
    include: { comments: { where: { isInternal: false }, orderBy: { createdAt: "desc" }, take: 1 } },
  })
  return tickets
    .filter((t) => t.comments.length > 0)
    .map((t) => ({ title: t.title, content: t.comments[0]?.body ?? "" }))
}

export async function assessUrgencySignals(args: { description: string }) {
  const { description } = args
  const urgentKeywords = ["urgent", "critical", "asap", "immediately", "blocking", "cannot work", "can't work", "deadline", "emergency", "broken", "down", "not working", "failed"]
  const highKeywords = ["soon", "today", "important", "impact", "affecting", "slowing", "issue", "problem"]
  const lower = description.toLowerCase()
  const signals: string[] = []
  urgentKeywords.forEach((kw) => { if (lower.includes(kw)) signals.push(kw) })
  const urgencyLevel = signals.length >= 2 ? "CRITICAL" : signals.length === 1 ? "HIGH" : highKeywords.some((kw) => lower.includes(kw)) ? "MEDIUM" : "LOW"
  return { urgencyLevel, signals }
}
