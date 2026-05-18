'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

const PRESET_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#6366f1', '#a855f7', '#ec4899',
  '#64748b', '#0ea5e9',
]

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Salvando...' : 'Criar tag'}
    </Button>
  )
}

export function CreateTagForm({ action }: { action: (prev: unknown, fd: FormData) => Promise<{ success?: boolean; error?: string }> }) {
  const [state, formAction] = useActionState(action, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
      toast.success('Tag criada')
    }
    if (state?.error) toast.error(state.error)
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Nome</label>
        <input
          name="name"
          required
          placeholder="Ex: VIP, Prospect, Urgente..."
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-2">Cor</label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map((color) => (
            <label key={color} className="cursor-pointer">
              <input type="radio" name="color" value={color} className="sr-only" defaultChecked={color === '#6366f1'} />
              <span
                className="block w-7 h-7 rounded-full border-2 border-transparent hover:border-slate-300 transition-colors"
                style={{ backgroundColor: color }}
              />
            </label>
          ))}
        </div>
      </div>
      <SubmitButton />
    </form>
  )
}
