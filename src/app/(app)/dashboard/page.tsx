import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveOrgId } from '@/lib/org'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { GoalGauge } from '@/components/dashboard/goal-gauge'
import { PeriodFilter } from '@/components/dashboard/period-filter'
import { FilterDropdown } from '@/components/dashboard/filter-dropdown'
import { RefreshButton } from '@/components/dashboard/refresh-button'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import Link from 'next/link'
import { Users, Building2, TrendingUp, CheckSquare, Clock, ArrowUpRight, ArrowDownRight, Banknote, Target, Send, BarChart2 } from 'lucide-react'

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

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--surface-border)',
  borderRadius: 14,
  boxShadow: 'var(--card-shadow, none)',
}

const monthLabels: Record<number, string> = {
  0: 'Jan', 1: 'Fev', 2: 'Mar', 3: 'Abr', 4: 'Mai', 5: 'Jun',
  6: 'Jul', 7: 'Ago', 8: 'Set', 9: 'Out', 10: 'Nov', 11: 'Dez',
}

interface Props {
  searchParams: Promise<{ period?: string; from?: string; to?: string; owner?: string; stage?: string; source?: string }>
}

export default async function DashboardPage({ searchParams }: Props) {
  const { period = 'month', from, to, owner, stage, source } = await searchParams
  const orgId = await getActiveOrgId()
  const supabase = await createClient()
  const admin = createAdminClient()

  const now = new Date()
  const brStr = now.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' })
  const nowBR = new Date(brStr)
  const y = nowBR.getFullYear()
  const mo = nowBR.getMonth()
  const d = nowBR.getDate()

  // Compute current period boundaries
  let periodStart: Date
  let periodEnd = now
  let granularity: 'daily' | 'weekly' | 'monthly'
  let periodLabel: string

  if (period === 'today') {
    periodStart = new Date(y, mo, d)
    granularity = 'daily'
    periodLabel = 'hoje'
  } else if (period === '7days') {
    periodStart = new Date(y, mo, d - 6)
    granularity = 'daily'
    periodLabel = 'últimos 7 dias'
  } else if (period === 'semester') {
    periodStart = new Date(y, mo - 5, 1)
    granularity = 'monthly'
    periodLabel = 'últimos 6 meses'
  } else if (period === 'year') {
    periodStart = new Date(y, 0, 1)
    granularity = 'monthly'
    periodLabel = 'este ano'
  } else if (period === 'custom') {
    periodStart = from ? new Date(from + 'T00:00:00') : new Date(y, mo, d - 29)
    if (to) { periodEnd = new Date(to + 'T23:59:59') }
    const diffDays = (periodEnd.getTime() - periodStart.getTime()) / 86400000
    granularity = diffDays <= 60 ? 'daily' : 'monthly'
    periodLabel = 'período personalizado'
  } else {
    // default: 30 dias
    periodStart = new Date(y, mo, d - 29)
    granularity = 'daily'
    periodLabel = 'últimos 30 dias'
  }

  const periodStartISO = periodStart.toISOString()
  const periodEndISO = periodEnd.toISOString()

  // Compute previous period for delta comparison
  let prevStart: Date
  let prevEnd: Date

  if (period === 'today') {
    prevStart = new Date(y, mo, d - 1)
    prevEnd = new Date(y, mo, d - 1, 23, 59, 59)
  } else if (period === '7days') {
    prevStart = new Date(y, mo, d - 13)
    prevEnd = new Date(y, mo, d - 7, 23, 59, 59)
  } else if (period === 'semester') {
    prevStart = new Date(y, mo - 11, 1)
    prevEnd = new Date(y, mo - 5, 0, 23, 59, 59)
  } else if (period === 'year') {
    prevStart = new Date(y - 1, 0, 1)
    prevEnd = new Date(y - 1, 11, 31, 23, 59, 59)
  } else if (period === 'custom') {
    const durationMs = periodEnd.getTime() - periodStart.getTime()
    prevEnd = new Date(periodStart.getTime() - 1)
    prevStart = new Date(prevEnd.getTime() - durationMs)
  } else {
    // default: 30 dias anteriores
    prevStart = new Date(y, mo, d - 59)
    prevEnd = new Date(y, mo, d - 30, 23, 59, 59)
  }

  const prevStartISO = prevStart.toISOString()
  const prevEndISO = prevEnd.toISOString()

  const deltaLabel: Record<string, string> = {
    today: 'vs ontem',
    '7days': 'vs 7 dias anteriores',
    semester: 'vs semestre anterior',
    year: 'vs ano anterior',
    custom: 'vs período anterior',
  }
  const vsLabel = deltaLabel[period] ?? 'vs 30 dias anteriores'

  const endOfLastMonth = new Date(y, mo, 0, 23, 59, 59).toISOString()
  const today = now.toISOString().split('T')[0]

  // Fetch stages + users for filter dropdown (parallel with main queries)
  const [stagesResult, membersResult, usersResult] = await Promise.all([
    supabase.from('pipeline_stages').select('id, name').eq('org_id', orgId!).order('position'),
    supabase.from('org_members').select('user_id').eq('org_id', orgId!),
    admin.auth.admin.listUsers({ perPage: 200 }),
  ])
  const orgUserIds = new Set((membersResult.data ?? []).map(m => m.user_id))
  const orgUsers = ((usersResult.data as { users: { id: string; email?: string; user_metadata?: Record<string, string> }[] }).users ?? [])
    .filter(u => orgUserIds.has(u.id))
    .map(u => ({ id: u.id, name: (u.user_metadata?.name ?? u.email ?? u.id.slice(0, 8)) }))
  const pipelineStages = (stagesResult.data ?? []) as { id: string; name: string }[]

  // Won deals with filters (revenue metrics)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wonQ = (() => { let q: any = supabase.from('deals').select('value, closed_at').eq('org_id', orgId!).eq('status', 'won'); if (owner) q = q.eq('owner_id', owner); if (source) q = q.eq('source', source); if (stage && stage !== 'won' && stage !== 'lost') q = q.eq('stage_id', stage); return q.gte('closed_at', periodStartISO).lte('closed_at', periodEndISO).order('closed_at') })()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prevWonQ = (() => { let q: any = supabase.from('deals').select('value').eq('org_id', orgId!).eq('status', 'won'); if (owner) q = q.eq('owner_id', owner); if (source) q = q.eq('source', source); return q.gte('closed_at', prevStartISO).lte('closed_at', prevEndISO) })()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createdQ = (() => { let q: any = supabase.from('deals').select('*', { count: 'exact', head: true }).eq('org_id', orgId!); if (owner) q = q.eq('owner_id', owner); if (source) q = q.eq('source', source); return q.gte('created_at', periodStartISO).lte('created_at', periodEndISO) })()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prevCreatedQ = (() => { let q: any = supabase.from('deals').select('*', { count: 'exact', head: true }).eq('org_id', orgId!); if (owner) q = q.eq('owner_id', owner); if (source) q = q.eq('source', source); return q.gte('created_at', prevStartISO).lte('created_at', prevEndISO) })()

  const [
    { count: contactsCount },
    { count: contactsLastMonth },
    { count: companiesCount },
    { count: companiesLastMonth },
    { count: dealsCount },
    { count: dealsLastMonth },
    { count: tasksCount },
    { data: wonDealsPeriod },
    { count: totalCreatedCount },
    { data: prevWonDeals },
    { count: prevCreatedCount },
    { data: recentActivities },
    { data: overdueTasks },
    { data: goalRows },
    { data: currentMonthWonDeals },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('org_id', orgId!),
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).lte('created_at', endOfLastMonth),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('org_id', orgId!),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).lte('created_at', endOfLastMonth),
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).eq('status', 'open'),
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).eq('status', 'open').lte('created_at', endOfLastMonth),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).eq('done', false),
    wonQ,
    createdQ,
    prevWonQ,
    prevCreatedQ,
    supabase.from('activities').select('id, type, body, created_at, contacts(name), deals(title), companies(name)').eq('org_id', orgId!).order('created_at', { ascending: false }).limit(5),
    supabase.from('tasks').select('id, title, due_date').eq('org_id', orgId!).eq('done', false).not('due_date', 'is', null).lte('due_date', today).order('due_date').limit(5),
    supabase.from('revenue_goals').select('goal').eq('org_id', orgId!).eq('year', y).eq('month', mo + 1).limit(1),
    supabase.from('deals').select('value').eq('org_id', orgId!).eq('status', 'won').gte('closed_at', new Date(y, mo, 1).toISOString()).lt('closed_at', new Date(y, mo + 1, 1).toISOString()),
  ])

  function kpiDelta(current: number, previous: number) {
    if (previous === 0) return null
    return Math.round(((current - previous) / previous) * 100)
  }

  const kpis = [
    { label: 'Contatos', value: contactsCount ?? 0, prev: contactsLastMonth ?? 0, icon: Users, href: '/contacts', color: '#2563eb', iconBg: 'rgba(37,99,235,0.12)' },
    { label: 'Negócios abertos', value: dealsCount ?? 0, prev: dealsLastMonth ?? 0, icon: TrendingUp, href: '/deals', color: '#34d399', iconBg: 'rgba(52,211,153,0.12)' },
    { label: 'Empresas', value: companiesCount ?? 0, prev: companiesLastMonth ?? 0, icon: Building2, href: '/companies', color: '#7c6fff', iconBg: 'rgba(124,111,255,0.12)' },
    { label: 'Tarefas pendentes', value: tasksCount ?? 0, prev: 0, icon: CheckSquare, href: '/tasks', color: '#fb923c', iconBg: 'rgba(251,146,60,0.12)' },
  ]

  // Goal gauge data
  const currentMonthGoal = goalRows?.[0]?.goal ?? null
  const currentMonthWon = (currentMonthWonDeals ?? []).reduce((s: number, d: { value?: number | null }) => s + (d.value ?? 0), 0)

  // Revenue chart data — grouped by period granularity
  const deals = wonDealsPeriod ?? []
  const buckets = new Map<string, { label: string; value: number }>()

  if (granularity === 'daily') {
    const cur = new Date(periodStart)
    cur.setHours(0, 0, 0, 0)
    while (cur <= periodEnd) {
      const key = `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`
      buckets.set(key, { label: cur.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value: 0 })
      cur.setDate(cur.getDate() + 1)
    }
    for (const deal of deals) {
      if (!deal.closed_at) continue
      const dd = new Date(deal.closed_at)
      const key = `${dd.getFullYear()}-${dd.getMonth()}-${dd.getDate()}`
      const b = buckets.get(key)
      if (b) b.value += deal.value ?? 0
    }
  } else {
    const cur = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1)
    while (cur <= periodEnd) {
      const key = `${cur.getFullYear()}-${cur.getMonth()}`
      buckets.set(key, { label: monthLabels[cur.getMonth()], value: 0 })
      cur.setMonth(cur.getMonth() + 1)
    }
    for (const deal of deals) {
      if (!deal.closed_at) continue
      const dd = new Date(deal.closed_at)
      const key = `${dd.getFullYear()}-${dd.getMonth()}`
      const b = buckets.get(key)
      if (b) b.value += deal.value ?? 0
    }
  }

  const revenueData = Array.from(buckets.values()).map(({ label, value }) => ({ month: label, value }))

  const { data: { user } } = await supabase.auth.getUser()
  const firstName = (user?.user_metadata?.name ?? user?.email ?? '').split(' ')[0]

  // Current period values
  const wonCount = deals.length
  const wonValue = deals.reduce((s: number, deal: { value?: number | null }) => s + (deal.value ?? 0), 0)
  const totalCreated = totalCreatedCount ?? 0
  const closingRate = totalCreated > 0 ? (wonCount / totalCreated) * 100 : null
  const ticketMedio = wonCount > 0 ? wonValue / wonCount : null

  // Previous period values
  const prevWonCount = prevWonDeals?.length ?? 0
  const prevWonVal = prevWonDeals?.reduce((s: number, d: { value?: number | null }) => s + (d.value ?? 0), 0) ?? 0
  const prevCreated = prevCreatedCount ?? 0
  const prevClosingRate = prevCreated > 0 ? (prevWonCount / prevCreated) * 100 : null
  const prevTicketMedio = prevWonCount > 0 ? prevWonVal / prevWonCount : null

  function pctDelta(curr: number, prev: number): number | null {
    if (prev === 0) return null
    return Math.round(((curr - prev) / prev) * 100)
  }

  const salesMetrics = [
    {
      label: 'Receita no Período',
      value: fmt(wonValue),
      delta: pctDelta(wonValue, prevWonVal),
      icon: Banknote,
      color: '#34d399',
      iconBg: 'rgba(52,211,153,0.12)',
    },
    {
      label: 'Taxa de Fechamento',
      value: closingRate !== null ? `${closingRate.toFixed(1)}%` : '—',
      delta: prevClosingRate !== null && closingRate !== null
        ? Math.round(closingRate - prevClosingRate)
        : null,
      deltaUnit: 'p.p.',
      icon: Target,
      color: '#06b6d4',
      iconBg: 'rgba(6,182,212,0.12)',
    },
    {
      label: 'Propostas Enviadas',
      value: totalCreated,
      delta: pctDelta(totalCreated, prevCreated),
      icon: Send,
      color: '#a78bfa',
      iconBg: 'rgba(167,139,250,0.12)',
    },
    {
      label: 'Ticket Médio',
      value: ticketMedio !== null ? fmt(ticketMedio) : '—',
      delta: pctDelta(ticketMedio ?? 0, prevTicketMedio ?? 0),
      icon: BarChart2,
      color: '#f59e0b',
      iconBg: 'rgba(245,158,11,0.12)',
    },
  ]

  const hourBrasilia = Number(now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }))
  const greeting = hourBrasilia < 12 ? 'Bom dia' : hourBrasilia < 18 ? 'Boa tarde' : 'Boa noite'
  const dateLabel = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
            {greeting}{firstName ? `, ${firstName}` : ''} <TrendingUp className="inline-block w-6 h-6 mb-1" style={{ color: 'var(--accent3)' }} />
          </h1>
          <p className="text-sm mt-0.5 capitalize" style={{ color: 'var(--text-dim)' }}>{dateLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter
            activePeriod={period} from={from} to={to}
            owner={owner} stage={stage} source={source}
          />
          <FilterDropdown
            period={period} from={from} to={to}
            stages={pipelineStages} users={orgUsers}
            activeOwner={owner} activeStage={stage} activeSource={source}
          />
          <RefreshButton />
          <ThemeToggle />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon
          const d = kpiDelta(k.value, k.prev)
          return (
            <Link key={k.href} href={k.href}>
              <div
                style={{
                  ...card,
                  borderTop: `2px solid ${k.color}`,
                  padding: '20px',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'transform 0.15s',
                }}
                className="hover:scale-[1.02]"
              >
                <div style={{
                  position: 'absolute', top: 0, right: 0,
                  width: 120, height: 120, pointerEvents: 'none',
                  background: `radial-gradient(ellipse at top right, ${k.color}22 0%, transparent 70%)`,
                }} />
                <div className="flex items-start justify-between mb-5">
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                    {k.label}
                  </span>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: k.iconBg }}>
                    <Icon className="w-4 h-4" style={{ color: k.color }} />
                  </div>
                </div>
                <p style={{ fontFamily: 'var(--font-syne)', fontSize: 36, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {k.value}
                </p>
                {d !== null && (
                  <p className="text-xs mt-3 flex items-center gap-0.5" style={{ color: d >= 0 ? '#34d399' : '#f87171' }}>
                    {d >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(d)}% vs mês anterior
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* Sales Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {salesMetrics.map((k) => {
          const Icon = k.icon
          return (
            <div
              key={k.label}
              style={{
                ...card,
                borderTop: `2px solid ${k.color}`,
                padding: '20px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{
                position: 'absolute', top: 0, right: 0,
                width: 120, height: 120, pointerEvents: 'none',
                background: `radial-gradient(ellipse at top right, ${k.color}22 0%, transparent 70%)`,
              }} />
              <div className="flex items-start justify-between mb-5">
                <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>
                  {k.label}
                </span>
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: k.iconBg }}>
                  <Icon className="w-4 h-4" style={{ color: k.color }} />
                </div>
              </div>
              <p style={{ fontFamily: 'var(--font-syne)', fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                {k.value}
              </p>
              {k.delta !== null && k.delta !== undefined ? (
                <p className="text-xs mt-3 flex items-center gap-0.5" style={{ color: k.delta >= 0 ? '#34d399' : '#f87171' }}>
                  {k.delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(k.delta)}{'deltaUnit' in k ? k.deltaUnit : '%'} {vsLabel}
                </p>
              ) : (
                <p className="text-xs mt-3" style={{ color: 'var(--text-faint)' }}>{vsLabel}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div style={{ ...card, padding: '20px' }} className="lg:col-span-3">
          <p className="text-sm font-semibold mb-0.5" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
            Receita no período
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>
            Negócios ganhos — {periodLabel}
          </p>
          <RevenueChart data={revenueData} />
        </div>

        <div style={{ ...card, padding: '20px' }} className="lg:col-span-2">
          <p className="text-sm font-semibold mb-0.5" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
            Meta do mês
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>Atingimento de receita</p>
          <GoalGauge wonValue={currentMonthWon} goal={currentMonthGoal} />
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Won this period */}
        <div
          style={{
            ...card,
            padding: '20px',
            boxShadow: '0 0 40px -15px rgba(52,211,153,0.4)',
            background: 'linear-gradient(135deg, rgba(52,211,153,0.08) 0%, var(--surface) 60%)',
          }}
        >
          <p className="text-xs font-medium mb-3 capitalize" style={{ color: '#34d399' }}>
            Ganhos — {periodLabel}
          </p>
          <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-syne)', color: '#34d399' }}>
            {fmt(wonValue)}
          </p>
          <p className="text-xs mt-2" style={{ color: 'rgba(52,211,153,0.6)' }}>
            {wonCount} negócio{wonCount !== 1 ? 's' : ''} fechado{wonCount !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Recent activities */}
        <div style={{ ...card, padding: '20px' }}>
          <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
            Atividades recentes
          </p>
          {!recentActivities?.length ? (
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Nenhuma atividade ainda</p>
          ) : (
            <ul className="space-y-3">
              {recentActivities.map((a) => {
                const contact = a.contacts as { name: string } | null
                const deal = a.deals as { title: string } | null
                const company = a.companies as { name: string } | null
                const subject = contact?.name ?? deal?.title ?? company?.name ?? '—'
                return (
                  <li key={a.id} className="flex items-start gap-2.5 text-sm">
                    <span className="text-base leading-none mt-0.5 shrink-0">{activityIcon[a.type] ?? '📌'}</span>
                    <div className="min-w-0">
                      <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{subject}</p>
                      {a.body && <p className="text-xs line-clamp-1 mt-0.5" style={{ color: 'var(--text-dim)' }}>{a.body}</p>}
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>{timeAgo(a.created_at)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Overdue tasks */}
        <div style={{ ...card, padding: '20px' }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4" style={{ color: 'var(--accent4)' }} />
            <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
              Tarefas vencidas
            </p>
          </div>
          {!overdueTasks?.length ? (
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Nenhuma tarefa vencida</p>
          ) : (
            <>
              <ul className="space-y-3">
                {overdueTasks.map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-2 text-sm">
                    <span className="leading-tight" style={{ color: 'var(--text-secondary)' }}>{t.title}</span>
                    <span className="text-xs whitespace-nowrap shrink-0" style={{ color: 'var(--accent4)' }}>
                      {t.due_date ? new Date(t.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/tasks" className="text-xs mt-4 block" style={{ color: 'var(--accent1)' }}>
                Ver todas →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
