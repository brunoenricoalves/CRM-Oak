# CRM Foundation & Auth — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a fundação do CRM SaaS: projeto Next.js, schema PostgreSQL completo, políticas RLS, funções SECURITY DEFINER, autenticação, criação de organização e fluxo de convite.

**Architecture:** Next.js 14 App Router com Supabase como backend. Todas as operações sensíveis (criação de org, aceitação de convite) usam funções SECURITY DEFINER. RLS garante isolamento multi-tenant em todas as tabelas.

**Tech Stack:** Next.js 14, TypeScript, Supabase (PostgreSQL + Auth), shadcn/ui, Tailwind CSS, Zod, Resend, Vitest, Playwright

**Spec:** `docs/superpowers/specs/2026-05-16-crm-sales-hub-design.md`

---

## File Structure

```
/
├── supabase/
│   └── migrations/
│       ├── 20260516000001_schema.sql
│       ├── 20260516000002_functions.sql
│       ├── 20260516000003_triggers.sql
│       └── 20260516000004_rls.sql
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (app)/
│   │   │   └── layout.tsx
│   │   ├── invite/[token]/page.tsx
│   │   └── layout.tsx
│   ├── components/
│   │   └── auth/
│   │       ├── login-form.tsx
│   │       └── signup-form.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts        ← browser client
│   │   │   ├── server.ts        ← server client (cookies)
│   │   │   └── admin.ts         ← service_role client
│   │   ├── validations/
│   │   │   ├── auth.ts
│   │   │   └── invite.ts
│   │   └── utils/
│   │       ├── slug.ts
│   │       └── token.ts
│   ├── server/
│   │   └── actions/
│   │       ├── auth.ts
│   │       └── invite.ts
│   └── types/
│       └── database.ts          ← Supabase generated types
├── tests/
│   ├── unit/
│   │   ├── slug.test.ts
│   │   └── token.test.ts
│   └── e2e/
│       └── auth.spec.ts
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

---

### Task 1: Inicializar projeto Next.js e instalar dependências

**Files:**
- Create: `package.json` (via CLI)
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`

- [ ] **Step 1: Criar projeto Next.js com TypeScript e Tailwind**

```bash
cd /Users/brunoalves/CRM
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-git
```

Responda às prompts: confirme as opções padrão.

- [ ] **Step 2: Instalar dependências de produção**

```bash
npm install @supabase/supabase-js @supabase/ssr \
  zod react-hook-form @hookform/resolvers \
  sonner \
  resend \
  @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  lucide-react \
  clsx tailwind-merge
```

- [ ] **Step 3: Instalar shadcn/ui**

```bash
npx shadcn@latest init
```

Quando solicitado: style = `default`, base color = `slate`, CSS variables = `yes`.

- [ ] **Step 4: Adicionar componentes shadcn necessários**

```bash
npx shadcn@latest add button input label form card sheet dialog \
  dropdown-menu avatar badge separator toast
```

- [ ] **Step 5: Instalar dependências de desenvolvimento**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react \
  @testing-library/user-event @testing-library/jest-dom \
  @playwright/test
```

- [ ] **Step 6: Criar `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
```

- [ ] **Step 7: Criar `tests/setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 8: Criar `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

- [ ] **Step 9: Adicionar scripts ao `package.json`**

Abra `package.json` e adicione em `"scripts"`:

```json
"test": "vitest",
"test:run": "vitest run",
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 10: Instalar browsers do Playwright**

```bash
npx playwright install chromium
```

- [ ] **Step 11: Commit**

```bash
git add .
git commit -m "chore: initialize Next.js project with Supabase, shadcn/ui, Vitest, Playwright"
```

---

### Task 2: Configurar Supabase e variáveis de ambiente

**Files:**
- Create: `.env.local`
- Create: `.env.local.example`
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/admin.ts`

- [ ] **Step 1: Criar projeto Supabase**

Acesse [supabase.com](https://supabase.com), crie um projeto e copie as credenciais.

- [ ] **Step 2: Instalar CLI do Supabase**

```bash
npm install -D supabase
npx supabase init
```

- [ ] **Step 3: Criar `.env.local`**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=your-resend-api-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

- [ ] **Step 4: Criar `.env.local.example`** (sem valores reais)

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
```

- [ ] **Step 5: Criar `src/lib/supabase/client.ts`**

```ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 6: Criar `src/lib/supabase/server.ts`**

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

- [ ] **Step 7: Criar `src/lib/supabase/admin.ts`**

```ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
```

- [ ] **Step 8: Criar `src/types/database.ts` placeholder**

```ts
// Gerado via: npx supabase gen types typescript --local > src/types/database.ts
// Executar após aplicar as migrations (Task 3)
export type Database = {
  public: {
    Tables: Record<string, never>
    Functions: Record<string, never>
  }
}
```

- [ ] **Step 9: Commit**

```bash
git add .
git commit -m "chore: configure Supabase clients (browser, server, admin)"
```

---

### Task 3: Migration — Schema do banco de dados

**Files:**
- Create: `supabase/migrations/20260516000001_schema.sql`

- [ ] **Step 1: Criar migration do schema**

```bash
npx supabase migration new schema
```

- [ ] **Step 2: Escrever `supabase/migrations/20260516000001_schema.sql`**

```sql
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS moddatetime;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Organizations
CREATE TABLE public.organizations (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  slug       text        NOT NULL UNIQUE,
  plan       text        NOT NULL DEFAULT 'free'
               CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Org Members
CREATE TABLE public.org_members (
  org_id     uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('admin', 'member')),
  invited_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, user_id)
);

-- Invitations
CREATE TABLE public.invitations (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email       text        NOT NULL,
  token       text        NOT NULL UNIQUE,
  role        text        NOT NULL CHECK (role IN ('admin', 'member')),
  invited_by  uuid        NOT NULL REFERENCES auth.users(id),
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '7 days',
  accepted_at timestamptz NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Companies
CREATE TABLE public.companies (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  domain      text        NULL,
  industry    text        NULL,
  size        text        NULL CHECK (
    size IS NULL OR size IN ('1-10', '11-50', '51-200', '200+')
  ),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Contacts
CREATE TABLE public.contacts (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  email       text        NULL,
  phone       text        NULL,
  company_id  uuid        NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  owner_id    uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Pipeline Stages
CREATE TABLE public.pipeline_stages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name        text        NOT NULL,
  position    float8      NOT NULL,
  color       text        NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Deals
CREATE TABLE public.deals (
  id          uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid          NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title       text          NOT NULL,
  value       numeric(15,2) NULL,
  stage_id    uuid          NULL REFERENCES public.pipeline_stages(id) ON DELETE RESTRICT,
  contact_id  uuid          NULL REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id  uuid          NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  owner_id    uuid          NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  status      text          NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'won', 'lost')),
  closed_at   timestamptz   NULL,
  close_date  date          NULL,
  position    float8        NOT NULL,
  created_at  timestamptz   NOT NULL DEFAULT now(),
  updated_at  timestamptz   NOT NULL DEFAULT now()
);

-- Activities
CREATE TABLE public.activities (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type        text        NOT NULL CHECK (type IN ('call', 'email', 'note', 'meeting')),
  body        text        NULL,
  contact_id  uuid        NULL REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id  uuid        NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  deal_id     uuid        NULL REFERENCES public.deals(id) ON DELETE SET NULL,
  user_id     uuid        NOT NULL REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT activity_has_target
    CHECK (contact_id IS NOT NULL OR deal_id IS NOT NULL OR company_id IS NOT NULL)
);

-- Tasks
CREATE TABLE public.tasks (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  due_date    timestamptz NULL,
  done        boolean     NOT NULL DEFAULT false,
  assigned_to uuid        NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by  uuid        NOT NULL REFERENCES auth.users(id),
  contact_id  uuid        NULL REFERENCES public.contacts(id) ON DELETE SET NULL,
  company_id  uuid        NULL REFERENCES public.companies(id) ON DELETE SET NULL,
  deal_id     uuid        NULL REFERENCES public.deals(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- updated_at triggers (moddatetime)
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.org_members
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
CREATE TRIGGER handle_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');

-- Performance indexes
CREATE INDEX ON public.contacts        (org_id);
CREATE INDEX ON public.companies       (org_id);
CREATE INDEX ON public.deals           (org_id, status);
CREATE INDEX ON public.deals           (org_id, stage_id, position);
CREATE INDEX ON public.activities      (org_id, created_at DESC);
CREATE INDEX ON public.tasks           (org_id, done, due_date);
CREATE INDEX ON public.pipeline_stages (org_id, position);
CREATE INDEX ON public.org_members     (user_id);
CREATE INDEX ON public.invitations     (org_id);
CREATE UNIQUE INDEX ON public.invitations (org_id, email) WHERE accepted_at IS NULL;

-- pg_trgm indexes for search
CREATE INDEX contacts_name_trgm  ON public.contacts  USING GIN (name  gin_trgm_ops);
CREATE INDEX contacts_email_trgm ON public.contacts  USING GIN (email gin_trgm_ops);
CREATE INDEX companies_name_trgm ON public.companies USING GIN (name  gin_trgm_ops);
```

- [ ] **Step 3: Aplicar migration localmente**

```bash
npx supabase db push
```

Esperado: `Applying migration 20260516000001_schema.sql... done`

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add initial database schema migration"
```

---

### Task 4: Migration — Funções SECURITY DEFINER e triggers

**Files:**
- Create: `supabase/migrations/20260516000002_functions.sql`
- Create: `supabase/migrations/20260516000003_triggers.sql`

- [ ] **Step 1: Criar migration de funções**

```bash
npx supabase migration new functions
```

- [ ] **Step 2: Escrever `supabase/migrations/20260516000002_functions.sql`**

```sql
-- Helper: verifica se o usuário é admin da org (evita recursão em RLS)
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Helper: verifica se o usuário é membro da org
CREATE OR REPLACE FUNCTION public.is_org_member(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
  );
$$;

-- Criação de organização no signup (bypassa RLS — usuário não tem membership ainda)
CREATE OR REPLACE FUNCTION public.create_org_and_admin(
  p_name    text,
  p_slug    text,
  p_user_id uuid
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_org_id uuid;
  v_base_slug text := p_slug;
  v_counter int := 0;
BEGIN
  -- Resolve colisão de slug com sufixo aleatório
  LOOP
    BEGIN
      INSERT INTO public.organizations (name, slug)
      VALUES (p_name, v_base_slug)
      RETURNING id INTO v_org_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_counter := v_counter + 1;
      v_base_slug := p_slug || '-' || substr(gen_random_uuid()::text, 1, 6);
    END;
  END LOOP;

  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'admin');

  RETURN v_org_id;
END;
$$;

-- Criação de convite (gera token seguro, verifica admin)
CREATE OR REPLACE FUNCTION public.create_invitation(
  p_org_id    uuid,
  p_email     text,
  p_role      text
)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_token text;
BEGIN
  IF NOT public.is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Apenas administradores podem convidar membros';
  END IF;

  -- Token de alta entropia (não UUID)
  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO public.invitations (org_id, email, token, role, invited_by)
  VALUES (p_org_id, lower(p_email), v_token, p_role, auth.uid());

  RETURN v_token;
END;
$$;

-- Aceite de convite (usuário pode não ser membro ainda — bypassa RLS)
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_inv public.invitations;
BEGIN
  SELECT * INTO v_inv
  FROM public.invitations
  WHERE token = p_token
    AND accepted_at IS NULL
    AND expires_at > now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Convite inválido ou expirado';
  END IF;

  -- Upsert: pode já ser membro de outra org
  INSERT INTO public.org_members (org_id, user_id, role)
  VALUES (v_inv.org_id, auth.uid(), v_inv.role)
  ON CONFLICT (org_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  UPDATE public.invitations
  SET accepted_at = now()
  WHERE id = v_inv.id;

  RETURN v_inv.org_id;
END;
$$;

-- Lookup público de convite por token (para a landing page)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token text)
RETURNS TABLE (
  id         uuid,
  org_id     uuid,
  org_name   text,
  email      text,
  role       text,
  expires_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT i.id, i.org_id, o.name AS org_name, i.email, i.role, i.expires_at
  FROM public.invitations i
  JOIN public.organizations o ON o.id = i.org_id
  WHERE i.token = p_token
    AND i.accepted_at IS NULL
    AND i.expires_at > now();
$$;
```

- [ ] **Step 3: Criar migration de triggers**

```bash
npx supabase migration new triggers
```

- [ ] **Step 4: Escrever `supabase/migrations/20260516000003_triggers.sql`**

```sql
-- Protege contra remoção do último admin da org
CREATE OR REPLACE FUNCTION public.ensure_org_has_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  IF (TG_OP = 'DELETE' AND OLD.role = 'admin') OR
     (TG_OP = 'UPDATE' AND OLD.role = 'admin' AND NEW.role != 'admin') THEN
    IF (SELECT COUNT(*) FROM public.org_members
        WHERE org_id = OLD.org_id AND role = 'admin') <= 1 THEN
      RAISE EXCEPTION 'A organização precisa de pelo menos um administrador';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER protect_last_admin
  BEFORE UPDATE OR DELETE ON public.org_members
  FOR EACH ROW EXECUTE FUNCTION public.ensure_org_has_admin();

-- Valida que owner_id / assigned_to pertence à mesma org
CREATE OR REPLACE FUNCTION public.validate_owner_org_membership()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF TG_TABLE_NAME IN ('contacts', 'deals') THEN
    v_user_id := NEW.owner_id;
  ELSIF TG_TABLE_NAME = 'tasks' THEN
    v_user_id := NEW.assigned_to;
  END IF;

  IF v_user_id IS NULL THEN RETURN NEW; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = NEW.org_id AND user_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'O usuário % não é membro da organização %', v_user_id, NEW.org_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_contacts_owner
  BEFORE INSERT OR UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.validate_owner_org_membership();

CREATE TRIGGER validate_deals_owner
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.validate_owner_org_membership();

CREATE TRIGGER validate_tasks_assigned_to
  BEFORE INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.validate_owner_org_membership();

-- Preenche closed_at automaticamente quando deal muda de status
CREATE OR REPLACE FUNCTION public.handle_deal_status_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status IN ('won', 'lost') AND OLD.status = 'open' THEN
    NEW.closed_at := now();
  ELSIF NEW.status = 'open' AND OLD.status != 'open' THEN
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER deal_status_change
  BEFORE UPDATE ON public.deals
  FOR EACH ROW EXECUTE FUNCTION public.handle_deal_status_change();
```

- [ ] **Step 5: Aplicar migrations**

```bash
npx supabase db push
```

Esperado: migrations 000002 e 000003 aplicadas com sucesso.

- [ ] **Step 6: Commit**

```bash
git add supabase/
git commit -m "feat: add SECURITY DEFINER functions and triggers"
```

---

### Task 5: Migration — Políticas RLS

**Files:**
- Create: `supabase/migrations/20260516000004_rls.sql`

- [ ] **Step 1: Criar migration**

```bash
npx supabase migration new rls
```

- [ ] **Step 2: Escrever `supabase/migrations/20260516000004_rls.sql`**

```sql
-- Habilitar RLS em todas as tabelas
ALTER TABLE public.organizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks           ENABLE ROW LEVEL SECURITY;

-- ===== organizations =====
CREATE POLICY "select_own_orgs" ON public.organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
  );
CREATE POLICY "admin_update_org" ON public.organizations
  FOR UPDATE USING (public.is_org_admin(id)) WITH CHECK (public.is_org_admin(id));

-- ===== org_members =====
CREATE POLICY "select_own_memberships" ON public.org_members
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "admin_select_org_members" ON public.org_members
  FOR SELECT USING (public.is_org_admin(org_id));
CREATE POLICY "admin_insert_members" ON public.org_members
  FOR INSERT WITH CHECK (public.is_org_admin(org_members.org_id));
CREATE POLICY "admin_update_members" ON public.org_members
  FOR UPDATE USING (public.is_org_admin(org_members.org_id))
             WITH CHECK (public.is_org_admin(org_members.org_id));
CREATE POLICY "admin_delete_members" ON public.org_members
  FOR DELETE USING (public.is_org_admin(org_members.org_id));

-- ===== invitations =====
CREATE POLICY "admin_select_invitations" ON public.invitations
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.org_members
      WHERE org_id = invitations.org_id AND user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "admin_insert_invitations" ON public.invitations
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.org_members
      WHERE org_id = invitations.org_id AND user_id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "admin_delete_invitations" ON public.invitations
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.org_members
      WHERE org_id = invitations.org_id AND user_id = auth.uid() AND role = 'admin')
  );

-- ===== contacts =====
CREATE POLICY "select_contacts" ON public.contacts
  FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "insert_contacts" ON public.contacts
  FOR INSERT WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "update_contacts" ON public.contacts
  FOR UPDATE USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "delete_contacts" ON public.contacts
  FOR DELETE USING (public.is_org_member(org_id));

-- ===== companies =====
CREATE POLICY "select_companies" ON public.companies
  FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "insert_companies" ON public.companies
  FOR INSERT WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "update_companies" ON public.companies
  FOR UPDATE USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "delete_companies" ON public.companies
  FOR DELETE USING (public.is_org_member(org_id));

-- ===== pipeline_stages — somente admins modificam =====
CREATE POLICY "select_stages" ON public.pipeline_stages
  FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "admin_insert_stages" ON public.pipeline_stages
  FOR INSERT WITH CHECK (public.is_org_admin(org_id));
CREATE POLICY "admin_update_stages" ON public.pipeline_stages
  FOR UPDATE USING (public.is_org_admin(org_id)) WITH CHECK (public.is_org_admin(org_id));
CREATE POLICY "admin_delete_stages" ON public.pipeline_stages
  FOR DELETE USING (public.is_org_admin(org_id));

-- ===== deals =====
CREATE POLICY "select_deals" ON public.deals
  FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "insert_deals" ON public.deals
  FOR INSERT WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "update_deals" ON public.deals
  FOR UPDATE USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "delete_deals" ON public.deals
  FOR DELETE USING (public.is_org_member(org_id));

-- ===== activities — append-only (sem UPDATE ou DELETE) =====
CREATE POLICY "select_activities" ON public.activities
  FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "insert_activities" ON public.activities
  FOR INSERT WITH CHECK (public.is_org_member(org_id));

-- ===== tasks =====
CREATE POLICY "select_tasks" ON public.tasks
  FOR SELECT USING (public.is_org_member(org_id));
CREATE POLICY "insert_tasks" ON public.tasks
  FOR INSERT WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "update_tasks" ON public.tasks
  FOR UPDATE USING (public.is_org_member(org_id)) WITH CHECK (public.is_org_member(org_id));
CREATE POLICY "delete_tasks" ON public.tasks
  FOR DELETE USING (public.is_org_member(org_id));
```

- [ ] **Step 3: Aplicar migration**

```bash
npx supabase db push
```

Esperado: migration 000004 aplicada com sucesso.

- [ ] **Step 4: Gerar tipos TypeScript do Supabase**

```bash
npx supabase gen types typescript --local > src/types/database.ts
```

- [ ] **Step 5: Commit**

```bash
git add supabase/ src/types/database.ts
git commit -m "feat: add RLS policies and generate TypeScript types"
```

---

### Task 6: Utilitários — slug e token

**Files:**
- Create: `src/lib/utils/slug.ts`
- Create: `src/lib/utils/token.ts`
- Create: `tests/unit/slug.test.ts`

- [ ] **Step 1: Escrever teste para slug**

```ts
// tests/unit/slug.test.ts
import { describe, it, expect } from 'vitest'
import { generateSlug } from '@/lib/utils/slug'

describe('generateSlug', () => {
  it('converte texto para slug lowercase', () => {
    expect(generateSlug('Oak Agência')).toBe('oak-agencia')
  })

  it('remove caracteres especiais', () => {
    expect(generateSlug('Hello, World!')).toBe('hello-world')
  })

  it('colapsa múltiplos hífens', () => {
    expect(generateSlug('foo  bar')).toBe('foo-bar')
  })

  it('remove hífens no início e fim', () => {
    expect(generateSlug(' foo ')).toBe('foo')
  })
})
```

- [ ] **Step 2: Rodar o teste para confirmar falha**

```bash
npm run test:run -- tests/unit/slug.test.ts
```

Esperado: FAIL — `generateSlug` not found

- [ ] **Step 3: Implementar `src/lib/utils/slug.ts`**

```ts
export function generateSlug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}
```

- [ ] **Step 4: Rodar o teste para confirmar passou**

```bash
npm run test:run -- tests/unit/slug.test.ts
```

Esperado: PASS (4 testes)

- [ ] **Step 5: Criar `src/lib/utils/token.ts`**

```ts
// Apenas utilitários client-side; geração segura de token é feita no banco via gen_random_bytes
export function isTokenExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date()
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/ tests/unit/slug.test.ts
git commit -m "feat: add slug and token utilities with tests"
```

---

### Task 7: Validações Zod para auth

**Files:**
- Create: `src/lib/validations/auth.ts`
- Create: `tests/unit/auth-validations.test.ts`

- [ ] **Step 1: Escrever testes**

```ts
// tests/unit/auth-validations.test.ts
import { describe, it, expect } from 'vitest'
import { signupSchema, loginSchema } from '@/lib/validations/auth'

describe('signupSchema', () => {
  it('aceita dados válidos', () => {
    const result = signupSchema.safeParse({
      name: 'Bruno Alves',
      orgName: 'Oak Agência',
      email: 'bruno@oakagencia.com.br',
      password: 'Senha123!',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita email inválido', () => {
    const result = signupSchema.safeParse({
      name: 'Bruno',
      orgName: 'Oak',
      email: 'not-an-email',
      password: 'Senha123!',
    })
    expect(result.success).toBe(false)
    expect(result.error?.errors[0].path).toContain('email')
  })

  it('rejeita senha menor que 8 caracteres', () => {
    const result = signupSchema.safeParse({
      name: 'Bruno',
      orgName: 'Oak',
      email: 'bruno@oak.com',
      password: '123',
    })
    expect(result.success).toBe(false)
    expect(result.error?.errors[0].path).toContain('password')
  })
})

describe('loginSchema', () => {
  it('aceita email e senha válidos', () => {
    const result = loginSchema.safeParse({
      email: 'bruno@oak.com',
      password: 'Senha123!',
    })
    expect(result.success).toBe(true)
  })
})
```

- [ ] **Step 2: Rodar para confirmar falha**

```bash
npm run test:run -- tests/unit/auth-validations.test.ts
```

Esperado: FAIL

- [ ] **Step 3: Implementar `src/lib/validations/auth.ts`**

```ts
import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

export const signupSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  orgName: z.string().min(2, 'Nome da organização deve ter ao menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
})

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
```

- [ ] **Step 4: Rodar para confirmar passou**

```bash
npm run test:run -- tests/unit/auth-validations.test.ts
```

Esperado: PASS (4 testes)

- [ ] **Step 5: Commit**

```bash
git add src/lib/validations/auth.ts tests/unit/auth-validations.test.ts
git commit -m "feat: add auth Zod validations with tests"
```

---

### Task 8: Server Actions — Auth e criação de org

**Files:**
- Create: `src/server/actions/auth.ts`

- [ ] **Step 1: Criar `src/server/actions/auth.ts`**

```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signupSchema, loginSchema } from '@/lib/validations/auth'
import { generateSlug } from '@/lib/utils/slug'

export async function login(formData: FormData) {
  const raw = { email: formData.get('email'), password: formData.get('password') }
  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: 'Email ou senha inválidos' }

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
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()

  // 1. Criar usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name } },
  })
  if (authError || !authData.user) return { error: authError?.message ?? 'Erro ao criar conta' }

  // 2. Criar org via SECURITY DEFINER function (bypassa RLS)
  const admin = createAdminClient()
  const slug = generateSlug(parsed.data.orgName)
  const { error: orgError } = await admin.rpc('create_org_and_admin', {
    p_name: parsed.data.orgName,
    p_slug: slug,
    p_user_id: authData.user.id,
  })
  if (orgError) return { error: 'Erro ao criar organização' }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

- [ ] **Step 2: Commit**

```bash
git add src/server/actions/auth.ts
git commit -m "feat: add auth server actions (login, signup, logout)"
```

---

### Task 9: Páginas de auth (Login e Signup)

**Files:**
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/signup/page.tsx`
- Create: `src/components/auth/login-form.tsx`
- Create: `src/components/auth/signup-form.tsx`
- Create: `src/app/(auth)/layout.tsx`

- [ ] **Step 1: Criar `src/app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-md">{children}</div>
    </div>
  )
}
```

- [ ] **Step 2: Criar `src/components/auth/login-form.tsx`**

```tsx
'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { login } from '@/server/actions/auth'
import Link from 'next/link'

type State = { error?: string } | undefined

export function LoginForm() {
  const [state, action, pending] = useActionState<State, FormData>(login, undefined)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar no CRM</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
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
            {pending ? 'Entrando...' : 'Entrar'}
          </Button>
          <p className="text-sm text-center text-slate-500">
            Não tem conta?{' '}
            <Link href="/signup" className="underline">Criar conta</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Criar `src/app/(auth)/login/page.tsx`**

```tsx
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return <LoginForm />
}
```

- [ ] **Step 4: Criar `src/components/auth/signup-form.tsx`**

```tsx
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
  const [state, action, pending] = useActionState<State, FormData>(signup, undefined)

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
```

- [ ] **Step 5: Criar `src/app/(auth)/signup/page.tsx`**

```tsx
import { SignupForm } from '@/components/auth/signup-form'

export default function SignupPage() {
  return <SignupForm />
}
```

- [ ] **Step 6: Testar manualmente no browser**

```bash
npm run dev
```

Abrir `http://localhost:3000/signup` e criar uma conta. Verificar no Supabase Dashboard que:
- Usuário foi criado em `auth.users`
- Registro criado em `organizations`
- Registro criado em `org_members` com `role = 'admin'`

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: add login and signup pages with Server Actions"
```

---

### Task 10: Fluxo de convite

**Files:**
- Create: `src/server/actions/invite.ts`
- Create: `src/app/invite/[token]/page.tsx`
- Create: `src/lib/validations/invite.ts`

- [ ] **Step 1: Criar `src/lib/validations/invite.ts`**

```ts
import { z } from 'zod'

export const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
  role: z.enum(['admin', 'member']),
})

export type InviteInput = z.infer<typeof inviteSchema>
```

- [ ] **Step 2: Criar `src/server/actions/invite.ts`**

```ts
'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { inviteSchema } from '@/lib/validations/invite'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendInvite(orgId: string, formData: FormData) {
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  const supabase = await createClient()

  // Gera token via SECURITY DEFINER function
  const { data: token, error } = await supabase.rpc('create_invitation', {
    p_org_id: orgId,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  })
  if (error) return { error: error.message }

  // Envia email com Resend
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
  await resend.emails.send({
    from: 'CRM <noreply@oakagencia.com.br>',
    to: parsed.data.email,
    subject: 'Você foi convidado para um CRM',
    html: `<p>Clique para aceitar o convite: <a href="${inviteUrl}">${inviteUrl}</a></p>`,
  })

  return { success: true }
}

export async function acceptInvite(token: string) {
  const supabase = await createClient()

  const { data: orgId, error } = await supabase.rpc('accept_invitation', {
    p_token: token,
  })
  if (error) return { error: error.message }

  redirect('/dashboard')
}
```

- [ ] **Step 3: Criar `src/app/invite/[token]/page.tsx`**

```tsx
import { createClient } from '@/lib/supabase/server'
import { acceptInvite } from '@/server/actions/invite'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

  // Lookup via SECURITY DEFINER function (não usa RLS)
  const { data: invite } = await supabase.rpc('get_invitation_by_token', { p_token: token })

  if (!invite || invite.length === 0) {
    redirect('/login?error=invite_invalid')
  }

  const inv = invite[0]

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Convite para {inv.org_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600">
            Você foi convidado como <strong>{inv.role}</strong> para a organização <strong>{inv.org_name}</strong>.
          </p>
          <form action={acceptInvite.bind(null, token)}>
            <Button type="submit" className="w-full">Aceitar convite</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Testar fluxo de convite manualmente**

1. Logar com o admin criado no Task 9
2. Chamar `sendInvite` via uma rota temporária ou diretamente no Supabase Dashboard com `create_invitation`
3. Abrir o link gerado
4. Verificar que aparece a página de convite com nome da org
5. Clicar "Aceitar" e verificar que cria entrada em `org_members`

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: add invite flow (send, landing page, accept)"
```

---

### Task 11: E2E — Testes de auth

**Files:**
- Create: `tests/e2e/auth.spec.ts`

- [ ] **Step 1: Criar `tests/e2e/auth.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

const uniqueEmail = () => `test+${Date.now()}@example.com`

test.describe('Auth flow', () => {
  test('signup cria conta e organização', async ({ page }) => {
    await page.goto('/signup')

    await page.fill('[name=name]', 'Teste Usuario')
    await page.fill('[name=orgName]', 'Org Teste E2E')
    await page.fill('[name=email]', uniqueEmail())
    await page.fill('[name=password]', 'Senha123!')
    await page.click('[type=submit]')

    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })
  })

  test('login com credenciais inválidas mostra erro', async ({ page }) => {
    await page.goto('/login')

    await page.fill('[name=email]', 'nao@existe.com')
    await page.fill('[name=password]', 'senhaerrada')
    await page.click('[type=submit]')

    await expect(page.getByText('Email ou senha inválidos')).toBeVisible()
  })

  test('redireciona para /login quando não autenticado', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })
})
```

- [ ] **Step 2: Criar middleware de auth guard**

Criar `src/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

- [ ] **Step 3: Criar placeholder de dashboard**

Criar `src/app/(app)/dashboard/page.tsx`:

```tsx
export default function DashboardPage() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Dashboard</h1></div>
}
```

Criar `src/app/(app)/layout.tsx`:

```tsx
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>
}
```

- [ ] **Step 4: Rodar testes E2E**

```bash
npm run dev &
npm run test:e2e -- tests/e2e/auth.spec.ts
```

Esperado: 3 testes passando

- [ ] **Step 5: Commit**

```bash
git add src/ tests/
git commit -m "feat: add auth middleware and E2E auth tests"
```

---

### Task 12: Verificação final da fundação

- [ ] **Step 1: Rodar todos os testes unitários**

```bash
npm run test:run
```

Esperado: todos os testes passando (slug, token, auth-validations)

- [ ] **Step 2: Rodar todos os testes E2E**

```bash
npm run test:e2e
```

Esperado: auth tests passando

- [ ] **Step 3: Verificar isolamento RLS no Supabase**

No Supabase Dashboard > SQL Editor, executar:

```sql
-- Verificar que RLS está ativo em todas as tabelas
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Esperado: `rowsecurity = true` para todas as tabelas.

- [ ] **Step 4: Commit final**

```bash
git add .
git commit -m "feat: complete CRM foundation — schema, RLS, auth, invites"
```

---

## Próximo Plano

Após concluir este plano, prosseguir com:
**`2026-05-16-crm-core-entities.md`** — Contatos, Empresas, Deals, Pipeline Kanban, Atividades e Tarefas.
