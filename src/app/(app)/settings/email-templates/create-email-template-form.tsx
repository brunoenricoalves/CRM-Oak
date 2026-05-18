'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Salvando...' : 'Criar template'}
    </Button>
  )
}

export function CreateEmailTemplateForm({
  action,
}: {
  action: (prev: unknown, fd: FormData) => Promise<{ success?: boolean; error?: string }>
}) {
  const [state, formAction] = useActionState(action, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
      toast.success('Template criado')
    }
    if (state?.error) toast.error(state.error)
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Nome do template</label>
        <input
          name="name"
          required
          placeholder="Ex: Primeiro contato, Follow-up..."
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Assunto</label>
        <input
          name="subject"
          required
          placeholder="Ex: Proposta comercial - {{empresa}}"
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Corpo</label>
        <textarea
          name="body"
          required
          rows={5}
          placeholder="Olá {{nome}}, ..."
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <SubmitButton />
    </form>
  )
}
