'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { createContact } from '@/server/actions/contact'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar contato'}
    </Button>
  )
}

export default function NewContactPage() {
  const [state, formAction] = useActionState(createContact, null)

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/contacts" className="text-sm text-slate-500 hover:text-slate-700">
          ← Voltar
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Novo contato</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do contato</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">{state.error}</div>
            )}
            <div className="space-y-1">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="flex gap-3 pt-2">
              <SubmitButton />
              <Button variant="outline" asChild>
                <Link href="/contacts">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
