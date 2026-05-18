import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteCompany } from '@/server/actions/company'
import { ActivityFeed } from '@/components/activities/activity-feed'
import { ActivityForm } from '@/components/activities/activity-form'
import { AvatarInitials } from '@/components/ui/avatar-initials'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TagPicker } from '@/components/tags/tag-picker'
import { CustomFieldDisplay } from '@/components/custom-fields/custom-field-display'
import { Pencil, Trash2, Globe, Briefcase, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CompanyDetailPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const fieldDefsQuery = await supabase
    .from('custom_field_defs')
    .select('id')
    .eq('org_id', orgId!)
    .eq('entity_type', 'company')
  const fieldDefIds = fieldDefsQuery.data?.map((f) => f.id) ?? []

  const [
    { data: company },
    { data: contacts },
    { data: deals },
    { data: allTags },
    { data: companyTagRows },
    { data: fieldDefs },
    { data: fieldValues },
  ] = await Promise.all([
    supabase
      .from('companies')
      .select('id, name, domain, industry, size, created_at')
      .eq('id', id)
      .eq('org_id', orgId!)
      .single(),
    supabase
      .from('contacts')
      .select('id, name, email')
      .eq('company_id', id)
      .eq('org_id', orgId!)
      .order('name'),
    supabase
      .from('deals')
      .select('id, title, value, status, pipeline_stages(name)')
      .eq('company_id', id)
      .eq('org_id', orgId!)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('tags').select('id, name, color').eq('org_id', orgId!).order('name'),
    supabase.from('company_tags').select('tag_id, tags(id, name, color)').eq('company_id', id),
    supabase
      .from('custom_field_defs')
      .select('id, name, field_type, options')
      .eq('org_id', orgId!)
      .eq('entity_type', 'company')
      .order('position'),
    fieldDefIds.length > 0
      ? supabase.from('custom_field_values').select('field_id, value').in('field_id', fieldDefIds).eq('entity_id', id)
      : Promise.resolve({ data: [] }),
  ])

  if (!company) notFound()

  const assignedTags = (companyTagRows ?? []).map((r) => r.tags as { id: string; name: string; color: string }).filter(Boolean)

  return (
    <div>
      <Link href="/companies" className="text-sm text-slate-500 hover:text-slate-700">
        ← Empresas
      </Link>

      <div className="flex items-start justify-between mt-4 mb-8">
        <div className="flex items-center gap-4">
          <AvatarInitials name={company.name} size="lg" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{company.name}</h1>
            {company.industry && (
              <p className="text-slate-500 text-sm mt-0.5">{company.industry}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/companies/${id}/edit`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            <Pencil className="w-4 h-4 mr-1" />
            Editar
          </Link>
          <form action={deleteCompany.bind(null, id)}>
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
              {company.domain && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{company.domain}</span>
                </div>
              )}
              {company.industry && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{company.industry}</span>
                </div>
              )}
              {company.size && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{company.size} funcionários</span>
                </div>
              )}

              {/* Tags */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Tags</p>
                <TagPicker
                  entityType="company"
                  entityId={id}
                  assignedTags={assignedTags}
                  allTags={allTags ?? []}
                />
              </div>

              {/* Custom fields */}
              <CustomFieldDisplay
                entityId={id}
                entityType="company"
                fieldDefs={(fieldDefs ?? []) as { id: string; name: string; field_type: string; options: string[] | null }[]}
                fieldValues={(fieldValues ?? []) as { field_id: string; value: string | null }[]}
              />

              <div className="pt-2 border-t border-slate-100 text-xs text-slate-400">
                Criado em {new Date(company.created_at).toLocaleDateString('pt-BR')}
              </div>
            </CardContent>
          </Card>

          {contacts && contacts.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  Contatos ({contacts.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {contacts.map((c) => (
                  <Link key={c.id} href={`/contacts/${c.id}`} className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50">
                    <AvatarInitials name={c.name} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{c.name}</p>
                      {c.email && <p className="text-xs text-slate-400">{c.email}</p>}
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          )}

          {deals && deals.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">Negócios</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {deals.map((d) => {
                  const stage = d.pipeline_stages as { name: string } | null
                  return (
                    <Link key={d.id} href={`/deals/${d.id}`} className="block p-2 rounded-lg hover:bg-slate-50 border border-slate-100">
                      <p className="font-medium text-slate-800 text-sm truncate">{d.title}</p>
                      <p className="text-xs text-slate-500">{stage?.name ?? '—'}</p>
                    </Link>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Registrar atividade</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityForm companyId={id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Histórico</CardTitle>
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
