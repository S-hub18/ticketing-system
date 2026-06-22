# NudgeTicket — Internal Support Ticketing Tool
## Product & Implementation Plan

---

## What We're Building

An internal support ticketing web app for employees to raise and track requests across four departments: **IT, HR, Finance, and Admin**. Agents handle their department queue. Admins get cross-department analytics.

The AI layer uses **Gemini with function-calling (tool use)** to power five agentic flows: a ticket intake agent, an auto-triage agent, an agent assist agent, an escalation intelligence agent, and an analytics insight agent. Each agent runs a multi-step loop — calling tools, reasoning over results, and deciding next actions — rather than making a single prompt → response call.

---

## User Roles

| Role | Who | What they do |
|---|---|---|
| **Employee** | Any staff member | Raises tickets, tracks status, receives notifications |
| **Agent** | Dept support staff | Works the queue, responds, resolves tickets |
| **Admin** | Dept head / IT admin | Oversees all tickets, manages users, views analytics |

---

## User Journeys & Scenarios

### Employee

| # | Scenario | Journey |
|---|---|---|
| E1 | **First-time user** | Login → empty dashboard → "Raise your first ticket" CTA → guided form with tooltips |
| E2 | **Raising a ticket** | Describe issue → Intake Agent fires after 400ms debounce → category chip + urgency nudge ("Sounds time-sensitive — consider marking High") → set urgency → submit |
| E3 | **Unsure of department** | Helper text: "Describe your issue — we'll route it for you" → agent suggests; confidence < 50% shows "Not sure — does this look right?" with override |
| E4 | **Self-service answer** | Intake Agent finds a directly applicable resolved ticket → surfaces resolution inline ("We think this answers your question. Did this help?") → employee can close without submitting |
| E5 | **Duplicate prevention** | No direct answer but similar tickets exist → bottom sheet with up to 3 matches → employee reads and decides |
| E6 | **CRITICAL urgency** | Urgency selector: Low / Medium / High / Critical → Critical triggers Auto-Triage Agent + notification blast to all dept agents |
| E7 | **Tracking** | Dashboard shows own tickets with status badges → bell notification fires on every status change |
| E8 | **Reopening closed ticket** | "Reopen" button → reason required → returns to Open → original agent notified |

### Agent

| # | Scenario | Journey |
|---|---|---|
| A1 | **Queue view** | Dept-filtered queue sorted: Critical → High → oldest first; CRITICAL tickets pulse red |
| A2 | **Claiming** | "Claim" assigns ticket + moves to In Progress |
| A3 | **Agent Assist** | "Generate Draft" → Agent Assist Agent: pulls history + similar resolutions + SLA via tools → returns draft + suggested action (Resolve / Needs Info / Escalate / Schedule Call) → agent edits; never auto-sent |
| A4 | **Internal notes** | Reply composer tabs: "Reply to Employee" \| "Internal Note" → amber background + lock icon; double-filtered (API + component) |
| A5 | **Escalation** | Escalation Intelligence Agent reviews stale tickets, diagnoses why stuck, drafts contextual escalation → shown in EscalationBanner (editable) |
| A6 | **Reassigning** | "Reassign" → dept + required note → ticket leaves current queue; new dept agents + employee notified |
| A7 | **Multi-dept agents** | Agents cover multiple depts → merged queue with dept column |

### Admin

| # | Scenario | Journey |
|---|---|---|
| AD1 | **Analytics dashboard** | KPI cards + 4 charts + stale tickets table + agent leaderboard |
| AD2 | **AI Insights** | Analytics Insight Agent interprets metrics → natural language anomaly/trend summary ("IT ticket volume up 40% this week — mostly VPN-related. Consider a status page.") |
| AD3 | **Oversight** | View/reassign any ticket across all depts |
| AD4 | **User management** | Create/edit users, set roles and dept assignments |
| AD5 | **Export** | Date-filtered CSV download |

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 14 App Router (TypeScript) | Full-stack, co-located API routes |
| Styling | Tailwind CSS + shadcn/ui | Fast, accessible components |
| Database | Prisma + SQLite | Zero setup prototype |
| Auth | NextAuth.js v5 (Credentials provider) | Simple email/password |
| AI | `@google/genai` — `gemini-2.0-flash` | Fast, cheap, strong tool-use for agentic loops |
| Charts | Recharts | Composable React charts |
| Validation | Zod | API boundary safety |

---

## Database Schema

```
User
  id, name, email, passwordHash, role (EMPLOYEE|AGENT|ADMIN)
  isActive, createdAt, updatedAt
  → AgentDepartment[]

AgentDepartment
  agentId → User, department (IT|HR|FINANCE|ADMIN)

Ticket
  id, title, description
  status: OPEN | IN_PROGRESS | RESOLVED | CLOSED
  urgency: LOW | MEDIUM | HIGH | CRITICAL
  department: IT | HR | FINANCE | ADMIN
  aiCategory, aiCategoryConf (float 0-1)
  aiUrgencySuggestion (LOW|MEDIUM|HIGH|CRITICAL)
  selfServiceAnswer (text — if Intake Agent found a direct answer)
  duplicateShown (bool)
  isEscalated, escalatedAt, lastActivityAt
  createdById → User, assignedToId → User
  createdAt, updatedAt, resolvedAt, closedAt

TicketComment
  id, ticketId, authorId, body
  isInternal (bool), isAiDraft (bool)
  agentSuggestedAction (RESOLVE|NEEDS_INFO|ESCALATE|SCHEDULE_CALL)
  createdAt, updatedAt

Notification
  id, userId, ticketId, type, title, body, isRead, createdAt
  Types: TICKET_CREATED | TICKET_ASSIGNED | TICKET_STATUS_CHANGED
         TICKET_COMMENT_ADDED | TICKET_ESCALATED | TICKET_REASSIGNED | TICKET_REOPENED

TicketHistory (audit trail)
  id, ticketId, changedById, field, oldValue, newValue, note, createdAt

AgentRun (agentic loop log — one row per tool call per run)
  id, ticketId, userId, agentType
  stepIndex, toolName, toolInput (JSON), toolOutput (JSON)
  finalOutput (text), totalSteps, latencyMs, modelId
  createdAt

Attachment
  id, ticketId, uploadedById, filename, mimeType, sizeBytes, storagePath, createdAt
```

**Status state machine:**
```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
CLOSED → OPEN (reopen with reason)
RESOLVED → IN_PROGRESS (agent re-opens)
```

---

## API Routes

### Tickets
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/tickets` | Role-filtered list |
| POST | `/api/tickets` | Create + trigger Auto-Triage Agent async + notify |
| GET | `/api/tickets/[id]` | Full ticket + comments + history |
| PATCH | `/api/tickets/[id]` | Status/urgency/dept/assignee; validates state machine |
| GET | `/api/tickets/[id]/comments` | Internal filtered for EMPLOYEE |
| POST | `/api/tickets/[id]/comments` | Agent/Admin only |

### Agentic AI
| Method | Path | Agent |
|---|---|---|
| POST | `/api/ai/intake` | Ticket Intake Agent |
| POST | `/api/ai/triage` | Auto-Triage Agent (internal, called from ticket creation) |
| POST | `/api/ai/assist` | Agent Assist Agent |
| POST | `/api/ai/escalate-agent` | Escalation Intelligence Agent |
| POST | `/api/ai/insights` | Analytics Insight Agent |

### Queue, Notifications, Admin
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/queue` | Agent queue sorted urgency+age |
| POST | `/api/queue/claim/[id]` | Assign to agent, IN_PROGRESS |
| GET | `/api/notifications` | `{notifications[], unreadCount}` |
| PATCH | `/api/notifications/read-all` | Mark all read |
| GET | `/api/admin/analytics` | Aggregate metrics |
| GET | `/api/admin/analytics/export` | CSV stream |
| GET/POST | `/api/users` | Admin: list/create |
| PATCH | `/api/users/[id]` | Admin: update role/depts/active |
| POST | `/api/internal/escalate` | Cron: trigger Escalation Agent on stale tickets |

---

## Agentic AI Design

All five agents use **Gemini function calling** (`gemini-2.0-flash`). The shared pattern in `src/lib/gemini.ts`:

```
1. Send system prompt + user message to Gemini
2. While response contains tool calls:
   a. Execute each tool (DB query / business logic)
   b. Feed results back to model
3. Model returns final structured JSON output
4. Log every step to AgentRun table
```

---

### Agent 1: Ticket Intake Agent
**Route:** `POST /api/ai/intake` | **Trigger:** Debounced 400ms on description (length > 50)

**Tools:**
- `searchSimilarTickets(query, department?, limit)` → `[{id, title, status, resolutionSummary}]`
- `getSelfServiceKnowledge(query)` → `[{title, content, source}]`
- `assessUrgencySignals(description)` → `{urgencyLevel, signals[]}`

**Output:**
```json
{
  "department": "IT",
  "confidence": 0.92,
  "reasoning": "Mentions VPN and remote access",
  "urgencySuggestion": "HIGH",
  "urgencySignals": ["can't work", "deadline implied"],
  "selfServiceAnswer": "Reset your VPN client by...",
  "selfServiceConfidence": 0.87,
  "similarTickets": [{"id": "...", "title": "...", "status": "RESOLVED", "resolutionSummary": "..."}]
}
```

**UX outputs (all from one agent call):**
- Category chip + confidence
- Urgency nudge chip
- Inline self-service answer panel (if selfServiceConfidence > 0.8)
- Duplicate bottom sheet (if similar tickets + no self-service answer)

---

### Agent 2: Auto-Triage Agent
**Route:** `POST /api/ai/triage` | **Trigger:** Async on every ticket submission (does not block response)

**Tools:**
- `getAgentWorkload(department)` → `[{id, name, openTickets, avgResolutionHours}]`
- `checkDuplicateTickets(description, department)` → `[{id, title, status, assignedTo}]`
- `getRequesterHistory(userId)` → `{previousTickets[], totalCount}`
- `getPriorityScore(urgency, department, requesterHistory)` → `{score, reasoning}`

**Output:**
```json
{
  "suggestedAssigneeId": "agent_id_or_null",
  "autoAssigned": true,
  "priorityScore": 85,
  "duplicateTicketId": null,
  "triageNotes": "Auto-assigned to Sarah (IT) — lowest workload. Requester has had 2 prior VPN tickets."
}
```

**Effect:** If autoAssigned, ticket is assigned + agent notified + triage note added to TicketHistory.

---

### Agent 3: Agent Assist Agent
**Route:** `POST /api/ai/assist` | **Trigger:** Agent clicks "Generate Draft"

**Tools:**
- `getTicketFullContext(ticketId)` → `{ticket, employee, comments: last10, internalNotes: last5}`
- `getSimilarResolutions(description, department, limit)` → `[{ticketId, title, resolution, resolvedAt}]`
- `checkSLAStatus(urgency, createdAt, lastActivityAt)` → `{slaBreached, hoursRemaining}`
- `getEmployeeTicketPattern(userId)` → `{commonCategories[], repeatIssues[], totalTickets}`

**Output:**
```json
{
  "draft": "Hi Sarah, thanks for reaching out...",
  "suggestedAction": "NEEDS_MORE_INFO",
  "actionReason": "Missing error code from the employee",
  "slaWarning": "SLA breached by 2 hours — prioritise this response",
  "repeatIssueNote": "Employee has had 3 VPN tickets this month"
}
```

**UX:** Draft in textarea. SuggestedActionChip above composer. SLAWarningBanner if breached. RepeatIssueBadge if applicable. Never auto-sent.

---

### Agent 4: Escalation Intelligence Agent
**Route:** `POST /api/ai/escalate-agent` | **Trigger:** Called per stale ticket by cron

**Tools:**
- `getStaleTicketContext(ticketId)` → `{ticket, assignedAgent, comments, lastActivity}`
- `getAgentAvailability(agentId)` → `{isActive, openTickets, lastLogin}`
- `findAlternativeAgent(department, excludeAgentId)` → `[{id, name, openTickets}]`
- `getSimilarResolvedTickets(description, department)` → `[{id, title, resolution, resolvedIn}]`

**Output:**
```json
{
  "action": "REASSIGN",
  "escalationMessage": "This ticket has been unattended for 52 hours. Suggested reassignment to James (IT) who resolved a similar VPN issue last week.",
  "suggestedAssigneeId": "james_id",
  "reasoning": "Assigned agent hasn't logged in for 3 days",
  "resolvedSimilarTicket": "ticket_xyz"
}
```

**UX:** EscalationBanner shows the drafted message (editable by agent). If REASSIGN, admin notified with reasoning.

---

### Agent 5: Analytics Insight Agent
**Route:** `POST /api/ai/insights` | **Trigger:** Admin loads dashboard (cached 1h)

**Tools:**
- `getVolumeAnomalies(dateRange, department?)` → `[{department, metric, change, baseline, current}]`
- `getResolutionTrends(dateRange)` → `[{department, avgHours, change, direction}]`
- `getTopCategories(department, limit)` → `[{label, count, percentChange}]`
- `getAgentBottlenecks()` → `[{agentId, name, stalledTickets, avgAge}]`

**Output:**
```json
{
  "summary": "IT ticket volume is up 40% this week, driven by VPN issues. Finance resolution time improved by 30%.",
  "insights": [
    {
      "type": "anomaly",
      "title": "VPN ticket spike",
      "detail": "23 VPN tickets this week vs. 14-week average of 16",
      "action": "Consider posting a VPN status update or self-service guide"
    },
    {
      "type": "win",
      "title": "Finance response time improving",
      "detail": "Avg resolution down from 18h to 12h over 2 weeks",
      "action": null
    }
  ],
  "generatedAt": "2026-06-20T10:00:00Z"
}
```

**UX:** `AiInsightsCard` at top of admin dashboard with expandable insight bullets per finding.

---

## Gemini Agent Runner (`src/lib/gemini.ts`)

```typescript
import { GoogleGenerativeAI } from "@google/genai";

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function runAgent<T>({ systemPrompt, userMessage, tools, toolHandlers, agentType, ticketId, userId }) {
  const model = genai.getGenerativeModel({
    model: "gemini-2.0-flash",
    systemInstruction: systemPrompt,
    tools: [{ functionDeclarations: tools }],
  });

  const chat = model.startChat();
  let response = await chat.sendMessage(userMessage);
  const steps = [];
  let stepIndex = 0;

  // Agentic loop — run until no more tool calls
  while (response.candidates?.[0]?.content.parts.some(p => p.functionCall)) {
    const toolCalls = response.candidates[0].content.parts.filter(p => p.functionCall);
    const toolResults = await Promise.all(
      toolCalls.map(async ({ functionCall: call }) => {
        const output = await toolHandlers[call.name](call.args);
        steps.push({ stepIndex: stepIndex++, toolName: call.name, toolInput: call.args, toolOutput: output });
        return { functionResponse: { name: call.name, response: output } };
      })
    );
    response = await chat.sendMessage(toolResults);
  }

  await logAgentRun({ agentType, ticketId, userId, steps, finalOutput: response.text(), latencyMs });
  return { result: JSON.parse(response.text()) as T, steps };
}
```

---

## File Structure

```
nudge-ticketing/
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── (auth)/login/page.tsx
│   │   ├── (employee)/dashboard/  +  tickets/new/  +  tickets/[id]/
│   │   ├── (agent)/queue/  +  tickets/[id]/
│   │   ├── (admin)/dashboard/  +  tickets/  +  users/
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── tickets/route.ts  +  [id]/route.ts  +  [id]/comments/route.ts
│   │       ├── queue/route.ts  +  claim/[id]/route.ts
│   │       ├── notifications/route.ts  +  read-all/route.ts
│   │       ├── ai/
│   │       │   ├── intake/route.ts          # Agent 1
│   │       │   ├── triage/route.ts          # Agent 2
│   │       │   ├── assist/route.ts          # Agent 3
│   │       │   ├── escalate-agent/route.ts  # Agent 4
│   │       │   └── insights/route.ts        # Agent 5
│   │       ├── admin/analytics/route.ts  +  analytics/export/route.ts
│   │       ├── users/route.ts  +  [id]/route.ts
│   │       └── internal/escalate/route.ts
│   ├── components/
│   │   ├── layout/     # AppShell, Sidebar, TopBar, NotificationBell
│   │   ├── ui/         # shadcn/ui
│   │   └── common/     # StatusBadge, UrgencyBadge, EmptyState, RelativeTime
│   ├── features/
│   │   ├── employee/
│   │   │   ├── components/   # NewTicketForm, AiCategoryChip, UrgencyNudge,
│   │   │   │                 # SelfServiceAnswerPanel, DuplicateWarningSheet,
│   │   │   │                 # MyTicketsList, ReopenDialog, TicketTimeline
│   │   │   └── hooks/useIntakeAgent.ts
│   │   ├── agent/
│   │   │   ├── components/   # QueueTable, ReplyComposer, AgentAssistButton,
│   │   │   │                 # SuggestedActionChip, SLAWarningBanner,
│   │   │   │                 # RepeatIssueBadge, EscalationBanner,
│   │   │   │                 # ReassignDialog, StatusTransitionBar,
│   │   │   │                 # SimilarTicketsPanel, InternalNoteBadge
│   │   │   └── hooks/useAgentAssist.ts
│   │   └── admin/
│   │       ├── components/   # AiInsightsCard, SummaryCards, VolumeBarChart,
│   │       │                 # StatusDonutChart, TrendLineChart,
│   │       │                 # ResolutionHistogram, StaleTicketsTable,
│   │       │                 # AgentLeaderboard, UsersTable
│   │       └── hooks/useAnalyticsInsights.ts
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── auth.ts
│   │   ├── gemini.ts                 # runAgent() loop + AgentRun logger
│   │   ├── agent-tools/
│   │   │   ├── intake-tools.ts       # searchSimilarTickets, getSelfServiceKnowledge, assessUrgency
│   │   │   ├── triage-tools.ts       # getAgentWorkload, checkDuplicates, getRequesterHistory
│   │   │   ├── assist-tools.ts       # getTicketFullContext, getSimilarResolutions, checkSLA
│   │   │   ├── escalation-tools.ts   # getStaleTicketContext, findAlternativeAgent
│   │   │   └── insights-tools.ts     # getVolumeAnomalies, getResolutionTrends, etc.
│   │   ├── notifications.ts
│   │   ├── escalation.ts             # loops over stale tickets → calls Escalation Agent
│   │   └── ticket-helpers.ts         # state machine
│   ├── hooks/useNotifications.ts
│   ├── types/                        # ticket.ts, user.ts, api.ts, agent.ts
│   └── middleware.ts
├── .env.local
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── components.json
└── package.json
```

---

## Build Phases

### Phase 1 — Foundation
1. `npx create-next-app@latest . --typescript --tailwind --app --src-dir`
2. Install: `prisma @prisma/client next-auth@beta @auth/prisma-adapter bcryptjs zod @types/bcryptjs @google/genai`
3. `prisma/schema.prisma` → `npx prisma migrate dev --name init`
4. Seed: 1 employee, 1 IT agent, 1 admin
5. `src/lib/auth.ts` — NextAuth v5 credentials
6. `src/middleware.ts` — role-based route protection
7. Login → AppShell → Sidebar → TopBar
8. ✅ **Gate:** login works, role redirects work

### Phase 2 — Core Ticket CRUD
1. `npx shadcn@latest init` + add components
2. Common components: StatusBadge, UrgencyBadge, EmptyState, RelativeTime
3. Ticket + comment API routes + state machine
4. Employee: NewTicketForm (no AI), MyTicketsList, ticket detail
5. Agent: QueueTable, claim, ticket detail + StatusTransitionBar + ReplyComposer
6. ✅ **Gate:** submit → claim → update → comment

### Phase 3 — Notifications
1. Notification API + NotificationBell + `useNotifications` (30s poll)
2. Wire all trigger points
3. ✅ **Gate:** bell updates, marks read

### Phase 4 — Agentic AI Layer (Agents 1–3)
1. `src/lib/gemini.ts` — `runAgent()` + AgentRun logger
2. `src/lib/agent-tools/` — all tool handlers (pure DB functions)
3. **Intake Agent** → `useIntakeAgent` → AiCategoryChip + UrgencyNudge + SelfServiceAnswerPanel + DuplicateWarningSheet
4. **Auto-Triage Agent** → async from `POST /api/tickets` → auto-assign with triage note
5. **Agent Assist Agent** → AgentAssistButton → draft + SuggestedActionChip + SLAWarningBanner
6. ✅ **Gate:** all 3 agents work with real Gemini calls; AgentRun table logs steps

### Phase 5 — Full Lifecycle + Escalation Agent (Agent 4)
1. TicketHistoryLog, TicketTimeline, ReopenDialog
2. **Escalation Intelligence Agent** → EscalationBanner with editable message
3. Cron endpoint loops stale tickets → calls Escalation Agent per ticket
4. ReassignDialog, internal notes (double-filtered), CRITICAL pulsing, SimilarTicketsPanel
5. ✅ **Gate:** all user journey scenarios work end-to-end

### Phase 6 — Admin Analytics + Insights Agent (Agent 5)
1. Install: `recharts`
2. Analytics API + 4 charts + KPI cards + filters
3. **Analytics Insight Agent** → AiInsightsCard (cached 1h)
4. StaleTicketsTable + AgentLeaderboard + CSV export + Users management
5. ✅ **Gate:** charts render; AI Insights card shows anomalies; CSV works

### Phase 7 — Polish & Seed
1. Responsive audit (768px+), skeletons, error boundaries
2. Attachment upload (local, 10MB, pdf/png/jpg/docx)
3. Full seed: 20 tickets, sample comments, internal notes, AgentRun records
4. ✅ **Gate:** full end-to-end walkthrough

---

## Environment Variables

```bash
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
GEMINI_API_KEY="AIza..."
INTERNAL_CRON_SECRET="<random string>"
```

---

## Seeded Demo Accounts

| Email | Password | Role |
|---|---|---|
| employee@company.com | password123 | Employee |
| it-agent@company.com | password123 | Agent (IT) |
| hr-agent@company.com | password123 | Agent (HR) |
| finance-agent@company.com | password123 | Agent (Finance) |
| admin-agent@company.com | password123 | Agent (Admin dept) |
| admin@company.com | password123 | Admin |

---

## Verification Checklist

1. Employee raises ticket → Intake Agent (multi-step) suggests category + urgency + self-service answer
2. Similar ticket found → duplicate sheet → employee closes without submitting
3. CRITICAL ticket → Auto-Triage Agent auto-assigns to least-loaded agent
4. Agent "Generate Draft" → Agent Assist Agent calls 4 tools → draft + suggested action + SLA warning
5. Ticket stale 48h → Escalation Agent diagnoses why stuck → EscalationBanner with drafted message
6. Agent internal note → employee cannot see it
7. Admin dashboard → AiInsightsCard shows anomaly → charts confirm
8. AgentRun table shows full step-by-step logs for every agent execution
9. All 13 user journey scenarios demonstrated end-to-end
