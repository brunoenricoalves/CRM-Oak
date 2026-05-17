'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { createActivity } from '@/server/actions/activity'
import { Button } from '@/components/ui/button'

interface ActivityFormProps {
  contactId?: string
  companyId?: string
  dealId?: string
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Salvando...' : 'Registrar'}
    </Button>
  )
}

export function ActivityForm({ contactId, companyId, dealId }: ActivityFormProps) {
  const [state, formAction] = useActionState(createActivity, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
      toast.success('Atividade registrada')
    }
    if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {contactId && <input type="hidden" name="contact_id" value={contactId} />}
      {companyId && <input type="hidden" name="company_id" value={companyId} />}
      {dealId && <input type="hidden" name="deal_id" value={dealId} />}

      <select
        name="type"
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        defaultValue="note"
      >
        <option value="note">Nota</option>
        <option value="call">Ligação</option>
        <option value="email">Email</option>
        <option value="meeting">Reunião</option>
      </select>

      <textarea
        name="body"
        required
        rows={3}
        placeholder="Descreva a atividade..."
        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-400"
      />

      <SubmitButton />
    </form>
  )
}
