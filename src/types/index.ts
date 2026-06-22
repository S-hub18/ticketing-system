export type {
  User,
  Ticket,
  TicketComment,
  Notification,
  TicketHistory,
  AgentRun,
  Attachment,
  AgentDepartment,
} from '@/generated/prisma/client'

export {
  Role,
  Department,
  TicketStatus,
  TicketUrgency,
  NotificationType,
  AgentSuggestedAction,
  AgentType,
} from '@/generated/prisma/client'

export interface IntakeAgentResult {
  department: string
  confidence: number
  reasoning: string
  urgencySuggestion: string
  urgencySignals: string[]
  selfServiceAnswer?: string
  selfServiceConfidence?: number
  similarTickets: Array<{
    id: string
    title: string
    status: string
    resolutionSummary?: string
  }>
}

export interface TriageAgentResult {
  suggestedAssigneeId: string | null
  autoAssigned: boolean
  priorityScore: number
  duplicateTicketId: string | null
  triageNotes: string
}

export interface AssistAgentResult {
  draft: string
  suggestedAction: string
  actionReason: string
  slaWarning?: string
  repeatIssueNote?: string
}

export interface EscalationAgentResult {
  action: 'REASSIGN' | 'NOTIFY' | 'CLOSE'
  escalationMessage: string
  suggestedAssigneeId?: string
  reasoning: string
  resolvedSimilarTicket?: string
}

export interface InsightsAgentResult {
  summary: string
  insights: Array<{
    type: 'anomaly' | 'win' | 'bottleneck' | 'trend'
    title: string
    detail: string
    action: string | null
  }>
  generatedAt: string
}

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}
