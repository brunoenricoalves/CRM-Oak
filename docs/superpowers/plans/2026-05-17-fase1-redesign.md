# Fase 1 — Redesign Visual CRM Oak

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign visual completo do CRM Oak — sidebar profissional, dashboard com gráficos Recharts, listas em tabela com avatars, e páginas de detalhe com layout de 2 colunas e header rico.

**Architecture:** Evolução incremental — substitui estilos e layouts sem quebrar Server Actions, rotas ou lógica de banco. O AppHeader é removido e o usuário fica no rodapé da sidebar. Recharts é adicionado como cliente leve para gráficos.

**Tech Stack:** Next.js 16, Tailwind CSS, shadcn/ui v4, Recharts, Lucide React, Inter

---

## Mapa de arquivos

| Arquivo | Ação |
|---|---|
| `src/components/ui/avatar-initials.tsx` | CRIAR — avatar circular com iniciais e cor hash |
| `src/components/dashboard/revenue-chart.tsx` | CRIAR — gráfico de linha Recharts (client) |
| `src/components/dashboard/pipeline-chart.tsx` | CRIAR — gráfico de barras horizontais Recharts (client) |
| `src/components/layout/sidebar.tsx` | MODIFICAR — Oak CRM brand, active state com border, user footer |
| `src/app/(app)/layout.tsx` | MODIFICAR — remover AppHeader, passar orgName+userName para Sidebar, bg-slate-50 |
| `src/app/(app)/dashboard/page.tsx` | MODIFICAR — greeting, KPI com variação, Recharts charts, layout melhorado |
| `src/app/(app)/contacts/page.tsx` | MODIFICAR — tabela com avatar, ações inline hover |
| `src/app/(app)/companies/page.tsx` | MODIFICAR — tabela com avatar, ações inline hover |
| `src/app/(app)/contacts/[id]/page.tsx` | MODIFICAR — header com avatar grande, layout 2 colunas, aba atividades |
| `src/app/(app)/companies/[id]/page.tsx` | MODIFICAR — header com avatar grande, layout 2 colunas |
| `src/app/(app)/deals/[id]/page.tsx` | MODIFICAR — pipeline progress bar, header melhorado |

---

### Task 1: Instalar Recharts + criar AvatarInitials

**Files:**
- Create: `src/components/ui/avatar-initials.tsx`

- [ ] **Step 1: Instalar recharts**

```bash
cd ~/CRM && npm install recharts
```

Expected: `added X packages`

- [ ] **Step 2: Criar AvatarInitials**

`src/components/ui/avatar-initials.tsx`:

```tsx
function hashHue(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

interface Props {
  name: string
  size?: 'sm' | 'md' | 'lg'
}

export function AvatarInitials({ name, size = 'md' }: Props) {
  const hue = hashHue(name)
  const initials = getInitials(name)
  const sizeClass =
    size === 'sm' ? 'w-8 h-8 text-xs' :
    size === 'lg' ? 'w-16 h-16 text-xl' :
    'w-10 h-10 text-sm'
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
      style={{ backgroundColor: `hsl(${hue}, 60%, 45%)` }}
    >
      {initials}
    </div>
  )
}
```

- [ ] **Step 3: Verificar build**

```bash
cd ~/CRM && npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
cd ~/CRM && git add src/components/ui/avatar-initials.tsx package.json package-lock.json && git commit -m "feat: adicionar AvatarInitials e instalar recharts"
```

---

### Task 2: Sidebar + Layout

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Atualizar sidebar**

`src/components/layout/sidebar.tsx`:

```tsx
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
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contatos', icon: Users },
  { href: '/companies', label: 'Empresas', icon: Building2 },
  { href: '/deals', label: 'Negócios', icon: TrendingUp },
  { href: '/tasks', label: 'Tarefas', icon: CheckSquare },
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
      {/* Logo */}
      <div className="px-6 py-5">
        <span className="text-white font-bold text-xl tracking-tight">Oak CRM</span>
        <p className="text-slate-400 text-xs mt-0.5 truncate">{orgName}</p>
      </div>

      {/* Nav */}
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

      {/* User footer */}
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
```

- [ ] **Step 2: Atualizar layout**

`src/app/(app)/layout.tsx`:

```tsx
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { getActiveOrg } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const org = await getActiveOrg()
  if (!org) redirect('/login')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userName = user?.user_metadata?.name ?? user?.email ?? 'Usuário'

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar orgName={org.name} userName={userName} />
      <main className="flex-1 p-8 min-w-0 overflow-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 3: Verificar build**

```bash
cd ~/CRM && npm run build 2>&1 | tail -8
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
cd ~/CRM && git add src/components/layout/sidebar.tsx src/app/'(app)'/layout.tsx && git commit -m "feat: redesign sidebar Oak CRM com user footer"
```

---

### Task 3: Componentes de gráfico (Recharts)

**Files:**
- Create: `src/components/dashboard/revenue-chart.tsx`
- Create: `src/components/dashboard/pipeline-chart.tsx`

- [ ] **Step 1: Criar RevenueChart**

`src/components/dashboard/revenue-chart.tsx`:

```tsx
'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  month: string
  value: number
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export function RevenueChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          width={36}
        />
        <Tooltip formatter={(v: number) => [fmt(v), 'Receita']} />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#1E40AF"
          strokeWidth={2}
          dot={{ fill: '#1E40AF', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 2: Criar PipelineChart**

`src/components/dashboard/pipeline-chart.tsx`:

```tsx
'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DataPoint {
  name: string
  value: number
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export function PipelineChart({ data }: { data: DataPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: '#64748b' }}
          axisLine={false}
          tickLine={false}
          width={90}
        />
        <Tooltip formatter={(v: number) => [fmt(v), 'Pipeline']} />
        <Bar dataKey="value" fill="#1E40AF" radius={[0, 4, 4, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: Verificar build**

```bash
cd ~/CRM && npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
cd ~/CRM && git add src/components/dashboard/ && git commit -m "feat: criar RevenueChart e PipelineChart com Recharts"
```

---

### Task 4: Dashboard redesign

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Reescrever dashboard**

`src/app/(app)/dashboard/page.tsx`:

```tsx
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { PipelineChart } from '@/components/dashboard/pipeline-chart'
import Link from 'next/link'
import { Users, Building2, TrendingUp, CheckSquare, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const activityIcon: Record<string, string> = {
  note: '📝',
  call: '📞',
  email: '✉️',
  meeting: '📅',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}min atrás`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h atrás`
  return `${Math.floor(hrs / 24)}d atrás`
}

export default async function DashboardPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()
  const today = now.toISOString().split('T')[0]

  const [
    { count: contactsCount },
    { count: contactsLastMonth },
    { count: companiesCount },
    { count: companiesLastMonth },
    { count: dealsCount },
    { count: dealsLastMonth },
    { count: tasksCount },
    { data: stageDeals },
    { data: wonDealsThisMonth },
    { data: wonDealsSixMonths },
    { data: recentActivities },
    { data: overdueTasks },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('org_id', orgId!),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).lte('created_at', endOfLastMonth),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('org_id', orgId!),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).lte('created_at', endOfLastMonth),
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).eq('status', 'open'),
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).eq('status', 'open').lte('created_at', endOfLastMonth),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).eq('done', false),
    supabase.from('deals').select('stage_id, value, pipeline_stages(name)').eq('org_id', orgId!).eq('status', 'open'),
    supabase.from('deals').select('value').eq('org_id', orgId!).eq('status', 'won').gte('closed_at', startOfMonth),
    supabase.from('deals').select('value, closed_at').eq('org_id', orgId!).eq('status', 'won').gte('closed_at', sixMonthsAgo).order('closed_at'),
    supabase.from('activities').select('id, type, body, created_at, contacts(name), deals(title), companies(name)').eq('org_id', orgId!).order('created_at', { ascending: false }).limit(5),
    supabase.from('tasks').select('id, title, due_date').eq('org_id', orgId!).eq('done', false).not('due_date', 'is', null).lte('due_date', today).order('due_date').limit(5),
  ])

  // KPI deltas
  function delta(current: number, previous: number) {
    if (previous === 0) return null
    return Math.round(((current - previous) / previous) * 100)
  }
  const kpis = [
    { label: 'Contatos', value: contactsCount ?? 0, prev: contactsLastMonth ?? 0, icon: Users, href: '/contacts', color: 'bg-blue-100 text-blue-700' },
    { label: 'Empresas', value: companiesCount ?? 0, prev: companiesLastMonth ?? 0, icon: Building2, href: '/companies', color: 'bg-indigo-100 text-indigo-700' },
    { label: 'Negócios abertos', value: dealsCount ?? 0, prev: dealsLastMonth ?? 0, icon: TrendingUp, href: '/deals', color: 'bg-green-100 text-green-700' },
    { label: 'Tarefas pendentes', value: tasksCount ?? 0, prev: 0, icon: CheckSquare, href: '/tasks', color: 'bg-orange-100 text-orange-700' },
  ]

  // Pipeline by stage
  const pipelineMap = new Map<string, { name: string; value: number }>()
  for (const deal of stageDeals ?? []) {
    const stage = deal.pipeline_stages as { name: string } | null
    const key = deal.stage_id ?? 'none'
    const entry = pipelineMap.get(key) ?? { name: stage?.name ?? 'Sem etapa', value: 0 }
    pipelineMap.set(key, { name: entry.name, value: entry.value + (deal.value ?? 0) })
  }
  const pipelineData = Array.from(pipelineMap.values())

  // Revenue last 6 months
  const monthLabels: Record<number, string> = { 0: 'Jan', 1: 'Fev', 2: 'Mar', 3: 'Abr', 4: 'Mai', 5: 'Jun', 6: 'Jul', 7: 'Ago', 8: 'Set', 9: 'Out', 10: 'Nov', 11: 'Dez' }
  const revenueByMonth: Record<string, number> = {}
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    revenueByMonth[`${d.getFullYear()}-${d.getMonth()}`] = 0
  }
  for (const deal of wonDealsSixMonths ?? []) {
    if (!deal.closed_at) continue
    const d = new Date(deal.closed_at)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    if (key in revenueByMonth) revenueByMonth[key] += deal.value ?? 0
  }
  const revenueData = Object.entries(revenueByMonth).map(([key, value]) => {
    const [year, month] = key.split('-').map(Number)
    return { month: monthLabels[month], value }
  })

  const wonValue = wonDealsThisMonth?.reduce((s, d) => s + (d.value ?? 0), 0) ?? 0

  const greeting = now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite'
  const dateLabel = now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{greeting} 👋</h1>
        <p className="text-slate-500 text-sm mt-0.5 capitalize">{dateLabel}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon
          const d = delta(k.value, k.prev)
          return (
            <Link key={k.href} href={k.href}>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-slate-500">{k.label}</span>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${k.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>
                  <p className="text-3xl font-bold text-slate-900">{k.value}</p>
                  {d !== null && (
                    <p className={`text-xs mt-1 flex items-center gap-0.5 ${d >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {d >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(d)}% vs mês anterior
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Receita mensal</CardTitle>
            <p className="text-xs text-slate-400">Negócios ganhos nos últimos 6 meses</p>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueData} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-slate-700">Pipeline por etapa</CardTitle>
            <p className="text-xs text-slate-400">Valor em aberto</p>
          </CardHeader>
          <CardContent>
            {pipelineData.length === 0 ? (
              <p className="text-sm text-slate-400 py-4">Nenhum negócio aberto</p>
            ) : (
              <PipelineChart data={pipelineData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Won this month + activities + overdue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-100">
          <CardContent className="pt-5">
            <p className="text-sm text-green-700 font-medium">Ganhos este mês</p>
            <p className="text-3xl font-bold text-green-700 mt-1">{fmt(wonValue)}</p>
            <p className="text-xs text-green-600 mt-1">{wonDealsThisMonth?.length ?? 0} negócio(s) fechado(s)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Atividades recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {!recentActivities?.length ? (
              <p className="text-slate-400 text-sm">Nenhuma atividade ainda</p>
            ) : (
              <ul className="space-y-2">
                {recentActivities.map((a) => {
                  const contact = a.contacts as { name: string } | null
                  const deal = a.deals as { title: string } | null
                  const company = a.companies as { name: string } | null
                  const subject = contact?.name ?? deal?.title ?? company?.name ?? '—'
                  return (
                    <li key={a.id} className="flex items-start gap-2 text-sm">
                      <span className="text-base leading-none mt-0.5">{activityIcon[a.type] ?? '📌'}</span>
                      <div>
                        <span className="font-medium text-slate-700">{subject}</span>
                        {a.body && <p className="text-slate-400 text-xs line-clamp-1">{a.body}</p>}
                        <p className="text-slate-300 text-xs">{timeAgo(a.created_at)}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Clock className="w-4 h-4 text-orange-400" />
            <CardTitle className="text-sm font-semibold text-slate-700">Tarefas vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            {!overdueTasks?.length ? (
              <p className="text-slate-400 text-sm">Nenhuma tarefa vencida</p>
            ) : (
              <>
                <ul className="space-y-2">
                  {overdueTasks.map((t) => (
                    <li key={t.id} className="flex items-start justify-between text-sm gap-2">
                      <span className="text-slate-700 leading-tight">{t.title}</span>
                      <span className="text-orange-500 text-xs whitespace-nowrap shrink-0">
                        {t.due_date ? new Date(t.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link href="/tasks" className="text-xs text-blue-600 hover:underline mt-3 block">
                  Ver todas →
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd ~/CRM && npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
cd ~/CRM && git add src/app/'(app)'/dashboard/page.tsx && git commit -m "feat: redesign dashboard com Recharts e KPIs"
```

---

### Task 5: Lista de Contatos

**Files:**
- Modify: `src/app/(app)/contacts/page.tsx`

- [ ] **Step 1: Reescrever contacts/page.tsx**

```tsx
import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteContact } from '@/server/actions/contact'
import { AvatarInitials } from '@/components/ui/avatar-initials'
import { SearchInput } from '@/components/ui/search-input'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function ContactsPage({ searchParams }: Props) {
  const { q } = await searchParams
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  let query = supabase
    .from('contacts')
    .select('id, name, email, phone, created_at, companies(name)')
    .eq('org_id', orgId!)
    .order('name')

  if (q) query = query.ilike('name', `%${q}%`)

  const { data: contacts } = await query

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contatos</h1>
          <p className="text-slate-500 text-sm mt-0.5">{contacts?.length ?? 0} contato(s)</p>
        </div>
        <Link href="/contacts/new" className={buttonVariants()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo contato
        </Link>
      </div>

      <div className="mb-4">
        <Suspense>
          <SearchInput placeholder="Buscar contatos..." defaultValue={q} />
        </Suspense>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {!contacts || contacts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium">
              {q ? `Nenhum resultado para "${q}"` : 'Nenhum contato ainda'}
            </p>
            {!q && <p className="text-sm mt-1">Crie seu primeiro contato para começar</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Empresa</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">E-mail</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Telefone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Criado em</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="group border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${c.id}`} className="flex items-center gap-3 hover:text-blue-700">
                      <AvatarInitials name={c.name} size="sm" />
                      <span className="font-medium text-slate-900">{c.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {(c.companies as { name: string } | null)?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/contacts/${c.id}/edit`}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <form action={deleteContact.bind(null, c.id)}>
                        <button
                          type="submit"
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd ~/CRM && npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
cd ~/CRM && git add src/app/'(app)'/contacts/page.tsx && git commit -m "feat: redesign lista de contatos com avatars e ações inline"
```

---

### Task 6: Lista de Empresas

**Files:**
- Modify: `src/app/(app)/companies/page.tsx`

- [ ] **Step 1: Reescrever companies/page.tsx**

```tsx
import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteCompany } from '@/server/actions/company'
import { AvatarInitials } from '@/components/ui/avatar-initials'
import { SearchInput } from '@/components/ui/search-input'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function CompaniesPage({ searchParams }: Props) {
  const { q } = await searchParams
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  let query = supabase
    .from('companies')
    .select('id, name, domain, industry, size, created_at')
    .eq('org_id', orgId!)
    .order('name')

  if (q) query = query.ilike('name', `%${q}%`)

  const { data: companies } = await query

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
          <p className="text-slate-500 text-sm mt-0.5">{companies?.length ?? 0} empresa(s)</p>
        </div>
        <Link href="/companies/new" className={buttonVariants()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova empresa
        </Link>
      </div>

      <div className="mb-4">
        <Suspense>
          <SearchInput placeholder="Buscar empresas..." defaultValue={q} />
        </Suspense>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {!companies || companies.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium">
              {q ? `Nenhum resultado para "${q}"` : 'Nenhuma empresa ainda'}
            </p>
            {!q && <p className="text-sm mt-1">Cadastre sua primeira empresa para começar</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Setor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Domínio</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Tamanho</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Criado em</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="group border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/companies/${c.id}`} className="flex items-center gap-3 hover:text-blue-700">
                      <AvatarInitials name={c.name} size="sm" />
                      <span className="font-medium text-slate-900">{c.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.industry ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{c.domain ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{c.size ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/companies/${c.id}/edit`}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <form action={deleteCompany.bind(null, c.id)}>
                        <button
                          type="submit"
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd ~/CRM && npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
cd ~/CRM && git add src/app/'(app)'/companies/page.tsx && git commit -m "feat: redesign lista de empresas com avatars e ações inline"
```

---

### Task 7: Página de detalhe — Contato

**Files:**
- Modify: `src/app/(app)/contacts/[id]/page.tsx`

- [ ] **Step 1: Reescrever contacts/[id]/page.tsx**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteContact } from '@/server/actions/contact'
import { ActivityFeed } from '@/components/activities/activity-feed'
import { ActivityForm } from '@/components/activities/activity-form'
import { AvatarInitials } from '@/components/ui/avatar-initials'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pencil, Trash2, Mail, Phone, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ContactDetailPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const [{ data: contact }, { data: deals }] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, name, email, phone, created_at, companies(id, name)')
      .eq('id', id)
      .eq('org_id', orgId!)
      .single(),
    supabase
      .from('deals')
      .select('id, title, value, status, pipeline_stages(name)')
      .eq('contact_id', id)
      .eq('org_id', orgId!)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (!contact) notFound()

  const company = contact.companies as { id: string; name: string } | null

  return (
    <div>
      {/* Breadcrumb */}
      <Link href="/contacts" className="text-sm text-slate-500 hover:text-slate-700">
        ← Contatos
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mt-4 mb-8">
        <div className="flex items-center gap-4">
          <AvatarInitials name={contact.name} size="lg" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{contact.name}</h1>
            {company && (
              <Link href={`/companies/${company.id}`} className="text-blue-600 hover:underline text-sm mt-0.5 inline-block">
                {company.name}
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/contacts/${id}/edit`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <Pencil className="w-4 h-4 mr-1" />
            Editar
          </Link>
          <form action={deleteContact.bind(null, id)}>
            <Button variant="outline" size="sm" type="submit" className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {contact.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <a href={`mailto:${contact.email}`} className="hover:text-blue-600 truncate">{contact.email}</a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{contact.phone}</span>
                </div>
              )}
              {company && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <Link href={`/companies/${company.id}`} className="hover:text-blue-600">{company.name}</Link>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-400">
                Criado em {new Date(contact.created_at).toLocaleDateString('pt-BR')}
              </div>
            </CardContent>
          </Card>

          {deals && deals.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">Negócios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {deals.map((d) => {
                  const stage = d.pipeline_stages as { name: string } | null
                  return (
                    <Link key={d.id} href={`/deals/${d.id}`} className="block p-2 rounded-lg hover:bg-slate-50 border border-slate-100">
                      <p className="font-medium text-slate-800 text-sm truncate">{d.title}</p>
                      <p className="text-xs text-slate-500">{stage?.name ?? '—'}</p>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Registrar atividade</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityForm contactId={id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed contactId={id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd ~/CRM && npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
cd ~/CRM && git add src/app/'(app)'/contacts/'[id]'/page.tsx && git commit -m "feat: redesign página de detalhe de contato"
```

---

### Task 8: Página de detalhe — Empresa

**Files:**
- Modify: `src/app/(app)/companies/[id]/page.tsx`

- [ ] **Step 1: Reescrever companies/[id]/page.tsx**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteCompany } from '@/server/actions/company'
import { ActivityFeed } from '@/components/activities/activity-feed'
import { ActivityForm } from '@/components/activities/activity-form'
import { AvatarInitials } from '@/components/ui/avatar-initials'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pencil, Trash2, Globe, Briefcase, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CompanyDetailPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const [{ data: company }, { data: contacts }, { data: deals }] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name, domain, industry, size, created_at')
      .eq('id', id)
      .eq('org_id', orgId!)
      .single(),
    supabase
      .from('contacts')
      .select('id, name, email')
      .eq('company_id', id)
      .eq('org_id', orgId!)
      .order('name'),
    supabase
      .from('deals')
      .select('id, title, value, status, pipeline_stages(name)')
      .eq('company_id', id)
      .eq('org_id', orgId!)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (!company) notFound()

  return (
    <div>
      <Link href="/companies" className="text-sm text-slate-500 hover:text-slate-700">
        ← Empresas
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mt-4 mb-8">
        <div className="flex items-center gap-4">
          <AvatarInitials name={company.name} size="lg" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{company.name}</h1>
            {company.industry && (
              <p className="text-slate-500 text-sm mt-0.5">{company.industry}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/companies/${id}/edit`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <Pencil className="w-4 h-4 mr-1" />
            Editar
          </Link>
          <form action={deleteCompany.bind(null, id)}>
            <Button variant="outline" size="sm" type="submit" className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {company.domain && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{company.domain}</span>
                </div>
              )}
              {company.industry && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{company.industry}</span>
                </div>
              )}
              {company.size && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{company.size} funcionários</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-400">
                Criado em {new Date(company.created_at).toLocaleDateString('pt-BR')}
              </div>
            </CardContent>
          </Card>

          {contacts && contacts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  Contatos ({contacts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {contacts.map((c) => (
                  <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50">
                    <AvatarInitials name={c.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{c.name}</p>
                      {c.email && <p className="text-xs text-slate-400">{c.email}</p>}
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {deals && deals.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">Negócios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {deals.map((d) => {
                  const stage = d.pipeline_stages as { name: string } | null
                  return (
                    <Link key={d.id} href={`/deals/${d.id}`} className="block p-2 rounded-lg hover:bg-slate-50 border border-slate-100">
                      <p className="font-medium text-slate-800 text-sm truncate">{d.title}</p>
                      <p className="text-xs text-slate-500">{stage?.name ?? '—'}</p>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Registrar atividade</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityForm companyId={id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed companyId={id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd ~/CRM && npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
cd ~/CRM && git add src/app/'(app)'/companies/'[id]'/page.tsx && git commit -m "feat: redesign página de detalhe de empresa"
```

---

### Task 9: Página de detalhe — Negócio

**Files:**
- Modify: `src/app/(app)/deals/[id]/page.tsx`

- [ ] **Step 1: Reescrever deals/[id]/page.tsx**

```tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteDeal, closeDeal, reopenDeal } from '@/server/actions/deal'
import { ActivityFeed } from '@/components/activities/activity-feed'
import { ActivityForm } from '@/components/activities/activity-form'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pencil, Trash2, DollarSign, Calendar, User, Building2, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default async function DealDetailPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const [{ data: deal }, { data: stages }] = await Promise.all([
    supabase
      .from('deals')
      .select('id, title, value, status, close_date, stage_id, contacts(id, name), companies(id, name), pipeline_stages(name)')
      .eq('id', id)
      .eq('org_id', orgId!)
      .single(),
    supabase
      .from('pipeline_stages')
      .select('id, name, position')
      .eq('org_id', orgId!)
      .order('position'),
  ])

  if (!deal) notFound()

  const contact = deal.contacts as { id: string; name: string } | null
  const company = deal.companies as { id: string; name: string } | null
  const stage = deal.pipeline_stages as { name: string } | null

  const statusMap = {
    open: { label: 'Aberto', className: 'bg-blue-100 text-blue-700' },
    won: { label: 'Ganho', className: 'bg-green-100 text-green-700' },
    lost: { label: 'Perdido', className: 'bg-red-100 text-red-700' },
  }
  const statusInfo = statusMap[deal.status as keyof typeof statusMap] ?? statusMap.open

  // Pipeline progress bar
  const currentStageIndex = stages?.findIndex((s) => s.id === deal.stage_id) ?? -1
  const totalStages = stages?.length ?? 0

  return (
    <div>
      <Link href="/deals" className="text-sm text-slate-500 hover:text-slate-700">
        ← Negócios
      </Link>

      {/* Pipeline progress */}
      {deal.status === 'open' && stages && stages.length > 0 && (
        <div className="mt-4 mb-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            {stages.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap',
                  i <= currentStageIndex
                    ? 'bg-blue-700 text-white'
                    : 'bg-slate-100 text-slate-400'
                )}>
                  <span className="w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center text-[10px]"
                    style={{ borderColor: i <= currentStageIndex ? 'white' : '#cbd5e1' }}>
                    {i < currentStageIndex ? '✓' : i + 1}
                  </span>
                  {s.name}
                </div>
                {i < stages.length - 1 && (
                  <div className={cn('h-0.5 flex-1', i < currentStageIndex ? 'bg-blue-700' : 'bg-slate-200')} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{deal.title}</h1>
            <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', statusInfo.className)}>
              {statusInfo.label}
            </span>
          </div>
          {deal.value !== null && (
            <p className="text-2xl font-semibold text-green-600 mt-1">{fmt(deal.value)}</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {deal.status === 'open' && (
            <>
              <form action={closeDeal.bind(null, id, 'won')}>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" type="submit">
                  Ganho ✓
                </Button>
              </form>
              <form action={closeDeal.bind(null, id, 'lost')}>
                <Button variant="outline" size="sm" type="submit" className="text-red-600 border-red-200 hover:bg-red-50">
                  Perdido ✗
                </Button>
              </form>
            </>
          )}
          {deal.status !== 'open' && (
            <form action={reopenDeal.bind(null, id)}>
              <Button variant="outline" size="sm" type="submit">Reabrir</Button>
            </form>
          )}
          <Link href={`/deals/${id}/edit`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            <Pencil className="w-4 h-4 mr-1" />
            Editar
          </Link>
          <form action={deleteDeal.bind(null, id)}>
            <Button variant="outline" size="sm" type="submit" className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {deal.value !== null && (
                <div className="flex items-center gap-2 text-slate-600">
                  <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-green-600">{fmt(deal.value)}</span>
                </div>
              )}
              {stage && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{stage.name}</span>
                </div>
              )}
              {deal.close_date && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{new Date(deal.close_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
              )}
              {contact && (
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <Link href={`/contacts/${contact.id}`} className="hover:text-blue-600">{contact.name}</Link>
                </div>
              )}
              {company && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <Link href={`/companies/${company.id}`} className="hover:text-blue-600">{company.name}</Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Registrar atividade</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityForm dealId={id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed dealId={id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verificar build**

```bash
cd ~/CRM && npm run build 2>&1 | tail -5
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
cd ~/CRM && git add src/app/'(app)'/deals/'[id]'/page.tsx && git commit -m "feat: redesign página de detalhe de negócio com pipeline progress bar"
```

---

### Task 10: Deploy

- [ ] **Step 1: Build final + deploy**

```bash
cd ~/CRM && vercel build --prod --yes && vercel deploy --prebuilt --prod
```

Expected: `Deployment ... ready.`

- [ ] **Step 2: Verificar produção**

Abrir `https://crm-zeta-mocha.vercel.app` e verificar:
- Sidebar com "Oak CRM" e user footer
- Dashboard com gráficos
- Lista de contatos com avatars
- Detalhe de contato/empresa/negócio com novo layout
