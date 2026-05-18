'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Salvando...' : 'Criar campo'}
    </Button>
  )
}

export function CreateCustomFieldForm({ action }: { action: (prev: unknown, fd: FormData) => Promise<{ success?: boolean; error?: string }> }) {
  const [state, formAction] = useActionState(action, null)
  const [fieldType, setFieldType] = useState('text')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
      setFieldType('text')
      toast.success('Campo criado')
    }
    if (state?.error) toast.error(state.error)
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Nome do campo</label>
        <input
          name="name"
          required
          placeholder="Ex: LinkedIn, Segmento, Prioridade..."
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Entidade</label>
        <select
          name="entity_type"
          required
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="contact">Contatos</option>
          <option value="company">Empresas</option>
          <option value="deal">Negócios</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
        <select
          name="field_type"
          required
          value={fieldType}
          onChange={(e) => setFieldType(e.target.value)}
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="text">Texto</option>
          <option value="number">Número</option>
          <option value="date">Data</option>
          <option value="select">Seleção</option>
          <option value="checkbox">Checkbox</option>
        </select>
      </div>
      {fieldType === 'select' && (
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Opções (separadas por vírgula)</label>
          <input
            name="options"
            placeholder="Ex: Alto, Médio, Baixo"
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}
      <SubmitButton />
    </form>
  )
}
