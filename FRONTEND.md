# NudgeTicket — Frontend User Journey Plan

Covers every screen, state, navigation flow, and AI touchpoint for all three roles.

---

## Screen Navigation Map

```mermaid
flowchart TD
    START([Browser]) --> LOGIN[/login]

    LOGIN -->|Employee| EDASH[/dashboard]
    LOGIN -->|Agent| QUEUE[/agent/queue]
    LOGIN -->|Admin| ADASH[/admin/dashboard]

    %% Employee screens
    EDASH --> NEWT[/tickets/new]
    EDASH --> EDETAIL[/tickets/:id]
    NEWT -->|submit success| EDETAIL
    EDETAIL -->|reopen| EDETAIL

    %% Agent screens
    QUEUE --> ADETAIL[/agent/tickets/:id]
    ADETAIL -->|reassign| QUEUE

    %% Admin screens
    ADASH --> ALLTICKETS[/admin/tickets]
    ADASH --> USERS[/admin/users]
    ALLTICKETS --> ADMINDETAIL[/admin/tickets/:id]

    %% Shared: notification click
    BELL["Bell Notification"] -->|employee ticket| EDETAIL
    BELL -->|agent ticket| ADETAIL
    BELL -->|admin ticket| ADMINDETAIL
```

---

## Global Shell (all authenticated screens)

**Layout:** Fixed sidebar (240px) + top bar + scrollable main content area

### Sidebar
- Logo + product name "NudgeTicket" at top
- Role-aware nav links:
  - Employee: Dashboard, New Ticket
  - Agent: Queue, My Assigned
  - Admin: Analytics, All Tickets, Users
- Bottom: User avatar + name + role badge + Logout

### Top Bar
- Breadcrumb (e.g. "Dashboard / TKT-0042")
- **Notification Bell** — unread count badge (red dot with number)
  - Click opens dropdown panel (max-height 400px, scrollable)
  - Shows last 10 notifications: icon by type · bold title · body snippet · relative time
  - Clicking a row → navigates to relevant ticket + marks it read
  - "Mark all as read" text button top-right of panel
  - "You're all caught up" empty state if none
  - Panel closes on outside click
- User avatar → Profile, Logout

---

## Screen 1 — Login `/login`

**Purpose:** Only entry point. No self-registration — admin creates accounts.

**Layout:** Centered card (400px) on neutral background with logo above.

### Components
| Element | Detail |
|---|---|
| Logo + "NudgeTicket" | Above the card |
| Email field | `type="email"`, autofocus on load |
| Password field | `type="password"`, show/hide toggle |
| Sign In button | Full-width, primary |
| Error banner | Below button — "Invalid email or password" |

### States
| State | Behaviour |
|---|---|
| Default | Empty fields, button enabled |
| Loading | Button spinner + "Signing in…", fields disabled |
| Error | Red banner, fields re-enabled, password cleared |
| Success | Redirect by role: Employee → `/dashboard`, Agent → `/agent/queue`, Admin → `/admin/dashboard` |

No "forgot password" — internal tool, admin resets manually.

---

## Screen 2 — Employee Dashboard `/dashboard`

**Purpose:** Command centre. Employee sees all their tickets and raises new ones.

**Layout:** Full-width single column.

### Empty State (first-time user)
```
  [Illustration: empty inbox]

  "You haven't raised any tickets yet"
  "Need help? Describe your issue — we'll route it to the right team."

  [ + Raise your first ticket ]   ← primary CTA button
```
Tooltip on first visit: "Click here — our AI will handle the routing for you."

### With Tickets

**Quick Stats Bar** (horizontal chips):
- `2 Open` (blue) · `1 In Progress` (amber) · `5 Resolved` (green)

**Filter Tabs:** All | Open | In Progress | Resolved | Closed
- Active tab underlined · count badge per tab

**Ticket Table:**
| Column | Detail |
|---|---|
| # | Ticket ID e.g. TKT-0042 |
| Title | Truncated at 60 chars, tooltip on hover |
| Department | Badge with icon: IT / HR / Finance / Admin |
| Urgency | LOW (grey) / MEDIUM (blue) / HIGH (orange) / CRITICAL (red, pulsing) |
| Status | Colour-coded badge |
| Raised | Relative time: "2 days ago" |
| Updated | Relative time: "3h ago" |

- Entire row clickable → `/tickets/:id`
- CRITICAL row: red left border (4px)
- Default sort: `updatedAt` descending

**"New Ticket" button** — top right, always visible

### Loading State
- Stats bar: 3 skeleton chips
- Table: 5 skeleton rows with shimmer

### Error State
- "Something went wrong" inline banner + Retry button

---

## Screen 3 — New Ticket Form `/tickets/new`

**Purpose:** Core employee action. AI assists at every step.

**Layout:** Centered single-column form (max-width 640px).

---

### Field 1 — Title
- Label: "What's the issue?"
- Placeholder: "e.g. Can't connect to VPN from home"
- Character counter (max 120) · required · min 5 chars

### Field 2 — Description
- Label: "Tell us more"
- Helper text: "Describe your issue — we'll figure out where to send it"
- Tall textarea (min 120px, auto-grows)
- Placeholder: "e.g. Since yesterday I can't log in to the VPN. I get error code 0x800..."

**↓ Intake Agent fires 400ms after typing stops, when length > 50 chars**

---

### AI Output Zone (below description, before next field)

**State A — AI loading:**
```
  ◌  Analysing your issue...
```

**State B — Category suggested (confidence ≥ 0.5):**
```
  ┌──────────────────────────────────────────────────────┐
  │  We think this is  [ IT · 92% ]   [Change ▾]         │
  └──────────────────────────────────────────────────────┘
```
- Clicking "Change" → inline dropdown to override
- Chip colour: blue (IT) · purple (HR) · green (Finance) · amber (Admin)

**State B2 — Low confidence (< 0.5):**
```
  ┌──────────────────────────────────────────────────────┐
  │  Not sure — does  [ IT ]  look right?  [Change ▾]    │
  └──────────────────────────────────────────────────────┘
```

**State C — Urgency nudge (AI detects urgency signals):**
```
  ┌──────────────────────────────────────────────────────┐
  │  ⚡  Sounds time-sensitive — consider marking High   │
  └──────────────────────────────────────────────────────┘
```
- Clicking the nudge → pre-selects High in urgency field · dismissable with ×

**State D — Self-service answer (AI confidence > 0.8):**
```
  ┌─────────────────────────────────────────────────────┐
  │  We think this answers your question                │
  │                                                     │
  │  "To reset your GlobalProtect VPN, open the         │
  │   client, click the gear icon, select Troubleshoot  │
  │   then Collect Logs. If that doesn't work, try..."  │
  │                                                     │
  │  [ This solved it — I don't need to submit ]        │
  │  [ My issue is different — continue ]               │
  └─────────────────────────────────────────────────────┘
```
- "This solved it" → dismisses form, redirects to dashboard with toast "Glad we could help!"
- "My issue is different" → collapses panel, form continues

**State E — AI failed / timed out:**
- Nothing shown — form continues normally, user picks department manually (silent failure)

---

### Field 3 — Department
- Label: "Route to"
- Dropdown: IT | HR | Finance | Admin
- Pre-selected from AI suggestion · user can always override

### Field 4 — Urgency
- Label: "How urgent is this?"
- 4-option segmented control (not a dropdown):
```
  [ Low ]  [ Medium ]  [ High ]  [ Critical ]
```
- Default: Medium
- CRITICAL warning inline:
```
  ⚠️  This will immediately notify all IT agents
```

### Field 5 — Attachments (optional)
- Drag-and-drop zone or "Browse" button
- Accepted: pdf, png, jpg, docx · max 10MB each
- Shows file list with × to remove
- Error inline if wrong type or too large

---

### Submit Flow

| State | Button Label | Behaviour |
|---|---|---|
| Ready | "Submit Ticket" | Enabled |
| AI checking | "Checking for similar tickets…" | Spinner, disabled (max 3s) |
| Duplicate found | — | Triggers Duplicate Warning Sheet |
| No duplicate | — | Submits immediately |
| Submitting | "Submitting…" | Spinner, disabled |
| Success | — | Toast "Ticket #TKT-0042 created" + redirect to `/tickets/:id` |

---

### Duplicate Warning Sheet (bottom sheet, slides up from bottom)

Trigger: AI finds similarity ≥ 0.6 on submit

```
┌────────────────────────────────────────────────────────────┐
│  We found similar tickets                          [×]     │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  TKT-0031 · RESOLVED            [Strong match]       │  │
│  │  VPN connection failing after Windows update         │  │
│  │  Resolved 3 days ago                                 │  │
│  │  "Updated the GlobalProtect client to v6.2…"        │  │
│  │                                          [View →]    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  TKT-0028 · IN PROGRESS         [Possible match]     │  │
│  │  Can't access company network remotely               │  │
│  │  Assigned to Sarah · IT — opened 2 days ago          │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  [ My issue is different — submit anyway ]                 │
│  [ Cancel — go back and edit ]                             │
└────────────────────────────────────────────────────────────┘
```

- "Strong match" badge (green): similarity ≥ 0.75
- "Possible match" badge (grey): 0.6–0.74
- "View →" opens ticket in new tab (employee reads full resolution)
- "Submit anyway" → submits + records `duplicateShown: true` on ticket

---

## Screen 4 — Ticket Detail (Employee View) `/tickets/:id`

**Purpose:** Track ticket, read agent replies, add context, reopen if needed.

**Layout:** Two-column desktop (≥1024px) · single-column stack on mobile.

### Left Panel — Ticket Info (320px)

```
  TKT-0042
  ─────────────────────────────────
  Can't connect to VPN from home

  Status:      [ IN PROGRESS ]
  Department:  [ IT ]
  Urgency:     [ HIGH ]
  Raised:      2 days ago
  Last update: 3 hours ago
  Assigned to: Sarah Chen
  ─────────────────────────────────
  Attachments
  • screenshot.png (320 KB)
```

- If status = CLOSED: **"Reopen this ticket"** button below meta info
- If status = RESOLVED: optional 👍 / 👎 CSAT row ("Was this helpful?")

### Right Panel — Conversation & Timeline

Timeline (oldest at top):
```
  ● Ticket raised by you                       2 days ago
  ● Assigned to Sarah Chen · IT                2 days ago
  ● Status changed to In Progress              2 days ago

  ╔══════════════════════════════════════════════════╗
  ║  Sarah Chen  ·  IT Support              3h ago   ║
  ║                                                  ║
  ║  Hi Alex, thanks for reaching out. Could you     ║
  ║  share the exact error code you're seeing?       ║
  ╚══════════════════════════════════════════════════╝

  ╔══════════════════════════════════════════════════╗
  ║  You                                    2h ago   ║
  ║  Error code 0x80004005, happens every morning.   ║
  ╚══════════════════════════════════════════════════╝
```

- Agent comments: left-aligned white card with avatar
- Employee comments: right-aligned muted background
- Internal notes: **never shown** to employee

**Add reply box:**
```
  ┌─────────────────────────────────────────┐
  │  Add more context or information...     │
  └─────────────────────────────────────────┘
  [ Attach file ]                [ Send ]
```

### Reopen Dialog (modal)

```
  ┌──────────────────────────────────────┐
  │  Reopen this ticket                  │
  │                                      │
  │  Why are you reopening it?           │
  │  ┌────────────────────────────────┐  │
  │  │  The issue came back after...  │  │
  │  └────────────────────────────────┘  │
  │  (required)                          │
  │                                      │
  │  [ Cancel ]   [ Reopen Ticket ]      │
  └──────────────────────────────────────┘
```

- "Reopen Ticket" disabled until textarea has content
- On confirm: status → OPEN, agent notified, reason logged in ticket history

---

## Screen 5 — Agent Queue `/agent/queue`

**Purpose:** Agent's primary work surface — find and claim tickets.

**Layout:** Full-width. Filter bar top, table below.

### Filter / Sort Bar

```
  [ All ]  [ IT ]  [ HR ]  [ Finance ]  [ Admin ]     Sort: Urgency ▾    Search...
```

- Department tabs shown only if agent covers multiple departments
- Sort: Urgency (default) | Date Created | Last Activity
- Search: filters by title or ticket ID

### Queue Table

| | # | Title | Dept | Urgency | Employee | Raised | Last Activity | Action |
|---|---|---|---|---|---|---|---|---|
| 🔴 | TKT-0051 | Can't access internal tools | IT | CRITICAL | Alex R. | 1h ago | 1h ago | **Claim** |
| | TKT-0048 | Expense report rejected | Finance | HIGH | Priya S. | 3h ago | 3h ago | **Claim** |
| | TKT-0044 | Need a new laptop mouse | IT | LOW | Tom W. | 2d ago | 5h ago | Sarah ⬤ |

**Row visual treatments:**
| Condition | Visual |
|---|---|
| CRITICAL | Red left border (4px) + pulsing 🔴 dot |
| HIGH | Orange left border (2px) |
| Stale > 48h | ⚠️ icon in Last Activity column |
| Claimed by me | "View →" (green) |
| Claimed by other | Agent avatar + tooltip "Assigned to Sarah" |
| Unassigned | "Claim" button (primary) |

Entire row is clickable → ticket detail

### Empty State
```
  ✅  Queue is clear
  "All tickets in this department are handled."
```

### Loading State
- 6 skeleton rows with shimmer

---

## Screen 6 — Ticket Detail (Agent View) `/agent/tickets/:id`

**Purpose:** Agent's primary working screen. Three panels.

**Layout:** Three-column desktop (≥1280px) · collapses to tab switcher on smaller screens.

---

### Left Panel — Ticket Info + Controls (280px)

**Status Transition Bar:**
```
  ● Open  →  ● In Progress  →  ○ Resolved  →  ○ Closed
```
- Completed steps: filled + dark
- Current step: filled + highlighted
- "Move to Resolved →" action button below bar

**Meta info (all inline-editable):**
```
  Urgency:     [ HIGH ▾ ]
  Department:  [ IT ]    Reassign →
  Assignee:    [ Sarah Chen ▾ ]
  Raised:      2 days ago
  In progress: 3 hours
  SLA:         🟡 4h remaining
  Escalated:   No
```

**Employee info card:**
```
  ┌──────────────────────────────┐
  │  Alex Raj                    │
  │  Engineering · Employee      │
  │  7 tickets total             │
  │  3 VPN-related               │
  └──────────────────────────────┘
```

**Auto-Triage note** (if agent ran):
```
  Auto-assigned — Alex has had 3 prior VPN
  tickets. Lowest workload agent selected.
```
Subtle grey box, collapsible.

---

### Middle Panel — Conversation

**Escalation Banner** (amber, appears if stale > 48h):
```
  ┌──────────────────────────────────────────────────────┐
  │  ⚠️  No activity for 52 hours                        │
  │                                                      │
  │  "Hi Alex, I wanted to follow up on your VPN        │
  │  issue. Could you confirm if the problem persists?" │
  │                                                      │
  │  [ Edit & Send ]                     [ Dismiss ]     │
  └──────────────────────────────────────────────────────┘
```
- AI-drafted message editable inline before sending
- Sending logs a comment + resets `lastActivityAt` + collapses banner

**Comment Thread:**
```
  ● Ticket raised by Alex Raj                  2 days ago
  ● Auto-assigned to Sarah Chen · IT           2 days ago
    Auto-assigned — lowest workload agent

  ╔════════════════════════════════════════════════╗
  ║  Sarah Chen  ·  IT Support           3h ago   ║
  ║                             AI-assisted        ║
  ║  Hi Alex, thanks for reaching out. Could you  ║
  ║  let me know which error code appears?         ║
  ╚════════════════════════════════════════════════╝

  ┌─  Internal Note  🔒  ──────────────────────────┐  ← amber bg
  │  Sarah Chen · 2h ago                           │
  │  Checked VPN logs — cert expiry issue.         │
  │  Will push a fix tonight.                      │
  └────────────────────────────────────────────────┘

  ╔════════════════════════════════════════════════╗
  ║  Alex Raj  (Employee)                1h ago   ║
  ║  Error code 0x80004005, every morning.         ║
  ╚════════════════════════════════════════════════╝
```

- Internal notes: amber background · lock icon · "Internal — visible to agents only" label
- AI-assisted badge: subtle, shown when `isAiDraft: true`

**Reply Composer (bottom):**
```
  ┌─────────────────────────────────────────────┐
  │  Reply to Employee  │  Internal Note         │  ← tabs
  ├─────────────────────────────────────────────┤
  │                                             │
  │  Type your reply…                           │
  │                                             │
  └─────────────────────────────────────────────┘
  [ ✨ Generate Draft ]   [ Attach ]   [ Send Reply ]
```

**After "Generate Draft" clicked:**
1. Button: spinner + "Generating…" (max 5s)
2. Draft text streams into textarea
3. Agent Assist panel appears above composer:

```
  ┌────────────────────────────────────────────────────────┐
  │  ✨ AI Suggestion                                      │
  │                                                        │
  │  Suggested action:  [ Request More Info ]              │
  │  "Missing the exact error code from the employee"      │
  │                                                        │
  │  ⚠️  SLA breached by 2h — prioritise this response    │
  │                                                        │
  │  Employee has had 3 VPN tickets this month             │
  └────────────────────────────────────────────────────────┘
```

Action chip colours: Resolve (green) · Needs Info (blue) · Escalate (red) · Schedule Call (purple)

**Internal Note tab:**
- Amber-tinted textarea background
- Placeholder: "Add a note for your team…"
- Button: "Add Internal Note"
- No AI draft available on this tab

---

### Right Panel — Similar Tickets Sidebar (280px)

```
  Similar resolved tickets
  ─────────────────────────────────────
  ┌───────────────────────────────────┐
  │  TKT-0031 · RESOLVED              │
  │  VPN cert expiry causing failure  │
  │  Resolved in 4h · 3 days ago      │
  │  "Renewed cert via IT portal…"   │
  └───────────────────────────────────┘

  ┌───────────────────────────────────┐
  │  TKT-0019 · RESOLVED              │
  │  GlobalProtect VPN timeout        │
  │  Resolved in 2h · 2 weeks ago     │
  │  "Rollback to v6.1 fixed it"      │
  └───────────────────────────────────┘
```

- Fetched on page load using ticket description + category
- Collapses to "2 similar tickets ▾" toggle on < 1280px

### Reassign Dialog

```
  ┌──────────────────────────────────────┐
  │  Reassign ticket                     │
  │                                      │
  │  Route to:    [ HR ▾ ]               │
  │                                      │
  │  Why are you reassigning this?       │
  │  ┌────────────────────────────────┐  │
  │  │  This is a payroll issue...    │  │
  │  └────────────────────────────────┘  │
  │  (required)                          │
  │                                      │
  │  [ Cancel ]      [ Reassign ]        │
  └──────────────────────────────────────┘
```

---

## Screen 7 — Admin Analytics Dashboard `/admin/dashboard`

**Purpose:** Full operational picture across all departments.

**Layout:** Full-width responsive grid.

### Top Bar
```
  Analytics Dashboard       [ Last 30 days ▾ ]  [ All Depts ▾ ]  [ Export CSV ]
```

### AI Insights Card (first on page)

```
  ┌──────────────────────────────────────────────────────────────────────────┐
  │  ✨ AI Insights  ·  Updated 5 min ago                            [ ↻ ]  │
  │                                                                          │
  │  IT ticket volume up 40% this week, driven by VPN issues.               │
  │  Finance resolution time improved 30% over the same period.              │
  │                                                                          │
  │  ┌────────────────────────────────────────────────────────────────────┐  │
  │  │  📈  Anomaly — VPN ticket spike                                    │  │
  │  │  23 VPN tickets this week vs 14-week average of 16                 │  │
  │  │  → Consider posting a VPN status update or self-service guide      │  │
  │  └────────────────────────────────────────────────────────────────────┘  │
  │  ┌────────────────────────────────────────────────────────────────────┐  │
  │  │  ✅  Win — Finance response time improving                         │  │
  │  │  Avg resolution down from 18h to 12h over 2 weeks                  │  │
  │  └────────────────────────────────────────────────────────────────────┘  │
  │  ┌────────────────────────────────────────────────────────────────────┐  │
  │  │  🚧  Bottleneck — James Liu has 8 stalled tickets                  │  │
  │  │  Average age 61h. Consider redistributing workload.                │  │
  │  └────────────────────────────────────────────────────────────────────┘  │
  └──────────────────────────────────────────────────────────────────────────┘
```

- Loading: skeleton card with 3 skeleton lines
- Cached 1h · "↻" forces refresh
- Insight type icons: 📈 Anomaly · ✅ Win · 🚧 Bottleneck · 📉 Trend

### KPI Cards Row

```
  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │  Open    │  │ In Prog. │  │ Resolved │  │ Avg Res. │  │ Critical │
  │   14     │  │    8     │  │  Today 6 │  │  10.4h   │  │  Unattn 2│
  │  ↑ +3    │  │  ↓ -2    │  │          │  │  ↓ -2h   │  │  🔴      │
  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘
```

- Trend arrow vs. previous period
- "Critical Unattended" card turns red if > 0 · links to queue filtered by CRITICAL

### Charts Row 1 (2/3 + 1/3 split)

**Volume Bar Chart (left):**
- X-axis: dates · Y-axis: ticket count
- Grouped bars by department (colour-coded)
- Hover tooltip: date + per-dept breakdown

**Status Donut Chart (right):**
- Segments: OPEN (blue) · IN_PROGRESS (amber) · RESOLVED (green) · CLOSED (grey)
- Centre label: total active tickets

### Charts Row 2 (2/3 + 1/3 split)

**Trend Line Chart (left):**
- 3 lines: Open · Resolved · In Progress
- Hover: vertical line + tooltip with all 3 values

**Resolution Histogram (right):**
- X-axis buckets: < 1h · 1–4h · 4–24h · 1–3d · > 3d
- Hover: count + percentage of total

### Needs Attention Table

```
  Needs Attention
  ───────────────────────────────────────────────────────────────
  Ticket         Dept     Assigned To    Status        Last Act.
  ───────────────────────────────────────────────────────────────
  TKT-0041  🔴   IT       James Liu      In Progress   72h ago  [View]
  TKT-0037        HR      Unassigned     Open          48h ago  [View]
  ───────────────────────────────────────────────────────────────
```

- Sorted by last activity ascending (most stale first)
- 🔴 = escalated flag

### Agent Leaderboard

```
  Agent Performance — Last 30 days
  ─────────────────────────────────────────────
  Agent           Dept       Resolved   Avg Time
  ─────────────────────────────────────────────
  Sarah Chen      IT         24         6.2h
  Priya Sharma    Finance    18         8.1h
  James Liu       IT         11         14.3h  ⚠️
  ─────────────────────────────────────────────
```

- ⚠️ shown when avg resolution > 2× department average

---

## Screen 8 — Admin All Tickets `/admin/tickets`

**Purpose:** Full ticket list across all departments — admin can see and act on any ticket.

Same layout as agent queue with:
- All departments visible by default (no dept restriction)
- Extra columns: Employee, Submitted Dept
- Filters: Status · Department · Urgency · Assignee · Date range · Search
- Actions per row: View · Reassign

---

## Screen 9 — Admin User Management `/admin/users`

**Purpose:** Create and manage all user accounts.

**Layout:** Table + "Add User" button (top right).

**Table columns:** Name · Email · Role · Departments · Status · Created · Actions

**Actions per row:** Edit (pencil) · Deactivate / Activate (toggle)

### Create / Edit User Dialog

```
  ┌──────────────────────────────────────────┐
  │  Add New User                            │
  │                                          │
  │  Name          [ Alex Raj            ]   │
  │  Email         [ alex@company.com    ]   │
  │  Password      [ ●●●●●●●●            ]   │  ← create only
  │  Role          [ Agent ▾             ]   │
  │                                          │
  │  Departments   ← shown only for Agent    │
  │  ☑ IT  ☐ HR  ☐ Finance  ☐ Admin          │
  │                                          │
  │  [ Cancel ]        [ Save User ]         │
  └──────────────────────────────────────────┘
```

- Departments multiselect only visible when Role = AGENT
- Password hidden on Edit (only on Create)
- Inline validation: email format, required fields

---

## Notification Types & Copy

| Type | Title | Body |
|---|---|---|
| TICKET_CREATED | "New ticket in your queue" | "Alex raised TKT-0051 — VPN issue · CRITICAL" |
| TICKET_ASSIGNED | "Ticket assigned to you" | "TKT-0048 has been assigned to you" |
| TICKET_STATUS_CHANGED | "Your ticket was updated" | "TKT-0042 moved to Resolved" |
| TICKET_COMMENT_ADDED | "New reply on your ticket" | "Sarah replied to TKT-0042" |
| TICKET_ESCALATED | "Ticket escalated" | "TKT-0041 escalated — no activity for 72h" |
| TICKET_REASSIGNED | "Ticket reassigned" | "TKT-0042 moved to HR by Sarah" |
| TICKET_REOPENED | "Ticket reopened" | "Alex reopened TKT-0042" |

---

## Empty & Error States

| Scenario | Treatment |
|---|---|
| No tickets (employee) | Illustration + "Raise your first ticket" CTA |
| Empty queue (agent) | ✅ icon + "Queue is clear" |
| No notifications | "You're all caught up" in dropdown |
| Charts loading | Skeleton bars/circles with shimmer |
| AI Insights loading | Skeleton card with 3 lines |
| Table loading | 5–6 skeleton rows |
| API error | Inline red banner + Retry button |
| 404 ticket | "This ticket doesn't exist or you don't have access" |
| Session expired | Redirect to `/login` + "Your session expired, please sign in again" toast |

---

## Responsive Behaviour

| Breakpoint | Change |
|---|---|
| < 768px (mobile) | Sidebar collapses to bottom nav bar (4 icons) |
| < 768px (agent detail) | 3 panels → tab switcher: Info · Conversation · Similar |
| < 1024px (admin charts) | Charts stack vertically full-width |
| < 1024px (new ticket) | AI Output Zone stays inline; bottom sheet becomes full-screen overlay |
| All widths | Duplicate Warning Sheet is always a bottom sheet, never a modal |

---

## Interaction Micro-details

| Interaction | Feedback |
|---|---|
| Claim ticket | Button → spinner "Claiming…" → disappears; row updates with agent avatar |
| Send reply | Send button spinner → comment appears in thread as "Sending…" → fades to normal |
| Mark notification read | Row fades to muted, unread count decrements |
| Category chip override | Dropdown opens inline; chip colour updates instantly on selection |
| Urgency nudge — accept | Urgency field pre-selects with brief highlight flash |
| Generate Draft | Textarea fades in with text streaming in word by word |
| Escalation banner send | Banner slides up and collapses; new comment appears in thread |
| Status transition | Step bar animates to next step; meta info updates without page reload |
| Reopen confirm | Modal closes; status badge animates CLOSED → OPEN; agent gets bell notification |
| Self-service accept | Form fades out; redirect to dashboard with "Glad we could help!" toast |
