import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { buttonVariants } from '@/components/ui/button'
import { KanbanBoard } from '@/components/deals/kanban-board'
import { Plus } from 'lucide-react'

export default async function DealsPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const [{ data: stages }, { data: deals }] = await Promise.all([
    supabase
      .from('pipeline_stages')
      .select('id, name, color, position')
      .eq('org_id', orgId!)
      .order('position'),
    supabase
      .from('deals')
      .select('id, title, value, stage_id, position, contacts(name), companies(name)')
      .eq('org_id', orgId!)
      .eq('status', 'open')
      .order('position'),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Negócios</h1>
        <Link href="/deals/new" className={buttonVariants()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo negócio
        </Link>
      </div>

      {!stages || stages.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-500">
          <p className="text-lg font-medium">Configure o pipeline primeiro</p>
          <p className="text-sm mt-1">
            <Link href="/settings/pipeline" className="text-blue-600 hover:underline">
              Vá para Configurações → Pipeline
            </Link>{' '}
            para criar as etapas do seu pipeline.
          </p>
        </div>
      ) : (
        <KanbanBoard
          stages={stages}
          deals={(deals ?? []).map((d) => ({
            ...d,
            contacts: Array.isArray(d.contacts) ? (d.contacts[0] ?? null) : d.contacts,
            companies: Array.isArray(d.companies) ? (d.companies[0] ?? null) : d.companies,
          }))}
        />
      )}
    </div>
  )
}
