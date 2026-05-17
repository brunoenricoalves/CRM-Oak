'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { contactSchema } from '@/lib/validations/contact'

export async function createContact(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const raw = {
    name: formData.get('name'),
    email: formData.get('email') || undefined,
    phone: formData.get('phone') || undefined,
    company_id: formData.get('company_id') || undefined,
    owner_id: formData.get('owner_id') || undefined,
  }

  const parsed = contactSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const insert: Record<string, string> = {
    name: parsed.data.name,
    org_id: orgId,
    owner_id: parsed.data.owner_id || user.id,
  }
  if (parsed.data.email) insert.email = parsed.data.email
  if (parsed.data.phone) insert.phone = parsed.data.phone
  if (parsed.data.company_id) insert.company_id = parsed.data.company_id

  const { error } = await supabase.from('contacts').insert(insert)
  if (error) return { error: error.message }

  revalidatePath('/contacts')
  redirect('/contacts')
}

export async function updateContact(_prev: unknown, formData: FormData) {
  const id = formData.get('id') as string
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const raw = {
    name: formData.get('name'),
    email: formData.get('email') || undefined,
    phone: formData.get('phone') || undefined,
    company_id: formData.get('company_id') || undefined,
  }

  const parsed = contactSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const update: Record<string, string | null> = { name: parsed.data.name }
  update.email = parsed.data.email || null
  update.phone = parsed.data.phone || null
  update.company_id = parsed.data.company_id || null

  const { error } = await supabase
    .from('contacts')
    .update(update)
    .eq('id', id)
    .eq('org_id', orgId)
  if (error) return { error: error.message }

  revalidatePath(`/contacts/${id}`)
  revalidatePath('/contacts')
  redirect(`/contacts/${id}`)
}

export async function deleteContact(id: string) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('contacts')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)
  if (error) return { error: error.message }

  revalidatePath('/contacts')
  redirect('/contacts')
}
