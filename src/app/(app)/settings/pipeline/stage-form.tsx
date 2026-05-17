'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { createStage } from '@/server/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Adicionando...' : 'Adicionar etapa'}
    </Button>
  )
}

export function StageForm() {
  const [state, formAction] = useActionState(createStage, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
      toast.success('Etapa adicionada')
    }
    if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nova etapa</CardTitle>
      </CardHeader>
      <CardContent>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Nome da etapa *</Label>
            <Input id="name" name="name" required placeholder="Ex: Qualificação" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="color">Cor</Label>
            <input
              id="color"
              name="color"
              type="color"
              defaultValue="#3b82f6"
              className="h-9 w-20 rounded-md border border-slate-200 cursor-pointer"
            />
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  )
}
