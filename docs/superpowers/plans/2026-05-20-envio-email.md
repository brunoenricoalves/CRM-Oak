# Envio de E-mail Real — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Send real emails from within a deal using Resend, automatically logging each send as an `email` activity in the deal's history.

**Architecture:** A new `sendEmail` server action calls Resend and inserts an activity row. `ActivityForm` gains a `contactEmail` prop and, when type='email', shows a `Para:` field plus a client-side "Enviar e-mail" button that calls the action via `useTransition`. The deal page fetches `contacts.email` and passes it down.

**Tech Stack:** Resend (already installed), Next.js server actions, `useTransition`, Supabase SSR client

---

## Environment Variables Required

Before the feature works, these must be set:
- `RESEND_API_KEY` — from resend.com dashboard
- `RESEND_FROM` — e.g. `Oak CRM <noreply@oakagencia.com.br>`

Add to `.env.local` for dev. Set in Vercel project settings for production.

---

## File Map

| Action  | Path                                              | Responsibility                              |
|---------|---------------------------------------------------|---------------------------------------------|
| Create  | `src/server/actions/send-email.ts`               | Server action: Resend call + activity insert|
| Modify  | `src/components/activities/activity-form.tsx`    | Add `Para:` field + "Enviar e-mail" button  |
| Modify  | `src/app/(app)/deals/[id]/page.tsx`              | Fetch contact email + pass to ActivityForm  |

---

### Task 1: sendEmail server action

**Files:**
- Create: `src/server/actions/send-email.ts`

- [ ] **Step 1: Create the action**

```typescript
// src/server/actions/send-email.ts
'use server'

import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(
  dealId: string,
  to: string,
  subject: string,
  body: string
): Promise<{ error?: string }> {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  if (!to.trim() || !subject.trim() || !body.trim())
    return { error: 'Destinatário, assunto e corpo são obrigatórios' }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(to.trim()))
    return { error: 'Endereço de e-mail inválido' }

  const from = process.env.RESEND_FROM
  if (!from) return { error: 'Configuração de e-mail ausente (RESEND_FROM)' }

  const { error: resendError } = await resend.emails.send({
    from,
    to: to.trim(),
    subject: subject.trim(),
    html: body.replace(/\n/g, '<br>'),
  })

  if (resendError) return { error: resendError.message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Usuário não autenticado' }

  await supabase.from('activities').insert({
    org_id: orgId,
    type: 'email',
    body: `**${subject.trim()}**\n\n${body.trim()}`,
    deal_id: dealId,
    user_id: user.id,
  })

  revalidatePath(`/deals/${dealId}`)
  return {}
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "send-email"
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/server/actions/send-email.ts
git commit -m "feat(email): add sendEmail server action"
```

---

### Task 2: Update ActivityForm with Para field and send button

**Files:**
- Modify: `src/components/activities/activity-form.tsx`

The form already tracks `type`, `subject`, and `body` in React state. Add:
- `contactEmail` optional prop
- `to` state (string, pre-filled from `contactEmail`)
- `sending` state via `useTransition`
- "Enviar e-mail" button that calls `sendEmail` action

- [ ] **Step 1: Replace the full contents of activity-form.tsx**

```tsx
// src/components/activities/activity-form.tsx
'use client'

import { useActionState, useState, useEffect, useRef, useTransition } from 'react'
import { useFormStatus } from 'react-dom'
import { toast } from 'sonner'
import { createActivity } from '@/server/actions/activity'
import { sendEmail } from '@/server/actions/send-email'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

interface Template {
  id: string
  name: string
  subject: string
  body: string
}

interface ActivityFormProps {
  contactId?: string
  companyId?: string
  dealId?: string
  contactEmail?: string
  emailTemplates?: Template[]
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? 'Salvando...' : 'Registrar'}
    </Button>
  )
}

export function ActivityForm({ contactId, companyId, dealId, contactEmail, emailTemplates = [] }: ActivityFormProps) {
  const [state, formAction] = useActionState(createActivity, null)
  const [type, setType] = useState('note')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [to, setTo] = useState(contactEmail ?? '')
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
      setType('note')
      setSubject('')
      setBody('')
      setTo(contactEmail ?? '')
      toast.success('Atividade registrada')
    }
    if (state?.error) toast.error(state.error)
  }, [state, contactEmail])

  function applyTemplate(templateId: string) {
    const t = emailTemplates.find((t) => t.id === templateId)
    if (!t) return
    setSubject(t.subject)
    setBody(t.body)
  }

  function handleSendEmail() {
    if (!dealId) return
    startTransition(async () => {
      const result = await sendEmail(dealId, to, subject, body)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('E-mail enviado e registrado')
        setSubject('')
        setBody('')
        setTo(contactEmail ?? '')
      }
    })
  }

  const showSubject = type === 'email'
  const showSchedule = type === 'call' || type === 'meeting'

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      {contactId && <input type="hidden" name="contact_id" value={contactId} />}
      {companyId && <input type="hidden" name="company_id" value={companyId} />}
      {dealId && <input type="hidden" name="deal_id" value={dealId} />}

      <div className="flex gap-2">
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="note">Nota</option>
          <option value="call">Ligação</option>
          <option value="email">Email</option>
          <option value="meeting">Reunião</option>
        </select>

        {showSubject && emailTemplates.length > 0 && (
          <select
            onChange={(e) => applyTemplate(e.target.value)}
            defaultValue=""
            className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="" disabled>Usar template...</option>
            {emailTemplates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
      </div>

      {showSubject && (
        <input
          placeholder="Para: email do destinatário"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      {showSubject && (
        <input
          name="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Assunto do email"
          className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}

      <textarea
        name="body"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        required
        rows={3}
        placeholder={type === 'email' ? 'Corpo do email...' : type === 'call' ? 'Resumo da ligação...' : type === 'meeting' ? 'Resumo da reunião...' : 'Adicionar nota...'}
        className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {showSchedule && (
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-500 whitespace-nowrap">Agendar para:</label>
          <input
            type="datetime-local"
            name="due_at"
            className="flex-1 rounded-md border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="flex items-center gap-2">
        <SubmitButton />
        {showSubject && dealId && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending || !to.trim() || !subject.trim() || !body.trim()}
            onClick={handleSendEmail}
            className="flex items-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            {isPending ? 'Enviando...' : 'Enviar e-mail'}
          </Button>
        )}
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep "activity-form"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/components/activities/activity-form.tsx
git commit -m "feat(email): add Para field and send button to ActivityForm"
```

---

### Task 3: Fetch contact email on deal page

**Files:**
- Modify: `src/app/(app)/deals/[id]/page.tsx`

Currently fetches `contacts(id, name)`. Add `email` to the select and pass it to `ActivityForm`.

- [ ] **Step 1: Update the contacts select in the Promise.all query**

Find this line in `src/app/(app)/deals/[id]/page.tsx` (around line 47):

```typescript
.select('id, title, value, status, close_date, stage_id, contacts(id, name), companies(id, name), pipeline_stages(name)')
```

Replace with:

```typescript
.select('id, title, value, status, close_date, stage_id, contacts(id, name, email), companies(id, name), pipeline_stages(name)')
```

- [ ] **Step 2: Update the contact type and pass email to ActivityForm**

Find this line:

```typescript
const contact = deal.contacts as { id: string; name: string } | null
```

Replace with:

```typescript
const contact = deal.contacts as { id: string; name: string; email: string | null } | null
```

Then find the `<ActivityForm>` usage (around line 219) and add `contactEmail`:

```tsx
<ActivityForm
  dealId={id}
  contactEmail={contact?.email ?? undefined}
  emailTemplates={emailTemplates ?? []}
/>
```

- [ ] **Step 3: Test in browser**

Navigate to `/deals/[any-id]`. Select "Email" type in the activity form. The `Para:` field should be pre-filled with the contact's email (if set). Fill in subject and body, click "Enviar e-mail". Verify toast says "E-mail enviado e registrado" and the activity appears in the history.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/deals/[id]/page.tsx
git commit -m "feat(email): fetch contact email and wire to ActivityForm"
```

---

### Task 4: Build and deploy

- [ ] **Step 1: Set env vars in Vercel (one-time)**

In Vercel project settings → Environment Variables, add:
- `RESEND_API_KEY` = your Resend API key
- `RESEND_FROM` = `Oak CRM <noreply@oakagencia.com.br>` (must be a verified domain in Resend)

- [ ] **Step 2: Build**

```bash
vercel build --prod --yes
```

Expected: ✓ Compiled successfully.

- [ ] **Step 3: Deploy**

```bash
vercel deploy --prebuilt --prod
```

Expected: `▲ Aliased https://crm-zeta-mocha.vercel.app`

- [ ] **Step 4: Smoke test**

On production, navigate to a deal with a contact that has an email. Send a test email. Verify it arrives in the inbox and the activity is logged.
