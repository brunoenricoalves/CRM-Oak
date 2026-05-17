'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { inviteMember } from '@/server/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Enviando...' : 'Enviar convite'}
    </Button>
  )
}

export function InviteForm() {
  const [state, formAction] = useActionState(inviteMember, null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Convidar membro</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">{state.error}</div>
          )}
          {state?.success && (
            <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md">
              Convite enviado com sucesso!
            </div>
          )}
          <div className="space-y-1">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="nome@empresa.com"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="role">Papel</Label>
            <select
              id="role"
              name="role"
              className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              defaultValue="member"
            >
              <option value="member">Membro</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <SubmitButton />
        </form>
      </CardContent>
    </Card>
  )
}
