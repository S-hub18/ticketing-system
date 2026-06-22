import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { AdminUsersClient } from '@/features/admin/components/AdminUsersClient'

export default async function AdminUsersPage() {
  const session = await auth()
  if (!session) redirect('/login')
  if ((session.user as any).role !== 'ADMIN') redirect('/dashboard')

  const users = await prisma.user.findMany({
    include: { agentDepartments: true },
    orderBy: { createdAt: 'asc' },
  })

  const sanitized = users.map(({ passwordHash: _ph, ...rest }) => ({
    ...rest,
    agentDepartments: rest.agentDepartments,
  }))

  const ROLE_COLORS: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-700 border-red-200',
    AGENT: 'bg-blue-100 text-blue-700 border-blue-200',
    EMPLOYEE: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  function formatDate(d: Date): string {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="px-6 py-6 space-y-4 max-w-screen-lg mx-auto">

        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-[#0c0a09] flex-1">Users</h1>
          <AdminUsersClient mode="add-button" users={[]} />
        </div>

        <Card className="border border-[#e7e5e4] shadow-none">
          <CardContent className="p-0">
            {sanitized.length === 0 ? (
              <div className="py-16 text-center text-sm text-[#a8a29e]">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#e7e5e4]">
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#78716c]">Name</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#78716c]">Email</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#78716c]">Role</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#78716c]">Departments</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#78716c]">Status</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#78716c]">Created</th>
                      <th className="text-left py-2.5 px-4 text-xs font-semibold text-[#78716c]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sanitized.map((user) => (
                      <tr
                        key={user.id}
                        className="border-b border-[#f5f5f4] hover:bg-[#fafaf9] transition-colors"
                      >
                        <td className="py-2.5 px-4 font-medium text-[#0c0a09] whitespace-nowrap">
                          {user.name}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-[#78716c]">{user.email}</td>
                        <td className="py-2.5 px-4">
                          <Badge
                            variant="outline"
                            className={`text-xs px-2 py-0.5 ${ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}
                          >
                            {user.role}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-4 text-xs text-[#78716c]">
                          {user.agentDepartments.length > 0
                            ? user.agentDepartments.map((d) => d.department).join(', ')
                            : <span className="text-[#a8a29e]">—</span>}
                        </td>
                        <td className="py-2.5 px-4">
                          {/* Active/Inactive toggle — client component */}
                          <AdminUsersClient
                            mode="toggle"
                            userId={user.id}
                            isActive={user.isActive}
                            users={[]}
                          />
                        </td>
                        <td className="py-2.5 px-4 text-xs text-[#a8a29e] whitespace-nowrap">
                          {formatDate(user.createdAt)}
                        </td>
                        <td className="py-2.5 px-4">
                          <AdminUsersClient
                            mode="edit-button"
                            userId={user.id}
                            editUser={{
                              id: user.id,
                              name: user.name,
                              email: user.email,
                              role: user.role,
                              isActive: user.isActive,
                              departments: user.agentDepartments.map((d) => d.department),
                            }}
                            users={[]}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  )
}
