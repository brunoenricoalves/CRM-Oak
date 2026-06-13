import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { toggleTask, deleteTask } from '@/server/actions/task'
import { buttonVariants } from '@/components/ui/button'
import { CheckSquare, Square, Trash2, Pencil } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const card = {
  background: 'var(--surface)',
  border: '1px solid var(--surface-border)',
  borderRadius: 12,
  padding: '16px',
}

export default async function TasksPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, title, done, due_date, contacts(name), deals(title)')
    .eq('org_id', orgId!)
    .order('done')
    .order('due_date', { ascending: true, nullsFirst: false })

  const pending = tasks?.filter((t) => !t.done) ?? []
  const done = tasks?.filter((t) => t.done) ?? []

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
          Tarefas
        </h1>
        <Link href="/tasks/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: 'var(--accent1)', color: '#fff' }}>
          Nova tarefa
        </Link>
      </div>

      <div className="space-y-2">
        {pending.length === 0 && done.length === 0 && (
          <div style={card} className="p-12 text-center">
            <p className="text-lg font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>Nenhuma tarefa ainda</p>
          </div>
        )}

        {pending.map((task) => (
          <div key={task.id} style={card} className="flex items-start gap-3">
            <form action={toggleTask.bind(null, task.id, task.done)}>
              <button type="submit" className="mt-0.5 transition-colors" style={{ color: 'var(--text-dim)' }}>
                <Square className="w-5 h-5" />
              </button>
            </form>
            <div className="flex-1 min-w-0">
              <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{task.title}</p>
              <div className="flex gap-3 mt-1 flex-wrap">
                {task.due_date && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Vence: {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </span>
                )}
                {task.contacts && (
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(124,111,255,0.12)', color: 'var(--accent1)' }}>
                    {(task.contacts as { name: string } | null)?.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Link href={`/tasks/${task.id}/edit`}
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'h-8 w-8 p-0')}
                style={{ color: 'var(--text-dim)' }}>
                <Pencil className="w-4 h-4" />
              </Link>
              <form action={deleteTask.bind(null, task.id)}>
                <button type="submit" className="h-8 w-8 flex items-center justify-center transition-colors"
                  style={{ color: 'var(--text-faint)' }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        ))}

        {done.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-medium mb-2" style={{ color: 'var(--text-dim)' }}>
              Concluídas ({done.length})
            </h2>
            {done.map((task) => (
              <div key={task.id} style={{ ...card, opacity: 0.45, marginBottom: 8 }} className="flex items-center gap-3">
                <form action={toggleTask.bind(null, task.id, task.done)}>
                  <button type="submit" className="transition-colors" style={{ color: 'var(--accent3)' }}>
                    <CheckSquare className="w-5 h-5" />
                  </button>
                </form>
                <p className="flex-1 line-through" style={{ color: 'rgba(255,255,255,0.4)' }}>{task.title}</p>
                <form action={deleteTask.bind(null, task.id)}>
                  <button type="submit" className="transition-colors" style={{ color: 'var(--text-faint)' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
