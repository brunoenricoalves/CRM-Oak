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

  const pipelineMap = new Map<string, { name: string; value: number }>()
  for (const deal of stageDeals ?? []) {
    const stage = deal.pipeline_stages as { name: string } | null
    const key = deal.stage_id ?? 'none'
    const entry = pipelineMap.get(key) ?? { name: stage?.name ?? 'Sem etapa', value: 0 }
    pipelineMap.set(key, { name: entry.name, value: entry.value + (deal.value ?? 0) })
  }
  const pipelineData = Array.from(pipelineMap.values())

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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{greeting} 👋</h1>
        <p className="text-slate-500 text-sm mt-0.5 capitalize">{dateLabel}</p>
      </div>

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
