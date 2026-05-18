'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'

export async function createTag(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const name = (formData.get('name') as string)?.trim()
  const color = (formData.get('color') as string) || '#6366f1'
  if (!name) return { error: 'Nome obrigatório' }

  const supabase = await createClient()
  const { error } = await supabase.from('tags').insert({ org_id: orgId, name, color })
  if (error) return { error: error.code === '23505' ? 'Tag já existe' : error.message }

  revalidatePath('/settings/tags')
  return { success: true }
}

export async function deleteTag(id: string) {
  const orgId = await getActiveOrgId()
  if (!orgId) return

  const supabase = await createClient()
  await supabase.from('tags').delete().eq('id', id).eq('org_id', orgId)
  revalidatePath('/settings/tags')
}

export async function addTagToContact(contactId: string, tagId: string) {
  const supabase = await createClient()
  await supabase.from('contact_tags').upsert({ contact_id: contactId, tag_id: tagId })
  revalidatePath(`/contacts/${contactId}`)
}

export async function removeTagFromContact(contactId: string, tagId: string) {
  const supabase = await createClient()
  await supabase.from('contact_tags').delete().eq('contact_id', contactId).eq('tag_id', tagId)
  revalidatePath(`/contacts/${contactId}`)
}

export async function addTagToCompany(companyId: string, tagId: string) {
  const supabase = await createClient()
  await supabase.from('company_tags').upsert({ company_id: companyId, tag_id: tagId })
  revalidatePath(`/companies/${companyId}`)
}

export async function removeTagFromCompany(companyId: string, tagId: string) {
  const supabase = await createClient()
  await supabase.from('company_tags').delete().eq('company_id', companyId).eq('tag_id', tagId)
  revalidatePath(`/companies/${companyId}`)
}

export async function addTagToDeal(dealId: string, tagId: string) {
  const supabase = await createClient()
  await supabase.from('deal_tags').upsert({ deal_id: dealId, tag_id: tagId })
  revalidatePath(`/deals/${dealId}`)
}

export async function removeTagFromDeal(dealId: string, tagId: string) {
  const supabase = await createClient()
  await supabase.from('deal_tags').delete().eq('deal_id', dealId).eq('tag_id', tagId)
  revalidatePath(`/deals/${dealId}`)
}
