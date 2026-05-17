'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { z } from 'zod'

const stageSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  color: z.string().optional().or(z.literal('')),
})

export async function createStage(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const parsed = stageSchema.safeParse({
    name: formData.get('name'),
    color: formData.get('color') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('pipeline_stages')
    .select('position')
    .eq('org_id', orgId)
    .order('position', { ascending: false })
    .limit(1)

  const position = existing && existing.length > 0 ? existing[0].position + 1000 : 1000

  const { error } = await supabase.from('pipeline_stages').insert({
    name: parsed.data.name,
    color: parsed.data.color || null,
    org_id: orgId,
    position,
  })
  if (error) return { error: error.message }

  revalidatePath('/settings/pipeline')
  return { success: true }
}

export async function deleteStage(id: string) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('pipeline_stages')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/settings/pipeline')
  return { success: true }
}

export async function updateOrgName(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const name = (formData.get('name') as string)?.trim()
  if (!name || name.length < 2) return { error: 'Nome deve ter ao menos 2 caracteres' }

  const supabase = await createClient()
  const { error } = await supabase.from('organizations').update({ name }).eq('id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}
