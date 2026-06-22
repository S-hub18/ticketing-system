'use client'

import { useState } from 'react'
import { EscalationBanner } from '@/features/agent/components/EscalationBanner'

interface EscalationBannerWrapperProps {
  ticketId: string
  hoursStale: number
}

export function EscalationBannerWrapper({
  ticketId,
  hoursStale,
}: EscalationBannerWrapperProps) {
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const defaultMessage =
    `Hi, just checking in on ticket ${ticketId} — there has been no activity for ${hoursStale} hours. ` +
    `Could you please provide an update or let us know if you need anything further? Thank you.`

  if (dismissed || sent) return null

  const handleSend = async (editedMessage: string) => {
    setSending(true)
    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: editedMessage,
          isInternal: false,
          isAiDraft: true,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to send' }))
        throw new Error(data.error ?? 'Failed to send escalation')
      }
      setSent(true)
    } catch (err) {
      console.error('[EscalationBannerWrapper]', err)
    } finally {
      setSending(false)
    }
  }

  return (
    <EscalationBanner
      ticketId={ticketId}
      message={defaultMessage}
      onSend={handleSend}
      onDismiss={() => setDismissed(true)}
    />
  )
}
