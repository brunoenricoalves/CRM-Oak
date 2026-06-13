'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'

interface NotificationBellProps {
  unreadCount: number
}

export function NotificationBell({ unreadCount }: NotificationBellProps) {
  return (
    <Link
      href="/notifications"
      className="relative flex items-center justify-center w-8 h-8 rounded-md transition-colors"
      style={{ color: 'var(--text-dim)' }}
      title="Notificações"
    >
      <Bell className="w-4 h-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white px-0.5"
          style={{ background: 'var(--accent4)' }}>
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
