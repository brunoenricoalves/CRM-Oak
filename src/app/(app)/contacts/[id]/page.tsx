import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteContact } from '@/server/actions/contact'
import { ActivityFeed } from '@/components/activities/activity-feed'
import { ActivityForm } from '@/components/activities/activity-form'
import { AvatarInitials } from '@/components/ui/avatar-initials'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pencil, Trash2, Mail, Phone, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ContactDetailPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const [{ data: contact }, { data: deals }] = await Promise.all([
    supabase
      .from('contacts')
      .select('id, name, email, phone, created_at, companies(id, name)')
      .eq('id', id)
      .eq('org_id', orgId!)
      .single(),
    supabase
      .from('deals')
      .select('id, title, value, status, pipeline_stages(name)')
      .eq('contact_id', id)
      .eq('org_id', orgId!)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (!contact) notFound()

  const company = contact.companies as { id: string; name: string } | null

  return (
    <div>
      <Link href="/contacts" className="text-sm text-slate-500 hover:text-slate-700">
        ← Contatos
      </Link>

      <div className="flex items-start justify-between mt-4 mb-8">
        <div className="flex items-center gap-4">
          <AvatarInitials name={contact.name} size="lg" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{contact.name}</h1>
            {company && (
              <Link href={`/companies/${company.id}`} className="text-blue-600 hover:underline text-sm mt-0.5 inline-block">
                {company.name}
              </Link>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/contacts/${id}/edit`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            <Pencil className="w-4 h-4 mr-1" />
            Editar
          </Link>
          <form action={deleteContact.bind(null, id)}>
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
              {contact.email && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <a href={`mailto:${contact.email}`} className="hover:text-blue-600 truncate">{contact.email}</a>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{contact.phone}</span>
                </div>
              )}
              {company && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  <Link href={`/companies/${company.id}`} className="hover:text-blue-600">{company.name}</Link>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-400">
                Criado em {new Date(contact.created_at).toLocaleDateString('pt-BR')}
              </div>
            </CardContent>
          </Card>

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
              <ActivityForm contactId={id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-slate-700">Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed contactId={id} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
