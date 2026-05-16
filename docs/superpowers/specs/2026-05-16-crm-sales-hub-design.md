# CRM Sales Hub — Design Spec

**Data:** 2026-05-16  
**Referência:** HubSpot Sales Hub  
**Status:** Aprovado (revisado após code review)

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

Um usuário pode pertencer a múltiplas organizações. A organização ativa é armazenada em um cookie de sessão e referenciada via JWT claim `org_id`. A UI expõe um org switcher no header da sidebar.

### Autenticação e Onboarding

Supabase Auth com email/senha e magic link.

**Fluxo de criação de conta:**
1. Usuário se registra → cria uma nova organização (nome + slug)
2. Passa a ser `admin` dessa organização automaticamente

**Fluxo de convite:**
1. Admin acessa `/settings/members` e envia convite por email
2. Sistema gera token único, persiste em `invitations`, envia email via Resend
3. Destinatário acessa `/invite/[token]`
4. Se não tem conta: cria conta e entra na org automaticamente
5. Se já tem conta: faz login e entra na org (multi-org suportado)
6. Token expira em 7 dias; convites aceitos marcados com `accepted_at`

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

Busca em contatos e empresas usa `pg_trgm` com índice GIN. Configurado na criação do schema — não retroativo.

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX contacts_name_trgm ON contacts USING GIN (name gin_trgm_ops);
CREATE INDEX contacts_email_trgm ON contacts USING GIN (email gin_trgm_ops);
CREATE INDEX companies_name_trgm ON companies USING GIN (name gin_trgm_ops);
```

---

## Modelo de Dados

```sql
organizations
  id          uuid        PK DEFAULT gen_random_uuid()
  name        text        NOT NULL
  slug        text        NOT NULL UNIQUE  -- usado no org switcher e URLs futuras
  plan        text        NOT NULL DEFAULT 'free'
  created_at  timestamptz NOT NULL DEFAULT now()
  updated_at  timestamptz NOT NULL DEFAULT now()

org_members
  org_id      uuid        NOT NULL FK → organizations
  user_id     uuid        NOT NULL FK → auth.users
  role        text        NOT NULL CHECK (role IN ('admin', 'member'))
  invited_at  timestamptz NOT NULL DEFAULT now()
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

contacts
  id          uuid        PK DEFAULT gen_random_uuid()
  org_id      uuid        NOT NULL FK → organizations
  name        text        NOT NULL
  email       text        NULL
  phone       text        NULL
  company_id  uuid        NULL FK → companies
  owner_id    uuid        NULL FK → auth.users
  -- owner_id deve ser membro da org (validado via trigger ou CHECK na aplicação)
  created_at  timestamptz NOT NULL DEFAULT now()
  updated_at  timestamptz NOT NULL DEFAULT now()

companies
  id          uuid        PK DEFAULT gen_random_uuid()
  org_id      uuid        NOT NULL FK → organizations
  name        text        NOT NULL
  domain      text        NULL
  industry    text        NULL
  size        text        NULL  -- ex: '1-10', '11-50', '51-200', '200+'
  created_at  timestamptz NOT NULL DEFAULT now()
  updated_at  timestamptz NOT NULL DEFAULT now()

pipeline_stages
  id          uuid        PK DEFAULT gen_random_uuid()
  org_id      uuid        NOT NULL FK → organizations
  name        text        NOT NULL
  position    int         NOT NULL
  color       text        NULL
  created_at  timestamptz NOT NULL DEFAULT now()
  updated_at  timestamptz NOT NULL DEFAULT now()
  -- ON DELETE: RESTRICT — UI deve mover deals antes de permitir deleção

deals
  id          uuid        PK DEFAULT gen_random_uuid()
  org_id      uuid        NOT NULL FK → organizations
  title       text        NOT NULL
  value       numeric     NULL
  stage_id    uuid        NULL FK → pipeline_stages ON DELETE RESTRICT
  contact_id  uuid        NULL FK → contacts
  company_id  uuid        NULL FK → companies
  owner_id    uuid        NULL FK → auth.users
  -- owner_id deve ser membro da org (validado via trigger ou CHECK na aplicação)
  status      text        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost'))
  closed_at   timestamptz NULL  -- preenchido quando status muda para won/lost
  close_date  date        NULL  -- data prevista de fechamento
  position    float8      NOT NULL DEFAULT 0  -- ordem dentro do stage no kanban (Lexorank)
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
  CONSTRAINT activity_has_target
    CHECK (contact_id IS NOT NULL OR deal_id IS NOT NULL OR company_id IS NOT NULL)

tasks
  id          uuid        PK DEFAULT gen_random_uuid()
  org_id      uuid        NOT NULL FK → organizations
  title       text        NOT NULL
  due_date    timestamptz NULL
  done        boolean     NOT NULL DEFAULT false
  assigned_to uuid        NULL FK → auth.users
  contact_id  uuid        NULL FK → contacts
  deal_id     uuid        NULL FK → deals
  created_at  timestamptz NOT NULL DEFAULT now()
  updated_at  timestamptz NOT NULL DEFAULT now()
```

**Relações chave:**
- Um deal pertence opcionalmente a um contato e/ou empresa
- Atividades podem ser associadas a contato, empresa, deal ou qualquer combinação — mas pelo menos um vínculo é obrigatório (CHECK constraint)
- Deals com `status = 'won'` ou `'lost'` preenchem `closed_at` automaticamente
- Deleção de `pipeline_stage`: bloqueada por FK RESTRICT — UI exibe diálogo "mova os deals para outro stage antes de deletar"
- `deals.position` usa float8 (estilo Lexorank) para reordenação drag & drop sem reescrever todos os registros
- `owner_id` em contacts e deals deve ser validado como membro da mesma `org_id` (trigger na camada de aplicação)

---

## Políticas RLS

Todas as tabelas têm RLS habilitado. Padrão: acesso negado por default, políticas permitem apenas membros da org.

```sql
-- Padrão aplicado a todas as tabelas com org_id
-- SELECT
CREATE POLICY "org_members_select" ON <table>
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- INSERT / UPDATE / DELETE (mesma lógica de org membership)
CREATE POLICY "org_members_write" ON <table>
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM org_members WHERE user_id = auth.uid()
    )
  );

-- pipeline_stages: somente admins podem modificar
CREATE POLICY "admin_only_stages" ON pipeline_stages
  FOR INSERT OR UPDATE OR DELETE USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_id = pipeline_stages.org_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );

-- org_members: somente admins podem convidar/remover
CREATE POLICY "admin_only_members" ON org_members
  FOR INSERT OR UPDATE OR DELETE USING (
    EXISTS (
      SELECT 1 FROM org_members AS om
      WHERE om.org_id = org_members.org_id
        AND om.user_id = auth.uid()
        AND om.role = 'admin'
    )
  );

-- invitations: somente admins criam; token lookup é público (para /invite/[token])
CREATE POLICY "admin_creates_invitations" ON invitations
  FOR INSERT USING (
    EXISTS (
      SELECT 1 FROM org_members
      WHERE org_id = invitations.org_id
        AND user_id = auth.uid()
        AND role = 'admin'
    )
  );
```

O `org_id` ativo do usuário é resolvido via lookup em `org_members` — não armazenado no JWT, evitando staleness após troca de org.

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
| `/companies/[id]` | Perfil: contatos vinculados, deals, atividades |
| `/deals` | Kanban por stage (drag & drop) + view de lista |
| `/deals/[id]` | Detalhe: valor, responsável, contato, timeline |
| `/tasks` | Lista com filtro por vencimento e responsável |
| `/settings/members` | Membros da org, envio de convites |
| `/settings/pipeline` | Stages customizáveis (criar, reordenar, deletar) |
| `/settings/profile` | Perfil do usuário |
| `/invite/[token]` | Landing page de convite |

### Padrões de UX

- **Sheet vs página completa:** O sheet (painel lateral deslizante) é a UI primária ao clicar em um contato ou deal dentro do app. As rotas `/contacts/[id]` e `/deals/[id]` são links compartilháveis — renderizam o mesmo conteúdo em layout de página completa. O sheet abre via navegação interna; a rota `[id]` é usada em acesso direto por URL.
- Timeline de atividades em ordem cronológica reversa em cada registro
- Drag & drop no kanban persiste `position` (float8) no banco — ordem sobrevive a page refresh
- Toast notifications para feedback de todas as ações
- Diálogo de confirmação ao deletar pipeline stage com deals ativos: "Mova os X deals para outro stage antes de continuar"

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
| Unitários | Vitest | Lógica de negócio, validações Zod, cálculos de pipeline, Lexorank position |
| E2E | Playwright | Criar contato, mover deal no kanban, criar tarefa, login/logout, fluxo de convite |
| RLS | Supabase CLI | Verificar isolamento entre organizações; usuário A não acessa dados da org B |

---

## Fora do Escopo (MVP)

- Email marketing e automações
- Rastreamento de email (open/click tracking)
- Templates de email
- Relatórios avançados e exportações
- Integrações com ferramentas externas (Slack, Gmail, etc.)
- Importação em massa via CSV
- Mobile app
- Subdomínios por organização (slug disponível no schema para uso futuro)

Esses módulos podem ser adicionados em versões futuras após validação do MVP.
