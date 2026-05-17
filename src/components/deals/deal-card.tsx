import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface DealCardProps {
  deal: {
    id: string
    title: string
    value: number | null
    contacts: { name: string } | null
    companies: { name: string } | null
  }
}

export function DealCard({ deal }: DealCardProps) {
  return (
    <Link href={`/deals/${deal.id}`} className="block">
      <div className="bg-white rounded-md border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <p className="font-medium text-slate-900 text-sm leading-snug">{deal.title}</p>
        {deal.value !== null && (
          <p className="text-sm text-green-600 font-medium mt-1">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
              deal.value
            )}
          </p>
        )}
        {deal.contacts && (
          <p className="text-xs text-slate-500 mt-1">{deal.contacts.name}</p>
        )}
        {deal.companies && (
          <Badge variant="secondary" className="mt-2 text-xs">
            {deal.companies.name}
          </Badge>
        )}
      </div>
    </Link>
  )
}
