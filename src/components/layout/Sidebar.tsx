'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import { LogOut, LayoutDashboard, PlusSquare, ListChecks, UserCheck, BarChart2, Ticket, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  EMPLOYEE: [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={16} /> },
    { label: 'New Ticket', href: '/tickets/new', icon: <PlusSquare size={16} /> },
  ],
  AGENT: [
    { label: 'Queue', href: '/agent/queue', icon: <ListChecks size={16} /> },
    { label: 'My Assigned', href: '/agent/queue?assigned=me', icon: <UserCheck size={16} /> },
  ],
  ADMIN: [
    { label: 'Analytics', href: '/admin/dashboard', icon: <BarChart2 size={16} /> },
    { label: 'All Tickets', href: '/admin/tickets', icon: <Ticket size={16} /> },
    { label: 'Users', href: '/admin/users', icon: <Users size={16} /> },
  ],
};

const ROLE_LABELS: Record<string, string> = {
  EMPLOYEE: 'Employee',
  AGENT: 'Agent',
  ADMIN: 'Admin',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface SidebarProps {
  role: string;
  userName: string;
  userEmail: string;
}

export function Sidebar({ role, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const navItems = NAV_BY_ROLE[role] ?? NAV_BY_ROLE['EMPLOYEE'];

  function isActive(href: string): boolean {
    if (href.includes('?')) {
      const [path, query] = href.split('?');
      const params = new URLSearchParams(query);
      return pathname === path && [...params.entries()].every(([k, v]) => searchParams.get(k) === v);
    }
    // Plain href: active only if pathname matches AND no query-string sibling is active
    const queryMatchExists = navItems.some((item) => {
      if (!item.href.includes('?')) return false;
      const [path, query] = item.href.split('?');
      const params = new URLSearchParams(query);
      return pathname === path && [...params.entries()].every(([k, v]) => searchParams.get(k) === v);
    });
    return pathname === href && !queryMatchExists;
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 bg-white border-r border-[#e7e5e4] flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 shrink-0">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#292524] text-white text-xs font-bold tracking-tight select-none">
          NT
        </div>
        <span className="text-sm font-semibold text-[#0c0a09] tracking-tight">NudgeTicket</span>
      </div>

      <Separator className="bg-[#e7e5e4]" />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#292524] text-white'
                  : 'text-[#777169] hover:bg-[#f5f5f5] hover:text-[#0c0a09]'
              }`}
            >
              <span className={active ? 'text-white' : 'text-[#a8a29e]'}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-[#e7e5e4]" />

      {/* User section */}
      <div className="px-4 py-4 shrink-0 space-y-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#e7e5e4] text-[#292524] text-xs font-semibold shrink-0 select-none">
            {getInitials(userName)}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-[#0c0a09] truncate leading-tight">{userName}</p>
            <p className="text-xs text-[#777169] truncate leading-tight">{userEmail}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className="text-xs text-[#777169] border-[#e7e5e4] px-2 py-0.5 font-normal"
          >
            {ROLE_LABELS[role] ?? role}
          </Badge>

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-1.5 text-xs text-[#777169] hover:text-[#dc2626] transition-colors"
            title="Sign out"
          >
            <LogOut size={13} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
