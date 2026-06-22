'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/common/StatusBadge';
import { UrgencyBadge } from '@/components/common/UrgencyBadge';
import { RelativeTime } from '@/components/common/RelativeTime';
import { EmptyState } from '@/components/common/EmptyState';
import { Plus } from 'lucide-react';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type TicketUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type Department = 'IT' | 'HR' | 'FINANCE' | 'ADMIN';

interface TicketRow {
  id: string;
  title: string;
  department: Department;
  urgency: TicketUrgency;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  assignedTo: { name: string } | null;
}

const FILTER_TABS = [
  { label: 'All', value: 'ALL' },
  { label: 'Open', value: 'OPEN' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Resolved', value: 'RESOLVED' },
  { label: 'Closed', value: 'CLOSED' },
] as const;

type FilterValue = (typeof FILTER_TABS)[number]['value'];

const DEPT_COLORS: Record<Department, string> = {
  IT: 'bg-blue-100 text-blue-700 border-blue-200',
  HR: 'bg-purple-100 text-purple-700 border-purple-200',
  FINANCE: 'bg-green-100 text-green-700 border-green-200',
  ADMIN: 'bg-amber-100 text-amber-700 border-amber-200',
};

function formatTicketId(id: string): string {
  return `TKT-${id.slice(-4).toUpperCase()}`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

export function EmployeeDashboardClient({ tickets }: { tickets: TicketRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState<FilterValue>('ALL');

  const open = tickets.filter((t) => t.status === 'OPEN').length;
  const inProgress = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const resolved = tickets.filter((t) => t.status === 'RESOLVED').length;

  const filtered =
    filter === 'ALL' ? tickets : tickets.filter((t) => t.status === filter);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">My Tickets</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track your submitted requests
          </p>
        </div>
        <Link
          href="/tickets/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#292524] text-white text-sm font-medium hover:bg-[#0c0a09] transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </Link>
      </div>

      {/* Quick stats */}
      <div className="flex gap-2 flex-wrap mb-5">
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs px-3 py-1">
          Open: {open}
        </Badge>
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs px-3 py-1">
          In Progress: {inProgress}
        </Badge>
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-3 py-1">
          Resolved: {resolved}
        </Badge>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 border-b border-border pb-0">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setFilter(tab.value)}
            className={`px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              filter === tab.value
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <EmptyState
          title={filter === 'ALL' ? 'No tickets yet' : `No ${tab_label(filter)} tickets`}
          description={
            filter === 'ALL'
              ? 'Submit your first request and our team will get on it.'
              : 'Nothing here matching this filter.'
          }
          action={
            filter === 'ALL' ? (
              <Link
                href="/tickets/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#292524] text-white text-sm font-medium hover:bg-[#0c0a09] transition-colors"
              >
                Raise your first ticket
              </Link>
            ) : undefined
          }
        />
      )}

      {/* Table */}
      {filtered.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-24">#</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Title</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-24 hidden sm:table-cell">Dept</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-24 hidden md:table-cell">Urgency</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-28">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-28 hidden lg:table-cell">Raised</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground w-28 hidden lg:table-cell">Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ticket) => (
                <tr
                  key={ticket.id}
                  onClick={() => router.push(`/tickets/${ticket.id}`)}
                  className={`border-b border-border last:border-0 cursor-pointer hover:bg-muted/40 transition-colors ${
                    ticket.urgency === 'CRITICAL' ? 'border-l-2 border-l-red-500' : ''
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {formatTicketId(ticket.id)}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground max-w-0">
                    <span className="block truncate" title={ticket.title}>
                      {truncate(ticket.title, 60)}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge
                      variant="outline"
                      className={`text-xs px-2 py-0.5 ${DEPT_COLORS[ticket.department]}`}
                    >
                      {ticket.department}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <UrgencyBadge urgency={ticket.urgency} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                    <RelativeTime date={ticket.createdAt} />
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                    <RelativeTime date={ticket.updatedAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function tab_label(v: FilterValue): string {
  const found = FILTER_TABS.find((t) => t.value === v);
  return found ? found.label.toLowerCase() : '';
}
