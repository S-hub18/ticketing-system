import { config } from 'dotenv'
import { existsSync } from 'fs'
import { resolve } from 'path'
// .env.local overrides .env (Next.js convention)
const envLocal = resolve(process.cwd(), '.env.local')
if (existsSync(envLocal)) config({ path: envLocal, override: true })
config()

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })
const hash = (p: string) => bcrypt.hash(p, 12)

const HOUR = 3600000
const DAY = 86400000
// `daysAgo(2, 5)` → 2 days and 5 hours before now
const daysAgo = (d: number, h = 0) => new Date(Date.now() - d * DAY - h * HOUR)
const hoursAgo = (h: number) => new Date(Date.now() - h * HOUR)

async function main() {
  console.log('Seeding...')

  await prisma.agentRun.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.ticketHistory.deleteMany()
  await prisma.ticketComment.deleteMany()
  await prisma.ticket.deleteMany()
  await prisma.agentDepartment.deleteMany()
  await prisma.user.deleteMany()

  const emp = await prisma.user.create({ data: { name: 'Alex Raj', email: 'employee@company.com', passwordHash: await hash('password123'), role: 'EMPLOYEE' } })
  const emp2 = await prisma.user.create({ data: { name: 'Priya Singh', email: 'employee2@company.com', passwordHash: await hash('password123'), role: 'EMPLOYEE' } })
  const itA = await prisma.user.create({ data: { name: 'Sarah Chen', email: 'it-agent@company.com', passwordHash: await hash('password123'), role: 'AGENT', agentDepartments: { create: [{ department: 'IT' }] } } })
  const itA2 = await prisma.user.create({ data: { name: 'James Liu', email: 'it-agent2@company.com', passwordHash: await hash('password123'), role: 'AGENT', agentDepartments: { create: [{ department: 'IT' }] } } })
  const hrA = await prisma.user.create({ data: { name: 'Priya Sharma', email: 'hr-agent@company.com', passwordHash: await hash('password123'), role: 'AGENT', agentDepartments: { create: [{ department: 'HR' }] } } })
  await prisma.user.create({ data: { name: 'Tom Wilson', email: 'finance-agent@company.com', passwordHash: await hash('password123'), role: 'AGENT', agentDepartments: { create: [{ department: 'FINANCE' }] } } })
  await prisma.user.create({ data: { name: 'Maria Santos', email: 'admin-agent@company.com', passwordHash: await hash('password123'), role: 'AGENT', agentDepartments: { create: [{ department: 'ADMIN' }] } } })
  await prisma.user.create({ data: { name: 'Admin User', email: 'admin@company.com', passwordHash: await hash('password123'), role: 'ADMIN' } })

  const t1 = await prisma.ticket.create({ data: { title: "Can't connect to VPN from home", description: 'I get error code 0x80004005. Blocking my work completely.', status: 'IN_PROGRESS', urgency: 'HIGH', department: 'IT', createdById: emp.id, assignedToId: itA.id, aiCategory: 'VPN Access', aiCategoryConf: 0.92, createdAt: daysAgo(2), lastActivityAt: hoursAgo(3) } })
  await prisma.ticketComment.create({ data: { ticketId: t1.id, authorId: itA.id, body: 'Hi Alex, could you share which error code appears and which VPN client version?', isAiDraft: true } })
  await prisma.ticketComment.create({ data: { ticketId: t1.id, authorId: emp.id, body: 'Error code 0x80004005, happens every morning. Using GlobalProtect v5.2.' } })
  await prisma.ticketComment.create({ data: { ticketId: t1.id, authorId: itA.id, body: 'Checked VPN logs — cert expiry issue. Will push a fix tonight.', isInternal: true } })
  await prisma.ticketHistory.createMany({ data: [{ ticketId: t1.id, changedById: emp.id, field: 'status', newValue: 'OPEN' }, { ticketId: t1.id, changedById: itA.id, field: 'status', oldValue: 'OPEN', newValue: 'IN_PROGRESS', note: 'Auto-assigned — lowest workload agent' }] })

  await prisma.ticket.create({ data: { title: 'Expense report rejected without explanation', description: 'My expense report was rejected with no explanation.', status: 'OPEN', urgency: 'MEDIUM', department: 'FINANCE', createdById: emp2.id, createdAt: daysAgo(1), lastActivityAt: hoursAgo(5) } })
  await prisma.ticket.create({ data: { title: 'Need a new laptop — current one is 5 years old', description: 'My laptop is extremely slow and causing daily productivity issues.', status: 'OPEN', urgency: 'LOW', department: 'IT', createdById: emp.id, createdAt: daysAgo(5), lastActivityAt: daysAgo(3) } })
  await prisma.ticket.create({ data: { title: 'Cannot access internal HR portal', description: 'Unable to access HR portal for 3 days. Need to update emergency contact urgently.', status: 'OPEN', urgency: 'CRITICAL', department: 'IT', createdById: emp2.id, createdAt: hoursAgo(4), lastActivityAt: hoursAgo(1) } })
  const t5 = await prisma.ticket.create({ data: { title: 'Payroll discrepancy in last month salary', description: 'My salary was lower than expected due to overtime calculation error.', status: 'RESOLVED', urgency: 'HIGH', department: 'HR', createdById: emp.id, assignedToId: hrA.id, createdAt: daysAgo(4), resolvedAt: daysAgo(2), lastActivityAt: daysAgo(2) } })
  await prisma.ticketComment.create({ data: { ticketId: t5.id, authorId: hrA.id, body: 'The overtime calculation was incorrect. A correction has been processed for next month.' } })
  await prisma.ticket.create({ data: { title: 'Request for remote work equipment allowance', description: 'Need approval for standing desk and monitor for home office.', status: 'CLOSED', urgency: 'LOW', department: 'ADMIN', createdById: emp2.id, createdAt: daysAgo(8), resolvedAt: daysAgo(6), closedAt: daysAgo(5), lastActivityAt: daysAgo(5) } })
  await prisma.ticket.create({ data: { title: 'Software license renewal — Adobe Creative Suite', description: 'License expires in 2 weeks. Urgent approval needed.', status: 'IN_PROGRESS', urgency: 'HIGH', department: 'IT', createdById: emp.id, assignedToId: itA2.id, createdAt: daysAgo(3), lastActivityAt: daysAgo(2) } })

  // Spread of mostly-resolved tickets across the last few weeks — drives the volume,
  // trend, resolution-histogram charts and the agent leaderboard.
  const itAgents = [itA.id, itA2.id]
  for (let i = 0; i < 8; i++) {
    const resolved = i < 6
    const createdAt = daysAgo(2 + i * 3, i * 2) // spread from ~2 to ~23 days ago
    const resolutionHours = [0.5, 3, 6, 18, 40, 80][i] ?? 6 // fills every histogram bucket
    await prisma.ticket.create({ data: {
      title: 'VPN connection dropping #' + (i + 1),
      description: 'VPN drops during video calls.',
      status: resolved ? 'RESOLVED' : 'OPEN',
      urgency: i % 3 === 0 ? 'HIGH' : 'MEDIUM',
      department: 'IT',
      createdById: i % 2 === 0 ? emp.id : emp2.id,
      assignedToId: resolved ? itAgents[i % 2] : undefined,
      createdAt,
      resolvedAt: resolved ? new Date(createdAt.getTime() + resolutionHours * HOUR) : undefined,
      lastActivityAt: resolved ? new Date(createdAt.getTime() + resolutionHours * HOUR) : createdAt,
    } })
  }

  await prisma.notification.createMany({ data: [
    { userId: emp.id, ticketId: t1.id, type: 'TICKET_ASSIGNED', title: 'Ticket assigned to agent', body: 'Your VPN issue has been assigned to Sarah Chen' },
    { userId: emp.id, ticketId: t1.id, type: 'TICKET_COMMENT_ADDED', title: 'New reply on your ticket', body: 'Sarah replied to your VPN issue' },
    { userId: itA.id, ticketId: t1.id, type: 'TICKET_CREATED', title: 'New ticket in your queue', body: 'Alex raised a HIGH priority ticket: VPN issue' },
  ]})

  console.log('Seed complete!')
  console.log('  employee@company.com / password123')
  console.log('  it-agent@company.com / password123')
  console.log('  hr-agent@company.com / password123')
  console.log('  finance-agent@company.com / password123')
  console.log('  admin@company.com / password123')
}

main().catch(console.error).finally(() => prisma.$disconnect())
