import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteDeal, closeDeal, reopenDeal } from '@/server/actions/deal'
import { ActivityFeed } from '@/components/activities/activity-feed'
import { ActivityForm } from '@/components/activities/activity-form'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TagPicker } from '@/components/tags/tag-picker'
import { CustomFieldDisplay } from '@/components/custom-fields/custom-field-display'
import { Pencil, Trash2, DollarSign, Calendar, User, Building2, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

export default async function DealDetailPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const fieldDefsQuery = await supabase
    .from('custom_field_defs')
    .select('id')
    .eq('org_id', orgId!)
    .eq('entity_type', 'deal')
  const fieldDefIds = fieldDefsQuery.data?.map((f) => f.id) ?? []

  const [
    { data: deal },
    { data: stages },
    { data: allTags },
    { data: dealTagRows },
    { data: fieldDefs },
    { data: fieldValues },
  ] = await Promise.all([
    supabase
      .from('deals')
      .select('id, title, value, status, close_date, stage_id, contacts(id, name), companies(id, name), pipeline_stages(name)')
      .eq('id', id)
      .eq('org_id', orgId!)
      .single(),
    supabase
      .from('pipeline_stages')
      .select('id, name, position')
      .eq('org_id', orgId!)
      .order('position'),
    supabase.from('tags').select('id, name, color').eq('org_id', orgId!).order('name'),
    supabase.from('deal_tags').select('tag_id, tags(id, name, color)').eq('deal_id', id),
    supabase
      .from('custom_field_defs')
      .select('id, name, field_type, options')
      .eq('org_id', orgId!)
      .eq('entity_type', 'deal')
      .order('position'),
    fieldDefIds.length > 0
      ? supabase.from('custom_field_values').select('field_id, value').in('field_id', fieldDefIds).eq('entity_id', id)
      : Promise.resolve({ data: [] }),
  ])

  if (!deal) notFound()

  const contact = deal.contacts as { id: string; name: string } | null
  const company = deal.companies as { id: string; name: string } | null
  const stage = deal.pipeline_stages as { name: string } | null
  const assignedTags = (dealTagRows ?? []).map((r) => r.tags as { id: string; name: string; color: string }).filter(Boolean)

  const statusMap = {
    open: { label: 'Aberto', className: 'bg-blue-100 text-blue-700' },
    won: { label: 'Ganho', className: 'bg-green-100 text-green-700' },
    lost: { label: 'Perdido', className: 'bg-red-100 text-red-700' },
  }
  const statusInfo = statusMap[deal.status as keyof typeof statusMap] ?? statusMap.open
  const currentStageIndex = stages?.findIndex((s) => s.id === deal.stage_id) ?? -1

  return (
    <div>
      <Link href="/deals" className="text-sm text-slate-500 hover:text-slate-700">
        ← Negócios
      </Link>

      {/* Pipeline progress */}
      {deal.status === 'open' && stages && stages.length > 0 && (
        <div className="mt-4 mb-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-1 min-w-max">
            {stages.map((s, i) => (
              <div key={s.id} className="flex items-center gap-1">
                <div className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap',
                  i <= currentStageIndex ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-400'
                )}>
                  {i < currentStageIndex ? '✓ ' : ''}{s.name}
                </div>
                {i < stages.length - 1 && (
                  <div className={cn('w-6 h-0.5', i < currentStageIndex ? 'bg-blue-700' : 'bg-slate-200')} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-bold text-slate-900">{deal.title}</h1>
            <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium', statusInfo.className)}>
              {statusInfo.label}
            </span>
          </div>
          {deal.value !== null && (
            <p className="text-2xl font-semibold text-green-600 mt-1">{fmt(deal.value)}</p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap shrink-0">
          {deal.status === 'open' && (
            <>
              <form action={closeDeal.bind(null, id, 'won')}>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" type="submit">Ganho ✓</Button>
              </form>
              <form action={closeDeal.bind(null, id, 'lost')}>
                <Button variant="outline" size="sm" type="submit" className="text-red-600 border-red-200 hover:bg-red-50">Perdido ✗</Button>
              </form>
            </>
          )}
          {deal.status !== 'open' && (
            <form action={reopenDeal.bind(null, id)}>
              <Button variant="outline" size="sm" type="submit">Reabrir</Button>
            </form>
          )}
          <Link href={`/deals/${id}/edit`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            <Pencil className="w-4 h-4 mr-1" />
            Editar
          </Link>
          <form action={deleteDeal.bind(null, id)}>
            <Button variant="outline" size="sm" type="submit" className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {deal.value !== null && (
                <div className="flex items-center gap-2 text-slate-600">
                  <DollarSign className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="font-semibold text-green-600">{fmt(deal.value)}</span>
                </div>
              )}
              {stage && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Tag className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{stage.name}</span>
                </div>
              )}
              {deal.close_date && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{new Date(deal.close_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
              )}
              {contact && (
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <Link href={`/contacts/${contact.id}`} className="hover:text-blue-600">{contact.name}</Link>
                </div>
              )}
              {company && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <Link href={`/companies/${company.id}`} className="hover:text-blue-600">{company.name}</Link>
                </div>
              )}

              {/* Tags */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Tags</p>
                <TagPicker
                  entityType="deal"
                  entityId={id}
                  assignedTags={assignedTags}
                  allTags={allTags ?? []}
                />
              </div>

              {/* Custom fields */}
              <CustomFieldDisplay
                entityId={id}
                entityType="deal"
                fieldDefs={(fieldDefs ?? []) as { id: string; name: string; field_type: string; options: string[] | null }[]}
                fieldValues={(fieldValues ?? []) as { field_id: string; value: string | null }[]}
              />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Registrar atividade</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityForm dealId={id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Histórico</CardTitle>
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
