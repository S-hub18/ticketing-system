import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Role } from '@/generated/prisma/client'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { id } = await params
  const { name, email, role, isActive, departments } = await req.json()
  const updates: any = {}
  if (name) updates.name = name
  if (email) updates.email = email
  if (role) updates.role = role as Role
  if (isActive !== undefined) updates.isActive = isActive
  if (departments !== undefined && role === 'AGENT') {
    await prisma.agentDepartment.deleteMany({ where: { agentId: id } })
    updates.agentDepartments = { create: departments.map((d: string) => ({ department: d as any })) }
  }
  const user = await prisma.user.update({ where: { id }, data: updates, include: { agentDepartments: true } })
  return NextResponse.json({ ...user, passwordHash: undefined })
}
