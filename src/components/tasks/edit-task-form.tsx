'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { updateTask } from '@/server/actions/task'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Contact { id: string; name: string }
interface Deal { id: string; title: string }
interface Props {
  task: {
    id: string
    title: string
    due_date: string | null
    contact_id: string | null
    deal_id: string | null
  }
  contacts: Contact[]
  deals: Deal[]
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar'}
    </Button>
  )
}

export function EditTaskForm({ task, contacts, deals }: Props) {
  const [state, formAction] = useActionState(updateTask, null)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={task.id} />
      {state?.error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">{state.error}</div>
      )}
      <div className="space-y-1">
        <Label htmlFor="title">Título *</Label>
        <Input id="title" name="title" required defaultValue={task.title} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="due_date">Data de vencimento</Label>
        <Input id="due_date" name="due_date" type="date" defaultValue={task.due_date ?? ''} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="contact_id">Contato</Label>
        <select
          id="contact_id"
          name="contact_id"
          defaultValue={task.contact_id ?? ''}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">Nenhum</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="deal_id">Negócio</Label>
        <select
          id="deal_id"
          name="deal_id"
          defaultValue={task.deal_id ?? ''}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">Nenhum</option>
          {deals.map((d) => (
            <option key={d.id} value={d.id}>{d.title}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <SubmitButton />
        <Link href="/tasks" className={cn(buttonVariants({ variant: 'outline' }))}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
