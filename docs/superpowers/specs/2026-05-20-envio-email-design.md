# Envio de E-mail Real — Design

**Date:** 2026-05-20
**Project:** Oak CRM
**Status:** Approved

---

## Goal

Send real emails from within a deal using Resend. The email is sent and automatically logged as an activity in the deal's history.

---

## Context

`resend` is already installed. The `activities` table already accepts `type = 'email'`. `ActivityForm` already shows subject + template selector when type is 'email'. We extend it — not replace it.

---

## Environment Variables

| Variable      | Example                                  |
|---------------|------------------------------------------|
| RESEND_API_KEY| `re_xxxxxxxxxxxx`                        |
| RESEND_FROM   | `Oak CRM <noreply@oakagencia.com.br>`    |

These must be set in Vercel project settings (and `.env.local` for dev). The feature will show an error toast if these are missing at runtime.

---

## UI Changes

### `ActivityForm` — new prop `contactEmail?: string`

When `type === 'email'`:
- Show a `Para:` input (state-controlled, pre-filled with `contactEmail`, editable).
- Show a second button **"Enviar e-mail"** (client-side, `useTransition`) alongside the existing "Registrar" button.
  - "Registrar" still works as before (logs activity only, no email sent).
  - "Enviar e-mail" calls the `sendEmail` server action and also logs the activity.

### Deal detail page — `src/app/(app)/deals/[id]/page.tsx`

- Fetch `contacts(id, name, email)` (add `email` to the select).
- Pass `contactEmail={contact?.email ?? undefined}` to `<ActivityForm>`.

---

## Server Action — `sendEmail`

**File:** `src/server/actions/send-email.ts`

```typescript
export async function sendEmail(
  dealId: string,
  to: string,
  subject: string,
  body: string
): Promise<{ error?: string }>
```

Steps:
1. `getActiveOrgId()` — return error if not authenticated.
2. Validate: `to`, `subject`, `body` non-empty; `to` is a valid email address.
3. Call Resend: `resend.emails.send({ from, to, subject, html: body.replace(/\n/g, '<br>') })`.
4. If Resend returns an error, return `{ error: message }`.
5. Insert activity: `type: 'email'`, `body: \`**${subject}**\n\n${body}\``, `deal_id: dealId`.
6. `revalidatePath(\`/deals/${dealId}\`)`.
7. Return `{}` on success.

---

## Files

| Action  | Path                                              |
|---------|---------------------------------------------------|
| Create  | `src/server/actions/send-email.ts`               |
| Modify  | `src/components/activities/activity-form.tsx`    |
| Modify  | `src/app/(app)/deals/[id]/page.tsx`              |

---

## What's Out of Scope

- Sending emails from contacts or companies pages
- Email open/click tracking
- Bulk email / campaigns
- Attachments (including proposal PDF)
- Unsubscribe management
