'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { updateCompany } from '@/server/actions/company'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Props {
  company: { id: string; name: string; domain: string | null; industry: string | null; size: string | null }
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar'}
    </Button>
  )
}

export function EditCompanyForm({ company }: Props) {
  const [state, formAction] = useActionState(updateCompany, null)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={company.id} />
      {state?.error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">{state.error}</div>
      )}
      <div className="space-y-1">
        <Label htmlFor="name">Nome *</Label>
        <Input id="name" name="name" required defaultValue={company.name} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="domain">Domínio</Label>
        <Input id="domain" name="domain" placeholder="empresa.com.br" defaultValue={company.domain ?? ''} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="industry">Setor</Label>
        <Input id="industry" name="industry" placeholder="Tecnologia, Varejo..." defaultValue={company.industry ?? ''} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="size">Tamanho</Label>
        <select
          id="size"
          name="size"
          defaultValue={company.size ?? ''}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">Selecione</option>
          <option value="1-10">1-10 funcionários</option>
          <option value="11-50">11-50 funcionários</option>
          <option value="51-200">51-200 funcionários</option>
          <option value="201-500">201-500 funcionários</option>
          <option value="500+">500+ funcionários</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <SubmitButton />
        <Link href={`/companies/${company.id}`} className={cn(buttonVariants({ variant: 'outline' }))}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
