import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Users, Building2, Handshake, CheckSquare, TrendingUp, Clock } from 'lucide-react'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const activityTypeLabel: Record<string, string> = {
  note: 'Nota',
  call: 'Ligação',
  email: 'E-mail',
  meeting: 'Reunião',
}

export default async function DashboardPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: contactsCount },
    { count: companiesCount },
    { count: dealsCount },
    { count: tasksCount },
    { data: stageDeals },
    { data: wonDeals },
    { data: recentActivities },
    { data: overdueTasks },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('org_id', orgId!),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('org_id', orgId!),
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).eq('status', 'open'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).eq('done', false),
    supabase
      .from('deals')
      .select('stage_id, value, pipeline_stages(name)')
      .eq('org_id', orgId!)
      .eq('status', 'open'),
    supabase
      .from('deals')
      .select('value')
      .eq('org_id', orgId!)
      .eq('status', 'won')
      .gte('closed_at', startOfMonth),
    supabase
      .from('activities')
      .select('id, type, body, created_at, contacts(name), deals(title), companies(name)')
      .eq('org_id', orgId!)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('tasks')
      .select('id, title, due_date')
      .eq('org_id', orgId!)
      .eq('done', false)
      .not('due_date', 'is', null)
      .lte('due_date', today)
      .order('due_date')
      .limit(5),
  ])

  // Aggregate pipeline by stage
  const pipelineMap = new Map<string, { name: string; count: number; value: number }>()
  for (const deal of stageDeals ?? []) {
    const stage = deal.pipeline_stages as { name: string } | null
    const key = deal.stage_id ?? 'none'
    const name = stage?.name ?? 'Sem etapa'
    const entry = pipelineMap.get(key) ?? { name, count: 0, value: 0 }
    pipelineMap.set(key, { name: entry.name, count: entry.count + 1, value: entry.value + (deal.value ?? 0) })
  }
  const pipeline = Array.from(pipelineMap.values())
  const maxPipelineValue = Math.max(...pipeline.map((s) => s.value), 1)

  const wonThisMonthValue = wonDeals?.reduce((sum, d) => sum + (d.value ?? 0), 0) ?? 0
  const wonThisMonthCount = wonDeals?.length ?? 0

  const stats = [
    { label: 'Contatos', count: contactsCount ?? 0, icon: Users, href: '/contacts', color: 'text-blue-500' },
    { label: 'Empresas', count: companiesCount ?? 0, icon: Building2, href: '/companies', color: 'text-indigo-500' },
    { label: 'Negócios abertos', count: dealsCount ?? 0, icon: Handshake, href: '/deals', color: 'text-green-500' },
    { label: 'Tarefas pendentes', count: tasksCount ?? 0, icon: CheckSquare, href: '/tasks', color: 'text-orange-500' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Link key={s.href} href={s.href}>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">{s.label}</CardTitle>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">{s.count}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Pipeline + Won this month */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <CardTitle className="text-sm font-medium">Pipeline por etapa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pipeline.length === 0 ? (
              <p className="text-slate-400 text-sm">Nenhum negócio em aberto</p>
            ) : (
              pipeline.map((stage) => (
                <div key={stage.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{stage.name}</span>
                    <span className="text-slate-500">{stage.count} · {fmt(stage.value)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(stage.value / maxPipelineValue) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Ganhos este mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{fmt(wonThisMonthValue)}</p>
            <p className="text-sm text-slate-500 mt-1">
              {wonThisMonthCount} negócio{wonThisMonthCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent activities + Overdue tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Atividades recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {!recentActivities?.length ? (
              <p className="text-slate-400 text-sm">Nenhuma atividade ainda</p>
            ) : (
              <ul className="space-y-3">
                {recentActivities.map((a) => {
                  const contact = a.contacts as { name: string } | null
                  const deal = a.deals as { title: string } | null
                  const company = a.companies as { name: string } | null
                  const subject = contact?.name ?? deal?.title ?? company?.name ?? '—'
                  return (
                    <li key={a.id} className="text-sm">
                      <span className="font-medium text-slate-700">
                        {activityTypeLabel[a.type] ?? a.type}
                      </span>
                      <span className="text-slate-400"> · {subject}</span>
                      {a.body && (
                        <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{a.body}</p>
                      )}
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
            <CardTitle className="text-sm font-medium">Tarefas vencidas</CardTitle>
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
                        {t.due_date
                          ? new Date(t.due_date).toLocaleDateString('pt-BR')
                          : ''}
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
