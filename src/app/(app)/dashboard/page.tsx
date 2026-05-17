import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Users, Building2, Handshake, CheckSquare } from 'lucide-react'

export default async function DashboardPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const [
    { count: contactsCount },
    { count: companiesCount },
    { count: dealsCount },
    { count: tasksCount },
  ] = await Promise.all([
    supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId!),
    supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId!),
    supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId!)
      .eq('status', 'open'),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('org_id', orgId!)
      .eq('done', false),
  ])

  const stats = [
    {
      label: 'Contatos',
      count: contactsCount ?? 0,
      icon: Users,
      href: '/contacts',
      color: 'text-blue-500',
    },
    {
      label: 'Empresas',
      count: companiesCount ?? 0,
      icon: Building2,
      href: '/companies',
      color: 'text-indigo-500',
    },
    {
      label: 'Negócios abertos',
      count: dealsCount ?? 0,
      icon: Handshake,
      href: '/deals',
      color: 'text-green-500',
    },
    {
      label: 'Tarefas pendentes',
      count: tasksCount ?? 0,
      icon: CheckSquare,
      href: '/tasks',
      color: 'text-orange-500',
    },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>
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
    </div>
  )
}
