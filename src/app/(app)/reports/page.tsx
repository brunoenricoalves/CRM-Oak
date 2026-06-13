import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { RevenueGoalChart } from '@/components/dashboard/revenue-goal-chart'
import { GoalForm } from './goal-form'
import { upsertRevenueGoal } from '@/server/actions/reports'
import {
  TrendingUp, Target, BarChart3, Percent,
  DollarSign, Users, ArrowUpRight, Layers,
} from 'lucide-react'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const pct = (v: number) => `${v.toFixed(1)}%`

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--surface-border)',
  borderRadius: 14,
}

const SOURCE_LABELS: Record<string, string> = {
  instagram: 'Instagram', google: 'Google', indicacao: 'Indicação', site: 'Site', whatsapp: 'WhatsApp',
}

type SectionHeadProps = { title: string; sub?: string }
function SectionHead({ title, sub }: SectionHeadProps) {
  return (
    <div className="mb-4">
      <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>{title}</p>
      {sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{sub}</p>}
    </div>
  )
}

export default async function ReportsPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const twelveMonthsAgo = new Date(now)
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
  twelveMonthsAgo.setDate(1)

  const [
    { data: wonDeals },
    { data: allDeals },
    { data: stages },
    { data: goals },
    { data: openDealsWithStages },
    { data: wonDealsDetail },
    { data: wonDealsWithCompanies },
  ] = await Promise.all([
    supabase.from('deals').select('value, closed_at').eq('org_id', orgId!).eq('status', 'won').gte('closed_at', twelveMonthsAgo.toISOString()),
    supabase.from('deals').select('status, value, created_at, source').eq('org_id', orgId!),
    supabase.from('pipeline_stages').select('id, name, position, probability').eq('org_id', orgId!).order('position'),
    supabase.from('revenue_goals').select('year, month, goal').eq('org_id', orgId!).order('year', { ascending: false }).order('month', { ascending: false }).limit(12),
    supabase.from('deals').select('value, stage_id, pipeline_stages(probability)').eq('org_id', orgId!).eq('status', 'open'),
    supabase.from('deals').select('value, created_at, closed_at, source').eq('org_id', orgId!).eq('status', 'won').not('closed_at', 'is', null),
    supabase.from('deals').select('value, companies(id, name)').eq('org_id', orgId!).eq('status', 'won').not('closed_at', 'is', null),
  ])

  // ── Revenue chart data (last 12 months) ───────────────────────────────────

  const monthlyRevenue = new Map<string, { value: number; goal?: number }>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now)
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyRevenue.set(key, { value: 0 })
  }
  for (const deal of wonDeals ?? []) {
    if (!deal.closed_at || !deal.value) continue
    const d = new Date(deal.closed_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (monthlyRevenue.has(key)) monthlyRevenue.get(key)!.value += deal.value
  }
  // Attach monthly goals to chart data
  for (const g of goals ?? []) {
    const key = `${g.year}-${String(g.month).padStart(2, '0')}`
    if (monthlyRevenue.has(key)) monthlyRevenue.get(key)!.goal = g.goal
  }
  const revenueChartData = Array.from(monthlyRevenue.entries()).map(([key, { value, goal }]) => {
    const [year, month] = key.split('-')
    const d = new Date(Number(year), Number(month) - 1, 1)
    return { month: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), value, goal }
  })

  // ── Funnel by stage (open deals) ──────────────────────────────────────────

  const dealsByStage = new Map<string, { name: string; count: number; value: number; position: number }>()
  for (const s of stages ?? []) dealsByStage.set(s.id, { name: s.name, count: 0, value: 0, position: s.position })
  for (const d of openDealsWithStages ?? []) {
    if (!d.stage_id) continue
    const entry = dealsByStage.get(d.stage_id)
    if (entry) { entry.count++; entry.value += d.value ?? 0 }
  }
  const funnelData = Array.from(dealsByStage.values()).sort((a, b) => a.position - b.position)

  // ── Conversion + KPIs ─────────────────────────────────────────────────────

  const wonCount = allDeals?.filter((d) => d.status === 'won').length ?? 0
  const lostCount = allDeals?.filter((d) => d.status === 'lost').length ?? 0
  const closedCount = wonCount + lostCount
  const conversionRate = closedCount > 0 ? (wonCount / closedCount) * 100 : 0

  const wonThisMonth = (wonDeals ?? [])
    .filter((d) => {
      if (!d.closed_at) return false
      const date = new Date(d.closed_at)
      return date.getFullYear() === currentYear && date.getMonth() + 1 === currentMonth
    })
    .reduce((sum, d) => sum + (d.value ?? 0), 0)

  const forecast = (openDealsWithStages ?? []).reduce((sum, d) => {
    const stage = d.pipeline_stages as { probability: number } | null
    const prob = stage?.probability ?? 50
    return sum + (d.value ?? 0) * (prob / 100)
  }, 0)

  const currentGoal = goals?.find((g) => g.year === currentYear && g.month === currentMonth)
  const goalProgress = currentGoal && wonThisMonth > 0 ? Math.min((wonThisMonth / currentGoal.goal) * 100, 100) : 0

  // ── Performance de Aquisição (by source) ──────────────────────────────────

  const sourcePerf = new Map<string, { total: number; won: number; wonValue: number }>()
  for (const deal of allDeals ?? []) {
    const src = deal.source || 'outros'
    if (!sourcePerf.has(src)) sourcePerf.set(src, { total: 0, won: 0, wonValue: 0 })
    const entry = sourcePerf.get(src)!
    entry.total++
    if (deal.status === 'won') { entry.won++; entry.wonValue += deal.value ?? 0 }
  }
  const sourcePerfData = Array.from(sourcePerf.entries())
    .map(([src, stats]) => ({
      source: SOURCE_LABELS[src] ?? src,
      total: stats.total,
      won: stats.won,
      wonValue: stats.wonValue,
      rate: stats.total > 0 ? (stats.won / stats.total) * 100 : 0,
    }))
    .filter((s) => s.total > 0)
    .sort((a, b) => b.wonValue - a.wonValue)

  // ── LTV + Retenção ────────────────────────────────────────────────────────

  const wonDealsLtv = (wonDealsDetail ?? []).filter((d) => d.closed_at && d.created_at)
  const avgDurationMonths = wonDealsLtv.length >= 3
    ? wonDealsLtv.reduce((sum, d) => {
        const ms = new Date(d.closed_at as string).getTime() - new Date(d.created_at).getTime()
        return sum + ms / (1000 * 60 * 60 * 24 * 30)
      }, 0) / wonDealsLtv.length
    : null
  const avgTicketAllTime = wonDealsLtv.length > 0
    ? wonDealsLtv.reduce((s, d) => s + (d.value ?? 0), 0) / wonDealsLtv.length
    : null
  const ltvEstimado = avgTicketAllTime !== null && avgDurationMonths !== null
    ? avgTicketAllTime * Math.max(avgDurationMonths, 1)
    : null

  // LTV by source
  const sourceLtvMap = new Map<string, { wonValue: number; count: number; totalDuration: number }>()
  for (const deal of wonDealsLtv) {
    const src = deal.source || 'outros'
    if (!sourceLtvMap.has(src)) sourceLtvMap.set(src, { wonValue: 0, count: 0, totalDuration: 0 })
    const entry = sourceLtvMap.get(src)!
    const ms = new Date(deal.closed_at as string).getTime() - new Date(deal.created_at).getTime()
    entry.wonValue += deal.value ?? 0
    entry.count++
    entry.totalDuration += ms / (1000 * 60 * 60 * 24 * 30)
  }
  const sourceLtvData = Array.from(sourceLtvMap.entries())
    .map(([src, stats]) => ({
      source: SOURCE_LABELS[src] ?? src,
      ltv: stats.count > 0 ? (stats.wonValue / stats.count) * Math.max(stats.totalDuration / stats.count, 1) : 0,
      avgTicket: stats.count > 0 ? stats.wonValue / stats.count : 0,
      avgMonths: stats.count > 0 ? stats.totalDuration / stats.count : 0,
    }))
    .filter((s) => s.avgMonths > 0)
    .sort((a, b) => b.ltv - a.ltv)

  // Top clients by revenue
  const clientAgg = new Map<string, { name: string; value: number; count: number }>()
  for (const deal of wonDealsWithCompanies ?? []) {
    const co = deal.companies as { id?: string; name?: string } | null
    if (!co?.name) continue
    const id = co.id ?? co.name
    if (!clientAgg.has(id)) clientAgg.set(id, { name: co.name, value: 0, count: 0 })
    const entry = clientAgg.get(id)!
    entry.value += deal.value ?? 0
    entry.count++
  }
  const topClients = Array.from(clientAgg.values()).sort((a, b) => b.value - a.value).slice(0, 8)

  // ── Previsão de receita (pipeline por probabilidade) ──────────────────────

  const tiers = [
    { label: 'Comprometido (>75%)', range: [76, 100] as [number, number], count: 0, value: 0, weighted: 0, color: '#10b981' },
    { label: 'Provável (51–75%)',   range: [51, 75]  as [number, number], count: 0, value: 0, weighted: 0, color: '#2563eb' },
    { label: 'Pipeline (26–50%)',   range: [26, 50]  as [number, number], count: 0, value: 0, weighted: 0, color: '#8b5cf6' },
    { label: 'Exploratório (0–25%)',range: [0, 25]   as [number, number], count: 0, value: 0, weighted: 0, color: '#6b7280' },
  ]
  for (const deal of openDealsWithStages ?? []) {
    const stage = deal.pipeline_stages as { probability: number } | null
    const prob = stage?.probability ?? 50
    const val = deal.value ?? 0
    for (const tier of tiers) {
      if (prob >= tier.range[0] && prob <= tier.range[1]) {
        tier.count++; tier.value += val; tier.weighted += val * (prob / 100)
        break
      }
    }
  }
  const totalPipeline = tiers.reduce((s, t) => s + t.value, 0)
  const totalForecast = tiers.reduce((s, t) => s + t.weighted, 0)

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  const kpis = [
    { icon: TrendingUp, iconColor: '#34d399', label: 'Ganho este mês', value: fmt(wonThisMonth), sub: currentGoal ? `Meta: ${fmt(currentGoal.goal)}` : null },
    { icon: BarChart3,  iconColor: '#2563eb', label: 'Previsão ponderada', value: fmt(forecast), sub: `${openDealsWithStages?.length ?? 0} negócios abertos` },
    { icon: Percent,    iconColor: '#c084fc', label: 'Taxa de conversão', value: pct(conversionRate), sub: `${wonCount} ganhos / ${closedCount} fechados` },
    { icon: Target,     iconColor: '#fb923c', label: 'Meta do mês', value: currentGoal ? pct(goalProgress) : '—', sub: currentGoal ? null : 'Sem meta definida', progress: currentGoal ? goalProgress : null },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>Relatórios</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Revenue Ops · Visão completa do desempenho comercial</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => {
          const Icon = k.icon
          return (
            <div key={k.label} style={{ ...card, padding: '16px' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4" style={{ color: k.iconColor }} />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{k.label}</span>
              </div>
              <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>{k.value}</p>
              {k.sub && <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>{k.sub}</p>}
              {k.progress !== null && k.progress !== undefined && (
                <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${k.progress}%`, background: '#fb923c' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Revenue chart + goal form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div style={{ ...card, padding: '20px' }} className="lg:col-span-2">
          <p className="text-sm font-semibold mb-0.5" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>
            Receita vs meta — últimos 12 meses
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>Negócios fechados · linha laranja = meta mensal</p>
          <RevenueGoalChart data={revenueChartData} />
        </div>
        <div style={{ ...card, padding: '20px' }}>
          <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>
            Definir meta mensal
          </p>
          <GoalForm action={upsertRevenueGoal} currentYear={currentYear} currentMonth={currentMonth} monthNames={monthNames} goals={goals ?? []} />
        </div>
      </div>

      {/* ── 1. Performance de Aquisição ─────────────────────────────────── */}
      <div style={{ ...card, padding: '20px' }} className="mb-6">
        <SectionHead title="Performance de Aquisição" sub="Leads por canal de origem — todos os períodos" />
        {sourcePerfData.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Nenhum dado de origem disponível. Adicione a origem ao criar negócios.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  {['Canal', 'Leads', 'Ganhos', 'Taxa', 'Receita total'].map((h) => (
                    <th key={h} className="pb-3 text-left text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sourcePerfData.map((s) => (
                  <tr key={s.source} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                    <td className="py-3 font-medium" style={{ color: 'var(--text-primary)' }}>{s.source}</td>
                    <td className="py-3" style={{ color: 'var(--text-secondary)' }}>{s.total}</td>
                    <td className="py-3" style={{ color: 'var(--text-secondary)' }}>{s.won}</td>
                    <td className="py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: s.rate >= 30 ? 'rgba(16,185,129,0.15)' : s.rate >= 15 ? 'rgba(245,158,11,0.15)' : 'rgba(248,113,113,0.15)', color: s.rate >= 30 ? '#10b981' : s.rate >= 15 ? '#f59e0b' : '#f87171' }}>
                        {pct(s.rate)}
                      </span>
                    </td>
                    <td className="py-3 font-semibold" style={{ color: 'var(--text-primary)' }}>{fmt(s.wonValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── 2. Funil detalhado ──────────────────────────────────────────── */}
      {funnelData.length > 0 && (
        <div style={{ ...card, padding: '20px' }} className="mb-6">
          <SectionHead title="Funil por etapa" sub="Negócios abertos em cada fase do pipeline" />
          <div className="space-y-3">
            {funnelData.map((stage, idx) => {
              const maxValue = Math.max(...funnelData.map((s) => s.value), 1)
              const widthPct = stage.value > 0 ? (stage.value / maxValue) * 100 : 0
              const prevStage = idx > 0 ? funnelData[idx - 1] : null
              const dropPct = prevStage && prevStage.count > 0 ? ((stage.count / prevStage.count) * 100).toFixed(0) : null
              return (
                <div key={stage.name}>
                  <div className="flex items-center gap-3">
                    <span className="text-sm w-36 shrink-0 truncate" style={{ color: 'var(--text-muted)' }}>{stage.name}</span>
                    <div className="flex-1 h-6 rounded overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                      <div className="h-full rounded transition-all flex items-center px-2" style={{ width: `${Math.max(widthPct, stage.count > 0 ? 5 : 0)}%`, background: '#2563eb' }}>
                        {stage.count > 0 && <span className="text-xs font-medium" style={{ color: '#fff' }}>{stage.count}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {dropPct && (
                        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>↓ {dropPct}%</span>
                      )}
                      <span className="text-sm font-medium w-28 text-right" style={{ color: 'var(--text-secondary)' }}>{fmt(stage.value)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 3. Retenção e Clientes + LTV ───────────────────────────────── */}
      <div className="mb-6">
        <div className="mb-4">
          <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>Retenção e Clientes</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>LTV estimado e análise de clientes</p>
        </div>

        {/* LTV summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {[
            {
              label: 'LTV estimado',
              value: ltvEstimado !== null ? fmt(ltvEstimado) : '—',
              sub: avgDurationMonths !== null ? `${avgDurationMonths.toFixed(1)} meses médios de ciclo` : 'Mínimo 3 negócios ganhos para calcular',
              color: '#f59e0b',
            },
            {
              label: 'Ticket médio',
              value: avgTicketAllTime !== null ? fmt(avgTicketAllTime) : '—',
              sub: `${wonDealsLtv.length} negócios ganhos (base)`,
              color: '#2563eb',
            },
            {
              label: 'Clientes únicos',
              value: String(clientAgg.size),
              sub: 'empresas com negócios ganhos',
              color: '#10b981',
            },
          ].map((k) => (
            <div key={k.label} style={{ ...card, padding: '16px', borderTop: `2px solid ${k.color}` }}>
              <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>{k.label}</p>
              <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>{k.value}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>{k.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top clients */}
          {topClients.length > 0 && (
            <div style={{ ...card, padding: '20px' }}>
              <SectionHead title="Top clientes por receita" sub="Negócios ganhos por empresa" />
              <div className="space-y-2.5">
                {topClients.map((c, i) => {
                  const maxVal = topClients[0]?.value ?? 1
                  const barPct = (c.value / maxVal) * 100
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs w-5 shrink-0 text-right font-semibold" style={{ color: 'var(--text-faint)' }}>{i + 1}</span>
                      <span className="text-sm shrink-0 truncate" style={{ color: 'var(--text-secondary)', width: 120 }}>{c.name}</span>
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: '#2563eb' }} />
                      </div>
                      <span className="text-xs font-semibold shrink-0" style={{ color: 'var(--text-primary)' }}>{fmt(c.value)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* LTV por canal */}
          {sourceLtvData.length > 0 && (
            <div style={{ ...card, padding: '20px' }}>
              <SectionHead title="LTV por canal de origem" sub="Valor vitalício estimado por fonte de lead" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                      {['Canal', 'LTV est.', 'Ticket médio', 'Ciclo médio'].map((h) => (
                        <th key={h} className="pb-2 text-left text-xs font-semibold" style={{ color: 'var(--text-dim)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sourceLtvData.map((s) => (
                      <tr key={s.source} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                        <td className="py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{s.source}</td>
                        <td className="py-2.5 font-semibold" style={{ color: '#f59e0b' }}>{fmt(s.ltv)}</td>
                        <td className="py-2.5" style={{ color: 'var(--text-secondary)' }}>{fmt(s.avgTicket)}</td>
                        <td className="py-2.5" style={{ color: 'var(--text-dim)' }}>{s.avgMonths.toFixed(1)} m</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 4. Previsão de Receita ──────────────────────────────────────── */}
      <div style={{ ...card, padding: '20px' }} className="mb-6">
        <SectionHead title="Previsão de Receita" sub="Pipeline aberto segmentado por probabilidade de fechamento" />
        {tiers.every((t) => t.count === 0) ? (
          <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Nenhum negócio aberto no pipeline.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {tiers.map((tier) => (
                <div key={tier.label} style={{ ...card, padding: '14px', borderTop: `2px solid ${tier.color}` }}>
                  <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-dim)' }}>{tier.label}</p>
                  <p className="text-xl font-bold mb-1" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>
                    {tier.count > 0 ? fmt(tier.weighted) : '—'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                    {tier.count} negócio{tier.count !== 1 ? 's' : ''} · {tier.count > 0 ? fmt(tier.value) : '—'} bruto
                  </p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)' }}>
              <div className="grid grid-cols-3 gap-6 text-center">
                {[
                  { label: 'Cenário pessimista', value: tiers[0].weighted, sub: 'somente >75%' },
                  { label: 'Forecast ponderado', value: totalForecast, sub: 'probabilidade média' },
                  { label: 'Pipeline total', value: totalPipeline, sub: 'se tudo fechar' },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-xs mb-1.5" style={{ color: 'var(--text-dim)' }}>{s.label}</p>
                    <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>{fmt(s.value)}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-faint)' }}>{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Goals history */}
      {goals && goals.length > 0 && (
        <div style={{ ...card, padding: '20px' }} className="mb-6">
          <SectionHead title="Histórico de metas" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {goals.slice(0, 12).map((g) => (
              <div key={`${g.year}-${g.month}`} className="text-center p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--surface-border)' }}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{monthNames[g.month - 1]}/{g.year}</p>
                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-secondary)' }}>{fmt(g.goal)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
