'use client'

import { useActionState, useTransition } from 'react'
import { createDealTask, toggleTask, deleteTask } from '@/server/actions/task'
import { CheckSquare, Square, Trash2, Plus } from 'lucide-react'

interface Task {
  id: string
  title: string
  done: boolean
  due_date: string | null
}

interface Props {
  dealId: string
  initialTasks: Task[]
}

export function DealTasksSection({ dealId, initialTasks }: Props) {
  const [state, formAction, pending] = useActionState(createDealTask, null)
  const [, startTransition] = useTransition()

  const pending_ = (id: string) => false

  return (
    <div className="space-y-3">
      {initialTasks.length === 0 && (
        <p className="text-sm" style={{ color: 'var(--text-dim)' }}>Nenhuma tarefa ainda.</p>
      )}

      {initialTasks.map((task) => (
        <div key={task.id} className="flex items-start gap-3 py-2" style={{ borderBottom: '1px solid var(--surface-border)' }}>
          <form action={toggleTask.bind(null, task.id, task.done, `/deals/${dealId}`)}>
            <button type="submit" className="mt-0.5 shrink-0 transition-colors" style={{ color: task.done ? 'var(--accent3)' : 'var(--text-dim)' }}>
              {task.done ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
          </form>
          <div className="flex-1 min-w-0">
            <p className="text-sm" style={{ color: task.done ? 'var(--text-dim)' : 'var(--text-primary)', textDecoration: task.done ? 'line-through' : 'none' }}>
              {task.title}
            </p>
            {task.due_date && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-faint)' }}>
                {new Date(task.due_date + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
            )}
          </div>
          <form action={deleteTask.bind(null, task.id, `/deals/${dealId}`)}>
            <button type="submit" className="shrink-0 transition-colors" style={{ color: 'var(--text-faint)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-faint)')}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      ))}

      <form action={formAction} className="flex gap-2 pt-1">
        <input type="hidden" name="deal_id" value={dealId} />
        <input
          name="title"
          placeholder="Nova tarefa..."
          required
          className="flex-1 text-sm rounded-lg px-3 py-2 outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'var(--text-primary)' }}
        />
        <input name="due_date" type="date" className="text-sm rounded-lg px-2 py-2 outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'var(--text-muted)' }} />
        <button type="submit" disabled={pending} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-opacity"
          style={{ background: 'var(--accent1)', color: '#fff', opacity: pending ? 0.6 : 1 }}>
          <Plus className="w-4 h-4" />
        </button>
      </form>
      {state?.error && <p className="text-xs" style={{ color: '#f87171' }}>{state.error}</p>}
    </div>
  )
}
