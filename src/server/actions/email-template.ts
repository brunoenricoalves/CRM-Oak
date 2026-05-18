'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'

export async function createEmailTemplate(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const name = (formData.get('name') as string)?.trim()
  const subject = (formData.get('subject') as string)?.trim()
  const body = (formData.get('body') as string)?.trim()

  if (!name || !subject || !body) return { error: 'Todos os campos são obrigatórios' }

  const supabase = await createClient()
  const { error } = await supabase.from('email_templates').insert({ org_id: orgId, name, subject, body })
  if (error) return { error: error.code === '23505' ? 'Template já existe com esse nome' : error.message }

  revalidatePath('/settings/email-templates')
  return { success: true }
}

export async function deleteEmailTemplate(id: string) {
  const orgId = await getActiveOrgId()
  if (!orgId) return

  const supabase = await createClient()
  await supabase.from('email_templates').delete().eq('id', id).eq('org_id', orgId)
  revalidatePath('/settings/email-templates')
}

export async function markActivityDone(id: string, revalidate: string) {
  const orgId = await getActiveOrgId()
  if (!orgId) return

  const supabase = await createClient()
  await supabase.from('activities').update({ done: true }).eq('id', id).eq('org_id', orgId)
  revalidatePath(revalidate)
}
