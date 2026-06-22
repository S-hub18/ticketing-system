import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function Home() {
  const session = await auth()
  if (!session) redirect('/login')
  const role = (session.user as any)?.role
  if (role === 'ADMIN') redirect('/admin/dashboard')
  if (role === 'AGENT') redirect('/agent/queue')
  redirect('/dashboard')
}
