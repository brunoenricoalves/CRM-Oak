'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { updateOrgName } from '@/server/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar'}
    </Button>
  )
}

export default function SettingsPage() {
  const [state, formAction] = useActionState(updateOrgName, null)

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Configurações</h1>

      <div className="grid gap-4 mb-6">
        <Link href="/settings/pipeline" className="block">
          <Card className="hover:border-slate-400 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <p className="font-medium">Pipeline de vendas</p>
              <p className="text-sm text-slate-500">Gerencie as etapas do seu funil</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/settings/members" className="block">
          <Card className="hover:border-slate-400 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <p className="font-medium">Membros</p>
              <p className="text-sm text-slate-500">Convide e gerencie membros da equipe</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/settings/tags" className="block">
          <Card className="hover:border-slate-400 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <p className="font-medium">Tags</p>
              <p className="text-sm text-slate-500">Crie tags para classificar registros</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/settings/custom-fields" className="block">
          <Card className="hover:border-slate-400 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <p className="font-medium">Campos personalizados</p>
              <p className="text-sm text-slate-500">Adicione campos customizados aos seus registros</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/settings/email-templates" className="block">
          <Card className="hover:border-slate-400 transition-colors cursor-pointer">
            <CardContent className="p-4">
              <p className="font-medium">Templates de email</p>
              <p className="text-sm text-slate-500">Crie templates reutilizáveis para emails</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organização</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">{state.error}</div>
            )}
            {state?.success && (
              <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md">
                Salvo com sucesso!
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="name">Nome da organização</Label>
              <Input id="name" name="name" required />
            </div>
            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
