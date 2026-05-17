import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function getActiveOrgId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('active_org_id')?.value ?? null
}

export async function getActiveOrg() {
  const supabase = await createClient()
  const orgId = await getActiveOrgId()
  if (!orgId) return null
  const { data } = await supabase
    .from('organizations')
    .select('id, name, slug, plan')
    .eq('id', orgId)
    .single()
  return data
}

export async function requireActiveOrg() {
  const org = await getActiveOrg()
  if (!org) throw new Error('No active org')
  return org
}
