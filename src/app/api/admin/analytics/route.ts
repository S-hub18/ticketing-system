import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAnalytics } from '@/lib/analytics'

const DEPARTMENTS = ['IT', 'HR', 'FINANCE', 'ADMIN'] as const

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const days = Math.min(Math.max(parseInt(searchParams.get('days') ?? '30', 10) || 30, 1), 365)
  const deptParam = searchParams.get('dept') ?? undefined
  const dept =
    deptParam && (DEPARTMENTS as readonly string[]).includes(deptParam) ? deptParam : undefined

  const data = await getAnalytics(days, dept)
  return NextResponse.json(data)
}
