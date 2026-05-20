# PDF de Proposta — Design

**Date:** 2026-05-20
**Project:** Oak CRM
**Status:** Approved

---

## Goal

Generate a downloadable PDF for any proposal, showing the proposal title, line items, and total. Downloadable from both the deal detail page and the `/proposals` list page.

---

## API Route

### `GET /api/proposals/[id]/pdf`

- Fetches the proposal row + its items from Supabase using the server Supabase client (RLS enforced — only org members can access).
- Returns `Content-Type: application/pdf` with `Content-Disposition: attachment; filename="proposta.pdf"`.
- Returns 404 if the proposal is not found (not a member of the org or doesn't exist).
- Generates the PDF using `@react-pdf/renderer` (new dependency).

---

## PDF Layout

| Section    | Content                                                               |
|------------|-----------------------------------------------------------------------|
| Header     | Oak logo (`/public/logo-oak.png` as base64) + brand color `#2563eb`  |
| Title      | Proposal title, large font                                            |
| Items table| Columns: Serviço, Descrição, Valor (BRL, right-aligned)              |
| Total row  | Bold, right-aligned, BRL formatted                                    |
| Footer     | "Gerado em DD/MM/YYYY" — generation date                             |

Colors: header background `#2563eb`, white text. Table alternates `#f8fafc` / white rows. Total row background `#eff6ff`.

---

## Download Button

`PdfDownloadButton` — a plain `<a>` tag pointing to `/api/proposals/[id]/pdf` with `target="_blank"`. Renders as a small icon button (Download icon from lucide-react). No client-side JS required beyond the link.

Used in:
- `src/components/proposals/proposal-list.tsx` — one button per proposal row
- `src/app/(app)/proposals/page.tsx` — one button per proposal row

---

## Files

| Action  | Path                                              |
|---------|---------------------------------------------------|
| Create  | `src/app/api/proposals/[id]/pdf/route.ts`         |
| Create  | `src/components/proposals/pdf-download-button.tsx`|
| Modify  | `src/components/proposals/proposal-list.tsx`      |
| Modify  | `src/app/(app)/proposals/page.tsx`                |

---

## What's Out of Scope

- Client branding (logo, colors per client)
- Email delivery of the PDF
- Proposal preview in-browser (stream vs download)
- Cover page or multi-page layout
