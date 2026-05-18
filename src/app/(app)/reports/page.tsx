import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import { GoalForm } from './goal-form'
import { upsertRevenueGoal } from '@/server/actions/reports'
import { TrendingUp, Target, BarChart3, Percent } from 'lucide-react'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

const pct = (v: number) => `${v.toFixed(1)}%`

export default async function ReportsPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  // Last 12 months revenue (won deals)
  const twelveMonthsAgo = new Date(now)
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
  twelveMonthsAgo.setDate(1)

  const [
    { data: wonDeals },
    { data: allDeals },
    { data: stages },
    { data: goals },
    { data: openDealsWithStages },
  ] = await Promise.all([
    supabase
      .from('deals')
      .select('value, closed_at')
      .eq('org_id', orgId!)
      .eq('status', 'won')
      .gte('closed_at', twelveMonthsAgo.toISOString()),
    supabase
      .from('deals')
      .select('status, value, created_at')
      .eq('org_id', orgId!),
    supabase
      .from('pipeline_stages')
      .select('id, name, position, probability')
      .eq('org_id', orgId!)
      .order('position'),
    supabase
      .from('revenue_goals')
      .select('year, month, goal')
      .eq('org_id', orgId!)
      .order('year', { ascending: false })
      .order('month', { ascending: false })
      .limit(12),
    supabase
      .from('deals')
      .select('value, stage_id, pipeline_stages(probability)')
      .eq('org_id', orgId!)
      .eq('status', 'open'),
  ])

  // Build monthly revenue chart data
  const monthlyRevenue = new Map<string, number>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now)
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    monthlyRevenue.set(key, 0)
  }

  for (const deal of wonDeals ?? []) {
    if (!deal.closed_at || !deal.value) continue
    const d = new Date(deal.closed_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (monthlyRevenue.has(key)) {
      monthlyRevenue.set(key, (monthlyRevenue.get(key) ?? 0) + deal.value)
    }
  }

  const revenueChartData = Array.from(monthlyRevenue.entries()).map(([key, value]) => {
    const [year, month] = key.split('-')
    const d = new Date(Number(year), Number(month) - 1, 1)
    return {
      month: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      value,
    }
  })

  // Funnel by stage
  const dealsByStage = new Map<string, { name: string; count: number; value: number; position: number }>()
  for (const s of stages ?? []) {
    dealsByStage.set(s.id, { name: s.name, count: 0, value: 0, position: s.position })
  }
  for (const deal of allDeals ?? []) {
    // already handled by open deals with stages
  }
  const openWithStage = openDealsWithStages ?? []
  for (const d of openWithStage) {
    if (!d.stage_id) continue
    const entry = dealsByStage.get(d.stage_id)
    if (entry) {
      entry.count++
      entry.value += d.value ?? 0
    }
  }
  const funnelData = Array.from(dealsByStage.values()).sort((a, b) => a.position - b.position)

  // Conversion rate (won / total closed)
  const totalDeals = allDeals?.length ?? 0
  const wonCount = allDeals?.filter((d) => d.status === 'won').length ?? 0
  const lostCount = allDeals?.filter((d) => d.status === 'lost').length ?? 0
  const closedCount = wonCount + lostCount
  const conversionRate = closedCount > 0 ? (wonCount / closedCount) * 100 : 0

  // Total won this month
  const wonThisMonth = (wonDeals ?? [])
    .filter((d) => {
      if (!d.closed_at) return false
      const date = new Date(d.closed_at)
      return date.getFullYear() === currentYear && date.getMonth() + 1 === currentMonth
    })
    .reduce((sum, d) => sum + (d.value ?? 0), 0)

  // Revenue forecast (open deals weighted by stage probability)
  const forecast = openWithStage.reduce((sum, d) => {
    const stage = d.pipeline_stages as { probability: number } | null
    const prob = stage?.probability ?? 50
    return sum + (d.value ?? 0) * (prob / 100)
  }, 0)

  // Current month goal
  const currentGoal = goals?.find((g) => g.year === currentYear && g.month === currentMonth)
  const goalProgress = currentGoal && wonThisMonth > 0
    ? Math.min((wonThisMonth / currentGoal.goal) * 100, 100)
    : 0

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Relatórios</h1>
        <p className="text-slate-500 text-sm mt-1">Visão geral do desempenho comercial</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-xs text-slate-500">Ganho este mês</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{fmt(wonThisMonth)}</p>
            {currentGoal && (
              <p className="text-xs text-slate-400 mt-0.5">Meta: {fmt(currentGoal.goal)}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-slate-500">Previsão ponderada</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{fmt(forecast)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{openWithStage.length} negócios abertos</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Percent className="w-4 h-4 text-purple-500" />
              <span className="text-xs text-slate-500">Taxa de conversão</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{pct(conversionRate)}</p>
            <p className="text-xs text-slate-400 mt-0.5">{wonCount} ganhos / {closedCount} fechados</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-slate-500">Meta do mês</span>
            </div>
            {currentGoal ? (
              <>
                <p className="text-xl font-bold text-slate-900">{pct(goalProgress)}</p>
                <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full transition-all"
                    style={{ width: `${goalProgress}%` }}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400 mt-1">Sem meta definida</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Revenue chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Receita ganha — últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <RevenueChart data={revenueChartData} />
          </CardContent>
        </Card>

        {/* Set goal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Definir meta mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <GoalForm
              action={upsertRevenueGoal}
              currentYear={currentYear}
              currentMonth={currentMonth}
              monthNames={monthNames}
              goals={goals ?? []}
            />
          </CardContent>
        </Card>
      </div>

      {/* Funnel by stage */}
      {funnelData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Funil por etapa (negócios abertos)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelData.map((stage) => {
                const maxValue = Math.max(...funnelData.map((s) => s.value), 1)
                const widthPct = stage.value > 0 ? (stage.value / maxValue) * 100 : 0
                return (
                  <div key={stage.name} className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 w-32 shrink-0 truncate">{stage.name}</span>
                    <div className="flex-1 h-6 bg-slate-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded transition-all flex items-center px-2"
                        style={{ width: `${Math.max(widthPct, stage.count > 0 ? 5 : 0)}%` }}
                      >
                        {stage.count > 0 && (
                          <span className="text-xs text-white font-medium">{stage.count}</span>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-slate-700 w-28 text-right shrink-0">
                      {fmt(stage.value)}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Goals history */}
      {goals && goals.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Histórico de metas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {goals.slice(0, 12).map((g) => (
                <div key={`${g.year}-${g.month}`} className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">{monthNames[g.month - 1]}/{g.year}</p>
                  <p className="text-sm font-semibold text-slate-800 mt-1">{fmt(g.goal)}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
