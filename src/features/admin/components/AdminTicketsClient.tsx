'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Agent {
  id: string
  name: string
  departments: string[]
}

interface AdminTicketsClientProps {
  ticketId: string
  currentAssigneeId?: string
  agents: Agent[]
}

export function AdminTicketsClient({
  ticketId,
  currentAssigneeId,
  agents,
}: AdminTicketsClientProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(currentAssigneeId ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  async function handleReassign() {
    setError(null)
    try {
      const res = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: selectedId || null }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Failed to reassign')
        return
      }
      setOpen(false)
      startTransition(() => router.refresh())
    } catch {
      setError('Network error. Please try again.')
    }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Link
          href={`/admin/tickets/${ticketId}`}
          className="text-xs text-[#3b82f6] hover:underline whitespace-nowrap"
        >
          View
        </Link>
        <button
          onClick={() => {
            setSelectedId(currentAssigneeId ?? '')
            setError(null)
            setOpen(true)
          }}
          className="text-xs text-[#78716c] hover:text-[#0c0a09] transition-colors whitespace-nowrap"
        >
          Reassign
        </button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Reassign Ticket</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <label className="text-xs font-medium text-[#44403c]">Assign to agent</label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="w-full text-sm border border-[#e7e5e4] rounded-md px-3 py-2 bg-white text-[#0c0a09] focus:outline-none focus:ring-2 focus:ring-[#292524]"
            >
              <option value="">Unassigned</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                  {agent.departments.length > 0 ? ` (${agent.departments.join(', ')})` : ''}
                </option>
              ))}
            </select>
            {error && <p className="text-xs text-red-500">{error}</p>}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReassign}
              disabled={isPending}
              className="bg-[#292524] text-white hover:bg-[#44403c]"
            >
              {isPending ? 'Saving…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
