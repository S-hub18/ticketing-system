'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { X, AlertTriangle } from 'lucide-react'

interface EscalationBannerProps {
  ticketId: string
  message: string
  onSend: (editedMessage: string) => void
  onDismiss: () => void
}

export function EscalationBanner({
  ticketId,
  message,
  onSend,
  onDismiss,
}: EscalationBannerProps) {
  const [editedMessage, setEditedMessage] = useState(message)
  const [isSending, setIsSending] = useState(false)

  const handleSend = async () => {
    if (!editedMessage.trim()) return
    setIsSending(true)
    try {
      await onSend(editedMessage.trim())
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 mb-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="text-sm font-semibold">
            No activity for 48+ hours — escalation nudge ready
          </span>
        </div>
        <button
          onClick={onDismiss}
          className="text-amber-600 hover:text-amber-800 transition-colors"
          aria-label="Dismiss escalation banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <Textarea
        value={editedMessage}
        onChange={(e) => setEditedMessage(e.target.value)}
        rows={4}
        className="bg-white border-amber-200 text-sm text-gray-800 focus-visible:ring-amber-400 resize-none mb-3"
        placeholder="Edit escalation message..."
      />

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={handleSend}
          disabled={isSending || !editedMessage.trim()}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {isSending ? 'Sending…' : 'Edit & Send'}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="text-amber-700 hover:text-amber-900 hover:bg-amber-100"
        >
          Dismiss
        </Button>
      </div>
    </div>
  )
}
