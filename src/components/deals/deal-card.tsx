import Link from 'next/link'

interface DealCardProps {
  deal: {
    id: string
    title: string
    value: number | null
    contacts: { name: string } | null
    companies: { name: string } | null
  }
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)

export function DealCard({ deal }: DealCardProps) {
  return (
    <Link href={`/deals/${deal.id}`} className="block group">
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--surface-border)',
          borderRadius: 10,
          padding: '12px',
          cursor: 'pointer',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        className="group-hover:[border-color:rgba(37,99,235,0.3)] group-hover:[box-shadow:0_0_20px_-8px_rgba(37,99,235,0.3)]"
      >
        <p className="font-medium text-sm leading-snug" style={{ color: 'rgba(255,255,255,0.82)' }}>
          {deal.title}
        </p>
        {deal.value !== null && (
          <p className="text-sm font-semibold mt-1.5" style={{ color: 'var(--accent3)', fontFamily: 'var(--font-syne)' }}>
            {fmt(deal.value)}
          </p>
        )}
        {deal.contacts && (
          <p className="text-xs mt-1" style={{ color: 'var(--text-dim)' }}>{deal.contacts.name}</p>
        )}
        {deal.companies && (
          <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
            {deal.companies.name}
          </span>
        )}
      </div>
    </Link>
  )
}
