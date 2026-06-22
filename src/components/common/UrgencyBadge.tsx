import { Badge } from '@/components/ui/badge';

type Urgency = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

interface UrgencyBadgeProps {
  urgency: Urgency;
}

const URGENCY_CONFIG: Record<Urgency, { label: string; className: string }> = {
  LOW: {
    label: 'Low',
    className: 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100',
  },
  MEDIUM: {
    label: 'Medium',
    className: 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
  },
  HIGH: {
    label: 'High',
    className: 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100',
  },
  CRITICAL: {
    label: 'Critical',
    className: 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100 animate-pulse',
  },
};

export function UrgencyBadge({ urgency }: UrgencyBadgeProps) {
  const config = URGENCY_CONFIG[urgency];

  return (
    <Badge
      variant="outline"
      className={`text-xs font-medium px-2 py-0.5 ${config.className} ${
        urgency === 'CRITICAL' ? 'animate-pulse-critical' : ''
      }`}
    >
      {urgency === 'CRITICAL' && (
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
      )}
      {config.label}
    </Badge>
  );
}
