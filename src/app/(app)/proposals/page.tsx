import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'

interface Props {
  searchParams: Promise<{ status?: string }>
}

const TABS = [
  { value: '',         label: 'Todas' },
  { value: 'sent',     label: 'Enviadas' },
  { value: 'accepted', label: 'Aceitas' },
  { value: 'rejected', label: 'Recusadas' },
]

const statusBadge = {
  sent:     { label: 'Aguardando', bg: 'rgba(251,191,36,0.15)', color: '#f59e0b' },
  accepted: { label: 'Aceita',     bg: 'rgba(52,211,153,0.15)', color: '#10b981' },
  rejected: { label: 'Recusada',   bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default async function ProposalsPage({ searchParams }: Props) {
  const { status } = await searchParams
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  let query = supabase
    .from('proposals')
    .select('id, title, status, sent_at, deal_id, deals(title), companies(name), proposal_items(value)')
    .eq('org_id', orgId!)
    .order('sent_at', { ascending: false })

  if (status) query = query.eq('status', status)

  const { data: proposals } = await query

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
          Propostas
        </h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: 'var(--surface)', border: '1px solid var(--surface-border)' }}>
        {TABS.map((tab) => {
          const active = (status ?? '') === tab.value
          return (
            <Link
              key={tab.value}
              href={tab.value ? `/proposals?status=${tab.value}` : '/proposals'}
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
      {!proposals || proposals.length === 0 ? (
        <div
          className="p-12 text-center rounded-xl"
          style={card}
        >
          <p className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
            Nenhuma proposta encontrada
          </p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>
            Crie propostas dentro de um negócio em{' '}
            <Link href="/deals" style={{ color: '#2563eb' }}>Negócios</Link>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => {
            const items = p.proposal_items ?? []
            const total = items.reduce((s: number, it: { value: unknown }) => s + Number(it.value), 0)
            const badge = statusBadge[p.status as keyof typeof statusBadge] ?? statusBadge.sent
            const company = p.companies as { name: string } | null
            const deal = p.deals as { title: string } | null

            return (
              <Link
                key={p.id}
                href={`/deals/${p.deal_id}`}
                className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl transition-all"
                style={{ ...card, display: 'flex' }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(37,99,235,0.3)')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--surface-border)')}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {p.title}
                  </p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-dim)' }}>
                    {company?.name ?? deal?.title ?? '—'}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {fmt(total)}
                  </span>
                  <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
                    {new Date(p.sent_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {badge.label}
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
