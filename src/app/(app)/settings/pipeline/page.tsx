import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteStage, updateStageProbability } from '@/server/actions/settings'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import { StageForm } from './stage-form'

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--surface-border)',
  borderRadius: 12,
}

export default async function PipelineSettingsPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: stages } = await supabase
    .from('pipeline_stages')
    .select('id, name, color, position, probability')
    .eq('org_id', orgId!)
    .order('position')

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/settings" className="text-sm transition-colors" style={{ color: 'var(--text-dim)' }}>
          ← Configurações
        </Link>
        <h1 className="text-2xl font-bold mt-2" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
          Pipeline de vendas
        </h1>
      </div>

      <div style={{ ...card, padding: '20px' }} className="mb-6">
        <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-secondary)' }}>
          Etapas do pipeline
        </p>
        {!stages || stages.length === 0 ? (
          <p className="text-sm mb-4" style={{ color: 'var(--text-dim)' }}>Nenhuma etapa criada ainda</p>
        ) : (
          <ul className="space-y-2 mb-4">
            {stages.map((s) => (
              <li key={s.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--surface-border)' }}>
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color ?? '#94a3b8' }} />
                <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{s.name}</span>
                <form
                  action={async (fd: FormData) => {
                    'use server'
                    const val = Number(fd.get('probability'))
                    if (!isNaN(val)) await updateStageProbability(s.id, Math.min(100, Math.max(0, val)))
                  }}
                  className="flex items-center gap-1"
                >
                  <input
                    name="probability"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={s.probability ?? 0}
                    className="w-16 text-sm rounded px-2 py-1 text-center"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--surface-border)', color: 'var(--text-secondary)' }}
                  />
                  <span className="text-xs" style={{ color: 'var(--text-dim)' }}>%</span>
                  <button type="submit" className="text-xs px-1 transition-colors" style={{ color: 'var(--accent3)' }}>
                    ✓
                  </button>
                </form>
                <form action={deleteStage.bind(null, s.id)}>
                  <button type="submit" className="transition-colors" style={{ color: 'var(--text-faint)' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      <StageForm />
    </div>
  )
}
