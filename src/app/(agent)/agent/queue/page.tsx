import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { formatTicketId } from '@/lib/ticket-helpers'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { AlertTriangle, CheckCircle2, Dot } from 'lucide-react'
import { Department, TicketUrgency } from '@/generated/prisma/client'
import { QueueActions } from './QueueActions'

const URGENCY_ORDER: Record<TicketUrgency, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

const URGENCY_BADGE: Record<TicketUrgency, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border border-red-300',
  HIGH: 'bg-orange-100 text-orange-800 border border-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  LOW: 'bg-gray-100 text-gray-600 border border-gray-300',
}

const DEPT_LABELS: Record<string, string> = {
  IT: 'IT',
  HR: 'HR',
  FINANCE: 'Finance',
  ADMIN: 'Admin',
}

const DEPARTMENTS = ['IT', 'HR', 'FINANCE', 'ADMIN'] as const

const STALE_HOURS = 48

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ dept?: string; search?: string; assigned?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  const role = (session.user as { role: string }).role
  if (!['AGENT', 'ADMIN'].includes(role)) redirect('/dashboard')

  const { dept, search, assigned } = await searchParams
  const userId = session.user.id

  // Determine allowed departments + which departments to offer as filter tabs.
  // tabDepts = the departments this user may actually filter by. Tabs only make
  // sense when there's more than one (a single-dept agent has nothing to switch to).
  let allowedDepts: string[]
  let tabDepts: string[]
  if (role === 'ADMIN') {
    tabDepts = [...DEPARTMENTS]
    allowedDepts = dept && tabDepts.includes(dept) ? [dept] : [...DEPARTMENTS]
  } else {
    const agentDepts = await prisma.agentDepartment.findMany({
      where: { agentId: userId },
      select: { department: true },
    })
    const myDepts = agentDepts.map((d) => d.department as string)
    tabDepts = myDepts
    if (dept) {
      // If agent selected a dept they don't own, return empty
      allowedDepts = myDepts.includes(dept) ? [dept] : []
    } else {
      allowedDepts = myDepts
    }
  }

  const whereClause: any = {
    department: { in: allowedDepts as Department[] },
    status: { in: ['OPEN', 'IN_PROGRESS'] },
  }

  if (assigned === 'me') {
    whereClause.assignedToId = userId
  }

  if (search?.trim()) {
    whereClause.OR = [
      { title: { contains: search.trim() } },
      { description: { contains: search.trim() } },
    ]
  }

  const tickets = await prisma.ticket.findMany({
    where: whereClause,
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ createdAt: 'asc' }],
  })

  const sorted = tickets.sort((a, b) => {
    const urgencyDiff = URGENCY_ORDER[a.urgency] - URGENCY_ORDER[b.urgency]
    if (urgencyDiff !== 0) return urgencyDiff
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  })

  const now = Date.now()

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Agent Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            {sorted.length} active ticket{sorted.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          {/* Department tabs — only shown when the user covers more than one department */}
          {tabDepts.length > 1 && (
            <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 flex-wrap">
              {[{ key: undefined, label: 'All' }, ...tabDepts.map(d => ({ key: d, label: DEPT_LABELS[d] }))].map(({ key, label }) => {
                const params = new URLSearchParams()
                if (key) params.set('dept', key)
                if (search) params.set('search', search)
                if (assigned) params.set('assigned', assigned)
                const href = `/agent/queue${params.toString() ? `?${params}` : ''}`
                const active = key ? dept === key : !dept
                return (
                  <Link
                    key={label}
                    href={href}
                    className={[
                      'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                      active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100',
                    ].join(' ')}
                  >
                    {label}
                  </Link>
                )
              })}
            </div>
          )}

          {/* Search */}
          <form className="flex-1 max-w-xs">
            <input
              name="search"
              defaultValue={search ?? ''}
              type="search"
              placeholder="Search tickets…"
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {dept && <input type="hidden" name="dept" value={dept} />}
            {assigned && <input type="hidden" name="assigned" value={assigned} />}
          </form>
        </div>

        {/* Empty state */}
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-400 mb-3" />
            <p className="text-lg font-semibold text-gray-700">Queue is clear</p>
            <p className="text-sm text-gray-400 mt-1">No open tickets right now.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 w-28">#</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500">Title</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 w-20">Dept</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 w-24">Urgency</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 w-32">Employee</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 w-28">Raised</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 w-28">Last Activity</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold text-gray-500 w-28">Action</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((ticket) => {
                  const isCritical = ticket.urgency === 'CRITICAL'
                  const lastActivity = ticket.lastActivityAt ?? ticket.createdAt
                  const ageHours = (now - new Date(lastActivity).getTime()) / (1000 * 60 * 60)
                  const isStale = ageHours > STALE_HOURS
                  const isAssignedToMe = ticket.assignedToId === userId
                  const isUnassigned = !ticket.assignedToId

                  return (
                    <tr
                      key={ticket.id}
                      className={[
                        'border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors relative',
                        isCritical ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-transparent',
                      ].join(' ')}
                    >
                      {/* Ticket ID */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {isCritical && (
                            <span className="relative flex h-2 w-2 shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                            </span>
                          )}
                          <span className="font-mono text-xs font-semibold text-blue-600">
                            {formatTicketId(ticket.id)}
                          </span>
                        </div>
                      </td>

                      {/* Title */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          {isStale && (
                            <span title="Stale: no activity for 48+ hours"><AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" /></span>
                          )}
                          <span className="text-gray-900 font-medium line-clamp-1">{ticket.title}</span>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="py-3 px-4">
                        <span className="text-xs text-gray-500">{DEPT_LABELS[ticket.department]}</span>
                      </td>

                      {/* Urgency */}
                      <td className="py-3 px-4">
                        <span
                          className={[
                            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            URGENCY_BADGE[ticket.urgency],
                          ].join(' ')}
                        >
                          {ticket.urgency}
                        </span>
                      </td>

                      {/* Employee */}
                      <td className="py-3 px-4">
                        <span className="text-xs text-gray-700 truncate block max-w-[120px]">
                          {ticket.createdBy.name}
                        </span>
                      </td>

                      {/* Raised */}
                      <td className="py-3 px-4">
                        <span className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true })}
                        </span>
                      </td>

                      {/* Last Activity */}
                      <td className="py-3 px-4">
                        <span className={['text-xs', isStale ? 'text-amber-600 font-medium' : 'text-gray-500'].join(' ')}>
                          {formatDistanceToNow(new Date(lastActivity), { addSuffix: true })}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4">
                        <QueueActions
                          ticketId={ticket.id}
                          isUnassigned={isUnassigned}
                          isAssignedToMe={isAssignedToMe}
                          assigneeName={ticket.assignedTo?.name ?? null}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
