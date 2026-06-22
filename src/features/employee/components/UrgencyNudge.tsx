'use client';

interface UrgencyNudgeProps {
  urgencySuggestion?: string;
  signals?: string[];
  onAccept: () => void;
  onDismiss: () => void;
}

export function UrgencyNudge({
  urgencySuggestion,
  signals,
  onAccept,
  onDismiss,
}: UrgencyNudgeProps) {
  const shouldShow =
    urgencySuggestion === 'HIGH' || urgencySuggestion === 'CRITICAL';

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="mt-2 flex items-start gap-2">
      <button
        type="button"
        onClick={onAccept}
        className="flex-1 flex items-center gap-1.5 rounded-md bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100 transition-colors text-left"
        title={signals?.join(', ')}
      >
        <span className="shrink-0">&#9889;</span>
        <span>
          Sounds time-sensitive — consider marking{' '}
          <strong>
            {urgencySuggestion === 'CRITICAL' ? 'Critical' : 'High'}
          </strong>
        </span>
      </button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss urgency suggestion"
        className="shrink-0 mt-1.5 text-amber-600 hover:text-amber-800 transition-colors text-sm leading-none"
      >
        &times;
      </button>
    </div>
  );
}
