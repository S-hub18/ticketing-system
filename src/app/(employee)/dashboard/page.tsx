import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { EmployeeDashboardClient } from '@/features/employee/components/EmployeeDashboardClient';

export default async function DashboardPage() {
  const session = await auth();
  if (!session) redirect('/login');

  const tickets = await prisma.ticket.findMany({
    where: { createdById: session.user.id },
    include: {
      assignedTo: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const serialized = tickets.map((t) => ({
    id: t.id,
    title: t.title,
    department: t.department,
    urgency: t.urgency,
    status: t.status,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    assignedTo: t.assignedTo ? { name: t.assignedTo.name } : null,
  }));

  return <EmployeeDashboardClient tickets={serialized} />;
}
