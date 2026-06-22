'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Ticket, MessageSquare, AlertCircle, Info } from 'lucide-react';
import { RelativeTime } from '@/components/common/RelativeTime';

interface Notification {
  id: string;
  type:
    | 'TICKET_CREATED'
    | 'TICKET_ASSIGNED'
    | 'TICKET_STATUS_CHANGED'
    | 'TICKET_COMMENT_ADDED'
    | 'TICKET_ESCALATED'
    | 'TICKET_REASSIGNED'
    | 'TICKET_REOPENED'
    | string;
  title: string;
  body: string;
  ticketId?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

interface NotificationBellProps {
  role?: string;
}

function NotificationIcon({ type }: { type: string }) {
  const cls = 'shrink-0 mt-0.5';
  switch (type) {
    case 'TICKET_CREATED':
      return <Ticket size={14} className={`${cls} text-blue-500`} />;
    case 'TICKET_COMMENT_ADDED':
      return <MessageSquare size={14} className={`${cls} text-purple-500`} />;
    case 'TICKET_STATUS_CHANGED':
    case 'TICKET_REOPENED':
      return <CheckCheck size={14} className={`${cls} text-green-600`} />;
    case 'TICKET_ASSIGNED':
    case 'TICKET_REASSIGNED':
      return <AlertCircle size={14} className={`${cls} text-amber-500`} />;
    case 'TICKET_ESCALATED':
      return <AlertCircle size={14} className={`${cls} text-red-500`} />;
    default:
      return <Info size={14} className={`${cls} text-gray-400`} />;
  }
}

export function NotificationBell({ role }: NotificationBellProps) {
  const router = useRouter();
  const [data, setData] = useState<NotificationsResponse>({ notifications: [], unreadCount: 0 });
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const json: NotificationsResponse = await res.json();
      setData(json);
    } catch {
      // silently ignore network errors
    }
  }, []);

  // Initial fetch + polling every 30s
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function markAllRead() {
    try {
      await fetch('/api/notifications/read-all', { method: 'PATCH' });
      setData((prev) => ({
        ...prev,
        unreadCount: 0,
        notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
      }));
    } catch {
      // ignore
    }
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.ticketId) {
      setOpen(false);
      return;
    }
    const href =
      role === 'AGENT'
        ? `/agent/tickets/${notification.ticketId}`
        : role === 'ADMIN'
          ? `/admin/tickets/${notification.ticketId}`
          : `/tickets/${notification.ticketId}`;
    router.push(href);
    setOpen(false);

    // Optimistically mark read locally
    if (!notification.isRead) {
      setData((prev) => ({
        ...prev,
        unreadCount: Math.max(0, prev.unreadCount - 1),
        notifications: prev.notifications.map((n) =>
          n.id === notification.id ? { ...n, isRead: true } : n
        ),
      }));
      fetch(`/api/notifications/${notification.id}/read`, { method: 'PATCH' }).catch(() => {});
    }
  }

  const { notifications, unreadCount } = data;

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-[#777169] hover:bg-[#f5f5f5] hover:text-[#0c0a09] transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-[#dc2626] text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-[#e7e5e4] rounded-xl shadow-lg z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#e7e5e4]">
            <span className="text-sm font-semibold text-[#0c0a09]">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-[#777169] hover:text-[#0c0a09] transition-colors flex items-center gap-1"
              >
                <CheckCheck size={12} />
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-[#f5f5f5]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Bell size={28} className="text-[#e7e5e4] mb-2" />
                <p className="text-sm font-medium text-[#0c0a09]">You&apos;re all caught up</p>
                <p className="text-xs text-[#777169] mt-0.5">No new notifications</p>
              </div>
            ) : (
              notifications.slice(0, 10).map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-[#f5f5f5] transition-colors ${
                    !n.isRead ? 'bg-blue-50/40' : ''
                  }`}
                >
                  <NotificationIcon type={n.type} />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm leading-tight truncate ${
                        !n.isRead ? 'font-semibold text-[#0c0a09]' : 'font-medium text-[#0c0a09]'
                      }`}
                    >
                      {n.title}
                    </p>
                    <p className="text-xs text-[#777169] mt-0.5 line-clamp-2 leading-snug">{n.body}</p>
                    <RelativeTime
                      date={n.createdAt}
                      className="text-[11px] text-[#a8a29e] mt-1 block"
                    />
                  </div>
                  {!n.isRead && (
                    <span className="shrink-0 mt-1 w-2 h-2 rounded-full bg-blue-500" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
