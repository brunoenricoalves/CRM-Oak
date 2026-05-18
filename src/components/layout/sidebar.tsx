'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/server/actions/auth'
import { AvatarInitials } from '@/components/ui/avatar-initials'
import {
  LayoutDashboard,
  Users,
  Building2,
  TrendingUp,
  CheckSquare,
  Settings,
  LogOut,
  BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contatos', icon: Users },
  { href: '/companies', label: 'Empresas', icon: Building2 },
  { href: '/deals', label: 'Negócios', icon: TrendingUp },
  { href: '/tasks', label: 'Tarefas', icon: CheckSquare },
  { href: '/reports', label: 'Relatórios', icon: BarChart3 },
]

interface Props {
  orgName: string
  userName: string
}

export function Sidebar({ orgName, userName }: Props) {
  const pathname = usePathname()

  function navClass(href: string) {
    const isActive =
      pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
    return cn(
      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
      isActive
        ? 'bg-blue-700 text-white border-l-2 border-blue-400 pl-[10px]'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    )
  }

  return (
    <aside className="w-60 shrink-0 min-h-screen bg-slate-900 flex flex-col">
      <div className="px-6 py-5">
        <span className="text-white font-bold text-xl tracking-tight">Oak CRM</span>
        <p className="text-slate-400 text-xs mt-0.5 truncate">{orgName}</p>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={navClass(href)}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}

        <div className="pt-4">
          <Link href="/settings" className={navClass('/settings')}>
            <Settings className="w-4 h-4 flex-shrink-0" />
            Configurações
          </Link>
        </div>
      </nav>

      <div className="px-3 py-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <AvatarInitials name={userName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{userName}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="text-slate-400 hover:text-white transition-colors"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </aside>
  )
}
