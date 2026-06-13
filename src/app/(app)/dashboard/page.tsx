import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveOrgId } from '@/lib/org'
import { RevenueGoalChart } from '@/components/dashboard/revenue-goal-chart'
import { ChannelBarChart } from '@/components/dashboard/channel-bar-chart'
import { RevenueBarsChart } from '@/components/dashboard/revenue-bars-chart'
import { PeriodFilter } from '@/components/dashboard/period-filter'
import { FilterDropdown } from '@/components/dashboard/filter-dropdown'
import { RefreshButton } from '@/components/dashboard/refresh-button'
import { ThemeToggle } from '@/components/layout/theme-toggle'
import Link from 'next/link'
import {
  Users, TrendingUp, CheckSquare, Clock, ArrowUpRight, ArrowDownRight,
  Banknote, Target, BarChart2, Zap, AlertCircle,
} from 'lucide-react'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const activityIcon: Record<string, string> = {
  note: '📝', call: '📞', email: '✉️', meeting: '📅',
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

const SOURCE_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  google: 'Google',
  indicacao: 'Indicação',
  site: 'Site',
  whatsapp: 'WhatsApp',
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

  // Period boundaries for the revenue chart
  let periodStart: Date
  let periodEnd = now
  let granularity: 'daily' | 'weekly' | 'monthly'
  let periodLabel: string

  if (period === 'today') {
    periodStart = new Date(y, mo, d); granularity = 'daily'; periodLabel = 'hoje'
  } else if (period === '7days') {
    periodStart = new Date(y, mo, d - 6); granularity = 'daily'; periodLabel = 'últimos 7 dias'
  } else if (period === 'semester') {
    periodStart = new Date(y, mo - 5, 1); granularity = 'monthly'; periodLabel = 'últimos 6 meses'
  } else if (period === 'year') {
    periodStart = new Date(y, 0, 1); granularity = 'monthly'; periodLabel = 'este ano'
  } else if (period === 'custom') {
    periodStart = from ? new Date(from + 'T00:00:00') : new Date(y, mo, d - 29)
    if (to) periodEnd = new Date(to + 'T23:59:59')
    const diffDays = (periodEnd.getTime() - periodStart.getTime()) / 86400000
    granularity = diffDays <= 60 ? 'daily' : 'monthly'; periodLabel = 'período personalizado'
  } else {
    periodStart = new Date(y, mo, d - 29); granularity = 'daily'; periodLabel = 'últimos 30 dias'
  }

  const periodStartISO = periodStart.toISOString()
  const periodEndISO = periodEnd.toISOString()

  const today = now.toISOString().split('T')[0]
  const startOfMonthISO = new Date(y, mo, 1).toISOString()
  const startOfNextMonthISO = new Date(y, mo + 1, 1).toISOString()
  const ninetyDaysAgoISO = new Date(y, mo, d - 90).toISOString()
  const sevenDaysAgoISO = new Date(y, mo, d - 7).toISOString()
  const twelveMonthsAgoISO = new Date(y, mo - 11, 1).toISOString()

  // Fetch stages + users for filter dropdowns
  const [stagesResult, membersResult, usersResult] = await Promise.all([
    supabase.from('pipeline_stages').select('id, name').eq('org_id', orgId!).order('position'),
    supabase.from('org_members').select('user_id').eq('org_id', orgId!),
    admin.auth.admin.listUsers({ perPage: 200 }),
  ])
  const orgUserIds = new Set((membersResult.data ?? []).map((m) => m.user_id))
  const orgUsers = ((usersResult.data as { users: { id: string; email?: string; user_metadata?: Record<string, string> }[] }).users ?? [])
    .filter((u) => orgUserIds.has(u.id))
    .map((u) => ({ id: u.id, name: u.user_metadata?.name ?? u.email ?? u.id.slice(0, 8) }))
  const pipelineStages = (stagesResult.data ?? []) as { id: string; name: string }[]

  // Period-filtered won deals (for revenue chart)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wonQ = (() => { let q: any = supabase.from('deals').select('value, closed_at').eq('org_id', orgId!).eq('status', 'won'); if (owner) q = q.eq('owner_id', owner); if (source) q = q.eq('source', source); if (stage && stage !== 'won' && stage !== 'lost') q = q.eq('stage_id', stage); return q.gte('closed_at', periodStartISO).lte('closed_at', periodEndISO).order('closed_at') })()

  const [
    // Activity feed
    { data: recentActivities },
    // Overdue tasks list
    { data: overdueTasks },
    // Period revenue chart data
    { data: wonDealsPeriod },
    // Current month won (for executive KPIs)
    { data: currentMonthWonDeals },
    // Revenue goal current month
    { data: goalRows },
    // Open pipeline (with stage probability for forecast + funnel)
    { data: openPipelineDeals },
    // Open pipeline stages metadata
    { data: pipelineStagesWithProb },
    // New leads this month
    { count: newLeadsThisMonth },
    // Won last 90d (for closing rate)
    { count: won90dCount },
    // Created last 90d (for closing rate)
    { count: created90dCount },
    // Won deals last 12m with dates (for LTV)
    { data: wonDeals12m },
    // Deals by source last 12m (channel chart)
    { data: dealsBySource },
    // Stale proposals
    { count: staleProposalsCount },
    // Overdue follow-ups 7d+
    { count: overdueFollowups7dCount },
    // Follow-ups today
    { data: followupsToday },
  ] = await Promise.all([
    supabase.from('activities').select('id, type, body, created_at, contacts(name), deals(title), companies(name)').eq('org_id', orgId!).order('created_at', { ascending: false }).limit(5),
    supabase.from('tasks').select('id, title, due_date').eq('org_id', orgId!).eq('done', false).not('due_date', 'is', null).lte('due_date', today).order('due_date').limit(5),
    wonQ,
    supabase.from('deals').select('value').eq('org_id', orgId!).eq('status', 'won').gte('closed_at', startOfMonthISO).lt('closed_at', startOfNextMonthISO),
    supabase.from('revenue_goals').select('year, month, goal').eq('org_id', orgId!).order('year', { ascending: false }).order('month', { ascending: false }).limit(6),
    supabase.from('deals').select('value, stage_id').eq('org_id', orgId!).eq('status', 'open'),
    supabase.from('pipeline_stages').select('id, name, position, probability').eq('org_id', orgId!).order('position'),
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).gte('created_at', startOfMonthISO).lt('created_at', startOfNextMonthISO),
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).eq('status', 'won').gte('closed_at', ninetyDaysAgoISO),
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).gte('created_at', ninetyDaysAgoISO),
    supabase.from('deals').select('value, created_at, closed_at').eq('org_id', orgId!).eq('status', 'won').not('closed_at', 'is', null).gte('closed_at', twelveMonthsAgoISO),
    supabase.from('deals').select('source, status, value').eq('org_id', orgId!).gte('created_at', twelveMonthsAgoISO),
    supabase.from('proposals').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).eq('status', 'sent'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).eq('done', false).not('due_date', 'is', null).lte('due_date', sevenDaysAgoISO),
    supabase.from('tasks').select('id, title').eq('org_id', orgId!).eq('done', false).eq('due_date', today).order('due_date').limit(6),
  ])

  // ── Executive KPI computations ─────────────────────────────────────────────

  const currentMonthGoal = (goalRows ?? []).find((g) => g.year === y && g.month === mo + 1)?.goal ?? null
  const currentMonthWon = (currentMonthWonDeals ?? []).reduce((s: number, d: { value?: number | null }) => s + (d.value ?? 0), 0)
  const currentMonthWonCount = currentMonthWonDeals?.length ?? 0
  const goalPct = currentMonthGoal && currentMonthGoal > 0 ? (currentMonthWon / currentMonthGoal) * 100 : null

  // Weighted forecast & open pipeline total
  const stageMap = new Map<string, number>()
  for (const s of pipelineStagesWithProb ?? []) stageMap.set(s.id, s.probability ?? 50)

  let openPipelineTotal = 0
  let weightedForecast = 0
  const stageBuckets = new Map<string, { id: string; name: string; position: number; count: number; value: number }>()
  for (const s of pipelineStagesWithProb ?? []) {
    stageBuckets.set(s.id, { id: s.id, name: s.name, position: s.position, count: 0, value: 0 })
  }
  for (const deal of openPipelineDeals ?? []) {
    const val = deal.value ?? 0
    const prob = stageMap.get(deal.stage_id ?? '') ?? 50
    openPipelineTotal += val
    weightedForecast += val * (prob / 100)
    if (deal.stage_id) {
      const bucket = stageBuckets.get(deal.stage_id)
      if (bucket) { bucket.count++; bucket.value += val }
    }
  }
  const openDealsCount = openPipelineDeals?.length ?? 0
  const pipelineFunnel = Array.from(stageBuckets.values()).sort((a, b) => a.position - b.position).filter((s) => s.count > 0 || s.value > 0)

  // ── Efficiency KPI computations ────────────────────────────────────────────

  const closingRate90d = (created90dCount ?? 0) > 0 ? ((won90dCount ?? 0) / (created90dCount ?? 1)) * 100 : null
  const ticketMedioMonth = currentMonthWonCount > 0 ? currentMonthWon / currentMonthWonCount : null

  const wonLtv = (wonDeals12m ?? []).filter((d) => d.closed_at && d.created_at)
  const avgDurationMonths = wonLtv.length >= 3
    ? wonLtv.reduce((sum, d) => {
        const ms = new Date(d.closed_at as string).getTime() - new Date(d.created_at).getTime()
        return sum + ms / (1000 * 60 * 60 * 24 * 30)
      }, 0) / wonLtv.length
    : null
  const avgTicket12m = (wonDeals12m?.length ?? 0) > 0
    ? (wonDeals12m ?? []).reduce((s, d) => s + (d.value ?? 0), 0) / wonDeals12m!.length
    : null
  const ltvEstimado = avgTicket12m !== null && avgDurationMonths !== null
    ? avgTicket12m * Math.max(avgDurationMonths, 1)
    : null

  // ── Channel chart data ─────────────────────────────────────────────────────

  const sourceAgg = new Map<string, { wonValue: number }>()
  for (const deal of dealsBySource ?? []) {
    if (deal.status !== 'won' || !((deal.value ?? 0) > 0)) continue
    const src = deal.source || 'outros'
    if (!sourceAgg.has(src)) sourceAgg.set(src, { wonValue: 0 })
    sourceAgg.get(src)!.wonValue += deal.value ?? 0
  }
  const channelData = Array.from(sourceAgg.entries())
    .map(([src, { wonValue }]) => ({ source: SOURCE_LABELS[src] ?? src, value: wonValue }))
    .sort((a, b) => b.value - a.value)

  // ── 6-month revenue vs goal bars ──────────────────────────────────────────

  const goalsMap = new Map<string, number>()
  for (const g of goalRows ?? []) goalsMap.set(`${g.year}-${g.month}`, g.goal)

  const sixMonthBars = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(y, mo - (5 - i), 1)
    const mKey = `${d.getFullYear()}-${d.getMonth() + 1}`
    const label = monthLabels[d.getMonth()]
    const goal = goalsMap.get(mKey)
    const isCurrent = d.getFullYear() === y && d.getMonth() === mo
    return { month: label, value: 0, goal, isCurrent, _year: d.getFullYear(), _month: d.getMonth() }
  })
  for (const deal of wonDeals12m ?? []) {
    if (!deal.closed_at) continue
    const dd = new Date(deal.closed_at)
    const bar = sixMonthBars.find((b) => b._year === dd.getFullYear() && b._month === dd.getMonth())
    if (bar) bar.value += deal.value ?? 0
  }

  // ── Revenue chart data (period-filtered) ──────────────────────────────────

  const deals = wonDealsPeriod ?? []
  const buckets = new Map<string, { label: string; value: number }>()
  if (granularity === 'daily') {
    const cur = new Date(periodStart); cur.setHours(0, 0, 0, 0)
    while (cur <= periodEnd) {
      const key = `${cur.getFullYear()}-${cur.getMonth()}-${cur.getDate()}`
      buckets.set(key, { label: cur.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), value: 0 })
      cur.setDate(cur.getDate() + 1)
    }
    for (const deal of deals) {
      if (!deal.closed_at) continue
      const dd = new Date(deal.closed_at)
      const key = `${dd.getFullYear()}-${dd.getMonth()}-${dd.getDate()}`
      const b = buckets.get(key); if (b) b.value += deal.value ?? 0
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
      const b = buckets.get(key); if (b) b.value += deal.value ?? 0
    }
  }
  const revenueData = Array.from(buckets.values()).map(({ label, value }) => ({ month: label, value }))

  // Attach monthly goal to last bucket if period is current month
  const revenueGoalData = revenueData.map((pt) => ({ ...pt }))
  if (currentMonthGoal && granularity !== 'daily') {
    const lastLabel = monthLabels[mo]
    for (const pt of revenueGoalData) {
      if (pt.month === lastLabel) (pt as { month: string; value: number; goal?: number }).goal = currentMonthGoal
    }
  }

  // ── Growth health signals ──────────────────────────────────────────────────

  const coverageRatio = currentMonthGoal && currentMonthGoal > 0
    ? (weightedForecast / currentMonthGoal) * 100
    : null

  const { data: { user } } = await supabase.auth.getUser()
  const firstName = (user?.user_metadata?.name ?? user?.email ?? '').split(' ')[0]

  const hourBrasilia = Number(now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }))
  const greeting = hourBrasilia < 12 ? 'Bom dia' : hourBrasilia < 18 ? 'Boa tarde' : 'Boa noite'
  const dateLabel = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' })

  // KPI card helper
  type StatusColor = 'green' | 'orange' | 'red' | 'neutral'
  function healthStatus(val: number | null, goodThresh: number, warnThresh: number, inverted = false): StatusColor {
    if (val === null) return 'neutral'
    if (inverted) {
      if (val === 0) return 'green'
      if (val <= warnThresh) return 'orange'
      return 'red'
    }
    if (val >= goodThresh) return 'green'
    if (val >= warnThresh) return 'orange'
    return 'red'
  }
  const statusColor: Record<StatusColor, string> = { green: '#10b981', orange: '#f59e0b', red: '#f87171', neutral: 'var(--text-dim)' }

  const healthSignals: { label: string; value: string; sub: string; status: StatusColor }[] = [
    {
      label: 'Cobertura de meta',
      value: coverageRatio !== null ? `${coverageRatio.toFixed(0)}%` : '—',
      sub: 'forecast / meta mensal',
      status: healthStatus(coverageRatio, 300, 150),
    },
    {
      label: 'Propostas s/ resp.',
      value: String(staleProposalsCount ?? 0),
      sub: 'aguardando retorno',
      status: healthStatus(staleProposalsCount ?? 0, 0, 3, true) === 'green' && (staleProposalsCount ?? 0) === 0 ? 'green' : healthStatus(staleProposalsCount ?? 0, 999, 3, false) === 'neutral' ? 'neutral' : ((staleProposalsCount ?? 0) <= 3 ? 'orange' : 'red'),
    },
    {
      label: 'Follow-ups +7d',
      value: String(overdueFollowups7dCount ?? 0),
      sub: 'tarefas atrasadas',
      status: (overdueFollowups7dCount ?? 0) === 0 ? 'green' : (overdueFollowups7dCount ?? 0) <= 3 ? 'orange' : 'red',
    },
    {
      label: 'Pipeline aberto',
      value: String(openDealsCount),
      sub: `${fmt(openPipelineTotal)} total`,
      status: 'neutral',
    },
    {
      label: 'Meta do mês',
      value: goalPct !== null ? `${goalPct.toFixed(0)}%` : '—',
      sub: currentMonthGoal ? `de ${fmt(currentMonthGoal)}` : 'sem meta',
      status: healthStatus(goalPct, 100, 70),
    },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
            {greeting}{firstName ? `, ${firstName}` : ''} <TrendingUp className="inline-block w-6 h-6 mb-1" style={{ color: '#2563eb' }} />
          </h1>
          <p className="text-sm mt-0.5 capitalize" style={{ color: 'var(--text-dim)' }}>{dateLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter activePeriod={period} from={from} to={to} owner={owner} stage={stage} source={source} />
          <FilterDropdown period={period} from={from} to={to} stages={pipelineStages} users={orgUsers} activeOwner={owner} activeStage={stage} activeSource={source} />
          <RefreshButton />
          <ThemeToggle />
        </div>
      </div>

      {/* Line 1 — Executive KPIs */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>
          Visão executiva — mês atual
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Receita do mês', value: fmt(currentMonthWon), sub: currentMonthGoal ? `Meta: ${fmt(currentMonthGoal)}` : 'Sem meta definida', icon: Banknote, color: '#10b981', iconBg: 'rgba(16,185,129,0.12)', href: '/deals' },
            { label: 'Forecast ponderado', value: fmt(weightedForecast), sub: `${openDealsCount} negócio${openDealsCount !== 1 ? 's' : ''} aberto${openDealsCount !== 1 ? 's' : ''}`, icon: TrendingUp, color: '#2563eb', iconBg: 'rgba(37,99,235,0.12)', href: '/deals' },
            { label: 'Pipeline aberto', value: fmt(openPipelineTotal), sub: `${openDealsCount} negócios`, icon: BarChart2, color: '#7c6fff', iconBg: 'rgba(124,111,255,0.12)', href: '/deals' },
            { label: 'Meta atingida', value: goalPct !== null ? `${goalPct.toFixed(0)}%` : '—', sub: currentMonthGoal ? `de ${fmt(currentMonthGoal)}` : 'Configure em Relatórios', icon: Target, color: '#fb923c', iconBg: 'rgba(251,146,60,0.12)', href: '/reports', progress: goalPct },
          ].map((k) => {
            const Icon = k.icon
            return (
              <Link key={k.label} href={k.href}>
                <div style={{ ...card, borderTop: `2px solid ${k.color}`, padding: '20px', position: 'relative', overflow: 'hidden', transition: 'transform 0.15s' }} className="hover:scale-[1.02]">
                  <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, pointerEvents: 'none', background: `radial-gradient(ellipse at top right, ${k.color}22 0%, transparent 70%)` }} />
                  <div className="flex items-start justify-between mb-4">
                    <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{k.label}</span>
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: k.iconBg }}>
                      <Icon className="w-4 h-4" style={{ color: k.color }} />
                    </div>
                  </div>
                  <p style={{ fontFamily: 'var(--font-syne)', fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{k.value}</p>
                  <p className="text-xs mt-2" style={{ color: 'var(--text-dim)' }}>{k.sub}</p>
                  {'progress' in k && k.progress !== null && k.progress !== undefined && (
                    <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(k.progress, 100)}%`, background: k.color }} />
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Line 2 — Efficiency KPIs */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-faint)' }}>
          Eficiência de vendas
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Leads novos', value: String(newLeadsThisMonth ?? 0), sub: 'criados este mês', icon: Users, color: '#2563eb', iconBg: 'rgba(37,99,235,0.12)' },
            { label: 'Taxa de fechamento', value: closingRate90d !== null ? `${closingRate90d.toFixed(1)}%` : '—', sub: 'últimos 90 dias', icon: Target, color: '#10b981', iconBg: 'rgba(16,185,129,0.12)' },
            { label: 'Ticket médio', value: ticketMedioMonth !== null ? fmt(ticketMedioMonth) : '—', sub: 'negócios ganhos este mês', icon: Banknote, color: '#8b5cf6', iconBg: 'rgba(139,92,246,0.12)' },
            {
              label: 'LTV estimado',
              value: ltvEstimado !== null ? fmt(ltvEstimado) : '—',
              sub: avgDurationMonths !== null ? `${avgDurationMonths.toFixed(1)} meses de duração avg.` : 'Ganhe mais negócios para calcular',
              icon: TrendingUp,
              color: '#f59e0b',
              iconBg: 'rgba(245,158,11,0.12)',
            },
          ].map((k) => {
            const Icon = k.icon
            return (
              <div key={k.label} style={{ ...card, borderTop: `2px solid ${k.color}`, padding: '20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, right: 0, width: 120, height: 120, pointerEvents: 'none', background: `radial-gradient(ellipse at top right, ${k.color}22 0%, transparent 70%)` }} />
                <div className="flex items-start justify-between mb-4">
                  <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--text-dim)' }}>{k.label}</span>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: k.iconBg }}>
                    <Icon className="w-4 h-4" style={{ color: k.color }} />
                  </div>
                </div>
                <p style={{ fontFamily: 'var(--font-syne)', fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{k.value}</p>
                <p className="text-xs mt-2" style={{ color: 'var(--text-dim)' }}>{k.sub}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Charts Row 1 — Revenue vs Meta (period) + 6-month bars */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div style={{ ...card, padding: '20px' }} className="lg:col-span-3">
          <p className="text-sm font-semibold mb-0.5" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
            Receita no período
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>
            Negócios ganhos — {periodLabel}{currentMonthGoal ? ' · linha laranja = meta' : ''}
          </p>
          <RevenueGoalChart data={revenueGoalData} />
        </div>
        <div style={{ ...card, padding: '20px' }} className="lg:col-span-2">
          <p className="text-sm font-semibold mb-0.5" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
            Receita vs meta — 6 meses
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>
            Mês atual destacado · barra laranja = meta
          </p>
          <RevenueBarsChart data={sixMonthBars} />
        </div>
      </div>

      {/* Charts Row 2 — Channel Revenue + Pipeline Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div style={{ ...card, padding: '20px' }} className="lg:col-span-3">
          <p className="text-sm font-semibold mb-0.5" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
            Receita por canal de origem
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>Negócios ganhos nos últimos 12 meses por fonte</p>
          <ChannelBarChart data={channelData} />
        </div>
        <div style={{ ...card, padding: '20px' }} className="lg:col-span-2">
          <p className="text-sm font-semibold mb-0.5" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
            Pipeline por etapa
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>Negócios abertos em cada fase</p>
          {pipelineFunnel.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Nenhum negócio em aberto</p>
          ) : (
            <div className="space-y-2.5">
              {pipelineFunnel.map((s) => {
                const maxVal = Math.max(...pipelineFunnel.map((x) => x.value), 1)
                const pct = s.value > 0 ? (s.value / maxVal) * 100 : 0
                return (
                  <div key={s.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs truncate" style={{ color: 'var(--text-dim)', maxWidth: '55%' }}>{s.name}</span>
                      <span className="text-xs font-medium shrink-0" style={{ color: 'var(--text-secondary)' }}>{s.count} · {fmt(s.value)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.max(pct, s.count > 0 ? 4 : 0)}%`, background: '#2563eb', transition: 'width 0.3s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Growth Health Block */}
      <div style={{ ...card, padding: '20px' }}>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4" style={{ color: '#f59e0b' }} />
          <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
            Saúde do pipeline
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {healthSignals.map((sig) => (
            <div key={sig.label} className="text-center p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)' }}>
              <p className="text-[10px] uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-faint)' }}>{sig.label}</p>
              <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-syne)', color: statusColor[sig.status] }}>{sig.value}</p>
              <p className="text-[10px] mt-1" style={{ color: 'var(--text-dim)' }}>{sig.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Operations Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

        {/* Follow-ups hoje */}
        <div style={{ ...card, padding: '20px' }}>
          <div className="flex items-center gap-2 mb-4">
            <CheckSquare className="w-4 h-4" style={{ color: '#10b981' }} />
            <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
              Follow-ups hoje
            </p>
          </div>
          {!followupsToday?.length ? (
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Nenhum follow-up agendado para hoje</p>
          ) : (
            <>
              <ul className="space-y-3">
                {followupsToday.map((t) => (
                  <li key={t.id} className="flex items-start gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: '#10b981' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{t.title}</span>
                  </li>
                ))}
              </ul>
              <Link href="/tasks" className="text-xs mt-4 block" style={{ color: '#2563eb' }}>
                Ver todas as tarefas →
              </Link>
            </>
          )}
        </div>

        {/* Tarefas vencidas */}
        <div style={{ ...card, padding: '20px' }}>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4" style={{ color: '#f87171' }} />
            <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
              Tarefas vencidas
            </p>
            {(overdueFollowups7dCount ?? 0) > 0 && (
              <span className="ml-auto flex items-center gap-1 text-xs" style={{ color: '#f87171' }}>
                <AlertCircle className="w-3 h-3" />
                {overdueFollowups7dCount} com +7d
              </span>
            )}
          </div>
          {!overdueTasks?.length ? (
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Nenhuma tarefa vencida</p>
          ) : (
            <>
              <ul className="space-y-3">
                {overdueTasks.map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-2 text-sm">
                    <span className="leading-tight" style={{ color: 'var(--text-secondary)' }}>{t.title}</span>
                    <span className="text-xs whitespace-nowrap shrink-0" style={{ color: '#f87171' }}>
                      {t.due_date ? new Date(t.due_date + 'T12:00:00').toLocaleDateString('pt-BR') : ''}
                    </span>
                  </li>
                ))}
              </ul>
              <Link href="/tasks" className="text-xs mt-4 block" style={{ color: '#2563eb' }}>
                Ver todas →
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
