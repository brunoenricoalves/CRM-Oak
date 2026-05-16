'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { signup } from '@/server/actions/auth'
import Link from 'next/link'

type State = { error?: string } | undefined

export function SignupForm() {
  const [state, action, pending] = useActionState<State, FormData>(
    (_prev, formData) => signup(formData),
    undefined
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Seu nome</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="orgName">Nome da organização</Label>
            <Input id="orgName" name="orgName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {state?.error && (
            <p className="text-sm text-red-500">{state.error}</p>
          )}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Criando conta...' : 'Criar conta'}
          </Button>
          <p className="text-sm text-center text-slate-500">
            Já tem conta?{' '}
            <Link href="/login" className="underline">Entrar</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
