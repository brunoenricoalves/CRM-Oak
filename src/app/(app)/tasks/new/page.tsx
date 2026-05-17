'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { createTask } from '@/server/actions/task'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar tarefa'}
    </Button>
  )
}

export default function NewTaskPage() {
  const [state, formAction] = useActionState(createTask, null)

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/tasks" className="text-sm text-slate-500 hover:text-slate-700">
          ← Voltar
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Nova tarefa</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados da tarefa</CardTitle>
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
              <Label htmlFor="due_date">Data de vencimento</Label>
              <Input id="due_date" name="due_date" type="date" />
            </div>
            <div className="flex gap-3 pt-2">
              <SubmitButton />
              <Link href="/tasks" className={cn(buttonVariants({ variant: 'outline' }))}>
                Cancelar
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
