'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { updateDeal } from '@/server/actions/deal'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Stage { id: string; name: string }
interface Contact { id: string; name: string }
interface Company { id: string; name: string }
interface Props {
  deal: {
    id: string
    title: string
    value: number | null
    stage_id: string | null
    contact_id: string | null
    company_id: string | null
    close_date: string | null
  }
  stages: Stage[]
  contacts: Contact[]
  companies: Company[]
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar'}
    </Button>
  )
}

export function EditDealForm({ deal, stages, contacts, companies }: Props) {
  const [state, formAction] = useActionState(updateDeal, null)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={deal.id} />
      {state?.error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">{state.error}</div>
      )}
      <div className="space-y-1">
        <Label htmlFor="title">Título *</Label>
        <Input id="title" name="title" required defaultValue={deal.title} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="value">Valor (R$)</Label>
        <Input
          id="value"
          name="value"
          type="number"
          step="0.01"
          min="0"
          defaultValue={deal.value !== null ? String(deal.value) : ''}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="stage_id">Etapa</Label>
        <select
          id="stage_id"
          name="stage_id"
          defaultValue={deal.stage_id ?? ''}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">Sem etapa</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="contact_id">Contato</Label>
        <select
          id="contact_id"
          name="contact_id"
          defaultValue={deal.contact_id ?? ''}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">Nenhum</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="company_id">Empresa</Label>
        <select
          id="company_id"
          name="company_id"
          defaultValue={deal.company_id ?? ''}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">Nenhuma</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="close_date">Data de fechamento</Label>
        <Input
          id="close_date"
          name="close_date"
          type="date"
          defaultValue={deal.close_date ?? ''}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <SubmitButton />
        <Link href={`/deals/${deal.id}`} className={cn(buttonVariants({ variant: 'outline' }))}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
