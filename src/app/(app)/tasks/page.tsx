import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { toggleTask, deleteTask } from '@/server/actions/task'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckSquare, Square, Trash2 } from 'lucide-react'
import Link from 'next/link'

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
        <h1 className="text-2xl font-bold text-slate-900">Tarefas</h1>
        <Button asChild>
          <Link href="/tasks/new">Nova tarefa</Link>
        </Button>
      </div>

      <div className="space-y-2">
        {pending.length === 0 && done.length === 0 && (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-500">
            <p className="text-lg font-medium">Nenhuma tarefa ainda</p>
          </div>
        )}

        {pending.map((task) => (
          <div
            key={task.id}
            className="flex items-start gap-3 bg-white rounded-lg border border-slate-200 p-4"
          >
            <form action={toggleTask.bind(null, task.id, task.done)}>
              <button
                type="submit"
                className="mt-0.5 text-slate-400 hover:text-blue-600 transition-colors"
              >
                <Square className="w-5 h-5" />
              </button>
            </form>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900">{task.title}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                {task.due_date && (
                  <span className="text-xs text-slate-500">
                    Vence: {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </span>
                )}
                {task.contacts && (
                  <Badge variant="secondary" className="text-xs">
                    {(task.contacts as { name: string } | null)?.name}
                  </Badge>
                )}
              </div>
            </div>
            <form action={deleteTask.bind(null, task.id)}>
              <button
                type="submit"
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </form>
          </div>
        ))}

        {done.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-medium text-slate-400 mb-2">
              Concluídas ({done.length})
            </h2>
            {done.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 bg-white rounded-lg border border-slate-100 p-4 opacity-60 mb-2"
              >
                <form action={toggleTask.bind(null, task.id, task.done)}>
                  <button
                    type="submit"
                    className="text-green-500 hover:text-slate-400 transition-colors"
                  >
                    <CheckSquare className="w-5 h-5" />
                  </button>
                </form>
                <p className="flex-1 text-slate-500 line-through">{task.title}</p>
                <form action={deleteTask.bind(null, task.id)}>
                  <button
                    type="submit"
                    className="text-slate-300 hover:text-red-500 transition-colors"
                  >
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
