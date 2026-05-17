import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { createStage, deleteStage } from '@/server/actions/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'

export default async function PipelineSettingsPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('id, name, color, position')
    .eq('org_id', orgId!)
    .order('position')

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700">
          ← Configurações
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Pipeline de vendas</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Etapas do pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          {!stages || stages.length === 0 ? (
            <p className="text-sm text-slate-400 mb-4">Nenhuma etapa criada ainda</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {stages.map((s) => (
                <li key={s.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-md">
                  <div
                    className="w-4 h-4 rounded-full flex-shrink-0"
                    style={{ backgroundColor: s.color ?? '#94a3b8' }}
                  />
                  <span className="flex-1 text-sm font-medium">{s.name}</span>
                  <form action={deleteStage.bind(null, s.id)}>
                    <button
                      type="submit"
                      className="text-slate-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nova etapa</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createStage.bind(null, null)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">Nome da etapa *</Label>
              <Input id="name" name="name" required placeholder="Ex: Qualificação" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="color">Cor</Label>
              <input
                id="color"
                name="color"
                type="color"
                defaultValue="#3b82f6"
                className="h-9 w-20 rounded-md border border-slate-200 cursor-pointer"
              />
            </div>
            <Button type="submit">Adicionar etapa</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
