'use client'

import { useActionState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updatePassword } from '@/server/actions/auth'

type State = { error?: string } | undefined

export default function ResetPasswordPage() {
  const [state, action, pending] = useActionState<State, FormData>(
    (_prev, formData) => updatePassword(formData),
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
        <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>Defina sua nova senha</p>
      </div>
      <form action={action} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password" style={{ color: 'var(--text-secondary)' }}>Nova senha</Label>
          <Input id="password" name="password" type="password" required placeholder="Mínimo 8 caracteres" minLength={8} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm" style={{ color: 'var(--text-secondary)' }}>Confirmar senha</Label>
          <Input id="confirm" name="confirm" type="password" required placeholder="Repita a senha" minLength={8} />
        </div>
        {state?.error && (
          <p className="text-sm" style={{ color: '#f87171' }}>{state.error}</p>
        )}
        <Button type="submit" className="w-full mt-2" disabled={pending}
          style={{ background: 'var(--accent1)', color: '#fff', border: 'none' }}>
          {pending ? 'Salvando...' : 'Salvar nova senha'}
        </Button>
      </form>
    </div>
  )
}
