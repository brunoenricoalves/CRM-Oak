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

  const { error } = await supabase.from('tasks').insert({
    title: parsed.data.title,
    org_id: orgId,
    created_by: user.id,
    done: false,
    due_date: parsed.data.due_date || null,
    assigned_to: parsed.data.assigned_to || null,
    contact_id: parsed.data.contact_id || null,
    company_id: parsed.data.company_id || null,
    deal_id: parsed.data.deal_id || null,
  })
  if (error) return { error: error.message }

  revalidatePath('/tasks')
  redirect('/tasks')
}

export async function updateTask(_prev: unknown, formData: FormData) {
  const id = formData.get('id') as string
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
  const { error } = await supabase
    .from('tasks')
    .update({
      title: parsed.data.title,
      due_date: parsed.data.due_date || null,
      assigned_to: parsed.data.assigned_to || null,
      contact_id: parsed.data.contact_id || null,
      company_id: parsed.data.company_id || null,
      deal_id: parsed.data.deal_id || null,
    })
    .eq('id', id)
    .eq('org_id', orgId)
  if (error) return { error: error.message }

  revalidatePath('/tasks')
  redirect('/tasks')
}

export async function toggleTask(id: string, done: boolean): Promise<void> {
  const orgId = await getActiveOrgId()
  if (!orgId) return

  const supabase = await createClient()
  await supabase.from('tasks').update({ done: !done }).eq('id', id).eq('org_id', orgId)

  revalidatePath('/tasks')
}

export async function deleteTask(id: string): Promise<void> {
  const orgId = await getActiveOrgId()
  if (!orgId) return

  const supabase = await createClient()
  await supabase.from('tasks').delete().eq('id', id).eq('org_id', orgId)

  revalidatePath('/tasks')
}
