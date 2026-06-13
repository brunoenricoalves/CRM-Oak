'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/server/actions/auth'
import { NotificationBell } from './notification-bell'
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  FileText,
  Briefcase,
  CheckSquare,
  Settings,
  LogOut,
  BarChart3,
} from 'lucide-react'

const sections = [
  {
    label: 'PRINCIPAL',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/companies', label: 'Empresas', icon: Building2 },
    ],
  },
  {
    label: 'VENDAS',
    items: [
      { href: '/deals', label: 'Negócios', icon: TrendingUp },
      { href: '/proposals', label: 'Propostas', icon: FileText },
      { href: '/projects', label: 'Projetos', icon: Briefcase },
      { href: '/tasks', label: 'Tarefas', icon: CheckSquare },
    ],
  },
  {
    label: 'ANÁLISE',
    items: [
      { href: '/reports', label: 'Relatórios', icon: BarChart3 },
      { href: '/settings', label: 'Configurações', icon: Settings },
    ],
  },
]

interface Props {
  orgName: string
  userName: string
  unreadNotifications?: number
}

function initials(name: string) {
  const parts = name.trim().split(' ')
  return parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0].slice(0, 2)
}

export function Sidebar({ orgName, userName, unreadNotifications = 0 }: Props) {
  const pathname = usePathname()

  function isActive(href: string) {
    return pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
  }

  return (
    <aside
      className="w-60 shrink-0 min-h-screen flex flex-col relative"
      style={{ background: 'var(--sidebar)', borderRight: '1px solid var(--sidebar-border)' }}
    >
      {/* glow top-left */}
      <div className="absolute top-0 left-0 w-48 h-48 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at top left, rgba(37,99,235,0.2) 0%, transparent 65%)',
      }} />

      {/* Logo */}
      <div className="relative flex items-center justify-center px-5 pt-6 pb-5" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <Link href="/dashboard">
          <div style={{
            width: 80, height: 23,
            background: 'linear-gradient(90deg, #2563eb 0%, #60a5fa 100%)',
            WebkitMaskImage: 'url(/logo-oak.png)',
            WebkitMaskSize: 'contain',
            WebkitMaskRepeat: 'no-repeat',
            maskImage: 'url(/logo-oak.png)',
            maskSize: 'contain',
            maskRepeat: 'no-repeat',
          }} />
        </Link>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-2 text-[10px] font-semibold tracking-widest" style={{ color: 'var(--text-faint)' }}>
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = isActive(href)
                return (
                  <Link
                    key={href}
                    href={href}
                    className="flex items-center gap-3 px-3 rounded-lg text-sm font-medium transition-all duration-150 relative group"
                    style={{ color: active ? 'var(--nav-active-color, var(--text-primary))' : 'var(--text-dim)', minHeight: 44 }}
                  >
                    {active && (
                      <span className="absolute inset-0 rounded-lg" style={{
                        background: 'var(--nav-active-bg, linear-gradient(90deg, rgba(37,99,235,0.2) 0%, rgba(37,99,235,0.04) 100%))',
                        borderLeft: '2px solid #2563eb',
                      }} />
                    )}
                    {!active && (
                      <span className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" style={{
                        background: 'rgba(255,255,255,0.04)',
                      }} />
                    )}
                    <Icon className="w-4 h-4 flex-shrink-0 relative" style={{ color: active ? 'var(--nav-active-color, #2563eb)' : 'inherit' }} />
                    <span className="relative group-hover:text-white transition-colors">{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="relative px-4 py-4" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff',
            fontFamily: 'var(--font-syne)',
          }}>
            {initials(userName).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-secondary)' }}>{userName.split(' ')[0]}</p>
              <span style={{
                fontSize: 9, fontWeight: 700, color: '#34d399',
                background: 'rgba(52,211,153,0.12)',
                padding: '1px 5px', borderRadius: 99, letterSpacing: '0.05em',
              }}>PRO</span>
            </div>
            <p className="text-xs truncate" style={{ color: 'var(--text-dim)' }}>{orgName}</p>
          </div>

          <NotificationBell unreadCount={unreadNotifications} />

          <form action={logout}>
            <button type="submit" title="Sair" className="transition-colors"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#e8e8f0')}
              onMouseLeave={e => (e.currentTarget.style.color = '#3a3a5a')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
