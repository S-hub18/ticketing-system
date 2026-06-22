'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface StatusTransitionBarProps {
  status: string
  ticketId: string
  onStatusChange?: (newStatus: string) => void
}

const STEPS = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const
type Step = (typeof STEPS)[number]

const STEP_LABELS: Record<Step, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

const NEXT_STATUS: Partial<Record<Step, Step>> = {
  OPEN: 'IN_PROGRESS',
  IN_PROGRESS: 'RESOLVED',
  RESOLVED: 'CLOSED',
}

export function StatusTransitionBar({
  status,
  ticketId,
  onStatusChange = () => {},
}: StatusTransitionBarProps) {
  const router = useRouter()
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentIndex = STEPS.indexOf(status as Step)
  const nextStatus = NEXT_STATUS[status as Step]

  const handleTransition = async () => {
    if (!nextStatus) return
    setError(null)
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to update status' }))
        throw new Error(data.error ?? 'Failed to update status')
      }
      onStatusChange(nextStatus)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Step progress bar */}
      <div className="flex items-center gap-0">
        {STEPS.map((step, index) => {
          const isCompleted = index < currentIndex
          const isCurrent = index === currentIndex
          const isLast = index === STEPS.length - 1

          return (
            <div key={step} className="flex items-center flex-1 min-w-0">
              {/* Step circle + label */}
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div
                  className={[
                    'h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 transition-colors',
                    isCompleted
                      ? 'bg-blue-600 text-white'
                      : isCurrent
                      ? 'bg-blue-100 border-2 border-blue-600 text-blue-700'
                      : 'bg-gray-100 border-2 border-gray-300 text-gray-400',
                  ].join(' ')}
                >
                  {isCompleted ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={[
                    'mt-1 text-[10px] font-medium text-center leading-tight',
                    isCurrent
                      ? 'text-blue-700'
                      : isCompleted
                      ? 'text-blue-500'
                      : 'text-gray-400',
                  ].join(' ')}
                >
                  {STEP_LABELS[step]}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={[
                    'h-0.5 flex-1 -mt-4 mx-0.5 transition-colors',
                    index < currentIndex ? 'bg-blue-400' : 'bg-gray-200',
                  ].join(' ')}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Transition button */}
      {nextStatus && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleTransition}
          disabled={isUpdating}
          className="w-full text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
        >
          {isUpdating ? (
            'Updating…'
          ) : (
            <>
              Move to {STEP_LABELS[nextStatus]}
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </>
          )}
        </Button>
      )}

      {status === 'CLOSED' && (
        <p className="text-xs text-center text-gray-500">This ticket is closed.</p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
