import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')
  const user = session.user as { role: string; name?: string | null; email?: string | null }
  return (
    <AppShell role={user.role} user={{ name: user.name, email: user.email }}>
      {children}
    </AppShell>
  )
}
