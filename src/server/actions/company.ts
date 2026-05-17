'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { companySchema } from '@/lib/validations/company'

export async function createCompany(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const raw = {
    name: formData.get('name'),
    domain: formData.get('domain') || undefined,
    industry: formData.get('industry') || undefined,
    size: formData.get('size') || undefined,
  }

  const parsed = companySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.from('companies').insert({
    name: parsed.data.name,
    org_id: orgId,
    domain: parsed.data.domain || null,
    industry: parsed.data.industry || null,
    size: parsed.data.size || null,
  })
  if (error) return { error: error.message }

  revalidatePath('/companies')
  redirect('/companies')
}

export async function updateCompany(_prev: unknown, formData: FormData) {
  const id = formData.get('id') as string
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const raw = {
    name: formData.get('name'),
    domain: formData.get('domain') || undefined,
    industry: formData.get('industry') || undefined,
    size: formData.get('size') || undefined,
  }

  const parsed = companySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from('companies')
    .update({
      name: parsed.data.name,
      domain: parsed.data.domain || null,
      industry: parsed.data.industry || null,
      size: parsed.data.size || null,
    })
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return { error: error.message }

  revalidatePath(`/companies/${id}`)
  revalidatePath('/companies')
  redirect(`/companies/${id}`)
}

export async function deleteCompany(id: string): Promise<void> {
  const orgId = await getActiveOrgId()
  if (!orgId) redirect('/companies')

  const supabase = await createClient()
  await supabase.from('companies').delete().eq('id', id).eq('org_id', orgId)

  revalidatePath('/companies')
  redirect('/companies')
}
