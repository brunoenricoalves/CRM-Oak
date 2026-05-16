# CRM Sales Hub — Design Spec

**Data:** 2026-05-16  
**Referência:** HubSpot Sales Hub  
**Status:** Aprovado

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
| Testes unitários | Vitest |
| Testes E2E | Playwright |
| Erros em produção | Sentry |
| Notificações UI | Sonner (toasts) |
| Hosting | Vercel (frontend) + Supabase Cloud |

---

## Arquitetura

### Multi-tenancy

Cada cliente do SaaS é uma **organização**. Todos os registros no banco possuem `org_id`. Row Level Security (RLS) do Supabase garante isolamento total — usuários só acessam dados da própria organização.

### Autenticação

Supabase Auth com email/senha e magic link. Ao criar conta, o usuário cria ou entra em uma organização existente via convite.

**Roles:**
- `admin` — gerencia membros, configura pipeline stages, acessa settings
- `member` — usa o CRM (contatos, deals, tarefas)

### Fluxo de dados

- Next.js chama Supabase diretamente via client SDK (com RLS) para leituras e mutations simples
- Server Actions para operações que exigem validação server-side ou lógica sensível
- Suspense boundaries para loading states por seção

---

## Modelo de Dados

```sql
organizations
  id uuid PK
  name text
  slug text UNIQUE
  plan text DEFAULT 'free'
  created_at timestamptz

org_members
  org_id uuid FK → organizations
  user_id uuid FK → auth.users
  role text CHECK (role IN ('admin', 'member'))
  invited_at timestamptz
  PRIMARY KEY (org_id, user_id)

contacts
  id uuid PK
  org_id uuid FK → organizations
  name text NOT NULL
  email text
  phone text
  company_id uuid FK → companies
  owner_id uuid FK → auth.users
  created_at timestamptz

companies
  id uuid PK
  org_id uuid FK → organizations
  name text NOT NULL
  domain text
  industry text
  size text
  created_at timestamptz

pipeline_stages
  id uuid PK
  org_id uuid FK → organizations
  name text NOT NULL
  position int NOT NULL
  color text
  created_at timestamptz

deals
  id uuid PK
  org_id uuid FK → organizations
  title text NOT NULL
  value numeric
  stage_id uuid FK → pipeline_stages
  contact_id uuid FK → contacts
  company_id uuid FK → companies
  owner_id uuid FK → auth.users
  close_date date
  created_at timestamptz

activities
  id uuid PK
  org_id uuid FK → organizations
  type text CHECK (type IN ('call', 'email', 'note', 'meeting'))
  body text
  contact_id uuid FK → contacts
  deal_id uuid FK → deals
  user_id uuid FK → auth.users
  created_at timestamptz

tasks
  id uuid PK
  org_id uuid FK → organizations
  title text NOT NULL
  due_date timestamptz
  done boolean DEFAULT false
  assigned_to uuid FK → auth.users
  contact_id uuid FK → contacts
  deal_id uuid FK → deals
  created_at timestamptz
```

**Relações chave:**
- Um deal pertence a um contato e opcionalmente a uma empresa
- Atividades e tarefas podem estar associadas a contato, deal, ou ambos
- `pipeline_stages` são customizáveis por organização
- RLS aplicado em todas as tabelas via `org_id`

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
```

### Mapa de rotas

| Rota | Descrição |
|------|-----------|
| `/dashboard` | Funil de deals por stage, tarefas pendentes, atividade recente |
| `/contacts` | Lista com busca, filtros, criação inline |
| `/contacts/[id]` | Perfil: dados, timeline de atividades, deals associados, tarefas |
| `/companies` | Lista de empresas com busca e filtros |
| `/companies/[id]` | Perfil: contatos vinculados, deals, atividades |
| `/deals` | Kanban por stage (drag & drop) + view de lista |
| `/deals/[id]` | Detalhe: valor, responsável, contato, timeline |
| `/tasks` | Lista com filtro por vencimento e responsável |
| `/settings` | Membros da org, stages customizáveis, perfil do usuário |

### Padrões de UX (inspirados no HubSpot)
- Painel lateral deslizante (sheet) ao clicar num contato ou deal — sem navegação de página
- Timeline de atividades em ordem cronológica reversa em cada registro
- Drag & drop no kanban para mover deals entre stages
- Toast notifications para feedback de todas as ações

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
| Unitários | Vitest | Lógica de negócio, validações Zod, cálculos de pipeline |
| E2E | Playwright | Criar contato, mover deal no kanban, criar tarefa, login/logout |
| RLS | Supabase CLI | Verificar isolamento entre organizações diferentes |

---

## Fora do Escopo (MVP)

- Email marketing e automações
- Rastreamento de email (open/click tracking)
- Templates de email
- Relatórios avançados e exportações
- Integrações com ferramentas externas (Slack, Gmail, etc.)
- Importação em massa via CSV
- Mobile app

Esses módulos podem ser adicionados em versões futuras após validação do MVP.
