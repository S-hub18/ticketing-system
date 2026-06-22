import { TicketStatus, TicketUrgency } from '@/generated/prisma/client'

export const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED', 'OPEN'],
  RESOLVED: ['CLOSED', 'IN_PROGRESS'],
  CLOSED: ['OPEN'],
}

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false
}

export function formatTicketId(id: string): string {
  return `TKT-${id.slice(-4).toUpperCase()}`
}

export const URGENCY_ORDER: Record<TicketUrgency, number> = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
}

export function getSLAHours(urgency: TicketUrgency): number {
  const sla: Record<TicketUrgency, number> = {
    CRITICAL: 4,
    HIGH: 8,
    MEDIUM: 24,
    LOW: 72,
  }
  return sla[urgency]
}

export function isSLABreached(
  urgency: TicketUrgency,
  createdAt: Date,
  lastActivityAt: Date
): { breached: boolean; hoursRemaining: number } {
  const slaHours = getSLAHours(urgency)
  const ageMs = Date.now() - lastActivityAt.getTime()
  const ageHours = ageMs / (1000 * 60 * 60)
  const hoursRemaining = slaHours - ageHours
  return { breached: hoursRemaining < 0, hoursRemaining }
}
