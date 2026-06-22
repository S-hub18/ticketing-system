'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';

const DEPARTMENTS = ['IT', 'HR', 'FINANCE', 'ADMIN'] as const;

const DEPT_COLORS: Record<string, string> = {
  IT: 'bg-blue-100 text-blue-700 border-blue-200',
  HR: 'bg-purple-100 text-purple-700 border-purple-200',
  FINANCE: 'bg-green-100 text-green-700 border-green-200',
  ADMIN: 'bg-amber-100 text-amber-700 border-amber-200',
};

interface AiCategoryChipProps {
  department?: string;
  confidence?: number;
  onOverride: (dept: string) => void;
  loading: boolean;
}

export function AiCategoryChip({ department, confidence, onOverride, loading }: AiCategoryChipProps) {
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center gap-1.5 mt-2">
        <span className="text-xs text-muted-foreground animate-pulse">
          &#9676; Analysing your issue...
        </span>
      </div>
    );
  }

  if (!department || confidence === undefined) {
    return null;
  }

  const colorClass = DEPT_COLORS[department] ?? 'bg-gray-100 text-gray-600 border-gray-200';
  const confidencePct = Math.round(confidence * 100);
  const isHighConfidence = confidence >= 0.5;

  return (
    <div className="flex items-center gap-2 mt-2 flex-wrap">
      <Badge
        variant="outline"
        className={`text-xs font-medium px-2 py-0.5 ${colorClass}`}
      >
        {isHighConfidence
          ? `We think this is ${department} · ${confidencePct}%`
          : `Not sure — does ${department} look right?`}
      </Badge>

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger>
          <button
            type="button"
            className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Change
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-40">
          {DEPARTMENTS.map((dept) => (
            <DropdownMenuItem
              key={dept}
              className="cursor-pointer"
              onSelect={() => {
                onOverride(dept);
                setOpen(false);
              }}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full mr-2 ${
                  dept === 'IT'
                    ? 'bg-blue-500'
                    : dept === 'HR'
                    ? 'bg-purple-500'
                    : dept === 'FINANCE'
                    ? 'bg-green-500'
                    : 'bg-amber-500'
                }`}
              />
              {dept}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
