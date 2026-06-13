'use client'

import { useActionState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signup } from '@/server/actions/auth'
import Link from 'next/link'

type State = { error?: string } | undefined

export function SignupForm() {
  const [state, action, pending] = useActionState<State, FormData>(
    (_prev, formData) => signup(formData),
    undefined
  )

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--surface-border)',
      borderRadius: 16,
      padding: '32px',
      boxShadow: '0 0 60px -20px rgba(124,111,255,0.25)',
    }}>
      <div className="mb-8">
        <Image src="/logo-oak.png" alt="Oak" width={80} height={23} priority style={{ filter: 'brightness(0) invert(1)' }} />
        <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>Crie sua conta para começar</p>
      </div>
      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="name" style={{ color: 'var(--text-secondary)' }}>Seu nome</Label>
          <Input id="name" name="name" required placeholder="João Silva" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="orgName" style={{ color: 'var(--text-secondary)' }}>Nome da empresa</Label>
          <Input id="orgName" name="orgName" required placeholder="Minha Empresa" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" style={{ color: 'var(--text-secondary)' }}>Email</Label>
          <Input id="email" name="email" type="email" required placeholder="voce@empresa.com" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" style={{ color: 'var(--text-secondary)' }}>Senha</Label>
          <Input id="password" name="password" type="password" required placeholder="••••••••" />
        </div>
        {state?.error && (
          <p className="text-sm" style={{ color: '#f87171' }}>{state.error}</p>
        )}
        <Button type="submit" className="w-full mt-2" disabled={pending}
          style={{ background: 'var(--accent1)', color: '#fff', border: 'none' }}>
          {pending ? 'Criando conta...' : 'Criar conta'}
        </Button>
        <p className="text-sm text-center pt-1" style={{ color: 'var(--text-dim)' }}>
          Já tem conta?{' '}
          <Link href="/login" className="font-medium" style={{ color: 'var(--accent1)' }}>Entrar</Link>
        </p>
      </form>
    </div>
  )
}
