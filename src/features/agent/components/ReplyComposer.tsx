'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Lock, Sparkles, Loader2 } from 'lucide-react'
import { useAgentAssist } from '@/features/agent/hooks/useAgentAssist'
import { SuggestedActionChip } from '@/features/agent/components/SuggestedActionChip'

interface ReplyComposerProps {
  ticketId: string
  onSent?: () => void
}

type TabValue = 'reply' | 'internal'

export function ReplyComposer({ ticketId, onSent = () => {} }: ReplyComposerProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabValue>('reply')
  const [replyBody, setReplyBody] = useState('')
  const [internalBody, setInternalBody] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { generateDraft, draft, suggestedAction, actionReason, slaWarning, repeatIssueNote, isLoading, error: assistError } =
    useAgentAssist()

  const isInternal = activeTab === 'internal'
  const body = isInternal ? internalBody : replyBody
  const setBody = isInternal ? setInternalBody : setReplyBody

  // Drafts are replies to the employee — when a new one arrives, drop it straight
  // into the reply box (switching to that tab) so the agent can edit and send.
  const appliedDraftRef = useRef('')
  useEffect(() => {
    if (draft && draft !== appliedDraftRef.current) {
      appliedDraftRef.current = draft
      setReplyBody(draft)
      setActiveTab('reply')
    }
  }, [draft])

  const handleGenerateDraft = async () => {
    await generateDraft(ticketId)
  }

  const handleSubmit = async () => {
    if (!body.trim()) return
    setError(null)
    setIsSending(true)

    try {
      const res = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body: body.trim(),
          isInternal,
          isAiDraft: false,
          agentSuggestedAction: !isInternal && suggestedAction ? suggestedAction : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Failed to send' }))
        throw new Error(data.error ?? 'Failed to send')
      }

      // Reset both tabs
      setReplyBody('')
      setInternalBody('')
      toast.success(isInternal ? 'Internal note added' : 'Reply sent')
      onSent()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white shadow-sm">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
        <TabsList className="w-full rounded-t-lg rounded-b-none border-b border-gray-200 bg-gray-50 h-auto p-0">
          <TabsTrigger
            value="reply"
            className="flex-1 rounded-none rounded-tl-lg py-2.5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700"
          >
            Reply to Employee
          </TabsTrigger>
          <TabsTrigger
            value="internal"
            className="flex-1 rounded-none rounded-tr-lg py-2.5 text-sm data-[state=active]:bg-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:text-amber-700"
          >
            <Lock className="h-3.5 w-3.5 mr-1.5" />
            Internal Note
          </TabsTrigger>
        </TabsList>

        <div className="p-4">
          <TabsContent value="reply" className="mt-0">
            <Textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply to the employee…"
              rows={5}
              className="resize-none text-sm focus-visible:ring-blue-500"
            />
          </TabsContent>

          <TabsContent value="internal" className="mt-0">
            <div className="flex items-center gap-1.5 mb-2 text-amber-700">
              <Lock className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">
                Visible to agents and admins only
              </span>
            </div>
            <Textarea
              value={internalBody}
              onChange={(e) => setInternalBody(e.target.value)}
              placeholder="Add an internal note…"
              rows={5}
              className="resize-none text-sm bg-amber-50 border-amber-200 focus-visible:ring-amber-400 placeholder:text-amber-400"
            />
          </TabsContent>

          {/* AI suggestion panel — draft is inserted into the reply box above */}
          {draft && !isInternal && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-blue-700 flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                AI draft inserted above — review and edit before sending.
              </p>
              <SuggestedActionChip
                action={suggestedAction as 'RESOLVE' | 'NEEDS_INFO' | 'ESCALATE' | 'SCHEDULE_CALL' | undefined}
                reason={actionReason ?? undefined}
                slaWarning={slaWarning ?? undefined}
                repeatIssueNote={repeatIssueNote ?? undefined}
              />
            </div>
          )}

          {assistError && (
            <p className="mt-2 text-xs text-amber-600">{assistError}</p>
          )}

          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <Button
              size="sm"
              variant="outline"
              onClick={handleGenerateDraft}
              disabled={isLoading}
              className="text-blue-700 border-blue-300 hover:bg-blue-50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                  Generate Draft
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSending || !body.trim()}
              className={
                isInternal
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            >
              {isSending
                ? 'Sending…'
                : isInternal
                ? 'Add Internal Note'
                : 'Send Reply'}
            </Button>
          </div>
        </div>
      </Tabs>
    </div>
  )
}
