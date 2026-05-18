import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { createCustomFieldDef, deleteCustomFieldDef } from '@/server/actions/custom-field'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import { CreateCustomFieldForm } from './create-custom-field-form'

const entityLabels: Record<string, string> = {
  contact: 'Contatos',
  company: 'Empresas',
  deal: 'Negócios',
}

const fieldTypeLabels: Record<string, string> = {
  text: 'Texto',
  number: 'Número',
  date: 'Data',
  select: 'Seleção',
  checkbox: 'Checkbox',
}

export default async function CustomFieldsPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: fields } = await supabase
    .from('custom_field_defs')
    .select('id, name, entity_type, field_type, options, position')
    .eq('org_id', orgId!)
    .order('entity_type')
    .order('position')

  const byEntity = {
    contact: fields?.filter((f) => f.entity_type === 'contact') ?? [],
    company: fields?.filter((f) => f.entity_type === 'company') ?? [],
    deal: fields?.filter((f) => f.entity_type === 'deal') ?? [],
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700">← Configurações</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Campos personalizados</h1>
        <p className="text-slate-500 text-sm mt-1">Adicione campos customizados para enriquecer seus registros.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Novo campo</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateCustomFieldForm action={createCustomFieldDef} />
          </CardContent>
        </Card>

        <div className="space-y-4">
          {(['contact', 'company', 'deal'] as const).map((entity) => (
            <Card key={entity}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-slate-700">
                  {entityLabels[entity]} ({byEntity[entity].length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {byEntity[entity].length === 0 ? (
                  <p className="text-sm text-slate-400">Nenhum campo.</p>
                ) : (
                  <div className="space-y-2">
                    {byEntity[entity].map((f) => (
                      <div key={f.id} className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-medium text-slate-700">{f.name}</span>
                          <span className="ml-2 text-xs text-slate-400">{fieldTypeLabels[f.field_type]}</span>
                          {f.options && (
                            <span className="ml-2 text-xs text-slate-400">
                              ({(f.options as string[]).join(', ')})
                            </span>
                          )}
                        </div>
                        <form action={deleteCustomFieldDef.bind(null, f.id)}>
                          <Button variant="ghost" size="sm" type="submit" className="text-red-400 hover:text-red-600 h-7 w-7 p-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
