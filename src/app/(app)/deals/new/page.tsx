import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { redirect } from 'next/navigation'
import { NewDealForm } from '@/components/deals/new-deal-form'

export default async function NewDealPage() {
  const orgId = await getActiveOrgId()
  if (!orgId) redirect('/deals')

  const supabase = await createClient()
  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('id, name, color')
    .eq('org_id', orgId)
    .order('position')

  if (!stages || stages.length === 0) redirect('/settings/pipeline')

  return <NewDealForm stages={stages} />
}
