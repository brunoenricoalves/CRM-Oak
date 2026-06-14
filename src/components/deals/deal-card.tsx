import Link from 'next/link'
import { Building2, DollarSign } from 'lucide-react'

interface DealCardProps {
  deal: {
    id: string
    title: string
    value: number | null
    contacts: { name: string } | null
    companies: { name: string } | null
  }
  dragging?: boolean
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export function DealCard({ deal, dragging }: DealCardProps) {
  return (
    <Link href={`/deals/${deal.id}`} className="block group" onClick={(e) => { if (dragging) e.preventDefault() }}>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--surface-border)',
          borderRadius: 10,
          padding: '12px 14px',
          cursor: dragging ? 'grabbing' : 'grab',
          boxShadow: dragging ? '0 8px 32px -8px rgba(0,0,0,0.5)' : 'none',
          transform: dragging ? 'rotate(1.5deg)' : 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        className="group-hover:[border-color:rgba(37,99,235,0.35)] group-hover:[box-shadow:0_0_20px_-8px_rgba(37,99,235,0.25)]"
      >
        <p className="font-medium text-sm leading-snug mb-2" style={{ color: 'var(--text-primary)' }}>
          {deal.title}
        </p>

        <div className="flex items-center justify-between gap-2">
          {deal.companies && (
            <div className="flex items-center gap-1.5 min-w-0">
              <Building2 className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-faint)' }} />
              <span className="text-xs truncate" style={{ color: 'var(--text-dim)' }}>
                {deal.companies.name}
              </span>
            </div>
          )}
          {deal.value !== null && (
            <span className="text-xs font-semibold flex-shrink-0 flex items-center gap-0.5" style={{ color: 'var(--accent3)' }}>
              <DollarSign className="w-3 h-3" />
              {fmt(deal.value).replace('R$ ', '')}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
