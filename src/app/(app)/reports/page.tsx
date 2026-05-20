import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { GoalForm } from './goal-form'
import { upsertRevenueGoal } from '@/server/actions/reports'
import { TrendingUp, Target, BarChart3, Percent, Briefcase, PauseCircle, CheckCircle2, DollarSign } from 'lucide-react'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const pct = (v: number) => `${v.toFixed(1)}%`

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--surface-border)',
  borderRadius: 14,
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
    { data: allProjects },
  ] = await Promise.all([
    supabase.from('deals').select('value, closed_at').eq('org_id', orgId!).eq('status', 'won').gte('closed_at', twelveMonthsAgo.toISOString()),
    supabase.from('deals').select('status, value, created_at').eq('org_id', orgId!),
    supabase.from('pipeline_stages').select('id, name, position, probability').eq('org_id', orgId!).order('position'),
    supabase.from('revenue_goals').select('year, month, goal').eq('org_id', orgId!).order('year', { ascending: false }).order('month', { ascending: false }).limit(12),
    supabase.from('deals').select('value, stage_id, pipeline_stages(probability)').eq('org_id', orgId!).eq('status', 'open'),
    supabase
      .from('projects')
      .select('id, status, start_date, deal_id, deals(value, title, companies(name))')
      .eq('org_id', orgId!),
  ])

  const monthlyRevenue = new Map<string, number>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now)
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthlyRevenue.set(key, 0)
  }
  for (const deal of wonDeals ?? []) {
    if (!deal.closed_at || !deal.value) continue
    const d = new Date(deal.closed_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (monthlyRevenue.has(key)) monthlyRevenue.set(key, (monthlyRevenue.get(key) ?? 0) + deal.value)
  }
  const revenueChartData = Array.from(monthlyRevenue.entries()).map(([key, value]) => {
    const [year, month] = key.split('-')
    const d = new Date(Number(year), Number(month) - 1, 1)
    return { month: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), value }
  })

  const dealsByStage = new Map<string, { name: string; count: number; value: number; position: number }>()
  for (const s of stages ?? []) dealsByStage.set(s.id, { name: s.name, count: 0, value: 0, position: s.position })
  for (const d of openDealsWithStages ?? []) {
    if (!d.stage_id) continue
    const entry = dealsByStage.get(d.stage_id)
    if (entry) { entry.count++; entry.value += d.value ?? 0 }
  }
  const funnelData = Array.from(dealsByStage.values()).sort((a, b) => a.position - b.position)

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

  type ProjectRow = {
    id: string
    status: string
    start_date: string
    deal_id: string
    deals: { value: number | null; title: string; companies: { name: string } | null } | null
  }

  const projects = (allProjects ?? []) as ProjectRow[]

  const activeProjects = projects.filter((p) => p.status === 'active')
  const pausedProjects = projects.filter((p) => p.status === 'paused')
  const closedThisYear = projects.filter((p) => {
    if (p.status !== 'closed') return false
    return new Date(p.start_date).getFullYear() === currentYear
  })

  const activeRevenue = activeProjects.reduce((sum, p) => sum + (p.deals?.value ?? 0), 0)

  const activeProjectRows = activeProjects
    .slice()
    .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())

  const currentGoal = goals?.find((g) => g.year === currentYear && g.month === currentMonth)
  const goalProgress = currentGoal && wonThisMonth > 0 ? Math.min((wonThisMonth / currentGoal.goal) * 100, 100) : 0

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  const kpis = [
    { icon: TrendingUp, iconColor: '#34d399', label: 'Ganho este mês', value: fmt(wonThisMonth), sub: currentGoal ? `Meta: ${fmt(currentGoal.goal)}` : null },
    { icon: BarChart3, iconColor: '#2563eb', label: 'Previsão ponderada', value: fmt(forecast), sub: `${openDealsWithStages?.length ?? 0} negócios abertos` },
    { icon: Percent, iconColor: '#c084fc', label: 'Taxa de conversão', value: pct(conversionRate), sub: `${wonCount} ganhos / ${closedCount} fechados` },
    { icon: Target, iconColor: '#fb923c', label: 'Meta do mês', value: currentGoal ? pct(goalProgress) : '—', sub: currentGoal ? null : 'Sem meta definida', progress: currentGoal ? goalProgress : null },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>Relatórios</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Visão geral do desempenho comercial</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue chart */}
        <div style={{ ...card, padding: '20px' }} className="lg:col-span-2">
          <p className="text-sm font-semibold mb-0.5" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>
            Receita ganha — últimos 12 meses
          </p>
          <p className="text-xs mb-4" style={{ color: 'var(--text-dim)' }}>Negócios fechados como ganhos</p>
          <RevenueChart data={revenueChartData} />
        </div>

        {/* Set goal */}
        <div style={{ ...card, padding: '20px' }}>
          <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>
            Definir meta mensal
          </p>
          <GoalForm
            action={upsertRevenueGoal}
            currentYear={currentYear}
            currentMonth={currentMonth}
            monthNames={monthNames}
            goals={goals ?? []}
          />
        </div>
      </div>

      {/* Funnel by stage */}
      {funnelData.length > 0 && (
        <div style={{ ...card, padding: '20px' }} className="mb-6">
          <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>
            Funil por etapa (negócios abertos)
          </p>
          <div className="space-y-3">
            {funnelData.map((stage) => {
              const maxValue = Math.max(...funnelData.map((s) => s.value), 1)
              const widthPct = stage.value > 0 ? (stage.value / maxValue) * 100 : 0
              return (
                <div key={stage.name} className="flex items-center gap-3">
                  <span className="text-sm w-32 shrink-0 truncate" style={{ color: 'var(--text-muted)' }}>{stage.name}</span>
                  <div className="flex-1 h-6 rounded overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded transition-all flex items-center px-2"
                      style={{ width: `${Math.max(widthPct, stage.count > 0 ? 5 : 0)}%`, background: '#2563eb' }}
                    >
                      {stage.count > 0 && (
                        <span className="text-xs font-medium" style={{ color: '#fff' }}>{stage.count}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-medium w-28 text-right shrink-0" style={{ color: 'var(--text-secondary)' }}>
                    {fmt(stage.value)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Goals history */}
      {goals && goals.length > 0 && (
        <div style={{ ...card, padding: '20px' }}>
          <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>
            Histórico de metas
          </p>
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

      {/* Projects section */}
      <div className="mt-6">
        <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>
          Projetos
        </p>

        {/* Project KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { icon: Briefcase,    iconColor: '#34d399', label: 'Ativos',              value: String(activeProjects.length) },
            { icon: PauseCircle,  iconColor: '#f59e0b', label: 'Pausados',            value: String(pausedProjects.length) },
            { icon: CheckCircle2, iconColor: '#a0a0b8', label: 'Encerrados este ano', value: String(closedThisYear.length) },
            { icon: DollarSign,   iconColor: '#2563eb', label: 'Receita ativa',       value: fmt(activeRevenue) },
          ].map((k) => {
            const Icon = k.icon
            return (
              <div key={k.label} style={{ ...card, padding: '16px' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4" style={{ color: k.iconColor }} />
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{k.label}</span>
                </div>
                <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>{k.value}</p>
              </div>
            )
          })}
        </div>

        {/* Active projects table */}
        {activeProjectRows.length > 0 && (
          <div style={{ ...card, padding: '20px' }}>
            <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>
              Projetos ativos
            </p>
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-4 pb-2 text-xs font-semibold" style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--surface-border)' }}>
                <span>Cliente</span>
                <span>Valor</span>
                <span>Início</span>
              </div>
              {activeProjectRows.map((p) => {
                const clientName = p.deals?.companies?.name ?? p.deals?.title ?? '—'
                return (
                  <div key={p.id} className="grid grid-cols-3 gap-4 py-2 text-sm" style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
                    <span className="truncate">{clientName}</span>
                    <span>{p.deals?.value != null ? fmt(p.deals.value) : '—'}</span>
                    <span>
                      <a href={`/deals/${p.deal_id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                        {new Date(p.start_date + 'T12:00:00').toLocaleDateString('pt-BR')} →
                      </a>
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeProjectRows.length === 0 && (
          <div style={{ ...card, padding: '20px' }} className="text-center">
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
              Nenhum projeto ativo. Projetos são criados automaticamente ao fechar um negócio como ganho.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
