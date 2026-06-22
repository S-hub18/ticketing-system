import { Badge } from '@/components/ui/badge';

type Status = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

interface StatusBadgeProps {
  status: Status;
}

const STATUS_CONFIG: Record<Status, { label: string; className: string }> = {
  OPEN: {
    label: 'Open',
    className: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100',
  },
  RESOLVED: {
    label: 'Resolved',
    className: 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100',
  },
  CLOSED: {
    label: 'Closed',
    className: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100',
  },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];

  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium px-2 py-0.5 ${config.className}`}
    >
      {config.label}
    </Badge>
  );
}
