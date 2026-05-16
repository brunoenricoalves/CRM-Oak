# CRM Sales Hub — Design Spec

**Data:** 2026-05-16  
**Referência:** HubSpot Sales Hub  
**Status:** Aprovado (revisado após 5 rounds de code review)

---

## Visão Geral

CRM SaaS multi-tenant inspirado no HubSpot Sales Hub, desenvolvido para uso interno na Oak Agência e comercializado como produto para outros clientes. O MVP cobre o fluxo completo de vendas: gestão de contatos, empresas, pipeline de deals com kanban, tarefas e dashboard de acompanhamento.

---

## Stack Tecnológica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14+ (App Router) + TypeScript |
| UI | shadcn/ui + Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| Validação | Zod + React Hook Form |
| Email transacional | Resend |
| Testes unitários | Vitest |
| Testes E2E | Playwright |
| Erros em produção | Sentry |
| Notificações UI | Sonner (toasts) |
| Hosting | Vercel (frontend) + Supabase Cloud |

---

## Arquitetura

### Multi-tenancy

Cada cliente do SaaS é uma **organização**. Todos os registros no banco possuem `org_id`. Row Level Security (RLS) do Supabase garante isolamento total — usuários só acessam dados da própria organização.

Um usuário pode pertencer a múltiplas organizações. A organização ativa é armazenada em um cookie de sessão. A UI expõe um org switcher no header da sidebar.

### Autenticação e Onboarding

Supabase Auth com email/senha e magic link.

**Fluxo de criação de conta:**
1. Usuário se registra → cria uma nova organização (nome + slug)
2. Passa a ser `admin` dessa organização automaticamente

**Fluxo de convite:**
1. Admin acessa `/settings/members` e envia convite por email
2. Sistema gera token único via `SECURITY DEFINER` function, persiste em `invitations`, envia email via Resend
3. Destinatário acessa `/invite/[token]` — lookup via `SECURITY DEFINER` function (sem RLS) para validar token não expirado
4. Se não tem conta: cria conta e entra na org automaticamente (INSERT em `org_members` via `SECURITY DEFINER`)
5. Se já tem conta: faz login e entra na org (multi-org suportado)
6. Token expira em 7 dias; convites aceitos marcados com `accepted_at`

A aceitação do convite usa uma `SECURITY DEFINER` function no Supabase, pois o usuário ainda não é membro da org e não passaria pelas policies RLS normais.

**Rotas de convite:**
- `POST /settings/members/invite` — admin envia convite (role: admin ou member)
- `GET /invite/[token]` — landing page do convite
- `POST /invite/[token]/accept` — aceita convite (cria conta ou autentica)

**Roles:**
- `admin` — gerencia membros, configura pipeline stages, acessa settings
- `member` — usa o CRM (contatos, deals, tarefas)

### Fluxo de dados

- Next.js chama Supabase diretamente via client SDK (com RLS) para leituras e mutations simples
- Server Actions para operações que exigem validação server-side ou lógica sensível (convites, deleção de stages)
- Suspense boundaries para loading states por seção

### Busca

Busca em contatos e empresas usa `pg_trgm` com índice GIN — suporta busca parcial com performance em escala.

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX contacts_name_trgm   ON contacts  USING GIN (name  gin_trgm_ops);
CREATE INDEX contacts_email_trgm  ON contacts  USING GIN (email gin_trgm_ops);
CREATE INDEX companies_name_trgm  ON companies USING GIN (name  gin_trgm_ops);
```

---

## Modelo de Dados

`updated_at` é atualizado automaticamente via trigger `moddatetime` (extensão do Supabase) em todas as tabelas que o possuem.

```sql
CREATE EXTENSION IF NOT EXISTS moddatetime;

-- Aplicar em cada tabela com updated_at (contacts, companies, deals, tasks, pipeline_stages, organizations, org_members, invitations):
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION moddatetime('updated_at');
-- Repetir o mesmo padrão para cada tabela substituindo "contacts" pelo nome da tabela.
```

```sql
organizations
  id          uuid        PK DEFAULT gen_random_uuid()
  name        text        NOT NULL
  slug        text        NOT NULL UNIQUE
  -- slug gerado a partir do nome; colisões resolvidas com sufixo aleatório
  plan        text        NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise'))
  created_at  timestamptz NOT NULL DEFAULT now()
  updated_at  timestamptz NOT NULL DEFAULT now()

org_members
  org_id      uuid        NOT NULL FK → organizations
  user_id     uuid        NOT NULL FK → auth.users
  role        text        NOT NULL CHECK (role IN ('admin', 'member'))
  invited_at  timestamptz NOT NULL DEFAULT now()
  updated_at  timestamptz NOT NULL DEFAULT now()
  -- updated_at reflete promoções/rebaixamentos de role
  PRIMARY KEY (org_id, user_id)

invitations
  id          uuid        PK DEFAULT gen_random_uuid()
  org_id      uuid        NOT NULL FK → organizations
  email       text        NOT NULL
  token       text        NOT NULL UNIQUE
  role        text        NOT NULL CHECK (role IN ('admin', 'member'))
  invited_by  uuid        NOT NULL FK → auth.users
  expires_at  timestamptz NOT NULL DEFAULT now() + interval '7 days'
  accepted_at timestamptz NULL
  created_at  timestamptz NOT NULL DEFAULT now()
  updated_at  timestamptz NOT NULL DEFAULT now()

contacts
  id          uuid        PK DEFAULT gen_random_uuid()
  org_id      uuid        NOT NULL FK → organizations
  name        text        NOT NULL
  email       text        NULL
  -- emails não são únicos por org (um contato pode ter múltiplos registros intencionalmente)
  phone       text        NULL
  company_id  uuid        NULL FK → companies
  owner_id    uuid        NULL FK → auth.users
  -- owner_id validado como membro da mesma org via trigger BEFORE INSERT OR UPDATE
  created_at  timestamptz NOT NULL DEFAULT now()
  updated_at  timestamptz NOT NULL DEFAULT now()

companies
  id          uuid        PK DEFAULT gen_random_uuid()
  org_id      uuid        NOT NULL FK → organizations
  name        text        NOT NULL
  domain      text        NULL
  -- domain não é único por org (intencionalmente — mesma empresa pode ter múltiplos registros em fase de deduplicação)
  industry    text        NULL
  size        text        NULL CHECK (size IN ('1-10', '11-50', '51-200', '200+') OR size IS NULL)
  created_at  timestamptz NOT NULL DEFAULT now()
  updated_at  timestamptz NOT NULL DEFAULT now()

pipeline_stages
  id          uuid        PK DEFAULT gen_random_uuid()
  org_id      uuid        NOT NULL FK → organizations
  name        text        NOT NULL
  position    float8      NOT NULL
  -- float8 permite reordenação drag & drop sem renumerar todos os registros
  -- novo stage: position = MAX(position) + 1.0
  -- reordenação: position = (position_anterior + position_posterior) / 2
  -- rebalanceamento: quando diferença < 0.001, renumerar todos com espaçamento 1.0
  color       text        NULL
  created_at  timestamptz NOT NULL DEFAULT now()
  updated_at  timestamptz NOT NULL DEFAULT now()
  -- ON DELETE: RESTRICT — UI deve mover deals antes de permitir deleção

deals
  id          uuid        PK DEFAULT gen_random_uuid()
  org_id      uuid        NOT NULL FK → organizations
  title       text        NOT NULL
  value       numeric(15,2) NULL
  stage_id    uuid        NULL FK → pipeline_stages ON DELETE RESTRICT
  -- stage_id NULL = deal sem stage ("Sem estágio"); exibido em coluna separada no kanban
  contact_id  uuid        NULL FK → contacts
  company_id  uuid        NULL FK → companies
  owner_id    uuid        NULL FK → auth.users
  -- owner_id validado como membro da mesma org via trigger BEFORE INSERT OR UPDATE
  status      text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost'))
  closed_at   timestamptz NULL
  -- closed_at preenchido automaticamente via trigger BEFORE UPDATE quando status muda para 'won' ou 'lost'
  -- zerado (NULL) se status voltar para 'open'
  close_date  date        NULL
  position    float8      NOT NULL
  -- posição no kanban dentro do stage; mesma estratégia de float8 do pipeline_stages
  -- application code sempre fornece o valor: MAX(position dentro do stage) + 1.0
  -- sem DEFAULT — forçar cálculo explícito na aplicação para evitar colisões de posição 0
  -- Zod schema deve marcar position como required; Server Action deve calculá-lo antes do INSERT
  created_at  timestamptz NOT NULL DEFAULT now()
  updated_at  timestamptz NOT NULL DEFAULT now()

activities
  id          uuid        PK DEFAULT gen_random_uuid()
  org_id      uuid        NOT NULL FK → organizations
  type        text        NOT NULL CHECK (type IN ('call', 'email', 'note', 'meeting'))
  body        text        NULL
  contact_id  uuid        NULL FK → contacts
  company_id  uuid        NULL FK → companies
  deal_id     uuid        NULL FK → deals
  user_id     uuid        NOT NULL FK → auth.users
  created_at  timestamptz NOT NULL DEFAULT now()
  -- activities são imutáveis (append-only); sem updated_at
  CONSTRAINT activity_has_target
    CHECK (contact_id IS NOT NULL OR deal_id IS NOT NULL OR company_id IS NOT NULL)

tasks
  id          uuid        PK DEFAULT gen_random_uuid()
  org_id      uuid        NOT NULL FK → organizations
  title       text        NOT NULL
  due_date    timestamptz NULL
  done        boolean     NOT NULL DEFAULT false
  assigned_to uuid        NULL FK → auth.users
  created_by  uuid        NOT NULL FK → auth.users
  contact_id  uuid        NULL FK → contacts
  company_id  uuid        NULL FK → companies
  deal_id     uuid        NULL FK → deals
  created_at  timestamptz NOT NULL DEFAULT now()
  updated_at  timestamptz NOT NULL DEFAULT now()
```

### Índices de performance

```sql
-- org_id em todas as tabelas principais (filtragem RLS + queries de lista)
CREATE INDEX ON contacts        (org_id);
CREATE INDEX ON companies       (org_id);
CREATE INDEX ON deals           (org_id, status);
CREATE INDEX ON deals           (org_id, stage_id, position);
CREATE INDEX ON activities      (org_id, created_at DESC);
CREATE INDEX ON tasks           (org_id, done, due_date);
CREATE INDEX ON pipeline_stages (org_id, position);

-- org_members: filtragem por user_id em todas as policies RLS do sistema
CREATE INDEX ON org_members (user_id);

-- invitations: filtragem por org_id nas policies de admin
CREATE INDEX ON invitations (org_id);
-- token já tem índice UNIQUE implícito

-- invitations: previne convites duplicados para o mesmo email na mesma org
CREATE UNIQUE INDEX ON invitations (org_id, email) WHERE accepted_at IS NULL;
```

---

## Políticas RLS

RLS habilitado em todas as tabelas. Padrão: acesso negado por default.

```sql
-- Habilitar RLS em todas as tabelas (executar antes de criar as policies)
ALTER TABLE organizations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages  ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals            ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks            ENABLE ROW LEVEL SECURITY;
```

> **Nota:** A sintaxe `FOR INSERT OR UPDATE` não é válida em PostgreSQL. Cada comando tem sua própria policy ou usa `FOR ALL` com `USING` + `WITH CHECK`.

### Helper SECURITY DEFINER

Policies em `org_members` que referenciam `org_members` internamente causam recursão infinita em PostgreSQL. A solução é uma função `SECURITY DEFINER` que bypassa RLS e é chamada pelas policies:

```sql
CREATE OR REPLACE FUNCTION is_org_admin(p_org_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.org_members
    WHERE org_id = p_org_id
      AND user_id = auth.uid()
      AND role = 'admin'
  );
$$;
-- SET search_path = public previne search path injection em funções SECURITY DEFINER
-- (exigido pelo linter do Supabase)
```

Esta função é usada nas policies de `org_members` (onde a auto-referência causaria recursão infinita) e na policy `admin_update_org` de `organizations`.

### organizations

```sql
-- SELECT: usuário vê apenas orgs das quais é membro (org switcher, invitation landing page)
CREATE POLICY "select_own_orgs" ON organizations
  FOR SELECT
  USING (
    id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
  );

-- UPDATE: somente admins atualizam nome/slug da org
CREATE POLICY "admin_update_org" ON organizations
  FOR UPDATE
  USING     (is_org_admin(id))
  WITH CHECK (is_org_admin(id));

-- INSERT: criação de org via SECURITY DEFINER function (usuário não tem membership ainda)
-- Sem política de INSERT pública — bloqueado por default; signup flow usa service_role
```

### Tabelas com dados de negócio (contacts, companies, deals, tasks)

> **Notas:**
> - `pipeline_stages` tem policies próprias na seção abaixo; não aplicar o template genérico nela.
> - `activities` é **append-only** (imutável): aplicar apenas SELECT e INSERT, **nunca UPDATE ou DELETE**.
> - Todos os `org_members` devem ser qualificados como `public.org_members` para consistência.

```sql
-- SELECT: membros da org leem seus próprios dados
CREATE POLICY "select_own_org" ON <table>
  FOR SELECT
  USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
  );

-- INSERT: membro só insere em org da qual faz parte
CREATE POLICY "insert_own_org" ON <table>
  FOR INSERT
  WITH CHECK (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
  );

-- UPDATE: membro só atualiza registros da própria org
-- NÃO aplicar em activities (append-only)
CREATE POLICY "update_own_org" ON <table>
  FOR UPDATE
  USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
  );

-- DELETE: membro só deleta registros da própria org
-- NÃO aplicar em activities (append-only)
CREATE POLICY "delete_own_org" ON <table>
  FOR DELETE
  USING (
    org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid())
  );
```

### activities — append-only (SELECT + INSERT apenas)

```sql
-- SELECT e INSERT usam o template genérico acima
-- Sem UPDATE policy — bloqueado por RLS default (intencional: activities são imutáveis)
-- Sem DELETE policy — bloqueado por RLS default (intencional: activities são imutáveis)
```

### pipeline_stages — somente admins modificam

> **Nota:** Os subqueries abaixo referenciam `public.org_members` diretamente (não via `is_org_admin()`).
> Isso é seguro porque a policy é em `pipeline_stages`, não em `org_members` — não há recursão.
> O subquery é filtrado pela policy `select_own_memberships` de `org_members` (`user_id = auth.uid()`),
> retornando apenas a linha do usuário atual — que é exatamente o comportamento desejado.

```sql
-- SELECT: todos os membros da org
CREATE POLICY "select_stages" ON pipeline_stages
  FOR SELECT
  USING (org_id IN (SELECT org_id FROM public.org_members WHERE user_id = auth.uid()));

-- INSERT/UPDATE/DELETE: somente admins
CREATE POLICY "admin_insert_stages" ON pipeline_stages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = pipeline_stages.org_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "admin_update_stages" ON pipeline_stages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = pipeline_stages.org_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = pipeline_stages.org_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

CREATE POLICY "admin_delete_stages" ON pipeline_stages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = pipeline_stages.org_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );
```

### org_members

```sql
-- SELECT 1: usuário vê suas próprias linhas (org switcher — quais orgs o usuário pertence)
CREATE POLICY "select_own_memberships" ON org_members
  FOR SELECT
  USING (user_id = auth.uid());

-- SELECT 2: admin vê todos os membros da org (página /settings/members)
CREATE POLICY "admin_select_org_members" ON org_members
  FOR SELECT
  USING (is_org_admin(org_id));

-- INSERT: defense-in-depth para INSERTs diretos por admins (re-adicionar membro removido)
-- O fluxo de convite usa SECURITY DEFINER function e não passa por esta policy
CREATE POLICY "admin_insert_members" ON org_members
  FOR INSERT
  WITH CHECK (is_org_admin(org_members.org_id));
  -- usa is_org_admin() para evitar recursão infinita (self-referential RLS)

CREATE POLICY "admin_update_members" ON org_members
  FOR UPDATE
  USING     (is_org_admin(org_members.org_id))
  WITH CHECK (is_org_admin(org_members.org_id));

CREATE POLICY "admin_delete_members" ON org_members
  FOR DELETE
  USING (is_org_admin(org_members.org_id));
```

**Proteção contra remoção do último admin:**

Uma `SECURITY DEFINER` function `ensure_org_has_admin` deve ser chamada via trigger `BEFORE UPDATE OR DELETE` em `org_members`. Se a operação resultaria em zero admins na org, a function executa `RAISE EXCEPTION 'A organização precisa de pelo menos um administrador'`. A UI também deve desabilitar o botão de remoção/rebaixamento nesses casos, mas o trigger é a camada de enforcement definitiva.

```sql
CREATE OR REPLACE FUNCTION ensure_org_has_admin()
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
  BEFORE UPDATE OR DELETE ON org_members
  FOR EACH ROW EXECUTE FUNCTION ensure_org_has_admin();
```

### invitations

```sql
-- SELECT público por token válido (para landing page /invite/[token])
-- Feito via SECURITY DEFINER function — não via RLS direta — para evitar expor outros campos
-- A function valida: token existe + expires_at > now() + accepted_at IS NULL antes de retornar

-- SELECT para admins da org (para listar convites pendentes em /settings/members)
CREATE POLICY "admin_select_invitations" ON invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = invitations.org_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- INSERT: somente admins criam convites
-- O índice parcial UNIQUE (org_id, email) WHERE accepted_at IS NULL garante sem duplicatas
CREATE POLICY "admin_insert_invitations" ON invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = invitations.org_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- UPDATE (marcar accepted_at): feito via SECURITY DEFINER function, sem policy de UPDATE pública
-- Sem UPDATE policy = bloqueado por RLS default (intencional)

-- DELETE: admins podem revogar convites pendentes
CREATE POLICY "admin_delete_invitations" ON invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.org_members
      WHERE org_id = invitations.org_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );
```

---

## Telas e Navegação

### Sidebar principal
```
Dashboard
Contatos
Empresas
Deals (Pipeline)
Tarefas
Configurações
[Org Switcher no header]
```

### Mapa de rotas

| Rota | Descrição |
|------|-----------|
| `/dashboard` | Funil de deals, tarefas pendentes, atividade recente |
| `/contacts` | Lista com busca (pg_trgm), filtros, criação inline |
| `/contacts/[id]` | Perfil: dados, timeline de atividades, deals associados, tarefas |
| `/companies` | Lista de empresas com busca e filtros |
| `/companies/[id]` | Perfil: contatos vinculados, deals, atividades, tarefas |
| `/deals` | Kanban por stage (drag & drop) + view de lista |
| `/deals/[id]` | Detalhe: valor, responsável, contato, timeline |
| `/tasks` | Lista com filtro por vencimento e responsável |
| `/settings/org` | Nome e slug da organização (somente admins) |
| `/settings/members` | Membros da org, envio e revogação de convites |
| `/settings/pipeline` | Stages customizáveis (criar, reordenar, deletar) |
| `/settings/profile` | Perfil do usuário |
| `/invite/[token]` | Landing page de convite |

### Padrões de UX

- **Sheet vs página completa:** O sheet (painel lateral deslizante) é a UI primária ao clicar em um contato ou deal dentro do app. As rotas `/contacts/[id]` e `/deals/[id]` são links compartilháveis — renderizam o mesmo conteúdo em layout de página completa. O sheet abre via navegação interna; a rota `[id]` é usada em acesso direto por URL.
- Timeline de atividades em ordem cronológica reversa em cada registro
- Drag & drop no kanban persiste `position` (float8) no banco — ordem sobrevive a page refresh
- Toast notifications para feedback de todas as ações
- Diálogo de confirmação ao deletar pipeline stage com deals ativos: "Mova os X deals para outro stage antes de continuar"
- Deals com `stage_id = NULL` exibidos em coluna "Sem estágio" no kanban

### Dashboard — painéis e fontes de dados

| Painel | Fonte | Filtro |
|--------|-------|--------|
| Funil de deals | `deals` agrupado por `stage_id` | `status = 'open'`, org ativa |
| Deals ganhos/perdidos | `deals` com `status IN ('won','lost')` | Últimos 30 dias |
| Tarefas pendentes | `tasks` com `done = false` | `assigned_to = auth.uid()`, `due_date <= now() + 7 days` |
| Atividade recente | `activities` | Org ativa, últimos 20 registros, ordenado por `created_at DESC` |
| Total em pipeline | `SUM(deals.value)` | `status = 'open'`, org ativa |

---

## Error Handling

- Erros do Supabase capturados nas Server Actions com retorno tipado `{ data, error }` — nunca expostos ao cliente
- Validação client-side com Zod + React Hook Form antes de qualquer chamada ao servidor
- Páginas de erro customizadas (`error.tsx`, `not-found.tsx`) no App Router
- Loading states com Suspense boundaries por seção
- Sentry para tracking de erros em produção com contexto de org/user

---

## Testes

| Tipo | Ferramenta | Cobertura |
|------|-----------|-----------|
| Unitários | Vitest | Lógica de negócio, validações Zod, cálculos de pipeline, rebalanceamento float8 |
| E2E | Playwright | Criar contato, mover deal no kanban, criar tarefa, login/logout, fluxo de convite completo |
| RLS | Supabase CLI | Verificar isolamento entre organizações; usuário A não acessa dados da org B; admin vs member permissions |

---

## Fora do Escopo (MVP)

- Email marketing e automações
- Rastreamento de email (open/click tracking)
- Templates de email
- Relatórios avançados e exportações
- Integrações com ferramentas externas (Slack, Gmail, etc.)
- Importação em massa via CSV
- Mobile app
- Subdomínios por organização (`slug` disponível no schema para uso futuro)

Esses módulos podem ser adicionados em versões futuras após validação do MVP.
