import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { updateProposalStatus, deleteProposal } from '@/server/actions/proposal'
import { CheckCircle2, XCircle, Trash2 } from 'lucide-react'

interface ProposalListProps {
  dealId: string
}

const statusBadge = {
  sent:     { label: 'Aguardando', bg: 'rgba(251,191,36,0.15)', color: '#f59e0b' },
  accepted: { label: 'Aceita',     bg: 'rgba(52,211,153,0.15)', color: '#10b981' },
  rejected: { label: 'Recusada',   bg: 'rgba(239,68,68,0.15)',  color: '#ef4444' },
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export async function ProposalList({ dealId }: ProposalListProps) {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, title, status, sent_at, notes, proposal_items(service, description, value, position)')
    .eq('deal_id', dealId)
    .eq('org_id', orgId!)
    .order('sent_at', { ascending: false })

  if (!proposals || proposals.length === 0) {
    return (
      <p className="text-sm text-center py-4" style={{ color: 'var(--text-dim)' }}>
        Nenhuma proposta registrada
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {proposals.map((p) => {
        const items = (p.proposal_items ?? []).sort((a, b) => a.position - b.position)
        const total = items.reduce((s, it) => s + Number(it.value), 0)
        const badge = statusBadge[p.status as keyof typeof statusBadge] ?? statusBadge.sent

        return (
          <div
            key={p.id}
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'var(--bg)', border: '1px solid var(--surface-border)' }}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {p.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
                  {new Date(p.sent_at).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: 'short', year: 'numeric',
                  })}
                </p>
              </div>
              <span
                className="shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ background: badge.bg, color: badge.color }}
              >
                {badge.label}
              </span>
            </div>

            {/* Items */}
            <div className="space-y-1">
              {items.map((it, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {it.service}{it.description ? ` — ${it.description}` : ''}
                  </span>
                  <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                    {fmt(Number(it.value))}
                  </span>
                </div>
              ))}
              <div
                className="flex items-center justify-between text-sm font-semibold pt-1 mt-1"
                style={{ borderTop: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
              >
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>

            {/* Notes */}
            {p.notes && (
              <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{p.notes}</p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              {p.status === 'sent' && (
                <>
                  <form action={updateProposalStatus.bind(null, p.id, 'accepted', dealId)}>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium transition-all"
                      style={{ minHeight: 36, background: 'rgba(52,211,153,0.12)', color: '#10b981', border: 'none' }}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Aceita
                    </button>
                  </form>
                  <form action={updateProposalStatus.bind(null, p.id, 'rejected', dealId)}>
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium transition-all"
                      style={{ minHeight: 36, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none' }}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Recusada
                    </button>
                  </form>
                </>
              )}
              <form
                action={deleteProposal.bind(null, p.id, dealId)}
                className="ml-auto"
              >
                <button
                  type="submit"
                  style={{ background: 'none', border: 'none', color: 'var(--text-faint)', minHeight: 36, padding: '0 4px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )
      })}
    </div>
  )
}
