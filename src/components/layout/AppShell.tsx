'use client';

import { ReactNode, Suspense } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

interface AppShellProps {
  children: ReactNode;
  role?: string;
  user?: {
    name?: string | null;
    email?: string | null;
  };
}

export function AppShell({ children, role = 'EMPLOYEE', user }: AppShellProps) {
  const userName = user?.name ?? 'User';
  const userEmail = user?.email ?? '';

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      {/* Sidebar reads search params for active-link state — needs a Suspense boundary in Next 16 */}
      <Suspense fallback={<aside className="fixed top-0 left-0 h-screen w-60 bg-white border-r border-[#e7e5e4] z-30" />}>
        <Sidebar role={role} userName={userName} userEmail={userEmail} />
      </Suspense>

      {/* Main area — offset by sidebar width on desktop, full-width on mobile */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        <Suspense fallback={<header className="fixed top-0 left-0 md:left-60 right-0 h-14 bg-white border-b border-[#e7e5e4] z-20" />}>
          <TopBar role={role} />
        </Suspense>

        {/* Page content — offset by topbar height */}
        <main className="flex-1 pt-14 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
