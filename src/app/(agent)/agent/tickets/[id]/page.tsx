import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { formatTicketId, getSLAHours } from '@/lib/ticket-helpers'
import { formatDistanceToNow, format } from 'date-fns'
import { AlertTriangle, User, Lock, MessageSquare, Clock } from 'lucide-react'
import { StatusTransitionBar } from '@/features/agent/components/StatusTransitionBar'
import { ReplyComposer } from '@/features/agent/components/ReplyComposer'
import { SimilarTicketsPanel } from '@/features/agent/components/SimilarTicketsPanel'
import { EscalationBannerWrapper } from './EscalationBannerWrapper'

const URGENCY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800 border border-red-300',
  HIGH: 'bg-orange-100 text-orange-800 border border-orange-300',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  LOW: 'bg-gray-100 text-gray-600 border border-gray-300',
}

const STATUS_BADGE: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
}

const STALE_HOURS = 48

type PageProps = { params: Promise<{ id: string }> }

export default async function TicketDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session) redirect('/login')
  const role = (session.user as { role: string }).role
  if (!['AGENT', 'ADMIN'].includes(role)) redirect('/dashboard')

  const { id } = await params

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
      assignedTo: {
        select: { id: true, name: true, email: true },
      },
      comments: {
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      history: {
        include: {
          changedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!ticket) notFound()

  // Agent department access check
  if (role === 'AGENT') {
    const agentDepts = await prisma.agentDepartment.findMany({
      where: { agentId: session.user.id },
      select: { department: true },
    })
    const depts = agentDepts.map((d) => d.department as string)
    if (!depts.includes(ticket.department)) redirect('/agent/queue')
  }

  // Employee ticket count
  const employeeTicketCount = await prisma.ticket.count({
    where: { createdById: ticket.createdById },
  })

  // Similar tickets: resolved tickets from same department, excluding this one
  const similarTickets = await prisma.ticket.findMany({
    where: {
      id: { not: ticket.id },
      department: ticket.department,
      status: { in: ['RESOLVED', 'CLOSED'] },
    },
    select: {
      id: true,
      title: true,
      status: true,
      resolvedAt: true,
    },
    orderBy: { resolvedAt: 'desc' },
    take: 5,
  })

  // Auto-triage note from most recent TRIAGE agent run
  const triageRun = await prisma.agentRun.findFirst({
    where: { ticketId: ticket.id, agentType: 'TRIAGE' },
    orderBy: { createdAt: 'desc' },
    select: { finalOutput: true },
  })
  const triageNote = triageRun?.finalOutput ?? null

  // Stale check
  const lastActivity = ticket.lastActivityAt ?? ticket.createdAt
  const ageHours = (Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60)
  const isStale = ageHours > STALE_HOURS

  // SLA
  const slaHours = getSLAHours(ticket.urgency)
  const slaAgeHours = (Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60)
  const slaBreached = slaAgeHours > slaHours
  const slaHoursRemaining = Math.max(0, slaHours - slaAgeHours)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1400px] mx-auto px-4 py-6">
        {/* Page header */}
        <div className="mb-5 flex items-center gap-3">
          <a href="/agent/queue" className="text-sm text-gray-400 hover:text-gray-600">
            ← Queue
          </a>
          <span className="text-gray-300">/</span>
          <span className="font-mono text-sm font-semibold text-blue-600">
            {formatTicketId(ticket.id)}
          </span>
          <span
            className={[
              'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
              STATUS_BADGE[ticket.status] ?? 'bg-gray-100 text-gray-600',
            ].join(' ')}
          >
            {ticket.status.replace('_', ' ')}
          </span>
        </div>

        <div className="flex gap-5 items-start">
          {/* ── LEFT PANEL ── */}
          <aside className="w-[280px] shrink-0 flex flex-col gap-4">
            {/* Status transition */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                Status
              </h3>
              <StatusTransitionBar
                status={ticket.status}
                ticketId={ticket.id}
                />
            </div>

            {/* Meta */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Details
              </h3>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Urgency</span>
                <span
                  className={[
                    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold',
                    URGENCY_BADGE[ticket.urgency] ?? '',
                  ].join(' ')}
                >
                  {ticket.urgency}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Department</span>
                <span className="text-xs font-medium text-gray-800">{ticket.department}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Assigned To</span>
                <span className="text-xs font-medium text-gray-800">
                  {ticket.assignedTo?.name ?? (
                    <span className="text-gray-400 italic">Unassigned</span>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Created</span>
                <span className="text-xs text-gray-600">
                  {format(new Date(ticket.createdAt), 'MMM d, yyyy')}
                </span>
              </div>

              {/* SLA */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">SLA ({slaHours}h)</span>
                  {slaBreached ? (
                    <span className="text-[10px] font-semibold text-red-600 flex items-center gap-0.5">
                      <AlertTriangle className="h-3 w-3" /> Breached
                    </span>
                  ) : (
                    <span className="text-[10px] text-green-600 font-medium">
                      {Math.round(slaHoursRemaining)}h left
                    </span>
                  )}
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className={[
                      'h-1.5 rounded-full transition-all',
                      slaBreached ? 'bg-red-500' : 'bg-green-500',
                    ].join(' ')}
                    style={{
                      width: `${Math.min(100, (slaAgeHours / slaHours) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Employee info */}
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Employee
              </h3>
              <div className="flex items-center gap-2.5 mb-3">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {ticket.createdBy.name}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate">
                    {ticket.createdBy.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Total tickets</span>
                <span className="font-semibold text-gray-800">{employeeTicketCount}</span>
              </div>
            </div>

            {/* Auto-triage note */}
            {triageNote && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4 shadow-sm">
                <h3 className="text-xs font-semibold text-indigo-700 uppercase tracking-wide mb-2">
                  Auto-Triage Note
                </h3>
                <p className="text-xs text-indigo-800 leading-relaxed whitespace-pre-wrap">
                  {(() => {
                    try {
                      const parsed = JSON.parse(triageNote)
                      return parsed.triageNotes ?? triageNote
                    } catch {
                      return triageNote
                    }
                  })()}
                </p>
              </div>
            )}
          </aside>

          {/* ── MIDDLE PANEL ── */}
          <main className="flex-1 min-w-0 flex flex-col gap-4">
            {/* Title + description */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h1 className="text-lg font-bold text-gray-900 mb-2">{ticket.title}</h1>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>

            {/* Escalation banner — client wrapper handles dismiss */}
            {isStale && (
              <EscalationBannerWrapper
                ticketId={ticket.id}
                hoursStale={Math.round(ageHours)}
              />
            )}

            {/* Comment timeline */}
            <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-semibold text-gray-700">
                  Activity ({ticket.comments.length})
                </span>
              </div>

              {ticket.comments.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-400">
                  No comments yet.
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {ticket.comments.map((comment) => {
                    const initials = comment.author.name
                      ? comment.author.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                      : '?'

                    return (
                      <div
                        key={comment.id}
                        className={[
                          'px-5 py-4',
                          comment.isInternal ? 'bg-amber-50' : '',
                        ].join(' ')}
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
                            {initials}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <span className="text-sm font-semibold text-gray-800">
                                {comment.author.name}
                              </span>
                              {comment.isInternal && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-1.5 py-0.5">
                                  <Lock className="h-2.5 w-2.5" />
                                  Internal
                                </span>
                              )}
                              {comment.isAiDraft && (
                                <span className="text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-1.5 py-0.5">
                                  ✨ AI Draft
                                </span>
                              )}
                              <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                              {comment.body}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Reply composer */}
            <ReplyComposer ticketId={ticket.id}  />
          </main>

          {/* ── RIGHT PANEL ── */}
          <aside className="w-[280px] shrink-0">
            <SimilarTicketsPanel
              tickets={similarTickets.map((t) => ({
                id: t.id,
                title: t.title,
                status: t.status,
                resolvedAt: t.resolvedAt?.toISOString() ?? null,
                resolutionSummary: undefined,
              }))}
            />
          </aside>
        </div>
      </div>
    </div>
  )
}
