'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { taskSchema } from '@/lib/validations/task'

export async function createTask(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const raw = {
    title: formData.get('title'),
    due_date: formData.get('due_date') || undefined,
    assigned_to: formData.get('assigned_to') || undefined,
    contact_id: formData.get('contact_id') || undefined,
    company_id: formData.get('company_id') || undefined,
    deal_id: formData.get('deal_id') || undefined,
  }

  const parsed = taskSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const insert: Record<string, unknown> = {
    title: parsed.data.title,
    org_id: orgId,
    created_by: user.id,
    done: false,
  }
  if (parsed.data.due_date) insert.due_date = parsed.data.due_date
  if (parsed.data.assigned_to) insert.assigned_to = parsed.data.assigned_to
  if (parsed.data.contact_id) insert.contact_id = parsed.data.contact_id
  if (parsed.data.company_id) insert.company_id = parsed.data.company_id
  if (parsed.data.deal_id) insert.deal_id = parsed.data.deal_id

  const { error } = await supabase.from('tasks').insert(insert)
  if (error) return { error: error.message }

  revalidatePath('/tasks')
  redirect('/tasks')
}

export async function toggleTask(id: string, done: boolean) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('tasks')
    .update({ done: !done })
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/tasks')
  return { success: true }
}

export async function deleteTask(id: string) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const supabase = await createClient()
  const { error } = await supabase.from('tasks').delete().eq('id', id).eq('org_id', orgId)
  if (error) return { error: error.message }

  revalidatePath('/tasks')
  return { success: true }
}
