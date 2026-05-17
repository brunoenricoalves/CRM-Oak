import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteCompany } from '@/server/actions/company'
import { ActivityFeed } from '@/components/activities/activity-feed'
import { ActivityForm } from '@/components/activities/activity-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Pencil } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CompanyDetailPage({ params }: Props) {
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

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name, email')
    .eq('company_id', id)
    .eq('org_id', orgId!)
    .order('name')

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/companies" className="text-sm text-slate-500 hover:text-slate-700">
            ← Empresas
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{company.name}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/companies/${id}/edit`}>
              <Pencil className="w-4 h-4 mr-1" />
              Editar
            </Link>
          </Button>
          <form action={deleteCompany.bind(null, id)}>
            <Button
              variant="outline"
              size="sm"
              type="submit"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informações</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <span className="text-slate-500">Domínio</span>
                <p className="font-medium">{company.domain ?? '—'}</p>
              </div>
              <div>
                <span className="text-slate-500">Setor</span>
                <p className="font-medium">{company.industry ?? '—'}</p>
              </div>
              <div>
                <span className="text-slate-500">Tamanho</span>
                <p className="font-medium">{company.size ?? '—'}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Contatos ({contacts?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              {!contacts || contacts.length === 0 ? (
                <p className="text-sm text-slate-400">Nenhum contato</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {contacts.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/contacts/${c.id}`}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.email && <p className="text-slate-500 text-xs">{c.email}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Registrar atividade</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityForm companyId={id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed companyId={id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
