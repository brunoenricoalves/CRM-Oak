# CRM Plan 4 — Deploy em Produção (Vercel + Supabase + Resend)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colocar o CRM em produção no Vercel com todas as variáveis de ambiente corretas, emails de convite funcionando via Resend, e o aviso de middleware eliminado.

**Architecture:** Sem mudanças arquiteturais. Apenas: (1) migração do arquivo `middleware.ts` → `proxy.ts` para parar o aviso de deprecação do Next.js 16; (2) repositório GitHub + deploy Vercel; (3) variáveis de ambiente em produção; (4) configuração do Supabase para aceitar o domínio de produção; (5) chave real do Resend.

**Tech Stack:** Next.js 16 (proxy convention), Vercel CLI, Supabase Dashboard, Resend Dashboard

> **Legenda:**
> - 🤖 Passo automatizado — executado pelo agente
> - 🖥️ Passo manual — requer ação do usuário no browser ou terminal

---

## File Map

| File | Action |
|------|--------|
| `src/middleware.ts` | Delete |
| `src/proxy.ts` | Create (mesmo conteúdo, export renomeado) |

---

## Task 1: Migrar middleware.ts → proxy.ts

No Next.js 16, `middleware.ts` foi renomeado para `proxy.ts`. A funcionalidade é idêntica — só muda o arquivo e o nome do export.

**Files:**
- Delete: `src/middleware.ts`
- Create: `src/proxy.ts`

- [ ] 🤖 **Step 1: Criar src/proxy.ts**

```typescript
// src/proxy.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/signup') ||
                     request.nextUrl.pathname.startsWith('/invite')

  if (!user && !isAuthPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
```

- [ ] 🤖 **Step 2: Deletar src/middleware.ts**

```bash
rm src/middleware.ts
```

- [ ] 🤖 **Step 3: Verificar build sem aviso de deprecação**

```bash
npm run build 2>&1 | grep -E "middleware|proxy|warning|error" | head -20
```

Esperado: sem linha `⚠ The "middleware" file convention is deprecated`.

- [ ] 🤖 **Step 4: Commit**

```bash
git add src/proxy.ts src/middleware.ts
git commit -m "fix: migrate middleware.ts to proxy.ts (Next.js 16 convention)"
```

---

## Task 2: Criar repositório GitHub e fazer push

- [ ] 🖥️ **Step 1: Criar repositório no GitHub**

Acesse https://github.com/new e crie um repositório **privado** com o nome `crm` (sem README, sem .gitignore — o projeto já tem).

- [ ] 🤖 **Step 2: Adicionar remote e fazer push**

Substitua `SEU_USUARIO` pelo seu usuário do GitHub:

```bash
git remote add origin https://github.com/SEU_USUARIO/crm.git
git branch -M main
git push -u origin main
```

Esperado: código enviado para o GitHub sem erros.

---

## Task 3: Deploy no Vercel

- [ ] 🖥️ **Step 1: Criar conta Vercel (se não tiver)**

Acesse https://vercel.com e faça login com sua conta GitHub.

- [ ] 🤖 **Step 2: Instalar Vercel CLI**

```bash
npm install -g vercel
```

- [ ] 🤖 **Step 3: Autenticar no Vercel**

```bash
vercel login
```

Esperado: abre o browser para autenticação. Após login, retorna `✅ Logged in`.

- [ ] 🤖 **Step 4: Fazer o deploy inicial**

Execute dentro de `/Users/brunoalves/CRM`:

```bash
vercel
```

Responda às perguntas:
- `Set up and deploy?` → **Y**
- `Which scope?` → selecione sua conta pessoal
- `Link to existing project?` → **N**
- `What's your project's name?` → **crm** (ou o nome que preferir)
- `In which directory is your code located?` → **./** (Enter)
- `Want to modify these settings?` → **N**

Esperado: deploy completo. Vercel exibe uma URL de preview como `https://crm-xxxxx.vercel.app`.

> **Nota:** O primeiro deploy vai falhar por falta das variáveis de ambiente. Isso é esperado. Vamos configurá-las na Task 4 e depois fazer o deploy de produção.

---

## Task 4: Configurar variáveis de ambiente no Vercel

Todas as variáveis devem ser adicionadas nos ambientes **Production**, **Preview** e **Development**.

- [ ] 🖥️ **Step 1: Abrir o projeto no Vercel**

Acesse https://vercel.com/dashboard → clique no projeto `crm` → **Settings** → **Environment Variables**.

- [ ] 🖥️ **Step 2: Adicionar as variáveis**

Adicione cada uma abaixo (Key → Value → marcar todos os environments → Save):

| Key | Valor | Onde encontrar |
|-----|-------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://diudnvhwezkafjeloqkn.supabase.co` | Já conhecido |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` | Supabase Dashboard → Project Settings → API → `anon public` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` | Supabase Dashboard → Project Settings → API → `service_role` (⚠️ secreto, nunca expor) |
| `RESEND_API_KEY` | `re_...` | Resend Dashboard → API Keys → Create API Key (ver Task 6) |
| `NEXT_PUBLIC_APP_URL` | `https://crm.vercel.app` (URL final do seu deploy) | URL que o Vercel atribuiu |

> **Atenção:** `NEXT_PUBLIC_APP_URL` deve ser a URL de produção definitiva. Se tiver domínio customizado, use-o aqui.

- [ ] 🖥️ **Step 3: Fazer redeploy com as variáveis**

No Vercel Dashboard → projeto `crm` → **Deployments** → clique no deploy mais recente → **Redeploy** → **Redeploy** (sem alterar configurações).

Ou via CLI:

```bash
vercel --prod
```

Esperado: deploy de produção completo. URL de produção exibida (ex: `https://crm.vercel.app`).

---

## Task 5: Configurar Supabase para produção

O Supabase precisa saber que o domínio de produção pode fazer autenticação e redirecionamentos.

- [ ] 🖥️ **Step 1: Adicionar URL de produção ao Supabase**

Acesse https://supabase.com/dashboard/project/diudnvhwezkafjeloqkn → **Authentication** → **URL Configuration**.

Configure:
- **Site URL:** `https://crm.vercel.app` (substitua pela URL real)
- **Redirect URLs:** Clique em **Add URL** e adicione:
  - `https://crm.vercel.app/**`
  - `http://localhost:3000/**` (para manter desenvolvimento local funcionando)

Clique em **Save**.

- [ ] 🖥️ **Step 2: Verificar que RLS está ativo**

No Supabase Dashboard → **SQL Editor**, execute:

```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Esperado: `rowsecurity = true` para todas as tabelas (contacts, companies, deals, activities, tasks, pipeline_stages, org_members, invitations, organizations).

- [ ] 🖥️ **Step 3: Testar login em produção**

Acesse a URL de produção, faça login com sua conta e verifique que:
- Redireciona para `/dashboard` após login
- Dashboard exibe os dados corretos
- Navegação entre páginas funciona

---

## Task 6: Configurar Resend e testar convite

- [ ] 🖥️ **Step 1: Criar conta e API key no Resend**

1. Acesse https://resend.com e crie uma conta (grátis)
2. Vá em **API Keys** → **Create API Key**
3. Nome: `crm-production`
4. Permissão: **Full Access**
5. Copie a chave `re_...`

- [ ] 🖥️ **Step 2: Verificar domínio de envio (opcional mas recomendado)**

No Resend → **Domains** → **Add Domain** → adicione seu domínio (ex: `oakagencia.com.br`).

Se não tiver domínio, o Resend usa `onboarding@resend.dev` para testes (apenas para o email do dono da conta).

- [ ] 🖥️ **Step 3: Atualizar RESEND_API_KEY no Vercel**

No Vercel Dashboard → **Settings** → **Environment Variables** → encontre `RESEND_API_KEY` → edite com a chave real → **Save**.

- [ ] 🤖 **Step 4: Verificar o remetente configurado no código**

```bash
grep -n "from\|resend\|Resend" src/server/actions/settings.ts
```

Verifique o campo `from:` no `resend.emails.send()`. Se estiver usando um domínio que não foi verificado no Resend, a linha precisa ser o email que você tem acesso. Por padrão, use `onboarding@resend.dev` para testes iniciais.

- [ ] 🖥️ **Step 5: Fazer redeploy com a chave real**

```bash
vercel --prod
```

- [ ] 🖥️ **Step 6: Testar fluxo de convite end-to-end**

1. Acesse Settings → Membros → adicione um email diferente do seu
2. Verifique que o email chegou na caixa de entrada
3. Clique no link do email
4. Crie conta com o email convidado
5. Verifique que o membro aparece em Settings → Membros

---

## Task 7: Commit final do plano

- [ ] 🤖 **Step 1: Commitar o plano**

```bash
git add docs/superpowers/plans/2026-05-17-crm-deploy.md
git commit -m "docs: add Plan 4 — deploy Vercel, Supabase prod, Resend"
git push
```
