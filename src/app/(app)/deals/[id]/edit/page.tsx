import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { EditDealForm } from '@/components/deals/edit-deal-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditDealPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const [
    { data: deal },
    { data: stages },
    { data: contacts },
    { data: companies },
  ] = await Promise.all([
    supabase
      .from('deals')
      .select('id, title, value, stage_id, contact_id, company_id, close_date')
      .eq('id', id)
      .eq('org_id', orgId!)
      .single(),
    supabase
      .from('pipeline_stages')
      .select('id, name')
      .eq('org_id', orgId!)
      .order('position'),
    supabase
      .from('contacts')
      .select('id, name')
      .eq('org_id', orgId!)
      .order('name'),
    supabase
      .from('companies')
      .select('id, name')
      .eq('org_id', orgId!)
      .order('name'),
  ])

  if (!deal) notFound()

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href={`/deals/${id}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Negócio
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Editar negócio</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do negócio</CardTitle>
        </CardHeader>
        <CardContent>
          <EditDealForm
            deal={deal}
            stages={stages ?? []}
            contacts={contacts ?? []}
            companies={companies ?? []}
          />
        </CardContent>
      </Card>
    </div>
  )
}
