import { AlertTriangle, Info } from 'lucide-react'

type SuggestedAction = 'RESOLVE' | 'NEEDS_INFO' | 'ESCALATE' | 'SCHEDULE_CALL'

interface SuggestedActionChipProps {
  action?: SuggestedAction
  reason?: string
  slaWarning?: string
  repeatIssueNote?: string
}

const ACTION_CONFIG: Record<
  SuggestedAction,
  { label: string; className: string }
> = {
  RESOLVE: {
    label: '✓ Resolve',
    className: 'bg-green-100 text-green-800 border border-green-300',
  },
  NEEDS_INFO: {
    label: '? Needs Info',
    className: 'bg-blue-100 text-blue-800 border border-blue-300',
  },
  ESCALATE: {
    label: '↑ Escalate',
    className: 'bg-red-100 text-red-800 border border-red-300',
  },
  SCHEDULE_CALL: {
    label: '📞 Schedule Call',
    className: 'bg-purple-100 text-purple-800 border border-purple-300',
  },
}

export function SuggestedActionChip({
  action,
  reason,
  slaWarning,
  repeatIssueNote,
}: SuggestedActionChipProps) {
  if (!action && !slaWarning && !repeatIssueNote) return null

  const config = action ? ACTION_CONFIG[action] : null

  return (
    <div className="flex flex-col gap-2 mb-3">
      {config && (
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}
          >
            {config.label}
          </span>
          {reason && (
            <span className="text-xs text-gray-500 italic">{reason}</span>
          )}
        </div>
      )}

      {slaWarning && (
        <div className="flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span className="text-xs text-amber-800 font-medium">
            {slaWarning}
          </span>
        </div>
      )}

      {repeatIssueNote && (
        <div className="flex items-center gap-2 rounded-md bg-gray-50 border border-gray-200 px-3 py-2">
          <Info className="h-3.5 w-3.5 shrink-0 text-gray-500" />
          <span className="text-xs text-gray-600">{repeatIssueNote}</span>
        </div>
      )}
    </div>
  )
}
