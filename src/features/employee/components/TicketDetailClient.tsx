'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/common/StatusBadge';
import { UrgencyBadge } from '@/components/common/UrgencyBadge';
import { RelativeTime } from '@/components/common/RelativeTime';
import { ArrowLeft } from 'lucide-react';

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
type TicketUrgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
type Department = 'IT' | 'HR' | 'FINANCE' | 'ADMIN';

interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string; email: string; role: string };
}

interface HistoryEntry {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  createdAt: string;
  changedBy: { id: string; name: string } | null;
}

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  urgency: TicketUrgency;
  department: Department;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
  createdBy: { id: string; name: string; email: string };
  assignedTo: { id: string; name: string; email: string } | null;
  comments: Comment[];
  history: HistoryEntry[];
}

interface Props {
  ticket: TicketDetail;
  currentUserId: string;
}

const DEPT_COLORS: Record<Department, string> = {
  IT: 'bg-blue-100 text-blue-700 border-blue-200',
  HR: 'bg-purple-100 text-purple-700 border-purple-200',
  FINANCE: 'bg-green-100 text-green-700 border-green-200',
  ADMIN: 'bg-amber-100 text-amber-700 border-amber-200',
};

function formatTicketId(id: string): string {
  return `TKT-${id.slice(-4).toUpperCase()}`;
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function historyLabel(entry: HistoryEntry): string {
  if (entry.field === 'status') {
    return `Status changed from ${entry.oldValue ?? 'none'} to ${entry.newValue}`;
  }
  if (entry.field === 'urgency') {
    return `Urgency changed to ${entry.newValue}`;
  }
  if (entry.field === 'assignedTo') {
    return entry.newValue ? `Assigned to ${entry.newValue}` : 'Unassigned';
  }
  return `${entry.field} updated`;
}

type TimelineItem =
  | { type: 'comment'; data: Comment; createdAt: string }
  | { type: 'history'; data: HistoryEntry; createdAt: string };

export function TicketDetailClient({ ticket, currentUserId }: Props) {
  const router = useRouter();
  const [replyBody, setReplyBody] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [submittingReopen, setSubmittingReopen] = useState(false);
  const [reopenError, setReopenError] = useState<string | null>(null);

  // Build merged timeline sorted by time
  const timeline: TimelineItem[] = [
    ...ticket.comments.map((c) => ({
      type: 'comment' as const,
      data: c,
      createdAt: c.createdAt,
    })),
    ...ticket.history.map((h) => ({
      type: 'history' as const,
      data: h,
      createdAt: h.createdAt,
    })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setSubmittingReply(true);
    setReplyError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: replyBody.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Error ${res.status}`);
      }
      setReplyBody('');
      toast.success('Reply sent');
      router.refresh();
    } catch (err: unknown) {
      setReplyError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmittingReply(false);
    }
  }

  async function handleReopen() {
    if (!reopenReason.trim()) return;
    setSubmittingReopen(true);
    setReopenError(null);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/reopen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reopenReason.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Error ${res.status}`);
      }
      setReopenOpen(false);
      setReopenReason('');
      toast.success('Ticket reopened');
      router.refresh();
    } catch (err: unknown) {
      setReopenError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSubmittingReopen(false);
    }
  }

  return (
    <div className="p-4 md:p-6">
      {/* Back nav */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        My Tickets
      </Link>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* LEFT: ticket meta */}
        <aside className="lg:w-72 shrink-0 space-y-4">
          <div className="rounded-lg border border-border bg-card p-4 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-1">
                {formatTicketId(ticket.id)}
              </p>
              <h1 className="text-base font-semibold text-foreground leading-snug">
                {ticket.title}
              </h1>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-muted-foreground mb-1">Status</p>
                <StatusBadge status={ticket.status} />
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Urgency</p>
                <UrgencyBadge urgency={ticket.urgency} />
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Department</p>
                <Badge
                  variant="outline"
                  className={`text-xs px-2 py-0.5 ${DEPT_COLORS[ticket.department]}`}
                >
                  {ticket.department}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Raised</p>
                <RelativeTime date={ticket.createdAt} className="text-foreground" />
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Updated</p>
                <RelativeTime date={ticket.updatedAt} className="text-foreground" />
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Assigned to</p>
                <p className="text-foreground">
                  {ticket.assignedTo ? ticket.assignedTo.name : 'Unassigned'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </p>
            </div>

            {(ticket.status === 'CLOSED' || ticket.status === 'RESOLVED') && (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setReopenOpen(true)}
              >
                Reopen this ticket
              </Button>
            )}
          </div>
        </aside>

        {/* RIGHT: conversation timeline */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <div className="rounded-lg border border-border bg-card p-4 flex-1">
            <h2 className="text-sm font-semibold text-foreground mb-4">Conversation</h2>

            {timeline.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No activity yet.
              </p>
            )}

            <div className="space-y-4">
              {timeline.map((item) => {
                if (item.type === 'history') {
                  return (
                    <div key={item.data.id} className="flex items-center gap-2">
                      <div className="h-px flex-1 bg-border" />
                      <p className="text-xs text-muted-foreground shrink-0">
                        {historyLabel(item.data)}{' '}
                        {item.data.changedBy && (
                          <span className="font-medium">
                            by {item.data.changedBy.name}
                          </span>
                        )}{' '}
                        &middot; <RelativeTime date={item.createdAt} />
                      </p>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                  );
                }

                const comment = item.data;
                const isEmployee = comment.author.id === currentUserId;

                return (
                  <div
                    key={comment.id}
                    className={`flex gap-2.5 ${isEmployee ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                      <AvatarFallback className="text-xs bg-muted">
                        {initials(comment.author.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div
                      className={`max-w-[75%] ${isEmployee ? 'items-end' : 'items-start'} flex flex-col gap-1`}
                    >
                      <div className="flex items-center gap-1.5">
                        {!isEmployee && (
                          <span className="text-xs font-medium text-foreground">
                            {comment.author.name}
                          </span>
                        )}
                        <RelativeTime
                          date={comment.createdAt}
                          className="text-xs text-muted-foreground"
                        />
                      </div>

                      <div
                        className={`rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                          isEmployee
                            ? 'bg-blue-600 text-white rounded-tr-sm'
                            : 'bg-muted text-foreground rounded-tl-sm'
                        }`}
                      >
                        {comment.body}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Reply box */}
          {ticket.status !== 'CLOSED' && (
            <form onSubmit={handleReply} className="rounded-lg border border-border bg-card p-4">
              <Textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Add a reply..."
                rows={3}
                className="resize-none mb-3"
              />
              {replyError && (
                <p className="text-xs text-red-500 mb-2">{replyError}</p>
              )}
              <div className="flex justify-end">
                <Button type="submit" size="sm" disabled={submittingReply || !replyBody.trim()}>
                  {submittingReply ? 'Sending...' : 'Send Reply'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Reopen dialog */}
      <Dialog open={reopenOpen} onOpenChange={setReopenOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reopen ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Please explain why you need to reopen this ticket.
            </p>
            <Textarea
              value={reopenReason}
              onChange={(e) => setReopenReason(e.target.value)}
              placeholder="Reason for reopening..."
              rows={3}
              className="resize-none"
            />
            {reopenError && (
              <p className="text-xs text-red-500">{reopenError}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReopenOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={submittingReopen || !reopenReason.trim()}
              onClick={handleReopen}
            >
              {submittingReopen ? 'Reopening...' : 'Reopen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
