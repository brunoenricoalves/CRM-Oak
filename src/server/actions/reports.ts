'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'

export async function upsertRevenueGoal(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const year = Number(formData.get('year'))
  const month = Number(formData.get('month'))
  const goal = Number(formData.get('goal'))

  if (!year || !month || isNaN(goal) || goal <= 0) return { error: 'Dados inválidos' }

  const supabase = await createClient()
  const { error } = await supabase.from('revenue_goals').upsert(
    { org_id: orgId, year, month, goal },
    { onConflict: 'org_id,year,month' },
  )
  if (error) return { error: error.message }

  revalidatePath('/reports')
  return { success: true }
}

export async function updateStageProbability(stageId: string, probability: number) {
  const orgId = await getActiveOrgId()
  if (!orgId) return

  const supabase = await createClient()
  await supabase
    .from('pipeline_stages')
    .update({ probability })
    .eq('id', stageId)
    .eq('org_id', orgId)

  revalidatePath('/reports')
  revalidatePath('/settings/pipeline')
}
