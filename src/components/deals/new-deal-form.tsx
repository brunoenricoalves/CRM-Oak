'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { createDeal } from '@/server/actions/deal'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Stage = { id: string; name: string; color: string | null }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar negócio'}
    </Button>
  )
}

export function NewDealForm({ stages }: { stages: Stage[] }) {
  const [state, formAction] = useActionState(createDeal, null)

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/deals" className="text-sm text-slate-500 hover:text-slate-700">
          ← Voltar
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Novo negócio</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do negócio</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">{state.error}</div>
            )}
            <div className="space-y-1">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="stage_id">Etapa *</Label>
              <select
                id="stage_id"
                name="stage_id"
                required
                defaultValue=""
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px',
                  borderRadius: 8,
                  border: '1px solid var(--surface-border)',
                  background: 'var(--surface)',
                  color: 'var(--text-primary)',
                  fontSize: 14,
                }}
              >
                <option value="" disabled>Selecione uma etapa</option>
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input id="value" name="value" type="number" step="0.01" min="0" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="close_date">Data de fechamento</Label>
              <Input id="close_date" name="close_date" type="date" />
            </div>
            <div className="flex gap-3 pt-2">
              <SubmitButton />
              <Link href="/deals" className={cn(buttonVariants({ variant: 'outline' }))}>
                Cancelar
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
