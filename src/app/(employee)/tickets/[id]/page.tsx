import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { TicketDetailClient } from '@/features/employee/components/TicketDetailClient';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TicketDetailPage({ params }: Props) {
  const session = await auth();
  if (!session) redirect('/login');

  const { id } = await params;

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      comments: {
        where: { isInternal: false },
        include: { author: { select: { id: true, name: true, email: true, role: true } } },
        orderBy: { createdAt: 'asc' },
      },
      history: {
        include: { changedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!ticket) notFound();

  // Employees may only view their own tickets
  if (session.user.role === 'EMPLOYEE' && ticket.createdById !== session.user.id) {
    notFound();
  }

  const serialized = {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    urgency: ticket.urgency,
    department: ticket.department,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
    resolvedAt: ticket.resolvedAt?.toISOString() ?? null,
    closedAt: ticket.closedAt?.toISOString() ?? null,
    createdBy: ticket.createdBy,
    assignedTo: ticket.assignedTo,
    comments: ticket.comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt.toISOString(),
      author: {
        id: c.author.id,
        name: c.author.name,
        email: c.author.email,
        role: (c.author as { role: string }).role,
      },
    })),
    history: ticket.history.map((h) => ({
      id: h.id,
      field: h.field,
      oldValue: h.oldValue,
      newValue: h.newValue,
      createdAt: h.createdAt.toISOString(),
      changedBy: h.changedBy,
    })),
  };

  return <TicketDetailClient ticket={serialized} currentUserId={session.user.id} />;
}
