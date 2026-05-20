import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { ProjectStatusToggle } from '@/components/projects/project-status-toggle'
import { ProjectMondayInput } from '@/components/projects/project-monday-input'

interface Props {
  searchParams: Promise<{ status?: string }>
}

const TABS = [
  { value: '',       label: 'Todos' },
  { value: 'active', label: 'Em andamento' },
  { value: 'paused', label: 'Pausado' },
  { value: 'closed', label: 'Encerrado' },
]

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default async function ProjectsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  let query = supabase
    .from('projects')
    .select('id, status, monday_url, start_date, deal_id, deals(title, value), companies(name)')
    .eq('org_id', orgId!)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: projects } = await query

  const card = {
    background: 'var(--surface)',
    border: '1px solid var(--surface-border)',
    borderRadius: 14,
    boxShadow: 'var(--card-shadow, none)',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
          Projetos
        </h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
        {TABS.map((tab) => {
          const active = (status ?? '') === tab.value
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/projects?status=${tab.value}` : '/projects'}
              className="px-4 rounded-lg text-sm font-medium transition-all"
              style={{
                minHeight: 36,
                display: 'flex',
                alignItems: 'center',
                background: active ? '#2563eb' : 'transparent',
                color: active ? '#ffffff' : 'var(--text-dim)',
              }}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {/* List */}
      {!projects || projects.length === 0 ? (
        <div className="p-12 text-center rounded-xl" style={card}>
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
            Nenhum projeto encontrado
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
            Projetos são criados automaticamente quando um negócio é marcado como{' '}
            <Link href="/deals" style={{ color: '#2563eb' }}>Ganho</Link>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => {
            const deal = p.deals as { title: string; value: number | null } | null
            const company = p.companies as { name: string } | null

            return (
              <div
                key={p.id}
                className="flex items-center gap-4 px-5 py-4 rounded-xl"
                style={card}
              >
                {/* Client info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {company?.name ?? deal?.title ?? '—'}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {deal?.value != null && (
                      <span className="text-xs font-medium" style={{ color: '#10b981' }}>
                        {fmt(deal.value)}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                      desde {new Date(p.start_date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <ProjectMondayInput projectId={p.id} mondayUrl={p.monday_url} />
                  <ProjectStatusToggle projectId={p.id} status={p.status as 'active' | 'paused' | 'closed'} />
                  <Link
                    href={`/deals/${p.deal_id}`}
                    className="text-xs"
                    style={{ color: 'var(--text-dim)' }}
                    title="Ver negócio"
                  >
                    ↗
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
