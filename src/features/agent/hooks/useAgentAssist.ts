'use client'

import { useState, useCallback } from 'react'
import type { AssistAgentResult } from '@/types'

interface AgentAssistState {
  draft: string
  suggestedAction: string | null
  actionReason: string | null
  slaWarning: string | null
  repeatIssueNote: string | null
  isLoading: boolean
  error: string | null
}

const initialState: AgentAssistState = {
  draft: '',
  suggestedAction: null,
  actionReason: null,
  slaWarning: null,
  repeatIssueNote: null,
  isLoading: false,
  error: null,
}

export function useAgentAssist() {
  const [state, setState] = useState<AgentAssistState>(initialState)

  const generateDraft = useCallback(async (ticketId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(err.error ?? 'Failed to generate draft')
      }

      const data: AssistAgentResult = await res.json()

      setState({
        draft: data.draft,
        suggestedAction: data.suggestedAction ?? null,
        actionReason: data.actionReason ?? null,
        slaWarning: data.slaWarning ?? null,
        repeatIssueNote: data.repeatIssueNote ?? null,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      console.error('[useAgentAssist]', error)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Could not generate a draft. Please try again.',
      }))
    }
  }, [])

  return {
    generateDraft,
    draft: state.draft,
    suggestedAction: state.suggestedAction,
    actionReason: state.actionReason,
    slaWarning: state.slaWarning,
    repeatIssueNote: state.repeatIssueNote,
    isLoading: state.isLoading,
    error: state.error,
  }
}
