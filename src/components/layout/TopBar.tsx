'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { NotificationBell } from '@/components/layout/NotificationBell';

interface TopBarProps {
  role?: string;
}

function useBreadcrumb(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (pathname === '/dashboard') return 'My Tickets';
  if (pathname === '/tickets/new') return 'New Ticket';
  if (pathname === '/admin/dashboard') return 'Analytics Dashboard';
  if (pathname === '/admin/tickets') return 'All Tickets';
  if (pathname === '/admin/users') return 'Users';
  if (pathname === '/agent/queue') {
    return searchParams.get('assigned') === 'me' ? 'My Assigned' : 'Queue';
  }

  // Ticket detail routes: /tickets/:id, /agent/tickets/:id, /admin/tickets/:id
  const match = pathname.match(/tickets\/([^/]+)$/);
  if (match && match[1] !== 'new') {
    return `TKT-${match[1].slice(-4).toUpperCase()}`;
  }

  return '';
}

export function TopBar({ role }: TopBarProps) {
  const breadcrumb = useBreadcrumb();
  return (
    <header className="fixed top-0 left-0 md:left-60 right-0 h-14 bg-white border-b border-[#e7e5e4] flex items-center justify-between px-6 z-20">
      <span className="text-sm font-medium text-[#777169]">{breadcrumb}</span>
      <NotificationBell role={role} />
    </header>
  );
}
