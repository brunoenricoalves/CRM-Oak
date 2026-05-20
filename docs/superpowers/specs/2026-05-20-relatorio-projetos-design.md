# Relatório de Projetos — Design

**Date:** 2026-05-20
**Project:** Oak CRM
**Status:** Approved

---

## Goal

Add a Projects section to the existing `/reports` page, giving Oak a live operational and financial view of their active client base.

---

## New Section: "Projetos"

Placed below the existing funnel-by-stage section.

### KPI Row (4 cards)

| Card                        | Query                                                          |
|-----------------------------|----------------------------------------------------------------|
| Projetos ativos             | `COUNT(*) WHERE status = 'active'`                            |
| Projetos pausados           | `COUNT(*) WHERE status = 'paused'`                            |
| Encerrados este ano         | `COUNT(*) WHERE status = 'closed' AND start_date >= Jan 1`    |
| Receita em projetos ativos  | `SUM(deals.value) WHERE projects.status = 'active'`           |

Icons: `Briefcase` (active), `PauseCircle` (paused), `CheckCircle2` (closed), `DollarSign` (revenue). Colors follow existing KPI card pattern.

### Active Projects Table

Shown only if there is at least one active project. Columns:

| Column       | Source                                        |
|--------------|-----------------------------------------------|
| Cliente      | `companies.name` or deal title if no company  |
| Valor        | `deals.value` (BRL formatted)                 |
| Início       | `projects.start_date` (DD/MM/YYYY)            |
| Negócio      | Link `→` to `/deals/[deal_id]`                |

No pagination. Sorted by `start_date DESC`.

---

## Data Queries

Added to the existing `Promise.all` in `reports/page.tsx`:

```typescript
supabase
  .from('projects')
  .select('id, status, start_date, deal_id, deals(value, title, companies(name))')
  .eq('org_id', orgId!)
```

All aggregations (counts, revenue sum) computed in JS from the returned rows — no extra DB queries.

---

## Files

| Action  | Path                                    |
|---------|-----------------------------------------|
| Modify  | `src/app/(app)/reports/page.tsx`        |

---

## What's Out of Scope

- Project timeline / Gantt view
- Revenue per project over time
- Project profitability (costs)
- Filtering or sorting within the table
