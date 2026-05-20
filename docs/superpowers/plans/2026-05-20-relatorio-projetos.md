# Relatório de Projetos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Projects section to the existing `/reports` page showing operational KPIs (active/paused/closed counts, active revenue) and a table of active projects.

**Architecture:** One additional Supabase query added to the existing `Promise.all` in `reports/page.tsx`. All aggregations computed in JS from the returned rows. No new files — only `/reports/page.tsx` is modified.

**Tech Stack:** Next.js 16 App Router server component, Supabase SSR client, existing CSS variable theming

---

## File Map

| Action  | Path                                    | Responsibility                        |
|---------|-----------------------------------------|---------------------------------------|
| Modify  | `src/app/(app)/reports/page.tsx`        | Add projects query + KPIs + table     |

---

### Task 1: Add projects section to reports page

**Files:**
- Modify: `src/app/(app)/reports/page.tsx`

- [ ] **Step 1: Add the projects query to the Promise.all**

In `src/app/(app)/reports/page.tsx`, the `Promise.all` currently has 5 queries. Add a 6th:

```typescript
const [
  { data: wonDeals },
  { data: allDeals },
  { data: stages },
  { data: goals },
  { data: openDealsWithStages },
  { data: allProjects },
] = await Promise.all([
  // ... existing 5 queries unchanged ...
  supabase
    .from('projects')
    .select('id, status, start_date, deal_id, deals(value, title, companies(name))')
    .eq('org_id', orgId!),
])
```

- [ ] **Step 2: Compute project aggregations (after the Promise.all)**

Add this block after the existing JS aggregations (after `const forecast = ...`):

```typescript
type ProjectRow = {
  id: string
  status: string
  start_date: string
  deal_id: string
  deals: { value: number | null; title: string; companies: { name: string } | null } | null
}

const projects = (allProjects ?? []) as ProjectRow[]

const activeProjects = projects.filter((p) => p.status === 'active')
const pausedProjects = projects.filter((p) => p.status === 'paused')
const closedThisYear = projects.filter((p) => {
  if (p.status !== 'closed') return false
  return new Date(p.start_date).getFullYear() === currentYear
})

const activeRevenue = activeProjects.reduce((sum, p) => sum + (p.deals?.value ?? 0), 0)

const activeProjectRows = activeProjects
  .slice()
  .sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())
```

- [ ] **Step 3: Add the Projects KPI row and table to the JSX**

Add the following section after the closing `</div>` of the goals history section (before the final `</div>` that closes the page):

```tsx
{/* Projects section */}
<div className="mt-6">
  <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>
    Projetos
  </p>

  {/* Project KPIs */}
  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
    {[
      { icon: Briefcase,     iconColor: '#34d399', label: 'Ativos',              value: String(activeProjects.length) },
      { icon: PauseCircle,   iconColor: '#f59e0b', label: 'Pausados',            value: String(pausedProjects.length) },
      { icon: CheckCircle2,  iconColor: '#a0a0b8', label: 'Encerrados este ano', value: String(closedThisYear.length) },
      { icon: DollarSign,    iconColor: '#2563eb', label: 'Receita ativa',       value: fmt(activeRevenue) },
    ].map((k) => {
      const Icon = k.icon
      return (
        <div key={k.label} style={{ ...card, padding: '16px' }}>
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-4 h-4" style={{ color: k.iconColor }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{k.label}</span>
          </div>
          <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>{k.value}</p>
        </div>
      )
    })}
  </div>

  {/* Active projects table */}
  {activeProjectRows.length > 0 && (
    <div style={{ ...card, padding: '20px' }}>
      <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>
        Projetos ativos
      </p>
      <div className="space-y-2">
        {/* Header */}
        <div className="grid grid-cols-3 gap-4 pb-2 text-xs font-semibold" style={{ color: 'var(--text-dim)', borderBottom: '1px solid var(--surface-border)' }}>
          <span>Cliente</span>
          <span>Valor</span>
          <span>Início</span>
        </div>
        {activeProjectRows.map((p) => {
          const clientName = p.deals?.companies?.name ?? p.deals?.title ?? '—'
          return (
            <div key={p.id} className="grid grid-cols-3 gap-4 py-2 text-sm" style={{ borderBottom: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}>
              <span className="truncate">{clientName}</span>
              <span>{p.deals?.value != null ? fmt(p.deals.value) : '—'}</span>
              <span>
                <a href={`/deals/${p.deal_id}`} style={{ color: '#2563eb', textDecoration: 'none' }}>
                  {new Date(p.start_date + 'T12:00:00').toLocaleDateString('pt-BR')} →
                </a>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )}

  {activeProjectRows.length === 0 && (
    <div style={{ ...card, padding: '20px' }} className="text-center">
      <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
        Nenhum projeto ativo. Projetos são criados automaticamente ao fechar um negócio como ganho.
      </p>
    </div>
  )}
</div>
```

- [ ] **Step 4: Add missing lucide-react imports**

In `src/app/(app)/reports/page.tsx`, the current import is:

```typescript
import { TrendingUp, Target, BarChart3, Percent } from 'lucide-react'
```

Replace with:

```typescript
import { TrendingUp, Target, BarChart3, Percent, Briefcase, PauseCircle, CheckCircle2, DollarSign } from 'lucide-react'
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "reports"
```

Expected: no output.

- [ ] **Step 6: Verify in browser**

Navigate to `/reports`. Scroll to the bottom. The "Projetos" section should show 4 KPI cards and either the active projects table or the empty-state message.

- [ ] **Step 7: Commit**

```bash
git add src/app/(app)/reports/page.tsx
git commit -m "feat(reports): add projects section with KPIs and active projects table"
```

---

### Task 2: Build and deploy

- [ ] **Step 1: Build**

```bash
vercel build --prod --yes
```

Expected: ✓ Compiled successfully.

- [ ] **Step 2: Deploy**

```bash
vercel deploy --prebuilt --prod
```

Expected: `▲ Aliased https://crm-zeta-mocha.vercel.app`

- [ ] **Step 3: Smoke test**

Open `https://crm-zeta-mocha.vercel.app/reports` and scroll down. Confirm the Projetos section is visible with KPI cards.
