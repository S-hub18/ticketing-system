interface AgentRow {
  agentId: string
  name: string
  department: string | null
  resolvedCount: number
  avgResolutionHours: number
}

interface AgentLeaderboardProps {
  data: AgentRow[]
}

function deptAvgHours(data: AgentRow[]): Record<string, number> {
  const deptMap: Record<string, { total: number; count: number }> = {}
  for (const row of data) {
    const dept = row.department ?? 'UNKNOWN'
    if (!deptMap[dept]) deptMap[dept] = { total: 0, count: 0 }
    deptMap[dept].total += row.avgResolutionHours
    deptMap[dept].count += 1
  }
  const result: Record<string, number> = {}
  for (const [dept, { total, count }] of Object.entries(deptMap)) {
    result[dept] = count > 0 ? total / count : 0
  }
  return result
}

export function AgentLeaderboard({ data }: AgentLeaderboardProps) {
  const deptAvg = deptAvgHours(data)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#e7e5e4]">
            <th className="text-left py-2 px-3 text-xs font-semibold text-[#78716c] w-6">#</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-[#78716c]">Agent</th>
            <th className="text-left py-2 px-3 text-xs font-semibold text-[#78716c]">Dept</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-[#78716c]">Resolved</th>
            <th className="text-right py-2 px-3 text-xs font-semibold text-[#78716c]">Avg Time</th>
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-sm text-[#a8a29e]">
                No agent data for this period.
              </td>
            </tr>
          ) : (
            data.map((row, index) => {
              const dept = row.department ?? 'UNKNOWN'
              const avg = deptAvg[dept] ?? 0
              const isSlow = avg > 0 && row.avgResolutionHours > avg * 2
              return (
                <tr
                  key={row.agentId}
                  className="border-b border-[#f5f5f4] hover:bg-[#fafaf9] transition-colors"
                >
                  <td className="py-2.5 px-3 text-xs text-[#a8a29e]">{index + 1}</td>
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-[#0c0a09]">{row.name}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="text-xs text-[#78716c]">{row.department ?? '—'}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-[#0c0a09]">
                    {row.resolvedCount}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span
                      className={`text-sm font-medium ${
                        isSlow ? 'text-amber-600' : 'text-[#44403c]'
                      }`}
                    >
                      {row.avgResolutionHours}h
                      {isSlow && (
                        <span className="ml-1 text-amber-500" title="2× slower than dept average">
                          ⚠️
                        </span>
                      )}
                    </span>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
