import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { StatusBadge } from '@/components/common/StatusBadge'
import { UrgencyBadge } from '@/components/common/UrgencyBadge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

type RouteParams = { params: Promise<{ id: string }> }

export default async function AdminTicketDetailPage({ params }: RouteParams) {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'ADMIN') redirect('/dashboard')

  const { id } = await params

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      comments: {
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
      history: {
        include: { changedBy: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!ticket) notFound()

  function formatDateTime(d: Date | null | undefined): string {
    if (!d) return '—'
    return new Date(d).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="px-6 py-6 space-y-4 max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-[#78716c]">
          <Link href="/admin/tickets" className="hover:text-[#0c0a09] transition-colors">
            All Tickets
          </Link>
          <span>/</span>
          <span className="text-[#0c0a09] font-medium truncate max-w-xs">{ticket.title}</span>
        </div>

        {/* Header card */}
        <Card className="border border-[#e7e5e4] shadow-none">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold text-[#0c0a09] leading-snug">
                  {ticket.title}
                </CardTitle>
                <p className="text-xs text-[#a8a29e] mt-0.5">#{ticket.id}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={ticket.status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'} />
                <UrgencyBadge urgency={ticket.urgency as 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'} />
                {ticket.isEscalated && (
                  <Badge variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">
                    Escalated
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <p className="text-sm text-[#44403c] leading-relaxed whitespace-pre-wrap">
              {ticket.description}
            </p>

            <Separator className="bg-[#f5f5f4]" />

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {[
                { label: 'Department', value: ticket.department },
                { label: 'Submitted by', value: ticket.createdBy.name },
                { label: 'Assigned to', value: ticket.assignedTo?.name ?? 'Unassigned' },
                { label: 'Created', value: formatDateTime(ticket.createdAt) },
                { label: 'Last activity', value: formatDateTime(ticket.lastActivityAt) },
                { label: 'Resolved', value: formatDateTime(ticket.resolvedAt) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#a8a29e]">
                    {label}
                  </p>
                  <p className="text-sm text-[#0c0a09] mt-0.5">{value}</p>
                </div>
              ))}
            </div>

            {ticket.aiCategory && (
              <>
                <Separator className="bg-[#f5f5f4]" />
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#a8a29e]">
                    AI Classification
                  </p>
                  <p className="text-sm text-[#44403c]">
                    {ticket.aiCategory}
                    {ticket.aiCategoryConf != null && (
                      <span className="text-[#a8a29e] ml-1">
                        ({Math.round(ticket.aiCategoryConf * 100)}% confidence)
                      </span>
                    )}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Comments */}
        <Card className="border border-[#e7e5e4] shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#0c0a09]">
              Comments ({ticket.comments.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {ticket.comments.length === 0 ? (
              <p className="text-sm text-[#a8a29e]">No comments yet.</p>
            ) : (
              ticket.comments.map((c) => (
                <div key={c.id} className="rounded-lg border border-[#e7e5e4] p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#0c0a09]">{c.author.name}</span>
                    {c.isInternal && (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-amber-600 border-amber-200 bg-amber-50 px-1.5 py-0"
                      >
                        Internal
                      </Badge>
                    )}
                    <span className="text-[10px] text-[#a8a29e] ml-auto">
                      {formatDateTime(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-[#44403c] whitespace-pre-wrap">{c.body}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* History */}
        <Card className="border border-[#e7e5e4] shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#0c0a09]">
              Activity History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ticket.history.length === 0 ? (
              <p className="text-sm text-[#a8a29e]">No history recorded.</p>
            ) : (
              <ol className="relative border-l border-[#e7e5e4] ml-2 space-y-4">
                {ticket.history.map((h) => (
                  <li key={h.id} className="ml-4">
                    <div className="absolute -left-1.5 mt-1.5 h-2.5 w-2.5 rounded-full border border-white bg-[#d4d4d4]" />
                    <p className="text-xs text-[#44403c]">
                      <span className="font-semibold">{h.changedBy.name}</span> changed{' '}
                      <span className="font-medium">{h.field}</span>
                      {h.oldValue && (
                        <>
                          {' '}from{' '}
                          <span className="text-[#78716c]">{h.oldValue}</span>
                        </>
                      )}
                      {h.newValue && (
                        <>
                          {' '}to{' '}
                          <span className="text-[#0c0a09] font-medium">{h.newValue}</span>
                        </>
                      )}
                    </p>
                    <p className="text-[10px] text-[#a8a29e] mt-0.5">{formatDateTime(h.createdAt)}</p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

      </div>
  )
}
