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

  const { error } = await supabase.from('contacts').insert({
    name: parsed.data.name,
    org_id: orgId,
    owner_id: parsed.data.owner_id || user.id,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    company_id: parsed.data.company_id || null,
  })
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
  const { error } = await supabase
    .from('contacts')
    .update({
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      company_id: parsed.data.company_id || null,
    })
    .eq('id', id)
    .eq('org_id', orgId)
  if (error) return { error: error.message }

  revalidatePath(`/contacts/${id}`)
  revalidatePath('/contacts')
  redirect(`/contacts/${id}`)
}

export async function deleteContact(id: string): Promise<void> {
  const orgId = await getActiveOrgId()
  if (!orgId) redirect('/contacts')

  const supabase = await createClient()
  await supabase.from('contacts').delete().eq('id', id).eq('org_id', orgId)

  revalidatePath('/contacts')
  redirect('/contacts')
}
