'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Goal {
  year: number
  month: number
  goal: number
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending} className="w-full">
      {pending ? 'Salvando...' : 'Salvar meta'}
    </Button>
  )
}

export function GoalForm({
  action,
  currentYear,
  currentMonth,
  monthNames,
  goals,
}: {
  action: (prev: unknown, fd: FormData) => Promise<{ success?: boolean; error?: string }>
  currentYear: number
  currentMonth: number
  monthNames: string[]
  goals: Goal[]
}) {
  const [state, formAction] = useActionState(action, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) toast.success('Meta salva')
    if (state?.error) toast.error(state.error)
  }, [state])

  const currentGoal = goals.find((g) => g.year === currentYear && g.month === currentMonth)

  const years = [currentYear - 1, currentYear, currentYear + 1]

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Mês</label>
          <select
            name="month"
            defaultValue={currentMonth}
            className="w-full border border-slate-200 rounded-md px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {monthNames.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Ano</label>
          <select
            name="year"
            defaultValue={currentYear}
            className="w-full border border-slate-200 rounded-md px-2 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Meta (R$)</label>
        <input
          name="goal"
          type="number"
          min="0"
          step="100"
          required
          defaultValue={currentGoal?.goal ?? ''}
          placeholder="Ex: 50000"
          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <SubmitButton />
    </form>
  )
}
