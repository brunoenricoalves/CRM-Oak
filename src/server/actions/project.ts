'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'

export async function updateProjectStatus(
  projectId: string,
  status: 'active' | 'paused' | 'closed'
): Promise<void> {
  const orgId = await getActiveOrgId()
  if (!orgId) return

  const supabase = await createClient()
  await supabase
    .from('projects')
    .update({ status })
    .eq('id', projectId)
    .eq('org_id', orgId)

  revalidatePath('/projects')
}

export async function updateProjectMondayUrl(
  projectId: string,
  monday_url: string
): Promise<void> {
  const orgId = await getActiveOrgId()
  if (!orgId) return

  const supabase = await createClient()
  await supabase
    .from('projects')
    .update({ monday_url: monday_url.trim() || null })
    .eq('id', projectId)
    .eq('org_id', orgId)

  revalidatePath('/projects')
}
