'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'

export type EntityType = 'contact' | 'company' | 'deal'
export type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox'

export async function createCustomFieldDef(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const name = (formData.get('name') as string)?.trim()
  const entity_type = formData.get('entity_type') as EntityType
  const field_type = formData.get('field_type') as FieldType
  const optionsRaw = (formData.get('options') as string)?.trim()

  if (!name || !entity_type || !field_type) return { error: 'Campos obrigatórios' }

  let options: string[] | null = null
  if (field_type === 'select' && optionsRaw) {
    options = optionsRaw.split(',').map((s) => s.trim()).filter(Boolean)
  }

  const supabase = await createClient()
  const { error } = await supabase.from('custom_field_defs').insert({
    org_id: orgId,
    name,
    entity_type,
    field_type,
    options: options ? options : null,
  })
  if (error) return { error: error.code === '23505' ? 'Campo já existe' : error.message }

  revalidatePath('/settings/custom-fields')
  return { success: true }
}

export async function deleteCustomFieldDef(id: string) {
  const orgId = await getActiveOrgId()
  if (!orgId) return

  const supabase = await createClient()
  await supabase.from('custom_field_defs').delete().eq('id', id).eq('org_id', orgId)
  revalidatePath('/settings/custom-fields')
}

export async function upsertCustomFieldValue(
  fieldId: string,
  entityId: string,
  value: string,
  entityType: EntityType,
) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const supabase = await createClient()
  const { error } = await supabase.from('custom_field_values').upsert(
    { field_id: fieldId, entity_id: entityId, org_id: orgId, value },
    { onConflict: 'field_id,entity_id' },
  )
  if (error) return { error: error.message }

  // Revalidate the entity page
  revalidatePath(`/${entityType}s/${entityId}`)
  return { success: true }
}
