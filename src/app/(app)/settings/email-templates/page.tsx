import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { createEmailTemplate, deleteEmailTemplate } from '@/server/actions/email-template'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import { CreateEmailTemplateForm } from './create-email-template-form'

export default async function EmailTemplatesPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: templates } = await supabase
    .from('email_templates')
    .select('id, name, subject, body, updated_at')
    .eq('org_id', orgId!)
    .order('name')

  return (
    <div>
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700">← Configurações</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Templates de email</h1>
        <p className="text-slate-500 text-sm mt-1">Crie templates reutilizáveis para acelerar o registro de emails.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Novo template</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateEmailTemplateForm action={createEmailTemplate} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Templates ({templates?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!templates || templates.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">Nenhum template criado.</p>
            ) : (
              <div className="space-y-3">
                {templates.map((t) => (
                  <div key={t.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 text-sm">{t.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">Assunto: {t.subject}</p>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{t.body}</p>
                      </div>
                      <form action={deleteEmailTemplate.bind(null, t.id)}>
                        <Button variant="ghost" size="sm" type="submit" className="text-red-400 hover:text-red-600 h-7 w-7 p-0 shrink-0">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
