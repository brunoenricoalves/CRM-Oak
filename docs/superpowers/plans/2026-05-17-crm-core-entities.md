# CRM Core Entities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar as entidades principais do CRM: App Shell (sidebar + header), Contacts, Companies, Deals Kanban, Tasks, Activities, Detail pages e Settings.

**Architecture:** Next.js 15 App Router com Server Components por padrão; Client Components apenas onde necessário (interatividade, DnD, formulários com useActionState). Org context resolvido no servidor via cookie `active_org_id`. Kanban com @dnd-kit.

**Tech Stack:** Next.js 15, TypeScript, Supabase (PostgreSQL + RLS), shadcn/ui v4 (@base-ui/react), Tailwind CSS, @dnd-kit/core + @dnd-kit/sortable, lucide-react, sonner (toasts), Zod, Vitest

---

## File Structure

**New files:**
- `src/lib/org.ts` — getActiveOrg(), getActiveOrgId()
- `src/lib/utils/position.ts` — float8 position helpers
- `src/components/layout/sidebar.tsx` — Client Component
- `src/components/layout/app-header.tsx` — Server Component
- `src/lib/validations/contact.ts`
- `src/lib/validations/company.ts`
- `src/lib/validations/deal.ts`
- `src/lib/validations/task.ts`
- `src/lib/validations/activity.ts`
- `src/server/actions/contact.ts`
- `src/server/actions/company.ts`
- `src/server/actions/deal.ts`
- `src/server/actions/task.ts`
- `src/server/actions/activity.ts`
- `src/server/actions/settings.ts`
- `src/app/(app)/contacts/page.tsx`
- `src/app/(app)/contacts/new/page.tsx`
- `src/app/(app)/contacts/[id]/page.tsx`
- `src/app/(app)/companies/page.tsx`
- `src/app/(app)/companies/new/page.tsx`
- `src/app/(app)/companies/[id]/page.tsx`
- `src/app/(app)/deals/page.tsx`
- `src/app/(app)/deals/new/page.tsx`
- `src/app/(app)/deals/[id]/page.tsx`
- `src/app/(app)/tasks/page.tsx`
- `src/app/(app)/settings/page.tsx`
- `src/app/(app)/settings/pipeline/page.tsx`
- `src/app/(app)/settings/members/page.tsx`
- `src/components/deals/kanban-board.tsx` — Client Component (DnD)
- `src/components/deals/deal-card.tsx`
- `src/components/activities/activity-feed.tsx`
- `src/components/activities/activity-form.tsx` — Client Component
- `src/components/tasks/task-list.tsx`

**Modified files:**
- `src/server/actions/auth.ts` — set/clear active_org_id cookie
- `src/app/(app)/layout.tsx` — sidebar + header + org context
- `src/app/layout.tsx` — add Toaster

---

### Task 1: App Shell — Org Context + Layout + Sidebar + Header

**Files:**
- Create: `src/lib/org.ts`
- Modify: `src/server/actions/auth.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/(app)/layout.tsx`
- Create: `src/components/layout/sidebar.tsx`
- Create: `src/components/layout/app-header.tsx`

- [ ] **Step 1: Criar src/lib/org.ts**

```typescript
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function getActiveOrgId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('active_org_id')?.value ?? null
}

export async function getActiveOrg() {
  const supabase = await createClient()
  const orgId = await getActiveOrgId()
  if (!orgId) return null
  const { data } = await supabase
    .from('organizations')
    .select('id, name, slug, plan')
    .eq('id', orgId)
    .single()
  return data
}

export async function requireActiveOrg() {
  const org = await getActiveOrg()
  if (!org) throw new Error('No active org')
  return org
}
```

- [ ] **Step 2: Atualizar src/server/actions/auth.ts para setar/limpar cookie active_org_id**

Substituir o arquivo inteiro:

```typescript
'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signupSchema, loginSchema } from '@/lib/validations/auth'
import { generateSlug } from '@/lib/utils/slug'

export async function login(formData: FormData) {
  const raw = { email: formData.get('email'), password: formData.get('password') }
  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: 'Email ou senha inválidos' }

  const { data: memberships } = await supabase
    .from('org_members')
    .select('org_id')
    .limit(1)

  if (memberships && memberships.length > 0) {
    const cookieStore = await cookies()
    cookieStore.set('active_org_id', memberships[0].org_id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    })
  }

  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const raw = {
    name: formData.get('name'),
    orgName: formData.get('orgName'),
    email: formData.get('email'),
    password: formData.get('password'),
  }
  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name } },
  })
  if (authError || !authData.user) return { error: authError?.message ?? 'Erro ao criar conta' }

  const admin = createAdminClient()
  const slug = generateSlug(parsed.data.orgName)
  const { data: orgId, error: orgError } = await admin.rpc('create_org_and_admin', {
    p_name: parsed.data.orgName,
    p_slug: slug,
    p_user_id: authData.user.id,
  })
  if (orgError) return { error: 'Erro ao criar organização' }

  if (orgId) {
    const cookieStore = await cookies()
    cookieStore.set('active_org_id', orgId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    })
  }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete('active_org_id')
  redirect('/login')
}
```

- [ ] **Step 3: Adicionar Toaster ao root layout (src/app/layout.tsx)**

```typescript
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'CRM Sales Hub',
  description: 'CRM by Oak Agência',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Criar src/components/layout/sidebar.tsx (Client Component)**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Building2,
  Handshake,
  CheckSquare,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contatos', icon: Users },
  { href: '/companies', label: 'Empresas', icon: Building2 },
  { href: '/deals', label: 'Negócios', icon: Handshake },
  { href: '/tasks', label: 'Tarefas', icon: CheckSquare },
  { href: '/settings', label: 'Configurações', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen bg-slate-900 flex flex-col">
      <div className="px-6 py-5 border-b border-slate-700">
        <span className="text-white font-bold text-lg">CRM Sales Hub</span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 5: Criar src/components/layout/app-header.tsx (Server Component)**

```typescript
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/server/actions/auth'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'

export async function AppHeader({ orgName }: { orgName: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userName = user?.user_metadata?.name ?? user?.email ?? 'Usuário'

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6">
      <div className="text-sm text-slate-500">{orgName}</div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1">
            {userName}
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <form action={logout}>
              <button type="submit" className="w-full text-left">Sair</button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
```

- [ ] **Step 6: Atualizar src/app/(app)/layout.tsx**

```typescript
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { getActiveOrg } from '@/lib/org'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const org = await getActiveOrg()
  if (!org) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader orgName={org.name} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/org.ts src/server/actions/auth.ts src/app/layout.tsx src/app/\(app\)/layout.tsx src/components/layout/sidebar.tsx src/components/layout/app-header.tsx
git commit -m "feat: add app shell — org context, sidebar, header, layout"
```

---

### Task 2: Contacts — Validações + Server Actions + List + Form

**Files:**
- Create: `src/lib/validations/contact.ts`
- Create: `src/server/actions/contact.ts`
- Create: `src/app/(app)/contacts/page.tsx`
- Create: `src/app/(app)/contacts/new/page.tsx`

- [ ] **Step 1: Criar src/lib/validations/contact.ts**

```typescript
import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  company_id: z.string().uuid('Empresa inválida').optional().or(z.literal('')),
  owner_id: z.string().uuid().optional().or(z.literal('')),
})

export type ContactInput = z.infer<typeof contactSchema>
```

- [ ] **Step 2: Criar src/server/actions/contact.ts**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { contactSchema } from '@/lib/validations/contact'

export async function createContact(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const raw = {
    name: formData.get('name'),
    email: formData.get('email') || undefined,
    phone: formData.get('phone') || undefined,
    company_id: formData.get('company_id') || undefined,
    owner_id: formData.get('owner_id') || undefined,
  }

  const parsed = contactSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const insert: Record<string, string> = {
    name: parsed.data.name,
    org_id: orgId,
    owner_id: parsed.data.owner_id || user.id,
  }
  if (parsed.data.email) insert.email = parsed.data.email
  if (parsed.data.phone) insert.phone = parsed.data.phone
  if (parsed.data.company_id) insert.company_id = parsed.data.company_id

  const { error } = await supabase.from('contacts').insert(insert)
  if (error) return { error: error.message }

  revalidatePath('/contacts')
  redirect('/contacts')
}

export async function updateContact(_prev: unknown, formData: FormData) {
  const id = formData.get('id') as string
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const raw = {
    name: formData.get('name'),
    email: formData.get('email') || undefined,
    phone: formData.get('phone') || undefined,
    company_id: formData.get('company_id') || undefined,
  }

  const parsed = contactSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const update: Record<string, string | null> = { name: parsed.data.name }
  update.email = parsed.data.email || null
  update.phone = parsed.data.phone || null
  update.company_id = parsed.data.company_id || null

  const { error } = await supabase.from('contacts').update(update).eq('id', id).eq('org_id', orgId)
  if (error) return { error: error.message }

  revalidatePath(`/contacts/${id}`)
  revalidatePath('/contacts')
  redirect(`/contacts/${id}`)
}

export async function deleteContact(id: string) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const supabase = await createClient()
  const { error } = await supabase.from('contacts').delete().eq('id', id).eq('org_id', orgId)
  if (error) return { error: error.message }

  revalidatePath('/contacts')
  redirect('/contacts')
}
```

- [ ] **Step 3: Criar src/app/(app)/contacts/page.tsx**

```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function ContactsPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name, email, phone, updated_at, companies(name)')
    .eq('org_id', orgId!)
    .order('name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Contatos</h1>
        <Button asChild>
          <Link href="/contacts/new">
            <Plus className="w-4 h-4 mr-2" />
            Novo contato
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {!contacts || contacts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium">Nenhum contato ainda</p>
            <p className="text-sm mt-1">Crie seu primeiro contato para começar</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Telefone</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Empresa</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${c.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {(c.companies as { name: string } | null)?.name ?? '—'}
                  </td>
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

- [ ] **Step 4: Criar src/app/(app)/contacts/new/page.tsx**

```typescript
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
        <Link href="/contacts" className="text-sm text-slate-500 hover:text-slate-700">← Voltar</Link>
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
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/contact.ts src/server/actions/contact.ts src/app/\(app\)/contacts/
git commit -m "feat: add contacts list, create form, and server actions"
```

---

### Task 3: Companies — Validações + Server Actions + List + Form

**Files:**
- Create: `src/lib/validations/company.ts`
- Create: `src/server/actions/company.ts`
- Create: `src/app/(app)/companies/page.tsx`
- Create: `src/app/(app)/companies/new/page.tsx`

- [ ] **Step 1: Criar src/lib/validations/company.ts**

```typescript
import { z } from 'zod'

export const companySchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  domain: z.string().optional().or(z.literal('')),
  industry: z.string().optional().or(z.literal('')),
  size: z.string().optional().or(z.literal('')),
})

export type CompanyInput = z.infer<typeof companySchema>
```

- [ ] **Step 2: Criar src/server/actions/company.ts**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { companySchema } from '@/lib/validations/company'

export async function createCompany(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const raw = {
    name: formData.get('name'),
    domain: formData.get('domain') || undefined,
    industry: formData.get('industry') || undefined,
    size: formData.get('size') || undefined,
  }

  const parsed = companySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const insert: Record<string, string> = { name: parsed.data.name, org_id: orgId }
  if (parsed.data.domain) insert.domain = parsed.data.domain
  if (parsed.data.industry) insert.industry = parsed.data.industry
  if (parsed.data.size) insert.size = parsed.data.size

  const { error } = await supabase.from('companies').insert(insert)
  if (error) return { error: error.message }

  revalidatePath('/companies')
  redirect('/companies')
}

export async function updateCompany(_prev: unknown, formData: FormData) {
  const id = formData.get('id') as string
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const raw = {
    name: formData.get('name'),
    domain: formData.get('domain') || undefined,
    industry: formData.get('industry') || undefined,
    size: formData.get('size') || undefined,
  }

  const parsed = companySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from('companies')
    .update({
      name: parsed.data.name,
      domain: parsed.data.domain || null,
      industry: parsed.data.industry || null,
      size: parsed.data.size || null,
    })
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return { error: error.message }

  revalidatePath(`/companies/${id}`)
  revalidatePath('/companies')
  redirect(`/companies/${id}`)
}

export async function deleteCompany(id: string) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const supabase = await createClient()
  const { error } = await supabase.from('companies').delete().eq('id', id).eq('org_id', orgId)
  if (error) return { error: error.message }

  revalidatePath('/companies')
  redirect('/companies')
}
```

- [ ] **Step 3: Criar src/app/(app)/companies/page.tsx**

```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function CompaniesPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, domain, industry, size')
    .eq('org_id', orgId!)
    .order('name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
        <Button asChild>
          <Link href="/companies/new">
            <Plus className="w-4 h-4 mr-2" />
            Nova empresa
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {!companies || companies.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium">Nenhuma empresa ainda</p>
            <p className="text-sm mt-1">Cadastre sua primeira empresa para começar</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Domínio</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Setor</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tamanho</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/companies/${c.id}`} className="font-medium text-slate-900 hover:text-blue-600">
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.domain ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{c.industry ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{c.size ?? '—'}</td>
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

- [ ] **Step 4: Criar src/app/(app)/companies/new/page.tsx**

```typescript
'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { createCompany } from '@/server/actions/company'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar empresa'}
    </Button>
  )
}

export default function NewCompanyPage() {
  const [state, formAction] = useActionState(createCompany, null)

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/companies" className="text-sm text-slate-500 hover:text-slate-700">← Voltar</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Nova empresa</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados da empresa</CardTitle></CardHeader>
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
              <Label htmlFor="domain">Domínio</Label>
              <Input id="domain" name="domain" placeholder="empresa.com.br" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="industry">Setor</Label>
              <Input id="industry" name="industry" placeholder="Tecnologia, Varejo..." />
            </div>
            <div className="space-y-1">
              <Label htmlFor="size">Tamanho</Label>
              <select
                id="size"
                name="size"
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
              <Button variant="outline" asChild>
                <Link href="/companies">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/company.ts src/server/actions/company.ts src/app/\(app\)/companies/
git commit -m "feat: add companies list, create form, and server actions"
```

---

### Task 4: Position Utility + Deal Validações + Server Actions

**Files:**
- Create: `src/lib/utils/position.ts`
- Create: `src/lib/validations/deal.ts`
- Create: `src/server/actions/deal.ts`

- [ ] **Step 1: Criar src/lib/utils/position.ts**

```typescript
const GAP = 1000
const REBALANCE_THRESHOLD = 0.001

export function getInsertPosition(positions: number[]): number {
  if (positions.length === 0) return GAP
  return Math.max(...positions) + GAP
}

export function getInsertBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return GAP
  if (before === null) return after! / 2
  if (after === null) return before + GAP
  return (before + after) / 2
}

export function needsRebalance(positions: number[]): boolean {
  if (positions.length < 2) return false
  const sorted = [...positions].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] < REBALANCE_THRESHOLD) return true
  }
  return false
}

export function rebalancePositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * GAP)
}
```

- [ ] **Step 2: Criar src/lib/validations/deal.ts**

```typescript
import { z } from 'zod'

export const dealSchema = z.object({
  title: z.string().min(2, 'Título deve ter ao menos 2 caracteres'),
  value: z.coerce.number().min(0).optional(),
  stage_id: z.string().uuid('Etapa inválida').optional().or(z.literal('')),
  contact_id: z.string().uuid().optional().or(z.literal('')),
  company_id: z.string().uuid().optional().or(z.literal('')),
  close_date: z.string().optional().or(z.literal('')),
})

export type DealInput = z.infer<typeof dealSchema>
```

- [ ] **Step 3: Criar src/server/actions/deal.ts**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { dealSchema } from '@/lib/validations/deal'
import { getInsertPosition, getInsertBetween, needsRebalance, rebalancePositions } from '@/lib/utils/position'

export async function createDeal(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const raw = {
    title: formData.get('title'),
    value: formData.get('value') || undefined,
    stage_id: formData.get('stage_id') || undefined,
    contact_id: formData.get('contact_id') || undefined,
    company_id: formData.get('company_id') || undefined,
    close_date: formData.get('close_date') || undefined,
  }

  const parsed = dealSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: existing } = await supabase
    .from('deals')
    .select('position')
    .eq('org_id', orgId)
    .order('position', { ascending: false })
    .limit(1)

  const positions = existing?.map((d) => d.position) ?? []
  const position = getInsertPosition(positions)

  const insert: Record<string, unknown> = {
    title: parsed.data.title,
    org_id: orgId,
    owner_id: user.id,
    position,
    status: 'open',
  }
  if (parsed.data.value !== undefined) insert.value = parsed.data.value
  if (parsed.data.stage_id) insert.stage_id = parsed.data.stage_id
  if (parsed.data.contact_id) insert.contact_id = parsed.data.contact_id
  if (parsed.data.company_id) insert.company_id = parsed.data.company_id
  if (parsed.data.close_date) insert.close_date = parsed.data.close_date

  const { error } = await supabase.from('deals').insert(insert)
  if (error) return { error: error.message }

  revalidatePath('/deals')
  redirect('/deals')
}

export async function updateDeal(_prev: unknown, formData: FormData) {
  const id = formData.get('id') as string
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const raw = {
    title: formData.get('title'),
    value: formData.get('value') || undefined,
    stage_id: formData.get('stage_id') || undefined,
    contact_id: formData.get('contact_id') || undefined,
    company_id: formData.get('company_id') || undefined,
    close_date: formData.get('close_date') || undefined,
  }

  const parsed = dealSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const update: Record<string, unknown> = {
    title: parsed.data.title,
    value: parsed.data.value ?? null,
    stage_id: parsed.data.stage_id || null,
    contact_id: parsed.data.contact_id || null,
    company_id: parsed.data.company_id || null,
    close_date: parsed.data.close_date || null,
  }

  const { error } = await supabase.from('deals').update(update).eq('id', id).eq('org_id', orgId)
  if (error) return { error: error.message }

  revalidatePath(`/deals/${id}`)
  revalidatePath('/deals')
  redirect(`/deals/${id}`)
}

export async function moveDeal(dealId: string, newStageId: string, beforePosition: number | null, afterPosition: number | null) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const supabase = await createClient()
  const newPosition = getInsertBetween(beforePosition, afterPosition)

  const { error } = await supabase
    .from('deals')
    .update({ stage_id: newStageId, position: newPosition })
    .eq('id', dealId)
    .eq('org_id', orgId)

  if (error) return { error: error.message }

  const { data: stageDeals } = await supabase
    .from('deals')
    .select('id, position')
    .eq('org_id', orgId)
    .eq('stage_id', newStageId)
    .order('position')

  if (stageDeals && needsRebalance(stageDeals.map((d) => d.position))) {
    const newPositions = rebalancePositions(stageDeals.length)
    await Promise.all(
      stageDeals.map((d, i) =>
        supabase.from('deals').update({ position: newPositions[i] }).eq('id', d.id)
      )
    )
  }

  revalidatePath('/deals')
  return { success: true }
}

export async function deleteDeal(id: string) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const supabase = await createClient()
  const { error } = await supabase.from('deals').delete().eq('id', id).eq('org_id', orgId)
  if (error) return { error: error.message }

  revalidatePath('/deals')
  redirect('/deals')
}
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils/position.ts src/lib/validations/deal.ts src/server/actions/deal.ts
git commit -m "feat: add position utility and deal server actions"
```

---

### Task 5: Deals Kanban Board

**Files:**
- Create: `src/components/deals/deal-card.tsx`
- Create: `src/components/deals/kanban-board.tsx`
- Create: `src/app/(app)/deals/page.tsx`
- Create: `src/app/(app)/deals/new/page.tsx`

- [ ] **Step 1: Criar src/components/deals/deal-card.tsx**

```typescript
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

interface DealCardProps {
  deal: {
    id: string
    title: string
    value: number | null
    contacts: { name: string } | null
    companies: { name: string } | null
  }
}

export function DealCard({ deal }: DealCardProps) {
  return (
    <Link href={`/deals/${deal.id}`} className="block">
      <div className="bg-white rounded-md border border-slate-200 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
        <p className="font-medium text-slate-900 text-sm leading-snug">{deal.title}</p>
        {deal.value !== null && (
          <p className="text-sm text-green-600 font-medium mt-1">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.value)}
          </p>
        )}
        {deal.contacts && (
          <p className="text-xs text-slate-500 mt-1">{deal.contacts.name}</p>
        )}
        {deal.companies && (
          <Badge variant="secondary" className="mt-2 text-xs">{deal.companies.name}</Badge>
        )}
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Criar src/components/deals/kanban-board.tsx (Client Component com DnD)**

```typescript
'use client'

import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { moveDeal } from '@/server/actions/deal'
import { DealCard } from './deal-card'

type Deal = {
  id: string
  title: string
  value: number | null
  stage_id: string | null
  position: number
  contacts: { name: string } | null
  companies: { name: string } | null
}

type Stage = {
  id: string
  name: string
  color: string | null
  position: number
}

interface KanbanBoardProps {
  stages: Stage[]
  deals: Deal[]
}

function SortableDealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: deal.id,
    data: { type: 'deal', deal },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard deal={deal} />
    </div>
  )
}

export function KanbanBoard({ stages, deals }: KanbanBoardProps) {
  const [items, setItems] = useState(deals)
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const activeDeal = activeId ? items.find((d) => d.id === activeId) : null

  function getDealsByStage(stageId: string) {
    return items.filter((d) => d.stage_id === stageId).sort((a, b) => a.position - b.position)
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string)
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeDeal = items.find((d) => d.id === activeId)
    if (!activeDeal) return

    const overStage = stages.find((s) => s.id === overId)
    const overDeal = items.find((d) => d.id === overId)

    const newStageId = overStage?.id ?? overDeal?.stage_id

    if (newStageId && activeDeal.stage_id !== newStageId) {
      setItems((prev) =>
        prev.map((d) => (d.id === activeId ? { ...d, stage_id: newStageId } : d))
      )
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeId = active.id as string
    const activeDeal = items.find((d) => d.id === activeId)
    if (!activeDeal || !activeDeal.stage_id) return

    const stageDeals = getDealsByStage(activeDeal.stage_id)
    const activeIndex = stageDeals.findIndex((d) => d.id === activeId)

    const before = stageDeals[activeIndex - 1]?.position ?? null
    const after = stageDeals[activeIndex + 1]?.position ?? null

    await moveDeal(activeId, activeDeal.stage_id, before, after)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {stages.map((stage) => {
          const stageDeals = getDealsByStage(stage.id)
          return (
            <div key={stage.id} className="flex-shrink-0 w-72">
              <div className="flex items-center gap-2 mb-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stage.color ?? '#94a3b8' }}
                />
                <h3 className="font-medium text-slate-700 text-sm">{stage.name}</h3>
                <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                  {stageDeals.length}
                </span>
              </div>
              <SortableContext
                id={stage.id}
                items={stageDeals.map((d) => d.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="bg-slate-100 rounded-lg p-2 min-h-24 space-y-2">
                  {stageDeals.map((deal) => (
                    <SortableDealCard key={deal.id} deal={deal} />
                  ))}
                </div>
              </SortableContext>
            </div>
          )
        })}
      </div>
      <DragOverlay>
        {activeDeal && <DealCard deal={activeDeal} />}
      </DragOverlay>
    </DndContext>
  )
}
```

- [ ] **Step 3: Criar src/app/(app)/deals/page.tsx**

```typescript
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { Button } from '@/components/ui/button'
import { KanbanBoard } from '@/components/deals/kanban-board'
import { Plus } from 'lucide-react'

export default async function DealsPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const [{ data: stages }, { data: deals }] = await Promise.all([
    supabase
      .from('pipeline_stages')
      .select('id, name, color, position')
      .eq('org_id', orgId!)
      .order('position'),
    supabase
      .from('deals')
      .select('id, title, value, stage_id, position, contacts(name), companies(name)')
      .eq('org_id', orgId!)
      .eq('status', 'open')
      .order('position'),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Negócios</h1>
        <Button asChild>
          <Link href="/deals/new">
            <Plus className="w-4 h-4 mr-2" />
            Novo negócio
          </Link>
        </Button>
      </div>

      {!stages || stages.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-500">
          <p className="text-lg font-medium">Configure o pipeline primeiro</p>
          <p className="text-sm mt-1">
            <Link href="/settings/pipeline" className="text-blue-600 hover:underline">
              Vá para Configurações → Pipeline
            </Link>{' '}
            para criar as etapas do seu pipeline.
          </p>
        </div>
      ) : (
        <KanbanBoard
          stages={stages}
          deals={(deals ?? []).map((d) => ({
            ...d,
            contacts: Array.isArray(d.contacts) ? d.contacts[0] ?? null : d.contacts,
            companies: Array.isArray(d.companies) ? d.companies[0] ?? null : d.companies,
          }))}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Criar src/app/(app)/deals/new/page.tsx**

```typescript
'use client'

import { useActionState, useEffect, useState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { createDeal } from '@/server/actions/deal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar negócio'}
    </Button>
  )
}

export default function NewDealPage() {
  const [state, formAction] = useActionState(createDeal, null)

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/deals" className="text-sm text-slate-500 hover:text-slate-700">← Voltar</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Novo negócio</h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Dados do negócio</CardTitle></CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">{state.error}</div>
            )}
            <div className="space-y-1">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="value">Valor (R$)</Label>
              <Input id="value" name="value" type="number" step="0.01" min="0" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="close_date">Data de fechamento</Label>
              <Input id="close_date" name="close_date" type="date" />
            </div>
            <div className="flex gap-3 pt-2">
              <SubmitButton />
              <Button variant="outline" asChild>
                <Link href="/deals">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/deals/ src/app/\(app\)/deals/
git commit -m "feat: add deals kanban board with drag and drop"
```

---

### Task 6: Tasks — Validações + Server Actions + List

**Files:**
- Create: `src/lib/validations/task.ts`
- Create: `src/server/actions/task.ts`
- Create: `src/app/(app)/tasks/page.tsx`

- [ ] **Step 1: Criar src/lib/validations/task.ts**

```typescript
import { z } from 'zod'

export const taskSchema = z.object({
  title: z.string().min(2, 'Título deve ter ao menos 2 caracteres'),
  due_date: z.string().optional().or(z.literal('')),
  assigned_to: z.string().uuid().optional().or(z.literal('')),
  contact_id: z.string().uuid().optional().or(z.literal('')),
  company_id: z.string().uuid().optional().or(z.literal('')),
  deal_id: z.string().uuid().optional().or(z.literal('')),
})

export type TaskInput = z.infer<typeof taskSchema>
```

- [ ] **Step 2: Criar src/server/actions/task.ts**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { taskSchema } from '@/lib/validations/task'

export async function createTask(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const raw = {
    title: formData.get('title'),
    due_date: formData.get('due_date') || undefined,
    assigned_to: formData.get('assigned_to') || undefined,
    contact_id: formData.get('contact_id') || undefined,
    company_id: formData.get('company_id') || undefined,
    deal_id: formData.get('deal_id') || undefined,
  }

  const parsed = taskSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const insert: Record<string, unknown> = {
    title: parsed.data.title,
    org_id: orgId,
    created_by: user.id,
    done: false,
  }
  if (parsed.data.due_date) insert.due_date = parsed.data.due_date
  if (parsed.data.assigned_to) insert.assigned_to = parsed.data.assigned_to
  if (parsed.data.contact_id) insert.contact_id = parsed.data.contact_id
  if (parsed.data.company_id) insert.company_id = parsed.data.company_id
  if (parsed.data.deal_id) insert.deal_id = parsed.data.deal_id

  const { error } = await supabase.from('tasks').insert(insert)
  if (error) return { error: error.message }

  revalidatePath('/tasks')
  redirect('/tasks')
}

export async function toggleTask(id: string, done: boolean) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ done: !done })
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/tasks')
  return { success: true }
}

export async function deleteTask(id: string) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const supabase = await createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id).eq('org_id', orgId)
  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { success: true }
}
```

- [ ] **Step 3: Criar src/app/(app)/tasks/page.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { toggleTask, deleteTask } from '@/server/actions/task'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckSquare, Square, Trash2 } from 'lucide-react'
import Link from 'next/link'

export default async function TasksPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, done, due_date, contacts(name), deals(title)')
    .eq('org_id', orgId!)
    .order('done')
    .order('due_date', { ascending: true, nullsFirst: false })

  const pending = tasks?.filter((t) => !t.done) ?? []
  const done = tasks?.filter((t) => t.done) ?? []

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Tarefas</h1>
        <Button asChild>
          <Link href="/tasks/new">Nova tarefa</Link>
        </Button>
      </div>

      <div className="space-y-2">
        {pending.length === 0 && done.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-500">
            <p className="text-lg font-medium">Nenhuma tarefa ainda</p>
          </div>
        )}

        {pending.map((task) => (
          <div key={task.id} className="flex items-start gap-3 bg-white rounded-lg border border-slate-200 p-4">
            <form action={toggleTask.bind(null, task.id, task.done)}>
              <button type="submit" className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors">
                <Square className="w-5 h-5" />
              </button>
            </form>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900">{task.title}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                {task.due_date && (
                  <span className="text-xs text-slate-500">
                    Vence: {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </span>
                )}
                {task.contacts && (
                  <Badge variant="secondary" className="text-xs">
                    {(task.contacts as { name: string } | null)?.name}
                  </Badge>
                )}
              </div>
            </div>
            <form action={deleteTask.bind(null, task.id)}>
              <button type="submit" className="text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </form>
          </div>
        ))}

        {done.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-medium text-slate-400 mb-2">Concluídas ({done.length})</h2>
            {done.map((task) => (
              <div key={task.id} className="flex items-center gap-3 bg-white rounded-lg border border-slate-100 p-4 opacity-60 mb-2">
                <form action={toggleTask.bind(null, task.id, task.done)}>
                  <button type="submit" className="text-green-500 hover:text-slate-400 transition-colors">
                    <CheckSquare className="w-5 h-5" />
                  </button>
                </form>
                <p className="flex-1 text-slate-500 line-through">{task.title}</p>
                <form action={deleteTask.bind(null, task.id)}>
                  <button type="submit" className="text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Criar src/app/(app)/tasks/new/page.tsx**

```typescript
'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { createTask } from '@/server/actions/task'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar tarefa'}
    </Button>
  )
}

export default function NewTaskPage() {
  const [state, formAction] = useActionState(createTask, null)

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/tasks" className="text-sm text-slate-500 hover:text-slate-700">← Voltar</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Nova tarefa</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Dados da tarefa</CardTitle></CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">{state.error}</div>
            )}
            <div className="space-y-1">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="due_date">Data de vencimento</Label>
              <Input id="due_date" name="due_date" type="date" />
            </div>
            <div className="flex gap-3 pt-2">
              <SubmitButton />
              <Button variant="outline" asChild>
                <Link href="/tasks">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/task.ts src/server/actions/task.ts src/app/\(app\)/tasks/
git commit -m "feat: add tasks list, create form, toggle, and server actions"
```

---

### Task 7: Activities — Server Actions + Feed + Form

**Files:**
- Create: `src/lib/validations/activity.ts`
- Create: `src/server/actions/activity.ts`
- Create: `src/components/activities/activity-feed.tsx`
- Create: `src/components/activities/activity-form.tsx`

- [ ] **Step 1: Criar src/lib/validations/activity.ts**

```typescript
import { z } from 'zod'

export const activitySchema = z.object({
  type: z.enum(['note', 'call', 'email', 'meeting']),
  body: z.string().min(1, 'Conteúdo obrigatório'),
  contact_id: z.string().uuid().optional().or(z.literal('')),
  company_id: z.string().uuid().optional().or(z.literal('')),
  deal_id: z.string().uuid().optional().or(z.literal('')),
})

export type ActivityInput = z.infer<typeof activitySchema>
```

- [ ] **Step 2: Criar src/server/actions/activity.ts**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { activitySchema } from '@/lib/validations/activity'

export async function createActivity(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const raw = {
    type: formData.get('type'),
    body: formData.get('body'),
    contact_id: formData.get('contact_id') || undefined,
    company_id: formData.get('company_id') || undefined,
    deal_id: formData.get('deal_id') || undefined,
  }

  const parsed = activitySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const insert: Record<string, unknown> = {
    type: parsed.data.type,
    body: parsed.data.body,
    org_id: orgId,
    user_id: user.id,
  }
  if (parsed.data.contact_id) insert.contact_id = parsed.data.contact_id
  if (parsed.data.company_id) insert.company_id = parsed.data.company_id
  if (parsed.data.deal_id) insert.deal_id = parsed.data.deal_id

  const { error } = await supabase.from('activities').insert(insert)
  if (error) return { error: error.message }

  const path = parsed.data.deal_id
    ? `/deals/${parsed.data.deal_id}`
    : parsed.data.contact_id
    ? `/contacts/${parsed.data.contact_id}`
    : parsed.data.company_id
    ? `/companies/${parsed.data.company_id}`
    : '/dashboard'

  revalidatePath(path)
  return { success: true }
}
```

- [ ] **Step 3: Criar src/components/activities/activity-feed.tsx (Server Component)**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { MessageSquare, Phone, Mail, Users } from 'lucide-react'

const typeConfig = {
  note: { icon: MessageSquare, label: 'Nota', color: 'text-slate-500' },
  call: { icon: Phone, label: 'Ligação', color: 'text-blue-500' },
  email: { icon: Mail, label: 'Email', color: 'text-green-500' },
  meeting: { icon: Users, label: 'Reunião', color: 'text-purple-500' },
} as const

interface ActivityFeedProps {
  contactId?: string
  companyId?: string
  dealId?: string
}

export async function ActivityFeed({ contactId, companyId, dealId }: ActivityFeedProps) {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  let query = supabase
    .from('activities')
    .select('id, type, body, created_at')
    .eq('org_id', orgId!)
    .order('created_at', { ascending: false })
    .limit(50)

  if (contactId) query = query.eq('contact_id', contactId)
  else if (companyId) query = query.eq('company_id', companyId)
  else if (dealId) query = query.eq('deal_id', dealId)

  const { data: activities } = await query

  if (!activities || activities.length === 0) {
    return (
      <div className="text-sm text-slate-400 py-4 text-center">Nenhuma atividade ainda</div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.map((a) => {
        const config = typeConfig[a.type as keyof typeof typeConfig] ?? typeConfig.note
        const Icon = config.icon
        return (
          <div key={a.id} className="flex gap-3">
            <div className={`mt-0.5 ${config.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">{config.label}</span>
                <span className="text-xs text-slate-400">
                  {new Date(a.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{a.body}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Criar src/components/activities/activity-form.tsx (Client Component)**

```typescript
'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { createActivity } from '@/server/actions/activity'
import { Button } from '@/components/ui/button'

interface ActivityFormProps {
  contactId?: string
  companyId?: string
  dealId?: string
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Salvando...' : 'Registrar'}
    </Button>
  )
}

export function ActivityForm({ contactId, companyId, dealId }: ActivityFormProps) {
  const [state, formAction] = useActionState(createActivity, null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
      toast.success('Atividade registrada')
    }
    if (state?.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {contactId && <input type="hidden" name="contact_id" value={contactId} />}
      {companyId && <input type="hidden" name="company_id" value={companyId} />}
      {dealId && <input type="hidden" name="deal_id" value={dealId} />}

      <select
        name="type"
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        defaultValue="note"
      >
        <option value="note">Nota</option>
        <option value="call">Ligação</option>
        <option value="email">Email</option>
        <option value="meeting">Reunião</option>
      </select>

      <textarea
        name="body"
        required
        rows={3}
        placeholder="Descreva a atividade..."
        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-400"
      />

      <SubmitButton />
    </form>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/activity.ts src/server/actions/activity.ts src/components/activities/
git commit -m "feat: add activities server action, feed, and form components"
```

---

### Task 8: Detail Pages — Contact, Company, Deal

**Files:**
- Create: `src/app/(app)/contacts/[id]/page.tsx`
- Create: `src/app/(app)/companies/[id]/page.tsx`
- Create: `src/app/(app)/deals/[id]/page.tsx`

- [ ] **Step 1: Criar src/app/(app)/contacts/[id]/page.tsx**

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteContact } from '@/server/actions/contact'
import { ActivityFeed } from '@/components/activities/activity-feed'
import { ActivityForm } from '@/components/activities/activity-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Pencil } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ContactDetailPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: contact } = await supabase
    .from('contacts')
    .select('id, name, email, phone, companies(id, name)')
    .eq('id', id)
    .eq('org_id', orgId!)
    .single()

  if (!contact) notFound()

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/contacts" className="text-sm text-slate-500 hover:text-slate-700">← Contatos</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{contact.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/contacts/${id}/edit`}>
              <Pencil className="w-4 h-4 mr-1" />
              Editar
            </Link>
          </Button>
          <form action={deleteContact.bind(null, id)}>
            <Button variant="outline" size="sm" type="submit" className="text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Informações</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <span className="text-slate-500">Email</span>
                <p className="font-medium">{contact.email ?? '—'}</p>
              </div>
              <div>
                <span className="text-slate-500">Telefone</span>
                <p className="font-medium">{contact.phone ?? '—'}</p>
              </div>
              <div>
                <span className="text-slate-500">Empresa</span>
                <p className="font-medium">
                  {contact.companies
                    ? <Link href={`/companies/${(contact.companies as { id: string; name: string }).id}`} className="text-blue-600 hover:underline">{(contact.companies as { id: string; name: string }).name}</Link>
                    : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Registrar atividade</CardTitle></CardHeader>
            <CardContent>
              <ActivityForm contactId={id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Histórico</CardTitle></CardHeader>
            <CardContent>
              <ActivityFeed contactId={id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Criar src/app/(app)/companies/[id]/page.tsx**

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteCompany } from '@/server/actions/company'
import { ActivityFeed } from '@/components/activities/activity-feed'
import { ActivityForm } from '@/components/activities/activity-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Pencil } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CompanyDetailPage({ params }: Props) {
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

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name, email')
    .eq('company_id', id)
    .eq('org_id', orgId!)
    .order('name')

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/companies" className="text-sm text-slate-500 hover:text-slate-700">← Empresas</Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{company.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/companies/${id}/edit`}>
              <Pencil className="w-4 h-4 mr-1" />
              Editar
            </Link>
          </Button>
          <form action={deleteCompany.bind(null, id)}>
            <Button variant="outline" size="sm" type="submit" className="text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Informações</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <span className="text-slate-500">Domínio</span>
                <p className="font-medium">{company.domain ?? '—'}</p>
              </div>
              <div>
                <span className="text-slate-500">Setor</span>
                <p className="font-medium">{company.industry ?? '—'}</p>
              </div>
              <div>
                <span className="text-slate-500">Tamanho</span>
                <p className="font-medium">{company.size ?? '—'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Contatos ({contacts?.length ?? 0})</CardTitle></CardHeader>
            <CardContent>
              {!contacts || contacts.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum contato</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {contacts.map((c) => (
                    <li key={c.id}>
                      <Link href={`/contacts/${c.id}`} className="font-medium text-blue-600 hover:underline">{c.name}</Link>
                      {c.email && <p className="text-slate-500 text-xs">{c.email}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Registrar atividade</CardTitle></CardHeader>
            <CardContent>
              <ActivityForm companyId={id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Histórico</CardTitle></CardHeader>
            <CardContent>
              <ActivityFeed companyId={id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Criar src/app/(app)/deals/[id]/page.tsx**

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteDeal } from '@/server/actions/deal'
import { ActivityFeed } from '@/components/activities/activity-feed'
import { ActivityForm } from '@/components/activities/activity-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, Pencil } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DealDetailPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: deal } = await supabase
    .from('deals')
    .select('id, title, value, status, close_date, contacts(id, name), companies(id, name), pipeline_stages(name)')
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

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/deals" className="text-sm text-slate-500 hover:text-slate-700">← Negócios</Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-slate-900">{deal.title}</h1>
            <Badge variant={statusVariant[deal.status] ?? 'secondary'}>
              {statusLabel[deal.status] ?? deal.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/deals/${id}/edit`}>
              <Pencil className="w-4 h-4 mr-1" />
              Editar
            </Link>
          </Button>
          <form action={deleteDeal.bind(null, id)}>
            <Button variant="outline" size="sm" type="submit" className="text-red-600 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Informações</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <span className="text-slate-500">Valor</span>
                <p className="font-medium text-green-600">
                  {deal.value !== null
                    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(deal.value)
                    : '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Etapa</span>
                <p className="font-medium">
                  {(deal.pipeline_stages as { name: string } | null)?.name ?? '—'}
                </p>
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
                  {deal.contacts
                    ? <Link href={`/contacts/${(deal.contacts as { id: string; name: string }).id}`} className="text-blue-600 hover:underline">{(deal.contacts as { id: string; name: string }).name}</Link>
                    : '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Empresa</span>
                <p className="font-medium">
                  {deal.companies
                    ? <Link href={`/companies/${(deal.companies as { id: string; name: string }).id}`} className="text-blue-600 hover:underline">{(deal.companies as { id: string; name: string }).name}</Link>
                    : '—'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Registrar atividade</CardTitle></CardHeader>
            <CardContent>
              <ActivityForm dealId={id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm">Histórico</CardTitle></CardHeader>
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

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/contacts/\[id\]/ src/app/\(app\)/companies/\[id\]/ src/app/\(app\)/deals/\[id\]/
git commit -m "feat: add contact, company, and deal detail pages with activity feed"
```

---

### Task 9: Settings — Pipeline + Org + Members

**Files:**
- Create: `src/server/actions/settings.ts`
- Create: `src/app/(app)/settings/page.tsx`
- Create: `src/app/(app)/settings/pipeline/page.tsx`
- Create: `src/app/(app)/settings/members/page.tsx`

- [ ] **Step 1: Criar src/server/actions/settings.ts**

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { z } from 'zod'

const stageSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  color: z.string().optional().or(z.literal('')),
})

export async function createStage(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const parsed = stageSchema.safeParse({
    name: formData.get('name'),
    color: formData.get('color') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('pipeline_stages')
    .select('position')
    .eq('org_id', orgId)
    .order('position', { ascending: false })
    .limit(1)

  const position = existing && existing.length > 0 ? existing[0].position + 1000 : 1000

  const { error } = await supabase.from('pipeline_stages').insert({
    name: parsed.data.name,
    color: parsed.data.color || null,
    org_id: orgId,
    position,
  })
  if (error) return { error: error.message }

  revalidatePath('/settings/pipeline')
  return { success: true }
}

export async function deleteStage(id: string) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('pipeline_stages')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/settings/pipeline')
  return { success: true }
}

export async function updateOrgName(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const name = (formData.get('name') as string)?.trim()
  if (!name || name.length < 2) return { error: 'Nome deve ter ao menos 2 caracteres' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('organizations')
    .update({ name })
    .eq('id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}
```

- [ ] **Step 2: Criar src/app/(app)/settings/page.tsx**

```typescript
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
  return <Button type="submit" size="sm" disabled={pending}>{pending ? 'Salvando...' : 'Salvar'}</Button>
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
      </div>

      <Card>
        <CardHeader><CardTitle>Organização</CardTitle></CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="bg-red-50 text-red-700 text-sm p-3 rounded-md">{state.error}</div>
            )}
            {state?.success && (
              <div className="bg-green-50 text-green-700 text-sm p-3 rounded-md">Salvo com sucesso!</div>
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
```

- [ ] **Step 3: Criar src/app/(app)/settings/pipeline/page.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { createStage, deleteStage } from '@/server/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'

export default async function PipelineSettingsPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('id, name, color, position')
    .eq('org_id', orgId!)
    .order('position')

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700">← Configurações</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Pipeline de vendas</h1>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Etapas do pipeline</CardTitle></CardHeader>
        <CardContent>
          {!stages || stages.length === 0 ? (
            <p className="text-sm text-slate-400 mb-4">Nenhuma etapa criada ainda</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {stages.map((s) => (
                <li key={s.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-md">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.color ?? '#94a3b8' }}
                  />
                  <span className="flex-1 text-sm font-medium">{s.name}</span>
                  <form action={deleteStage.bind(null, s.id)}>
                    <button type="submit" className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Nova etapa</CardTitle></CardHeader>
        <CardContent>
          <form action={createStage.bind(null, null as unknown as unknown)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Nome da etapa *</Label>
              <Input id="name" name="name" required placeholder="Ex: Qualificação" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="color">Cor</Label>
              <input
                id="color"
                name="color"
                type="color"
                defaultValue="#3b82f6"
                className="h-9 w-20 rounded-md border border-slate-200 cursor-pointer"
              />
            </div>
            <Button type="submit">Adicionar etapa</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Criar src/app/(app)/settings/members/page.tsx**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { sendInvite } from '@/server/actions/invite'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

export default async function MembersSettingsPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: members } = await supabase
    .from('org_members')
    .select('user_id, role, invited_at')
    .eq('org_id', orgId!)
    .order('invited_at')

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700">← Configurações</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Membros</h1>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle>Membros da equipe ({members?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(members ?? []).map((m) => (
              <li key={m.user_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-md">
                <span className="text-sm font-mono text-slate-600">{m.user_id.slice(0, 8)}...</span>
                <Badge variant={m.role === 'admin' ? 'default' : 'secondary'}>{m.role}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Convidar membro</CardTitle></CardHeader>
        <CardContent>
          <form action={sendInvite.bind(null, orgId!)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" name="email" type="email" required placeholder="nome@empresa.com" />
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
            <Button type="submit">Enviar convite</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/server/actions/settings.ts src/app/\(app\)/settings/
git commit -m "feat: add settings pages — pipeline stages, org name, member invite"
```

---

### Task 10: Dashboard Update + Build Check

**Files:**
- Modify: `src/app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Atualizar dashboard com resumo**

```typescript
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'
import { Users, Building2, Handshake, CheckSquare } from 'lucide-react'

export default async function DashboardPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const [
    { count: contactsCount },
    { count: companiesCount },
    { count: dealsCount },
    { count: tasksCount },
  ] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('org_id', orgId!),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('org_id', orgId!),
    supabase.from('deals').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).eq('status', 'open'),
    supabase.from('tasks').select('*', { count: 'exact', head: true }).eq('org_id', orgId!).eq('done', false),
  ])

  const stats = [
    { label: 'Contatos', count: contactsCount ?? 0, icon: Users, href: '/contacts', color: 'text-blue-500' },
    { label: 'Empresas', count: companiesCount ?? 0, icon: Building2, href: '/companies', color: 'text-indigo-500' },
    { label: 'Negócios abertos', count: dealsCount ?? 0, icon: Handshake, href: '/deals', color: 'text-green-500' },
    { label: 'Tarefas pendentes', count: tasksCount ?? 0, icon: CheckSquare, href: '/tasks', color: 'text-orange-500' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard</h1>
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
    </div>
  )
}
```

- [ ] **Step 2: Rodar build para verificar erros**

```bash
cd /Users/brunoalves/CRM && npm run build 2>&1 | tail -50
```

Expected: compilação sem erros críticos (warnings de TypeScript em imports de relações Supabase são aceitáveis).

- [ ] **Step 3: Corrigir erros se houver**

Verificar erros de TypeScript e corrigir imports ou tipos incorretos.

- [ ] **Step 4: Commit final**

```bash
git add src/app/\(app\)/dashboard/page.tsx
git commit -m "feat: add dashboard summary stats and complete Plan 2 — core entities"
```
