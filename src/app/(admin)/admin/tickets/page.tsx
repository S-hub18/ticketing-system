import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { StatusBadge } from '@/components/common/StatusBadge'
import { UrgencyBadge } from '@/components/common/UrgencyBadge'
import { Card, CardContent } from '@/components/ui/card'
import { AdminTicketsClient } from '@/features/admin/components/AdminTicketsClient'
import type { TicketStatus, TicketUrgency, Department } from '@/generated/prisma/client'

interface SearchParams {
  status?: string
  dept?: string
  urgency?: string
  q?: string
}

export default async function AdminTicketsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'ADMIN') redirect('/dashboard')

  const sp = await searchParams
  const { status, dept, urgency, q } = sp

  const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
  const VALID_DEPTS = ['IT', 'HR', 'FINANCE', 'ADMIN']
  const VALID_URGENCIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

  const where: Record<string, unknown> = {}
  if (status && VALID_STATUSES.includes(status)) where.status = status as TicketStatus
  if (dept && VALID_DEPTS.includes(dept)) where.department = dept as Department
  if (urgency && VALID_URGENCIES.includes(urgency)) where.urgency = urgency as TicketUrgency
  if (q?.trim()) {
    where.OR = [
      { title: { contains: q.trim(), mode: 'insensitive' } },
      { description: { contains: q.trim(), mode: 'insensitive' } },
    ]
  }

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  // Fetch agents for reassign dialog
  const agents = await prisma.user.findMany({
    where: { role: 'AGENT', isActive: true },
    select: { id: true, name: true, agentDepartments: { select: { department: true } } },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="px-6 py-6 space-y-4 max-w-screen-xl mx-auto">

        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-semibold text-[#0c0a09] flex-1 min-w-0">All Tickets</h1>
          <span className="text-xs text-[#78716c]">{tickets.length} result{tickets.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Filters */}
        <form method="GET" className="flex flex-wrap gap-2 items-center">
          <input
            name="q"
            defaultValue={q ?? ''}
            placeholder="Search tickets…"
            className="text-xs border border-[#e7e5e4] rounded-md px-3 py-1.5 bg-white text-[#0c0a09] w-48 focus:outline-none focus:ring-2 focus:ring-[#292524]"
          />
          <select
            name="status"
            defaultValue={status ?? ''}
            className="text-xs border border-[#e7e5e4] rounded-md px-2 py-1.5 bg-white text-[#0c0a09] focus:outline-none focus:ring-2 focus:ring-[#292524]"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <select
            name="dept"
            defaultValue={dept ?? ''}
            className="text-xs border border-[#e7e5e4] rounded-md px-2 py-1.5 bg-white text-[#0c0a09] focus:outline-none focus:ring-2 focus:ring-[#292524]"
          >
            <option value="">All Depts</option>
            <option value="IT">IT</option>
            <option value="HR">HR</option>
            <option value="FINANCE">Finance</option>
            <option value="ADMIN">Admin</option>
          </select>
          <select
            name="urgency"
            defaultValue={urgency ?? ''}
            className="text-xs border border-[#e7e5e4] rounded-md px-2 py-1.5 bg-white text-[#0c0a09] focus:outline-none focus:ring-2 focus:ring-[#292524]"
          >
            <option value="">All Urgencies</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <button
            type="submit"
            className="text-xs bg-[#292524] text-white px-3 py-1.5 rounded-md hover:bg-[#44403c] transition-colors"
          >
            Filter
          </button>
          <Link
            href="/admin/tickets"
            className="text-xs text-[#78716c] hover:text-[#0c0a09] transition-colors"
          >
            Clear
          </Link>
        </form>

        {/* Table */}
        <Card className="border border-[#e7e5e4] shadow-none">
          <CardContent className="p-0">
            {tickets.length === 0 ? (
              <div className="py-16 text-center text-sm text-[#a8a29e]">
                No tickets match your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e7e5e4]">
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#78716c]">Title</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#78716c]">Employee</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#78716c]">Dept</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#78716c]">Status</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#78716c]">Urgency</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#78716c]">Assigned To</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#78716c]">Created</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#78716c]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        className="border-b border-[#f5f5f4] hover:bg-[#fafaf9] transition-colors"
                      >
                        <td className="py-2.5 px-4 max-w-[240px]">
                          <Link
                            href={`/admin/tickets/${ticket.id}`}
                            className="font-medium text-[#0c0a09] hover:underline line-clamp-1"
                          >
                            {ticket.title}
                          </Link>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-[#78716c] whitespace-nowrap">
                          {ticket.createdBy.name}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-[#78716c]">{ticket.department}</td>
                        <td className="py-2.5 px-4">
                          <StatusBadge status={ticket.status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'} />
                        </td>
                        <td className="py-2.5 px-4">
                          <UrgencyBadge urgency={ticket.urgency as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'} />
                        </td>
                        <td className="py-2.5 px-4 text-xs text-[#78716c] whitespace-nowrap">
                          {ticket.assignedTo?.name ?? (
                            <span className="text-[#a8a29e]">Unassigned</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-[#a8a29e] whitespace-nowrap">
                          {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-2.5 px-4">
                          <AdminTicketsClient
                            ticketId={ticket.id}
                            currentAssigneeId={ticket.assignedToId ?? undefined}
                            agents={agents.map((a) => ({
                              id: a.id,
                              name: a.name,
                              departments: a.agentDepartments.map((d) => d.department),
                            }))}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  )
}
