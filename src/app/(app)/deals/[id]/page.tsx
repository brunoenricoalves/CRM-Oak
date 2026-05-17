import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteDeal } from '@/server/actions/deal'
import { ActivityFeed } from '@/components/activities/activity-feed'
import { ActivityForm } from '@/components/activities/activity-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trash2, Pencil } from 'lucide-react'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DealDetailPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: deal } = await supabase
    .from('deals')
    .select(
      'id, title, value, status, close_date, contacts(id, name), companies(id, name), pipeline_stages(name)'
    )
    .eq('id', id)
    .eq('org_id', orgId!)
    .single()

  if (!deal) notFound()

  const statusLabel: Record<string, string> = {
    open: 'Aberto',
    won: 'Ganho',
    lost: 'Perdido',
  }

  const statusVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
    open: 'secondary',
    won: 'default',
    lost: 'destructive',
  }

  const contact = deal.contacts as { id: string; name: string } | null
  const company = deal.companies as { id: string; name: string } | null
  const stage = deal.pipeline_stages as { name: string } | null

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/deals" className="text-sm text-slate-500 hover:text-slate-700">
            ← Negócios
          </Link>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="text-2xl font-bold text-slate-900">{deal.title}</h1>
            <Badge variant={statusVariant[deal.status] ?? 'secondary'}>
              {statusLabel[deal.status] ?? deal.status}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/deals/${id}/edit`}>
              <Pencil className="w-4 h-4 mr-1" />
              Editar
            </Link>
          </Button>
          <form action={deleteDeal.bind(null, id)}>
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
                <span className="text-slate-500">Valor</span>
                <p className="font-medium text-green-600">
                  {deal.value !== null
                    ? new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(deal.value)
                    : '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Etapa</span>
                <p className="font-medium">{stage?.name ?? '—'}</p>
              </div>
              <div>
                <span className="text-slate-500">Fechamento</span>
                <p className="font-medium">
                  {deal.close_date
                    ? new Date(deal.close_date).toLocaleDateString('pt-BR')
                    : '—'}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Contato</span>
                <p className="font-medium">
                  {contact ? (
                    <Link href={`/contacts/${contact.id}`} className="text-blue-600 hover:underline">
                      {contact.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Empresa</span>
                <p className="font-medium">
                  {company ? (
                    <Link href={`/companies/${company.id}`} className="text-blue-600 hover:underline">
                      {company.name}
                    </Link>
                  ) : (
                    '—'
                  )}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Registrar atividade</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityForm dealId={id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed dealId={id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
