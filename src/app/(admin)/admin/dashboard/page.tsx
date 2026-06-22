import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SummaryCards } from '@/features/admin/components/SummaryCards'
import { AgentLeaderboard } from '@/features/admin/components/AgentLeaderboard'
import { AdminDashboardClient } from '@/features/admin/components/AdminDashboardClient'
import { InsightsAgentResult } from '@/types/index'
import { getAnalytics } from '@/lib/analytics'

async function fetchInsights(cookie: string): Promise<InsightsAgentResult | null> {
  try {
    const res = await fetch(
      `${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/api/ai/insights`,
      { cache: 'no-store', headers: { cookie } },
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3_600_000)
  const d = Math.floor(h / 24)
  if (d > 0) return `${d}d ago`
  if (h > 0) return `${h}h ago`
  return 'just now'
}

interface SearchParams {
  days?: string
  dept?: string
}

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'ADMIN') redirect('/dashboard')

  const sp = await searchParams
  const days = Math.min(Math.max(parseInt(sp.days ?? '30', 10) || 30, 1), 365)
  const dept = sp.dept && ['IT', 'HR', 'FINANCE', 'ADMIN'].includes(sp.dept) ? sp.dept : undefined

  const cookie = (await headers()).get('cookie') ?? ''
  const [analytics, insights] = await Promise.all([getAnalytics(days, dept), fetchInsights(cookie)])

  const summary = analytics.summary

  return (
    <div className="px-6 py-6 space-y-6 max-w-screen-xl mx-auto">

        {/* Header row: filters + export */}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-lg font-semibold text-[#0c0a09] flex-1 min-w-0">
            Analytics Dashboard
          </h1>

          {/* Date range filter */}
          <form method="GET" className="flex items-center gap-2">
            {dept && <input type="hidden" name="dept" value={dept} />}
            <label className="text-xs text-[#78716c]">Last</label>
            <select
              name="days"
              defaultValue={String(days)}
              className="text-xs border border-[#e7e5e4] rounded-md px-2 py-1.5 bg-white text-[#0c0a09] focus:outline-none focus:ring-2 focus:ring-[#292524]"
            >
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>

            {/* Dept filter */}
            <select
              name="dept"
              defaultValue={dept ?? ''}
              className="text-xs border border-[#e7e5e4] rounded-md px-2 py-1.5 bg-white text-[#0c0a09] focus:outline-none focus:ring-2 focus:ring-[#292524]"
            >
              <option value="">All Depts</option>
              <option value="IT">IT</option>
              <option value="HR">HR</option>
              <option value="FINANCE">Finance</option>
              <option value="ADMIN">Admin</option>
            </select>

            <button
              type="submit"
              className="text-xs bg-[#292524] text-white px-3 py-1.5 rounded-md hover:bg-[#44403c] transition-colors"
            >
              Apply
            </button>
          </form>

          {/* Export CSV */}
          <a
            href={`/api/admin/analytics/export${dept ? `?dept=${dept}` : ''}`}
            className="text-xs border border-[#e7e5e4] rounded-md px-3 py-1.5 bg-white text-[#0c0a09] hover:bg-[#f5f5f4] transition-colors"
          >
            Export CSV
          </a>
        </div>

        {/* KPI summary cards */}
        <SummaryCards
          data={{
            open: summary.open,
            inProgress: summary.inProgress,
            resolvedToday: summary.resolvedToday,
            criticalUnattended: summary.criticalUnattended,
            avgResolutionHours: summary.avgResolutionHours,
          }}
          trends={analytics.trends}
        />

        {/* AI Insights — client component handles refresh */}
        <AdminDashboardClient
          initialInsights={insights ?? undefined}
          volumeByDay={analytics.volumeByDay}
          statusBreakdown={analytics.statusBreakdown}
          trendByDay={analytics.trendByDay}
          resolutionHistogram={analytics.resolutionHistogram}
        />

        {/* Stale tickets table */}
        {analytics.staleTickets.length > 0 && (
          <Card className="border border-[#e7e5e4] shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-[#0c0a09]">
                Stale Tickets{' '}
                <span className="text-[#a8a29e] font-normal">
                  (no activity &gt; 48h)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e7e5e4]">
                      <th className="text-left py-2 px-4 text-xs font-semibold text-[#78716c]">Ticket</th>
                      <th className="text-left py-2 px-4 text-xs font-semibold text-[#78716c]">Dept</th>
                      <th className="text-left py-2 px-4 text-xs font-semibold text-[#78716c]">Assigned</th>
                      <th className="text-left py-2 px-4 text-xs font-semibold text-[#78716c]">Status</th>
                      <th className="text-left py-2 px-4 text-xs font-semibold text-[#78716c]">Last Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.staleTickets.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-[#f5f5f4] hover:bg-[#fafaf9] transition-colors"
                      >
                        <td className="py-2.5 px-4">
                          <Link
                            href={`/admin/tickets/${t.id}`}
                            className="text-[#0c0a09] font-medium hover:underline line-clamp-1"
                          >
                            {t.title}
                          </Link>
                          {t.isEscalated && (
                            <span className="ml-2 text-[10px] text-red-500 font-semibold">ESCALATED</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-[#78716c]">{t.dept}</td>
                        <td className="py-2.5 px-4 text-xs text-[#78716c]">
                          {t.assignedTo ?? <span className="text-[#a8a29e]">Unassigned</span>}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-[#78716c]">{t.status}</td>
                        <td className="py-2.5 px-4 text-xs text-[#a8a29e]">
                          {formatRelative(t.lastActivityAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agent leaderboard */}
        <Card className="border border-[#e7e5e4] shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-[#0c0a09]">Agent Leaderboard</CardTitle>
          </CardHeader>
          <CardContent className="p-0 pb-2">
            <AgentLeaderboard data={analytics.agentLeaderboard} />
          </CardContent>
        </Card>

      </div>
  )
}
