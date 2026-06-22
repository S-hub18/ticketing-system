import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { Role } from '@/generated/prisma/client'

export async function GET() {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const users = await prisma.user.findMany({
    include: { agentDepartments: true },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(users.map(u => ({ ...u, passwordHash: undefined })))
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session || (session.user as any)?.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { name, email, password, role, departments } = await req.json()
  if (!name || !email || !password || !role) return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: {
      name, email, passwordHash, role: role as Role,
      agentDepartments: role === 'AGENT' && departments?.length ? { create: departments.map((d: string) => ({ department: d as any })) } : undefined,
    },
    include: { agentDepartments: true },
  })
  return NextResponse.json({ ...user, passwordHash: undefined }, { status: 201 })
}
