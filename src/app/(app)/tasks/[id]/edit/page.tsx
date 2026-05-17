import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { EditTaskForm } from '@/components/tasks/edit-task-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditTaskPage({ params }: Props) {
  const { id } = await params
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const [{ data: task }, { data: contacts }, { data: deals }] = await Promise.all([
    supabase
      .from('tasks')
      .select('id, title, due_date, contact_id, deal_id')
      .eq('id', id)
      .eq('org_id', orgId!)
      .single(),
    supabase.from('contacts').select('id, name').eq('org_id', orgId!).order('name'),
    supabase.from('deals').select('id, title').eq('org_id', orgId!).eq('status', 'open').order('title'),
  ])

  if (!task) notFound()

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/tasks" className="text-sm text-slate-500 hover:text-slate-700">
          ← Tarefas
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Editar tarefa</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Dados da tarefa</CardTitle>
        </CardHeader>
        <CardContent>
          <EditTaskForm
            task={task}
            contacts={contacts ?? []}
            deals={deals ?? []}
          />
        </CardContent>
      </Card>
    </div>
  )
}
