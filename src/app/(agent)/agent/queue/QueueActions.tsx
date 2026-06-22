'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useRouter } from 'next/navigation'

interface QueueActionsProps {
  ticketId: string
  isUnassigned: boolean
  isAssignedToMe: boolean
  assigneeName: string | null
}

export function QueueActions({
  ticketId,
  isUnassigned,
  isAssignedToMe,
  assigneeName,
}: QueueActionsProps) {
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleClaim = async () => {
    setClaiming(true)
    setError(null)
    try {
      const res = await fetch(`/api/queue/claim/${ticketId}`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to claim' }))
        throw new Error(data.error ?? 'Failed to claim ticket')
      }
      toast.success('Ticket claimed')
      router.push(`/agent/tickets/${ticketId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
      setClaiming(false)
    }
  }

  if (isUnassigned) {
    return (
      <div className="flex flex-col gap-1">
        <Button
          size="sm"
          onClick={handleClaim}
          disabled={claiming}
          className="text-xs bg-blue-600 hover:bg-blue-700 text-white h-7 px-3"
        >
          {claiming ? 'Claiming…' : 'Claim'}
        </Button>
        {error && <p className="text-[10px] text-red-500">{error}</p>}
      </div>
    )
  }

  if (isAssignedToMe) {
    return (
      <Link href={`/agent/tickets/${ticketId}`}>
        <Button
          size="sm"
          variant="outline"
          className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50 h-7 px-3"
        >
          View →
        </Button>
      </Link>
    )
  }

  // Assigned to another agent
  const initials = assigneeName
    ? assigneeName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="flex items-center gap-1.5">
      <Avatar className="h-6 w-6">
        <AvatarFallback className="text-[10px] bg-gray-200 text-gray-600">
          {initials}
        </AvatarFallback>
      </Avatar>
      <span className="text-[11px] text-gray-500 truncate max-w-[80px]">
        {assigneeName ?? 'Agent'}
      </span>
    </div>
  )
}
