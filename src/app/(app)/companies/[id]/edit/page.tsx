import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { EditCompanyForm } from '@/components/companies/edit-company-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditCompanyPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, domain, industry, size')
    .eq('id', id)
    .eq('org_id', orgId!)
    .single()

  if (!company) notFound()

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href={`/companies/${id}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Empresa
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Editar empresa</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <EditCompanyForm company={company} />
        </CardContent>
      </Card>
    </div>
  )
}
