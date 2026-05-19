'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { proposalSchema } from '@/lib/validations/proposal'

export async function createProposal(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  let items: unknown[]
  try {
    items = JSON.parse(formData.get('items') as string)
  } catch {
    return { error: 'Itens inválidos' }
  }

  const raw = {
    deal_id: formData.get('deal_id'),
    contact_id: formData.get('contact_id') || undefined,
    company_id: formData.get('company_id') || undefined,
    title: formData.get('title'),
    notes: formData.get('notes') || undefined,
    items: items.map((item: unknown, i: number) => {
      const it = item as Record<string, unknown>
      return { service: it.service, description: it.description, value: it.value, position: i }
    }),
  }

  const parsed = proposalSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()

  const { data: proposal, error: propError } = await supabase
    .from('proposals')
    .insert({
      org_id: orgId,
      deal_id: parsed.data.deal_id,
      contact_id: parsed.data.contact_id || null,
      company_id: parsed.data.company_id || null,
      title: parsed.data.title,
      status: 'sent',
      notes: parsed.data.notes || null,
    })
    .select('id')
    .single()

  if (propError || !proposal) return { error: propError?.message ?? 'Erro ao criar proposta' }

  const { error: itemsError } = await supabase.from('proposal_items').insert(
    parsed.data.items.map((item, i) => ({
      proposal_id: proposal.id,
      service: item.service,
      description: item.description || null,
      value: item.value,
      position: i,
    }))
  )

  if (itemsError) return { error: itemsError.message }

  revalidatePath(`/deals/${parsed.data.deal_id}`)
  revalidatePath('/proposals')
  return { success: true }
}

export async function updateProposalStatus(
  proposalId: string,
  status: 'accepted' | 'rejected',
  dealId: string
): Promise<void> {
  const orgId = await getActiveOrgId()
  if (!orgId) return

  const supabase = await createClient()
  await supabase
    .from('proposals')
    .update({ status })
    .eq('id', proposalId)
    .eq('org_id', orgId)

  revalidatePath(`/deals/${dealId}`)
  revalidatePath('/proposals')
}

export async function deleteProposal(proposalId: string, dealId: string): Promise<void> {
  const orgId = await getActiveOrgId()
  if (!orgId) return

  const supabase = await createClient()
  await supabase.from('proposals').delete().eq('id', proposalId).eq('org_id', orgId)

  revalidatePath(`/deals/${dealId}`)
  revalidatePath('/proposals')
}
