'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { updateContact } from '@/server/actions/contact'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Company { id: string; name: string }
interface Props {
  contact: { id: string; name: string; email: string | null; phone: string | null; company_id: string | null }
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

export function EditContactForm({ contact, companies }: Props) {
  const [state, formAction] = useActionState(updateContact, null)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={contact.id} />
      {state?.error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">{state.error}</div>
      )}
      <div className="space-y-1">
        <Label htmlFor="name">Nome *</Label>
        <Input id="name" name="name" required defaultValue={contact.name} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={contact.email ?? ''} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" name="phone" defaultValue={contact.phone ?? ''} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="company_id">Empresa</Label>
        <select
          id="company_id"
          name="company_id"
          defaultValue={contact.company_id ?? ''}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">Nenhuma</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <SubmitButton />
        <Link href={`/contacts/${contact.id}`} className={cn(buttonVariants({ variant: 'outline' }))}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
