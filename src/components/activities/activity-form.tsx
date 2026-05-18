'use client'

import { useActionState, useState, useEffect, useRef } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'
import { createActivity } from '@/server/actions/activity'
import { Button } from '@/components/ui/button'

interface Template {
  id: string
  name: string
  subject: string
  body: string
}

interface ActivityFormProps {
  contactId?: string
  companyId?: string
  dealId?: string
  emailTemplates?: Template[]
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Salvando...' : 'Registrar'}
    </Button>
  )
}

export function ActivityForm({ contactId, companyId, dealId, emailTemplates = [] }: ActivityFormProps) {
  const [state, formAction] = useActionState(createActivity, null)
  const [type, setType] = useState('note')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
      setType('note')
      setSubject('')
      setBody('')
      toast.success('Atividade registrada')
    }
    if (state?.error) toast.error(state.error)
  }, [state])

  function applyTemplate(templateId: string) {
    const t = emailTemplates.find((t) => t.id === templateId)
    if (!t) return
    setSubject(t.subject)
    setBody(t.body)
  }

  const showSubject = type === 'email'
  const showSchedule = type === 'call' || type === 'meeting'

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {contactId && <input type="hidden" name="contact_id" value={contactId} />}
      {companyId && <input type="hidden" name="company_id" value={companyId} />}
      {dealId && <input type="hidden" name="deal_id" value={dealId} />}

      <div className="flex gap-2">
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="note">Nota</option>
          <option value="call">Ligação</option>
          <option value="email">Email</option>
          <option value="meeting">Reunião</option>
        </select>

        {showSubject && emailTemplates.length > 0 && (
          <select
            onChange={(e) => applyTemplate(e.target.value)}
            defaultValue=""
            className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>Usar template...</option>
            {emailTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {showSubject && (
        <input
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Assunto do email"
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      <textarea
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        rows={3}
        placeholder={type === 'email' ? 'Corpo do email...' : type === 'call' ? 'Resumo da ligação...' : type === 'meeting' ? 'Resumo da reunião...' : 'Adicionar nota...'}
        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {showSchedule && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">Agendar para:</label>
          <input
            type="datetime-local"
            name="due_at"
            className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <SubmitButton />
    </form>
  )
}
