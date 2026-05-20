# PDF de Proposta — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a download-PDF button to every proposal in both `/deals/[id]` and `/proposals`, generating a branded PDF with title, line items, and total via a Next.js API route.

**Architecture:** A `GET /api/proposals/[id]/pdf` route handler fetches the proposal from Supabase (RLS-enforced), reads the Oak logo from the filesystem, and streams a PDF generated with `@react-pdf/renderer`. A simple `PdfDownloadButton` (`<a>` tag) links to this route from both locations.

**Tech Stack:** Next.js 16 App Router Route Handlers, `@react-pdf/renderer`, Supabase SSR client, Node.js `fs`

---

## File Map

| Action  | Path                                                  | Responsibility                          |
|---------|-------------------------------------------------------|-----------------------------------------|
| Create  | `src/app/api/proposals/[id]/pdf/route.ts`             | Route handler — fetch + generate PDF   |
| Create  | `src/components/proposals/proposal-pdf.tsx`           | @react-pdf/renderer document component |
| Create  | `src/components/proposals/pdf-download-button.tsx`    | `<a>` link to the route                |
| Modify  | `src/components/proposals/proposal-list.tsx`          | Add button to deal-page proposal rows  |
| Modify  | `src/app/(app)/proposals/page.tsx`                    | Add button to proposals-page rows      |

---

### Task 1: Install @react-pdf/renderer

**Files:**
- Modify: `package.json` (via npm)

- [ ] **Step 1: Install the package**

```bash
npm install @react-pdf/renderer
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Verify TypeScript types are available**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors related to `@react-pdf/renderer`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @react-pdf/renderer"
```

---

### Task 2: ProposalPdf document component

**Files:**
- Create: `src/components/proposals/proposal-pdf.tsx`

This is a pure `@react-pdf/renderer` component. It must NOT have `'use client'` — it runs only on the server inside the route handler.

- [ ] **Step 1: Create the component**

```tsx
// src/components/proposals/proposal-pdf.tsx
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer'

interface Item {
  service: string
  description: string | null
  value: number | string
  position: number
}

interface ProposalPdfProps {
  title: string
  items: Item[]
  logoBase64: string
}

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: '#0f172a' },
  header: { backgroundColor: '#2563eb', padding: 16, marginBottom: 28, borderRadius: 4, flexDirection: 'row', alignItems: 'center' },
  logo: { width: 70, height: 20 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#0f172a' },
  tableHeaderRow: { flexDirection: 'row', backgroundColor: '#eff6ff', padding: '6 8', borderRadius: 4, marginBottom: 2 },
  tableRow: { flexDirection: 'row', padding: '6 8', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', borderBottomStyle: 'solid' },
  totalRow: { flexDirection: 'row', padding: '8 8', backgroundColor: '#eff6ff', borderRadius: 4, marginTop: 4 },
  colService: { width: '25%' },
  colDesc: { width: '50%' },
  colValue: { width: '25%', textAlign: 'right' },
  labelText: { fontSize: 9, color: '#64748b', fontWeight: 'bold' },
  valueText: { fontSize: 10, fontWeight: 'bold' },
  footer: { position: 'absolute', bottom: 24, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#94a3b8' },
})

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export function ProposalPdf({ title, items, logoBase64 }: ProposalPdfProps) {
  const total = items.reduce((sum, it) => sum + Number(it.value), 0)
  const today = new Date().toLocaleDateString('pt-BR')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logoBase64} style={styles.logo} />
        </View>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Table header */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.colService, styles.labelText]}>SERVIÇO</Text>
          <Text style={[styles.colDesc, styles.labelText]}>DESCRIÇÃO</Text>
          <Text style={[styles.colValue, styles.labelText]}>VALOR</Text>
        </View>

        {/* Items */}
        {items.map((it, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.colService}>{it.service}</Text>
            <Text style={styles.colDesc}>{it.description ?? ''}</Text>
            <Text style={styles.colValue}>{fmt(Number(it.value))}</Text>
          </View>
        ))}

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={[styles.colService, styles.valueText]}>Total</Text>
          <Text style={styles.colDesc} />
          <Text style={[styles.colValue, styles.valueText]}>{fmt(total)}</Text>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>Gerado em {today}</Text>
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/proposals/proposal-pdf.tsx
git commit -m "feat(pdf): add ProposalPdf document component"
```

---

### Task 3: PDF route handler

**Files:**
- Create: `src/app/api/proposals/[id]/pdf/route.ts`

- [ ] **Step 1: Create the route handler**

```typescript
// src/app/api/proposals/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import fs from 'fs'
import path from 'path'
import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { ProposalPdf } from '@/components/proposals/proposal-pdf'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const orgId = await getActiveOrgId()
  if (!orgId) return new NextResponse('Unauthorized', { status: 401 })

  const supabase = await createClient()
  const { data: proposal } = await supabase
    .from('proposals')
    .select('id, title, proposal_items(service, description, value, position)')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (!proposal) return new NextResponse('Not found', { status: 404 })

  const items = ((proposal.proposal_items ?? []) as {
    service: string
    description: string | null
    value: number
    position: number
  }[]).sort((a, b) => a.position - b.position)

  const logoPath = path.join(process.cwd(), 'public', 'logo-oak.png')
  const logoBuffer = await fs.promises.readFile(logoPath)
  const logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`

  const buffer = await renderToBuffer(
    React.createElement(ProposalPdf, { title: proposal.title, items, logoBase64 })
  )

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="proposta.pdf"`,
    },
  })
}
```

- [ ] **Step 2: Start the dev server and smoke-test manually**

```bash
npm run dev
```

Open `http://localhost:3000` in a browser, navigate to any deal with a proposal, and visit `/api/proposals/<proposal-id>/pdf` directly. Expected: browser downloads a PDF file.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/proposals/[id]/pdf/route.ts
git commit -m "feat(pdf): add PDF route handler"
```

---

### Task 4: PdfDownloadButton component

**Files:**
- Create: `src/components/proposals/pdf-download-button.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/proposals/pdf-download-button.tsx
import { Download } from 'lucide-react'

interface PdfDownloadButtonProps {
  proposalId: string
}

export function PdfDownloadButton({ proposalId }: PdfDownloadButtonProps) {
  return (
    <a
      href={`/api/proposals/${proposalId}/pdf`}
      target="_blank"
      rel="noreferrer"
      title="Baixar PDF"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 8,
        color: 'var(--text-dim)',
        background: 'none',
        border: 'none',
        textDecoration: 'none',
        flexShrink: 0,
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#2563eb')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-dim)')}
    >
      <Download size={16} />
    </a>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/proposals/pdf-download-button.tsx
git commit -m "feat(pdf): add PdfDownloadButton component"
```

---

### Task 5: Add button to ProposalList (deal page)

**Files:**
- Modify: `src/components/proposals/proposal-list.tsx`

Add the download button to the Actions section of each proposal card, alongside the existing Aceita/Recusada/Trash buttons.

- [ ] **Step 1: Import PdfDownloadButton and add to actions div**

In `src/components/proposals/proposal-list.tsx`, add the import at the top:

```typescript
import { PdfDownloadButton } from './pdf-download-button'
```

Then in the Actions `<div className="flex items-center gap-2 pt-1">`, add the button before the delete form:

```tsx
{/* Actions */}
<div className="flex items-center gap-2 pt-1">
  {p.status === 'sent' && (
    <>
      <form action={updateProposalStatus.bind(null, p.id, 'accepted', dealId)}>
        <button
          type="submit"
          className="flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium transition-all"
          style={{ minHeight: 36, background: 'rgba(52,211,153,0.12)', color: '#10b981', border: 'none' }}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Aceita
        </button>
      </form>
      <form action={updateProposalStatus.bind(null, p.id, 'rejected', dealId)}>
        <button
          type="submit"
          className="flex items-center gap-1.5 px-3 rounded-lg text-xs font-medium transition-all"
          style={{ minHeight: 36, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none' }}
        >
          <XCircle className="w-3.5 h-3.5" />
          Recusada
        </button>
      </form>
    </>
  )}
  <PdfDownloadButton proposalId={p.id} />
  <form
    action={deleteProposal.bind(null, p.id, dealId)}
    className="ml-auto"
  >
    <button
      type="submit"
      style={{ background: 'none', border: 'none', color: 'var(--text-faint)', minHeight: 36, padding: '0 4px' }}
      onMouseEnter={e => (e.currentTarget.style.color = '#ef4444')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  </form>
</div>
```

- [ ] **Step 2: Verify in browser**

Navigate to `/deals/[any-deal-id]` with at least one proposal. Confirm the Download icon appears per proposal and clicking it downloads a PDF.

- [ ] **Step 3: Commit**

```bash
git add src/components/proposals/proposal-list.tsx
git commit -m "feat(pdf): add download button to ProposalList"
```

---

### Task 6: Add button to /proposals page

**Files:**
- Modify: `src/app/(app)/proposals/page.tsx`

The current row is a full `<Link>` wrapping all content. We cannot nest an `<a>` inside it. Restructure each row: make it a `<div>` with the same card styles, add a Link for the deal title area, and place the `PdfDownloadButton` as a sibling.

- [ ] **Step 1: Import PdfDownloadButton**

Add at the top of `src/app/(app)/proposals/page.tsx`:

```typescript
import { PdfDownloadButton } from '@/components/proposals/pdf-download-button'
```

- [ ] **Step 2: Replace each row's Link wrapper with a div + internal Link**

Replace the per-row JSX (currently a `<Link>` wrapping everything) with:

```tsx
<div
  key={p.id}
  className="flex items-center justify-between gap-4 px-5 py-4 rounded-xl"
  style={{ ...card, display: 'flex' }}
>
  <Link
    href={`/deals/${p.deal_id}`}
    className="flex-1 min-w-0"
    style={{ textDecoration: 'none' }}
  >
    <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
      {p.title}
    </p>
    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-dim)' }}>
      {company?.name ?? deal?.title ?? '—'}
    </p>
  </Link>

  <div className="flex items-center gap-4 shrink-0">
    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
      {fmt(total)}
    </span>
    <span className="text-xs" style={{ color: 'var(--text-dim)' }}>
      {new Date(p.sent_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
    </span>
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ background: badge.bg, color: badge.color }}
    >
      {badge.label}
    </span>
    <PdfDownloadButton proposalId={p.id} />
  </div>
</div>
```

- [ ] **Step 3: Verify in browser**

Navigate to `/proposals`. Each row should show the Download icon at the right. Clicking the title/company text navigates to the deal; clicking the Download icon downloads the PDF.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/proposals/page.tsx
git commit -m "feat(pdf): add download button to proposals page"
```

---

### Task 7: Build and deploy

- [ ] **Step 1: Build**

```bash
vercel build --prod --yes
```

Expected: ✓ Compiled successfully, `/api/proposals/[id]/pdf` appears in the route list.

- [ ] **Step 2: Deploy**

```bash
vercel deploy --prebuilt --prod
```

Expected: `▲ Aliased https://crm-zeta-mocha.vercel.app`

- [ ] **Step 3: Smoke test on production**

Open `https://crm-zeta-mocha.vercel.app`, navigate to a deal with a proposal, and click the Download button. Confirm the PDF downloads with correct title, items, and total.
