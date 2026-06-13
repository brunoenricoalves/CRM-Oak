'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { updateOrgName } from '@/server/actions/settings'
import { Input } from '@/components/ui/input'
import { ChevronRight } from 'lucide-react'

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--surface-border)',
  borderRadius: 12,
}

const settingLinks = [
  { href: '/settings/pipeline', label: 'Pipeline de vendas', desc: 'Gerencie as etapas do seu funil' },
  { href: '/settings/members', label: 'Membros', desc: 'Convide e gerencie membros da equipe' },
  { href: '/settings/tags', label: 'Tags', desc: 'Crie tags para classificar registros' },
  { href: '/settings/custom-fields', label: 'Campos personalizados', desc: 'Adicione campos customizados aos seus registros' },
  { href: '/settings/email-templates', label: 'Templates de email', desc: 'Crie templates reutilizáveis para emails' },
]

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
      style={{ background: 'var(--accent1)', color: '#fff', opacity: pending ? 0.6 : 1 }}
    >
      {pending ? 'Salvando...' : 'Salvar'}
    </button>
  )
}

export default function SettingsPage() {
  const [state, formAction] = useActionState(updateOrgName, null)

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
        Configurações
      </h1>

      <div className="space-y-2 mb-8">
        {settingLinks.map(({ href, label, desc }) => (
          <Link key={href} href={href} className="flex items-center gap-4 p-4 rounded-xl transition-colors group"
            style={card}
          >
            <div className="flex-1">
              <p className="font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-dim)' }}>{desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-faint)' }} />
          </Link>
        ))}
      </div>

      <div style={{ ...card, padding: '20px' }}>
        <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>
          Organização
        </p>
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <div className="text-sm p-3 rounded-lg" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>{state.error}</div>
          )}
          {state?.success && (
            <div className="text-sm p-3 rounded-lg" style={{ background: 'rgba(52,211,153,0.1)', color: '#34d399' }}>Salvo com sucesso!</div>
          )}
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: 'var(--text-muted)' }}>Nome da organização</label>
            <Input id="name" name="name" required />
          </div>
          <SubmitButton />
        </form>
      </div>
    </div>
  )
}
