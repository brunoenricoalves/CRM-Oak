'use client'

import { useActionState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword } from '@/server/actions/auth'

type State = { error?: string; success?: boolean } | undefined

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState<State, FormData>(
    (_prev, formData) => resetPassword(formData),
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
        <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>Recuperar acesso à sua conta</p>
      </div>

      {state?.success ? (
        <div className="space-y-4">
          <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)', color: '#10b981' }}>
            E-mail enviado! Verifique sua caixa de entrada e clique no link para redefinir sua senha.
          </div>
          <Link href="/login" className="block text-sm text-center font-medium" style={{ color: 'var(--accent1)' }}>
            Voltar ao login
          </Link>
        </div>
      ) : (
        <form action={action} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" style={{ color: 'var(--text-secondary)' }}>E-mail</Label>
            <Input id="email" name="email" type="email" required placeholder="voce@empresa.com" />
          </div>
          {state?.error && (
            <p className="text-sm" style={{ color: '#f87171' }}>{state.error}</p>
          )}
          <Button type="submit" className="w-full mt-2" disabled={pending}
            style={{ background: 'var(--accent1)', color: '#fff', border: 'none' }}>
            {pending ? 'Enviando...' : 'Enviar link de recuperação'}
          </Button>
          <p className="text-sm text-center pt-1" style={{ color: 'var(--text-dim)' }}>
            Lembrou a senha?{' '}
            <Link href="/login" className="font-medium" style={{ color: 'var(--accent1)' }}>Entrar</Link>
          </p>
        </form>
      )}
    </div>
  )
}
