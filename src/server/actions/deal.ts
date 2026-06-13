'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { dealSchema } from '@/lib/validations/deal'
import {
  getInsertPosition,
  getInsertBetween,
  needsRebalance,
  rebalancePositions,
} from '@/lib/utils/position'

export async function createDeal(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const raw = {
    title: formData.get('title'),
    value: formData.get('value') || undefined,
    stage_id: formData.get('stage_id') || undefined,
    contact_id: formData.get('contact_id') || undefined,
    company_id: formData.get('company_id') || undefined,
    close_date: formData.get('close_date') || undefined,
  }

  const parsed = dealSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: existing } = await supabase
    .from('deals')
    .select('position')
    .eq('org_id', orgId)
    .order('position', { ascending: false })
    .limit(1)

  const positions = existing?.map((d) => d.position) ?? []
  const position = getInsertPosition(positions)

  const { error } = await supabase.from('deals').insert({
    title: parsed.data.title,
    org_id: orgId,
    owner_id: user.id,
    position,
    status: 'open',
    value: parsed.data.value ?? null,
    stage_id: parsed.data.stage_id || null,
    contact_id: parsed.data.contact_id || null,
    company_id: parsed.data.company_id || null,
    close_date: parsed.data.close_date || null,
  })
  if (error) return { error: error.message }

  revalidatePath('/deals')
  redirect('/deals')
}

export async function updateDeal(_prev: unknown, formData: FormData) {
  const id = formData.get('id') as string
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const raw = {
    title: formData.get('title'),
    value: formData.get('value') || undefined,
    stage_id: formData.get('stage_id') || undefined,
    contact_id: formData.get('contact_id') || undefined,
    company_id: formData.get('company_id') || undefined,
    close_date: formData.get('close_date') || undefined,
  }

  const parsed = dealSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase
    .from('deals')
    .update({
      title: parsed.data.title,
      value: parsed.data.value ?? null,
      stage_id: parsed.data.stage_id || null,
      contact_id: parsed.data.contact_id || null,
      company_id: parsed.data.company_id || null,
      close_date: parsed.data.close_date || null,
    })
    .eq('id', id)
    .eq('org_id', orgId)
  if (error) return { error: error.message }

  revalidatePath(`/deals/${id}`)
  revalidatePath('/deals')
  redirect(`/deals/${id}`)
}

export async function moveDeal(
  dealId: string,
  newStageId: string,
  beforePosition: number | null,
  afterPosition: number | null
) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const supabase = await createClient()
  const newPosition = getInsertBetween(beforePosition, afterPosition)

  const { error } = await supabase
    .from('deals')
    .update({ stage_id: newStageId, position: newPosition })
    .eq('id', dealId)
    .eq('org_id', orgId)

  if (error) return { error: error.message }

  const { data: stageDeals } = await supabase
    .from('deals')
    .select('id, position')
    .eq('org_id', orgId)
    .eq('stage_id', newStageId)
    .order('position')

  if (stageDeals && needsRebalance(stageDeals.map((d) => d.position))) {
    const newPositions = rebalancePositions(stageDeals.length)
    await Promise.all(
      stageDeals.map((d, i) =>
        supabase.from('deals').update({ position: newPositions[i] }).eq('id', d.id)
      )
    )
  }

  revalidatePath('/deals')
  return { success: true }
}

export async function closeDeal(id: string, status: 'won' | 'lost'): Promise<void> {
  const orgId = await getActiveOrgId()
  if (!orgId) return

  const supabase = await createClient()

  await supabase
    .from('deals')
    .update({ status, closed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('org_id', orgId)

  revalidatePath(`/deals/${id}`)
  revalidatePath('/deals')
  revalidatePath('/dashboard')
}

export async function reopenDeal(id: string): Promise<void> {
  const orgId = await getActiveOrgId()
  if (!orgId) return

  const supabase = await createClient()
  await supabase
    .from('deals')
    .update({ status: 'open', closed_at: null })
    .eq('id', id)
    .eq('org_id', orgId)

  revalidatePath(`/deals/${id}`)
  revalidatePath('/deals')
  revalidatePath('/dashboard')
}

export async function deleteDeal(id: string): Promise<void> {
  const orgId = await getActiveOrgId()
  if (!orgId) redirect('/deals')

  const supabase = await createClient()
  await supabase.from('deals').delete().eq('id', id).eq('org_id', orgId)

  revalidatePath('/deals')
  redirect('/deals')
}
