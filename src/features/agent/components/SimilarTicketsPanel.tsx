import { formatTicketId } from '@/lib/ticket-helpers'
import { Clock, CheckCircle2 } from 'lucide-react'

interface SimilarTicket {
  id: string
  title: string
  status: string
  resolvedAt?: string | Date | null
  resolutionSummary?: string | null
}

interface SimilarTicketsPanelProps {
  tickets: SimilarTicket[]
}

function resolvedInHours(resolvedAt?: string | Date | null): string | null {
  if (!resolvedAt) return null
  const ms = new Date(resolvedAt).getTime() - 0
  if (isNaN(ms)) return null
  // We don't have createdAt here so just show the resolved date age from now
  const ageHours = Math.round(
    (Date.now() - new Date(resolvedAt).getTime()) / (1000 * 60 * 60)
  )
  if (ageHours < 24) return `${ageHours}h ago`
  const days = Math.round(ageHours / 24)
  return `${days}d ago`
}

export function SimilarTicketsPanel({ tickets }: SimilarTicketsPanelProps) {
  if (tickets.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Similar Tickets</h3>
        <p className="text-xs text-gray-400 text-center py-4">No similar tickets found.</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">
        Similar Tickets
        <span className="ml-1.5 text-xs font-normal text-gray-400">
          ({tickets.length})
        </span>
      </h3>

      <div className="flex flex-col gap-3">
        {tickets.map((ticket) => {
          const resolvedLabel = resolvedInHours(ticket.resolvedAt)

          return (
            <div
              key={ticket.id}
              className="rounded-md border border-gray-100 bg-gray-50 p-3 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[10px] font-mono font-semibold text-blue-600 bg-blue-50 rounded px-1.5 py-0.5">
                  {formatTicketId(ticket.id)}
                </span>
                {ticket.status === 'RESOLVED' || ticket.status === 'CLOSED' ? (
                  <span className="flex items-center gap-0.5 text-[10px] text-green-600">
                    <CheckCircle2 className="h-3 w-3" />
                    Resolved
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 capitalize">
                    {ticket.status.toLowerCase().replace('_', ' ')}
                  </span>
                )}
              </div>

              <p className="text-xs font-medium text-gray-800 leading-snug mb-1.5 line-clamp-2">
                {ticket.title}
              </p>

              {resolvedLabel && (
                <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-1.5">
                  <Clock className="h-3 w-3" />
                  <span>{resolvedLabel}</span>
                </div>
              )}

              {ticket.resolutionSummary && (
                <p className="text-[10px] text-gray-500 leading-relaxed line-clamp-3 border-t border-gray-200 pt-1.5 mt-1.5">
                  {ticket.resolutionSummary}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
