# Fase 1 — Redesign Visual CRM Oak

**Goal:** Transformar o CRM MVP em um produto visualmente profissional, com identidade Oak (azul, branco, preto), navegação clara e páginas ricas.

**Architecture:** Evolução incremental sobre a estrutura existente — substituição de estilos, adição de Recharts para gráficos, reorganização de layouts. Sem quebrar Server Actions nem estrutura de rotas.

**Tech Stack:** Next.js 16, Tailwind CSS, shadcn/ui v4, Recharts, Lucide React, Inter (fonte)

---

## 1. Design System

### Paleta
- Primário: `#1E40AF` (blue-800), hover `#1D4ED8`, fundo suave `#DBEAFE`
- Sidebar: fundo `#0F172A` (slate-900)
- Superfícies: branco para cards, `#F8FAFC` para fundo de página
- Status: verde `#16A34A` (won/concluído), âmbar `#D97706` (pendente), vermelho `#DC2626` (atrasado), azul `#2563EB` (em progresso)

### Tipografia
- Fonte: Inter (já instalada via next/font)
- Headings: `font-semibold`
- Body: `font-normal`, `text-slate-700`
- Labels/metadados: `text-xs text-slate-500`

### Sombras e bordas
- Cards: `shadow-sm` padrão, `hover:shadow-md` em listas clicáveis
- Bordas: `border border-slate-200`
- Radius: `rounded-xl` em cards, `rounded-lg` em inputs/badges

---

## 2. Sidebar

**Arquivo:** `src/components/layout/sidebar.tsx`

### Estrutura
- Largura fixa: 240px
- Fundo: `bg-slate-900`
- Sempre visível (não colapsável)

### Elementos
- **Topo:** logo Oak (texto "Oak CRM" estilizado em branco) + nome da organização em `text-slate-400 text-xs`
- **Navegação principal:**
  - Dashboard (LayoutDashboard)
  - Contatos (Users)
  - Empresas (Building2)
  - Negócios (TrendingUp)
  - Tarefas (CheckSquare)
- **Rodapé:** avatar com iniciais + nome do usuário + botão logout (LogOut icon)

### Estados dos itens
- Padrão: `text-slate-400`, hover `text-white bg-slate-800`
- Ativo: `text-white bg-blue-700`, borda esquerda `border-l-2 border-blue-400`

---

## 3. Dashboard

**Arquivo:** `src/app/(app)/dashboard/page.tsx`

### Header
- "Bom dia, [Nome]" em `text-2xl font-bold`
- Data atual formatada em português

### KPI Cards (grid 4 colunas)
Cada card contém:
- Ícone colorido (fundo tinted)
- Label em `text-sm text-slate-500`
- Número em `text-3xl font-bold`
- Variação vs mês anterior: `+X% ↑` em verde ou `-X% ↓` em vermelho

Métricas: Contatos totais, Empresas, Negócios abertos (valor R$), Tarefas pendentes

### Gráficos (Recharts)
- **Receita mensal** (linha): últimos 6 meses, valor em R$ dos negócios fechados — ocupa 60% da largura
- **Pipeline por estágio** (barras horizontais): contagem e valor por estágio — ocupa 40% da largura

### Coluna inferior
- **Tarefas de hoje** (lista compacta): título + contato/negócio relacionado + checkbox
- **Atividades recentes** (feed): ícone por tipo + descrição + "X min atrás"

---

## 4. Listas

**Arquivos:** `contacts/page.tsx`, `companies/page.tsx`, `deals/page.tsx`

### Layout geral
- Substituir cards por tabela com `<table>` estilizada
- Linhas clicáveis: `hover:bg-slate-50 cursor-pointer`
- Ações inline (editar/excluir) aparecem no hover da linha via `group-hover:opacity-100`

### Contatos
Colunas: Avatar+Nome | Empresa | E-mail | Telefone | Status | Criado em | Ações

- Avatar: círculo com iniciais, cor gerada a partir do nome (hash → hue)
- Badge de status se aplicável

### Empresas
Colunas: Logo+Nome | Segmento | Contatos | Negócios abertos | Criado em | Ações

### Negócios
Colunas: Nome | Empresa | Estágio (badge colorido) | Valor (R$) | Responsável | Fechamento | Ações

### Barra superior
- Título da página + contador total
- SearchInput existente (mantido)
- Botão "Novo [item]" azul primário

### Cabeçalho da tabela
- `text-xs font-medium text-slate-500 uppercase tracking-wide`
- Hover indica ordenação (implementar ordenação client-side por coluna)

---

## 5. Páginas de Detalhe

**Arquivos:** `contacts/[id]/page.tsx`, `companies/[id]/page.tsx`, `deals/[id]/page.tsx`

### Header
- Avatar grande (64px) com iniciais ou foto futura
- Nome em `text-3xl font-bold`
- Badges de status/estágio
- Botões: "Editar", "Nova tarefa", "Nova atividade"

### Layout 2 colunas
**Coluna principal (70%):**
- Abas: Visão geral | Atividades | Tarefas | [Negócios para contatos/empresas]
- Conteúdo da aba ativa

**Coluna lateral (30%):**
- Card "Informações": todos os campos do registro
- Card "Negócios relacionados" (para contatos/empresas)
- Card "Contatos relacionados" (para empresas/negócios)

### Deal detail extra
- Barra de progresso do pipeline no topo: etapas como steps, etapa atual destacada em azul

### Feed de atividades
- Item: ícone por tipo (Phone, Mail, Calendar, FileText) + texto + autor + timestamp relativo
- Borda esquerda colorida por tipo

---

## Dependências a instalar

```bash
npm install recharts
```

---

## O que NÃO muda nesta fase

- Estrutura de rotas e Server Actions
- Lógica de banco de dados / Supabase
- Sistema de autenticação e organizações
- Kanban de negócios (redesign na Fase 2)
