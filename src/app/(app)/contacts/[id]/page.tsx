import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteContact } from '@/server/actions/contact'
import { ActivityFeed } from '@/components/activities/activity-feed'
import { ActivityForm } from '@/components/activities/activity-form'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ContactDetailPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: contact } = await supabase
    .from('contacts')
    .select('id, name, email, phone, companies(id, name)')
    .eq('id', id)
    .eq('org_id', orgId!)
    .single()

  if (!contact) notFound()

  const company = contact.companies as { id: string; name: string } | null

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href="/contacts" className="text-sm text-slate-500 hover:text-slate-700">
            ← Contatos
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{contact.name}</h1>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/contacts/${id}/edit`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            <Pencil className="w-4 h-4 mr-1" />
            Editar
          </Link>
          <form action={deleteContact.bind(null, id)}>
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
                <span className="text-slate-500">Email</span>
                <p className="font-medium">{contact.email ?? '—'}</p>
              </div>
              <div>
                <span className="text-slate-500">Telefone</span>
                <p className="font-medium">{contact.phone ?? '—'}</p>
              </div>
              <div>
                <span className="text-slate-500">Empresa</span>
                <p className="font-medium">
                  {company ? (
                    <Link
                      href={`/companies/${company.id}`}
                      className="text-blue-600 hover:underline"
                    >
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
              <ActivityForm contactId={id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Histórico</CardTitle>
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
