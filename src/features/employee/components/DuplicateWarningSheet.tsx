'use client';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/common/StatusBadge';
import Link from 'next/link';

export interface SimilarTicketRow {
  id: string;
  title: string;
  status: string;
  resolutionSummary?: string | null;
  createdAt: string;
}

interface DuplicateWarningSheetProps {
  tickets: SimilarTicketRow[];
  onSubmitAnyway: () => void;
  onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatTicketId(id: string): string {
  return `TKT-${id.slice(-4).toUpperCase()}`;
}

export function DuplicateWarningSheet({
  tickets,
  onSubmitAnyway,
  onCancel,
  open,
  onOpenChange,
}: DuplicateWarningSheetProps) {
  const displayed = tickets.slice(0, 3);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto rounded-t-xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="text-base font-semibold">
            We found similar tickets
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            Before submitting, check if one of these already covers your issue.
          </p>
        </SheetHeader>

        <div className="space-y-3 mb-6">
          {displayed.map((ticket, index) => (
            <div
              key={ticket.id}
              className="rounded-lg border border-border bg-muted/30 p-3"
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-muted-foreground">
                    {formatTicketId(ticket.id)}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      index === 0
                        ? 'bg-red-50 text-red-700 border-red-200 text-xs'
                        : 'bg-amber-50 text-amber-700 border-amber-200 text-xs'
                    }
                  >
                    {index === 0 ? 'Strong match' : 'Possible match'}
                  </Badge>
                </div>
                <StatusBadge status={ticket.status as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'} />
              </div>

              <p className="text-sm font-medium text-foreground mb-1 line-clamp-2">
                {ticket.title}
              </p>

              {ticket.resolutionSummary && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {ticket.resolutionSummary}
                </p>
              )}

              <Link
                href={`/tickets/${ticket.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5"
              >
                View &rarr;
              </Link>
            </div>
          ))}
        </div>

        <SheetFooter className="flex flex-col gap-2 sm:flex-col">
          <Button
            type="button"
            variant="default"
            className="w-full"
            onClick={onSubmitAnyway}
          >
            My issue is different — submit anyway
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={onCancel}
          >
            Cancel — go back and edit
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
