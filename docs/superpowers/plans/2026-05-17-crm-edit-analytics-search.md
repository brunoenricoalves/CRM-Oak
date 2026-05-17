# CRM Plan 3 — Edit Pages, Deal Close, Dashboard Analytics, List Search

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix broken edit links (contacts/companies/deals), add deal win/lose actions, enrich dashboard with analytics, and add search to list pages.

**Architecture:** Edit pages are Server Components that fetch data and pass defaultValues to dedicated client form components. Deal close/reopen use new `Promise<void>` server actions bound directly to `<form action>`. Dashboard runs parallel Supabase queries and aggregates in JS. List search uses URL searchParams (server-side filtering) with a shared client SearchInput component wrapped in Suspense.

**Tech Stack:** Next.js 16 App Router, Supabase, shadcn/ui v4 (@base-ui — NO `asChild`), `useActionState`/`useFormStatus`, `useRouter`/`useSearchParams`, lucide-react

---

## File Map

| File | Action |
|------|--------|
| `src/components/contacts/edit-contact-form.tsx` | Create |
| `src/app/(app)/contacts/[id]/edit/page.tsx` | Create |
| `src/components/companies/edit-company-form.tsx` | Create |
| `src/app/(app)/companies/[id]/edit/page.tsx` | Create |
| `src/components/deals/edit-deal-form.tsx` | Create |
| `src/app/(app)/deals/[id]/edit/page.tsx` | Create |
| `src/server/actions/deal.ts` | Modify — add `closeDeal`, `reopenDeal` |
| `src/app/(app)/deals/[id]/page.tsx` | Modify — add Win/Lose/Reopen buttons |
| `src/app/(app)/dashboard/page.tsx` | Modify — add analytics sections |
| `src/components/ui/search-input.tsx` | Create |
| `src/app/(app)/contacts/page.tsx` | Modify — searchParams + SearchInput |
| `src/app/(app)/companies/page.tsx` | Modify — searchParams + SearchInput |

---

## Task 1: Edit Pages — Contact, Company, Deal

**Files:**
- Create: `src/components/contacts/edit-contact-form.tsx`
- Create: `src/app/(app)/contacts/[id]/edit/page.tsx`
- Create: `src/components/companies/edit-company-form.tsx`
- Create: `src/app/(app)/companies/[id]/edit/page.tsx`
- Create: `src/components/deals/edit-deal-form.tsx`
- Create: `src/app/(app)/deals/[id]/edit/page.tsx`

- [ ] **Step 1: Criar EditContactForm**

```typescript
// src/components/contacts/edit-contact-form.tsx
'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { updateContact } from '@/server/actions/contact'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Company { id: string; name: string }
interface Props {
  contact: { id: string; name: string; email: string | null; phone: string | null; company_id: string | null }
  companies: Company[]
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar'}
    </Button>
  )
}

export function EditContactForm({ contact, companies }: Props) {
  const [state, formAction] = useActionState(updateContact, null)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={contact.id} />
      {state?.error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">{state.error}</div>
      )}
      <div className="space-y-1">
        <Label htmlFor="name">Nome *</Label>
        <Input id="name" name="name" required defaultValue={contact.name} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" defaultValue={contact.email ?? ''} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone">Telefone</Label>
        <Input id="phone" name="phone" defaultValue={contact.phone ?? ''} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="company_id">Empresa</Label>
        <select
          id="company_id"
          name="company_id"
          defaultValue={contact.company_id ?? ''}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">Nenhuma</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <SubmitButton />
        <Link href={`/contacts/${contact.id}`} className={cn(buttonVariants({ variant: 'outline' }))}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Criar página /contacts/[id]/edit**

```typescript
// src/app/(app)/contacts/[id]/edit/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { EditContactForm } from '@/components/contacts/edit-contact-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditContactPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const [{ data: contact }, { data: companies }] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, name, email, phone, company_id')
      .eq('id', id)
      .eq('org_id', orgId!)
      .single(),
    supabase
      .from('companies')
      .select('id, name')
      .eq('org_id', orgId!)
      .order('name'),
  ])

  if (!contact) notFound()

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href={`/contacts/${id}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Contato
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Editar contato</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do contato</CardTitle>
        </CardHeader>
        <CardContent>
          <EditContactForm contact={contact} companies={companies ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 3: Criar EditCompanyForm**

```typescript
// src/components/companies/edit-company-form.tsx
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
```

- [ ] **Step 4: Criar página /companies/[id]/edit**

```typescript
// src/app/(app)/companies/[id]/edit/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { EditCompanyForm } from '@/components/companies/edit-company-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditCompanyPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, domain, industry, size')
    .eq('id', id)
    .eq('org_id', orgId!)
    .single()

  if (!company) notFound()

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href={`/companies/${id}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Empresa
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Editar empresa</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <EditCompanyForm company={company} />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: Criar EditDealForm**

```typescript
// src/components/deals/edit-deal-form.tsx
'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { updateDeal } from '@/server/actions/deal'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

interface Stage { id: string; name: string }
interface Contact { id: string; name: string }
interface Company { id: string; name: string }
interface Props {
  deal: {
    id: string
    title: string
    value: number | null
    stage_id: string | null
    contact_id: string | null
    company_id: string | null
    close_date: string | null
  }
  stages: Stage[]
  contacts: Contact[]
  companies: Company[]
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar'}
    </Button>
  )
}

export function EditDealForm({ deal, stages, contacts, companies }: Props) {
  const [state, formAction] = useActionState(updateDeal, null)

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={deal.id} />
      {state?.error && (
        <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">{state.error}</div>
      )}
      <div className="space-y-1">
        <Label htmlFor="title">Título *</Label>
        <Input id="title" name="title" required defaultValue={deal.title} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="value">Valor (R$)</Label>
        <Input
          id="value"
          name="value"
          type="number"
          step="0.01"
          min="0"
          defaultValue={deal.value !== null ? String(deal.value) : ''}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="stage_id">Etapa</Label>
        <select
          id="stage_id"
          name="stage_id"
          defaultValue={deal.stage_id ?? ''}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">Sem etapa</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="contact_id">Contato</Label>
        <select
          id="contact_id"
          name="contact_id"
          defaultValue={deal.contact_id ?? ''}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">Nenhum</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="company_id">Empresa</Label>
        <select
          id="company_id"
          name="company_id"
          defaultValue={deal.company_id ?? ''}
          className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="">Nenhuma</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="close_date">Data de fechamento</Label>
        <Input
          id="close_date"
          name="close_date"
          type="date"
          defaultValue={deal.close_date ?? ''}
        />
      </div>
      <div className="flex gap-3 pt-2">
        <SubmitButton />
        <Link href={`/deals/${deal.id}`} className={cn(buttonVariants({ variant: 'outline' }))}>
          Cancelar
        </Link>
      </div>
    </form>
  )
}
```

- [ ] **Step 6: Criar página /deals/[id]/edit**

```typescript
// src/app/(app)/deals/[id]/edit/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { EditDealForm } from '@/components/deals/edit-deal-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditDealPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const [
    { data: deal },
    { data: stages },
    { data: contacts },
    { data: companies },
  ] = await Promise.all([
    supabase
      .from('deals')
      .select('id, title, value, stage_id, contact_id, company_id, close_date')
      .eq('id', id)
      .eq('org_id', orgId!)
      .single(),
    supabase
      .from('pipeline_stages')
      .select('id, name')
      .eq('org_id', orgId!)
      .order('position'),
    supabase
      .from('contacts')
      .select('id, name')
      .eq('org_id', orgId!)
      .order('name'),
    supabase
      .from('companies')
      .select('id, name')
      .eq('org_id', orgId!)
      .order('name'),
  ])

  if (!deal) notFound()

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href={`/deals/${id}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Negócio
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Editar negócio</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do negócio</CardTitle>
        </CardHeader>
        <CardContent>
          <EditDealForm
            deal={deal}
            stages={stages ?? []}
            contacts={contacts ?? []}
            companies={companies ?? []}
          />
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 7: Build parcial e commit**

```bash
cd /Users/brunoalves/CRM && npm run build 2>&1 | tail -30
git add src/components/contacts/edit-contact-form.tsx \
        "src/app/(app)/contacts/[id]/edit/page.tsx" \
        src/components/companies/edit-company-form.tsx \
        "src/app/(app)/companies/[id]/edit/page.tsx" \
        src/components/deals/edit-deal-form.tsx \
        "src/app/(app)/deals/[id]/edit/page.tsx"
git commit -m "feat: add edit pages for contacts, companies, and deals"
```

---

## Task 2: Deal Close — Ganho / Perdido / Reabrir

**Files:**
- Modify: `src/server/actions/deal.ts`
- Modify: `src/app/(app)/deals/[id]/page.tsx`

- [ ] **Step 1: Adicionar closeDeal e reopenDeal em deal.ts**

Adicionar ao final de `src/server/actions/deal.ts` (antes do último `}`):

```typescript
export async function closeDeal(id: string, status: 'won' | 'lost'): Promise<void> {
  const orgId = await getActiveOrgId()
  if (!orgId) return

  const supabase = await createClient()
  await supabase
    .from('deals')
    .update({ status, closed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', orgId)

  revalidatePath(`/deals/${id}`)
  revalidatePath('/deals')
  revalidatePath('/dashboard')
}

export async function reopenDeal(id: string): Promise<void> {
  const orgId = await getActiveOrgId()
  if (!orgId) return

  const supabase = await createClient()
  await supabase
    .from('deals')
    .update({ status: 'open', closed_at: null })
    .eq('id', id)
    .eq('org_id', orgId)

  revalidatePath(`/deals/${id}`)
  revalidatePath('/deals')
  revalidatePath('/dashboard')
}
```

- [ ] **Step 2: Atualizar deals/[id]/page.tsx com botões Win/Lose/Reopen**

Substituir o bloco de imports e o bloco `<div className="flex gap-2">` no arquivo existente:

```typescript
// src/app/(app)/deals/[id]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteDeal, closeDeal, reopenDeal } from '@/server/actions/deal'
import { ActivityFeed } from '@/components/activities/activity-feed'
import { ActivityForm } from '@/components/activities/activity-form'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DealDetailPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: deal } = await supabase
    .from('deals')
    .select(
      'id, title, value, status, close_date, contacts(id, name), companies(id, name), pipeline_stages(name)'
    )
    .eq('id', id)
    .eq('org_id', orgId!)
    .single()

  if (!deal) notFound()

  const statusLabel: Record<string, string> = {
    open: 'Aberto',
    won: 'Ganho',
    lost: 'Perdido',
  }

  const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
    open: 'secondary',
    won: 'default',
    lost: 'destructive',
  }

  const contact = deal.contacts as { id: string; name: string } | null
  const company = deal.companies as { id: string; name: string } | null
  const stage = deal.pipeline_stages as { name: string } | null

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/deals" className="text-sm text-slate-500 hover:text-slate-700">
            ← Negócios
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-slate-900">{deal.title}</h1>
            <Badge variant={statusVariant[deal.status] ?? 'secondary'}>
              {statusLabel[deal.status] ?? deal.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {deal.status === 'open' && (
            <>
              <form action={closeDeal.bind(null, id, 'won')}>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" type="submit">
                  Ganho ✓
                </Button>
              </form>
              <form action={closeDeal.bind(null, id, 'lost')}>
                <Button variant="outline" size="sm" type="submit" className="text-red-600 border-red-200 hover:bg-red-50">
                  Perdido ✗
                </Button>
              </form>
            </>
          )}
          {deal.status !== 'open' && (
            <form action={reopenDeal.bind(null, id)}>
              <Button variant="outline" size="sm" type="submit">
                Reabrir
              </Button>
            </form>
          )}
          <Link
            href={`/deals/${id}/edit`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <Pencil className="w-4 h-4 mr-1" />
            Editar
          </Link>
          <form action={deleteDeal.bind(null, id)}>
            <Button
              variant="outline"
              size="sm"
              type="submit"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informações</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <span className="text-slate-500">Valor</span>
                <p className="font-medium text-green-600">
                  {deal.value !== null
                    ? new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(deal.value)
                    : '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Etapa</span>
                <p className="font-medium">{stage?.name ?? '—'}</p>
              </div>
              <div>
                <span className="text-slate-500">Fechamento</span>
                <p className="font-medium">
                  {deal.close_date
                    ? new Date(deal.close_date).toLocaleDateString('pt-BR')
                    : '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Contato</span>
                <p className="font-medium">
                  {contact ? (
                    <Link href={`/contacts/${contact.id}`} className="text-blue-600 hover:underline">
                      {contact.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Empresa</span>
                <p className="font-medium">
                  {company ? (
                    <Link href={`/companies/${company.id}`} className="text-blue-600 hover:underline">
                      {company.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Registrar atividade</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityForm dealId={id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed dealId={id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/deal.ts "src/app/(app)/deals/[id]/page.tsx"
git commit -m "feat: add win/lose/reopen actions to deal detail page"
```

---

## Task 3: Dashboard Analytics

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Substituir dashboard/page.tsx completo**

```typescript
// src/app/(app)/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Users, Building2, Handshake, CheckSquare, TrendingUp, Clock } from 'lucide-react'

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

const activityTypeLabel: Record<string, string> = {
  note: 'Nota',
  call: 'Ligação',
  email: 'E-mail',
  meeting: 'Reunião',
}

export default async function DashboardPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: contactsCount },
    { count: companiesCount },
    { count: dealsCount },
    { count: tasksCount },
    { data: stageDeals },
    { data: wonDeals },
    { data: recentActivities },
    { data: overdueTasks },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('org_id', orgId!),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('org_id', orgId!),
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).eq('status', 'open'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).eq('done', false),
    supabase
      .from('deals')
      .select('stage_id, value, pipeline_stages(name)')
      .eq('org_id', orgId!)
      .eq('status', 'open'),
    supabase
      .from('deals')
      .select('value')
      .eq('org_id', orgId!)
      .eq('status', 'won')
      .gte('closed_at', startOfMonth),
    supabase
      .from('activities')
      .select('id, type, body, created_at, contacts(name), deals(title), companies(name)')
      .eq('org_id', orgId!)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('tasks')
      .select('id, title, due_date')
      .eq('org_id', orgId!)
      .eq('done', false)
      .not('due_date', 'is', null)
      .lte('due_date', today)
      .order('due_date')
      .limit(5),
  ])

  // Aggregate pipeline by stage
  const pipelineMap = new Map<string, { name: string; count: number; value: number }>()
  for (const deal of stageDeals ?? []) {
    const stage = deal.pipeline_stages as { name: string } | null
    const key = deal.stage_id ?? 'none'
    const name = stage?.name ?? 'Sem etapa'
    const entry = pipelineMap.get(key) ?? { name, count: 0, value: 0 }
    pipelineMap.set(key, { name: entry.name, count: entry.count + 1, value: entry.value + (deal.value ?? 0) })
  }
  const pipeline = Array.from(pipelineMap.values())
  const maxPipelineValue = Math.max(...pipeline.map((s) => s.value), 1)

  const wonThisMonthValue = wonDeals?.reduce((sum, d) => sum + (d.value ?? 0), 0) ?? 0
  const wonThisMonthCount = wonDeals?.length ?? 0

  const stats = [
    { label: 'Contatos', count: contactsCount ?? 0, icon: Users, href: '/contacts', color: 'text-blue-500' },
    { label: 'Empresas', count: companiesCount ?? 0, icon: Building2, href: '/companies', color: 'text-indigo-500' },
    { label: 'Negócios abertos', count: dealsCount ?? 0, icon: Handshake, href: '/deals', color: 'text-green-500' },
    { label: 'Tarefas pendentes', count: tasksCount ?? 0, icon: CheckSquare, href: '/tasks', color: 'text-orange-500' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <Link key={s.href} href={s.href}>
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500">{s.label}</CardTitle>
                  <Icon className={`w-5 h-5 ${s.color}`} />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-900">{s.count}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Pipeline + Won this month */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="col-span-2">
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <TrendingUp className="w-4 h-4 text-slate-400" />
            <CardTitle className="text-sm font-medium">Pipeline por etapa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pipeline.length === 0 ? (
              <p className="text-slate-400 text-sm">Nenhum negócio em aberto</p>
            ) : (
              pipeline.map((stage) => (
                <div key={stage.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{stage.name}</span>
                    <span className="text-slate-500">{stage.count} · {fmt(stage.value)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(stage.value / maxPipelineValue) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-500">Ganhos este mês</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{fmt(wonThisMonthValue)}</p>
            <p className="text-sm text-slate-500 mt-1">
              {wonThisMonthCount} negócio{wonThisMonthCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent activities + Overdue tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Atividades recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {!recentActivities?.length ? (
              <p className="text-slate-400 text-sm">Nenhuma atividade ainda</p>
            ) : (
              <ul className="space-y-3">
                {recentActivities.map((a) => {
                  const contact = a.contacts as { name: string } | null
                  const deal = a.deals as { title: string } | null
                  const company = a.companies as { name: string } | null
                  const subject = contact?.name ?? deal?.title ?? company?.name ?? '—'
                  return (
                    <li key={a.id} className="text-sm">
                      <span className="font-medium text-slate-700">
                        {activityTypeLabel[a.type] ?? a.type}
                      </span>
                      <span className="text-slate-400"> · {subject}</span>
                      {a.body && (
                        <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{a.body}</p>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Clock className="w-4 h-4 text-orange-400" />
            <CardTitle className="text-sm font-medium">Tarefas vencidas</CardTitle>
          </CardHeader>
          <CardContent>
            {!overdueTasks?.length ? (
              <p className="text-slate-400 text-sm">Nenhuma tarefa vencida</p>
            ) : (
              <ul className="space-y-2">
                {overdueTasks.map((t) => (
                  <li key={t.id} className="flex items-start justify-between text-sm gap-2">
                    <span className="text-slate-700 leading-tight">{t.title}</span>
                    <span className="text-orange-500 text-xs whitespace-nowrap shrink-0">
                      {t.due_date
                        ? new Date(t.due_date).toLocaleDateString('pt-BR')
                        : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {overdueTasks && overdueTasks.length > 0 && (
              <Link href="/tasks" className="text-xs text-blue-600 hover:underline mt-3 block">
                Ver todas →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add "src/app/(app)/dashboard/page.tsx"
git commit -m "feat: enrich dashboard with pipeline analytics, won this month, and overdue tasks"
```

---

## Task 4: List Search — Contacts e Companies

**Files:**
- Create: `src/components/ui/search-input.tsx`
- Modify: `src/app/(app)/contacts/page.tsx`
- Modify: `src/app/(app)/companies/page.tsx`

- [ ] **Step 1: Criar SearchInput**

`useSearchParams()` requer um Suspense boundary no pai. O componente é `'use client'` e usa debounce de 300ms para não disparar uma request por tecla.

```typescript
// src/components/ui/search-input.tsx
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Search } from 'lucide-react'
import { useRef } from 'react'

interface Props {
  placeholder: string
  defaultValue?: string
}

export function SearchInput({ placeholder, defaultValue }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) {
        params.set('q', value)
      } else {
        params.delete('q')
      }
      router.push(`${pathname}?${params.toString()}`)
    }, 300)
  }

  return (
    <div className="relative max-w-xs">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
      <Input
        placeholder={placeholder}
        defaultValue={defaultValue}
        onChange={handleChange}
        className="pl-9"
      />
    </div>
  )
}
```

- [ ] **Step 2: Atualizar contacts/page.tsx com searchParams e SearchInput**

```typescript
// src/app/(app)/contacts/page.tsx
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function ContactsPage({ searchParams }: Props) {
  const { q } = await searchParams
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  let query = supabase
    .from('contacts')
    .select('id, name, email, phone, companies(name)')
    .eq('org_id', orgId!)
    .order('name')

  if (q) query = query.ilike('name', `%${q}%`)

  const { data: contacts } = await query

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Contatos</h1>
        <Link href="/contacts/new" className={buttonVariants()}>
          Novo contato
        </Link>
      </div>

      <div className="mb-4">
        <Suspense>
          <SearchInput placeholder="Buscar contatos..." defaultValue={q} />
        </Suspense>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {!contacts || contacts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium">
              {q ? `Nenhum contato encontrado para "${q}"` : 'Nenhum contato ainda'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Telefone</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Empresa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contacts.map((contact) => {
                const company = contact.companies as { name: string } | null
                return (
                  <tr key={contact.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/contacts/${contact.id}`} className="font-medium text-blue-600 hover:underline">
                        {contact.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{contact.email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{contact.phone ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{company?.name ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Atualizar companies/page.tsx com searchParams e SearchInput**

```typescript
// src/app/(app)/companies/page.tsx
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function CompaniesPage({ searchParams }: Props) {
  const { q } = await searchParams
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  let query = supabase
    .from('companies')
    .select('id, name, domain, industry, size')
    .eq('org_id', orgId!)
    .order('name')

  if (q) query = query.ilike('name', `%${q}%`)

  const { data: companies } = await query

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
        <Link href="/companies/new" className={buttonVariants()}>
          Nova empresa
        </Link>
      </div>

      <div className="mb-4">
        <Suspense>
          <SearchInput placeholder="Buscar empresas..." defaultValue={q} />
        </Suspense>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {!companies || companies.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium">
              {q ? `Nenhuma empresa encontrada para "${q}"` : 'Nenhuma empresa ainda'}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Domínio</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Setor</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Tamanho</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/companies/${company.id}`} className="font-medium text-blue-600 hover:underline">
                      {company.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{company.domain ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{company.industry ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{company.size ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/search-input.tsx \
        "src/app/(app)/contacts/page.tsx" \
        "src/app/(app)/companies/page.tsx"
git commit -m "feat: add search to contacts and companies list pages"
```

---

## Task 5: Build Final + Commit do Plano

- [ ] **Step 1: Rodar build completo**

```bash
cd /Users/brunoalves/CRM && npm run build 2>&1 | tail -40
```

Esperado: `✓ Generating static pages` sem erros de TypeScript.

- [ ] **Step 2: Corrigir erros se houver**

Se houver erros de TypeScript, corrigi-los inline e re-rodar o build.

- [ ] **Step 3: Commit do plano**

```bash
git add docs/superpowers/plans/2026-05-17-crm-edit-analytics-search.md
git commit -m "docs: add Plan 3 — edit pages, deal close, dashboard analytics, search"
```
