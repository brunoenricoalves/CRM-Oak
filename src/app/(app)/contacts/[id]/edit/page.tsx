import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { EditContactForm } from '@/components/contacts/edit-contact-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditContactPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const [{ data: contact }, { data: companies }] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, name, email, phone, company_id')
      .eq('id', id)
      .eq('org_id', orgId!)
      .single(),
    supabase
      .from('companies')
      .select('id, name')
      .eq('org_id', orgId!)
      .order('name'),
  ])

  if (!contact) notFound()

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href={`/contacts/${id}`} className="text-sm text-slate-500 hover:text-slate-700">
          ← Contato
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Editar contato</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados do contato</CardTitle>
        </CardHeader>
        <CardContent>
          <EditContactForm contact={contact} companies={companies ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
