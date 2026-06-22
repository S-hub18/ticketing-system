import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape a value for CSV: wrap in quotes and double-up any internal quotes */
function csvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(values: (string | number | null | undefined)[]): string {
  return values.map(csvCell).join(',');
}

function isoOrEmpty(d: Date | null | undefined): string {
  return d ? d.toISOString() : '';
}

// ---------------------------------------------------------------------------
// GET /api/admin/analytics/export
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  // --- Auth ---
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
  }
  if (session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // --- Query params ---
  const { searchParams } = new URL(req.url);
  const startDateParam = searchParams.get('startDate');
  const endDateParam = searchParams.get('endDate');
  const deptParam = searchParams.get('dept');

  const startDate = startDateParam ? new Date(startDateParam) : undefined;
  const endDate = endDateParam ? new Date(endDateParam) : undefined;

  const deptFilter =
    deptParam && ['IT', 'HR', 'FINANCE', 'ADMIN'].includes(deptParam)
      ? (deptParam as 'IT' | 'HR' | 'FINANCE' | 'ADMIN')
      : undefined;

  // Validate dates when provided
  if (startDate && isNaN(startDate.getTime())) {
    return NextResponse.json({ error: 'Invalid startDate' }, { status: 400 });
  }
  if (endDate && isNaN(endDate.getTime())) {
    return NextResponse.json({ error: 'Invalid endDate' }, { status: 400 });
  }

  // Build where clause
  const where: Record<string, unknown> = {};
  if (deptFilter) where.department = deptFilter;
  if (startDate || endDate) {
    const createdAt: Record<string, Date> = {};
    if (startDate) createdAt.gte = startDate;
    if (endDate) {
      // Make endDate inclusive by advancing to end of that day
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      createdAt.lte = end;
    }
    where.createdAt = createdAt;
  }

  // --- Fetch tickets ---
  const tickets = await prisma.ticket.findMany({
    where,
    select: {
      id: true,
      title: true,
      department: true,
      status: true,
      urgency: true,
      createdBy: { select: { name: true } },
      assignedTo: { select: { name: true } },
      createdAt: true,
      resolvedAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  // --- Build CSV ---
  const header = csvRow([
    'ID',
    'Title',
    'Department',
    'Status',
    'Urgency',
    'CreatedBy',
    'AssignedTo',
    'CreatedAt',
    'ResolvedAt',
    'UpdatedAt',
  ]);

  const rows = tickets.map((t) =>
    csvRow([
      t.id,
      t.title,
      t.department,
      t.status,
      t.urgency,
      t.createdBy.name,
      t.assignedTo?.name ?? '',
      isoOrEmpty(t.createdAt),
      isoOrEmpty(t.resolvedAt),
      isoOrEmpty(t.updatedAt),
    ]),
  );

  const csv = [header, ...rows].join('\r\n');

  // --- Stream response ---
  const filename = `tickets-export-${new Date().toISOString().slice(0, 10)}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
