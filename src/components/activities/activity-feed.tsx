import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { markActivityDone } from '@/server/actions/email-template'
import { MessageSquare, Phone, Mail, Users, CheckCircle2, Clock } from 'lucide-react'

const typeConfig = {
  note: { icon: MessageSquare, label: 'Nota', color: 'text-slate-500' },
  call: { icon: Phone, label: 'Ligação', color: 'text-blue-500' },
  email: { icon: Mail, label: 'Email', color: 'text-green-500' },
  meeting: { icon: Users, label: 'Reunião', color: 'text-purple-500' },
} as const

interface ActivityFeedProps {
  contactId?: string
  companyId?: string
  dealId?: string
}

export async function ActivityFeed({ contactId, companyId, dealId }: ActivityFeedProps) {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const revalidatePath = contactId
    ? `/contacts/${contactId}`
    : companyId
      ? `/companies/${companyId}`
      : dealId
        ? `/deals/${dealId}`
        : '/dashboard'

  let query = supabase
    .from('activities')
    .select('id, type, body, subject, due_at, done, user_name, created_at')
    .eq('org_id', orgId!)
    .order('created_at', { ascending: false })
    .limit(50)

  if (contactId) query = query.eq('contact_id', contactId)
  else if (companyId) query = query.eq('company_id', companyId)
  else if (dealId) query = query.eq('deal_id', dealId)

  const { data: activities } = await query

  if (!activities || activities.length === 0) {
    return (
      <div className="text-sm text-slate-400 py-4 text-center">Nenhuma atividade ainda</div>
    )
  }

  const now = new Date()

  return (
    <div className="space-y-4">
      {activities.map((a) => {
        const config = typeConfig[a.type as keyof typeof typeConfig] ?? typeConfig.note
        const Icon = config.icon
        const isOverdue = a.due_at && !a.done && new Date(a.due_at) < now
        const isDueToday = a.due_at && !a.done && !isOverdue

        return (
          <div key={a.id} className={`flex gap-3 ${a.done ? 'opacity-60' : ''}`}>
            <div className={`mt-0.5 ${config.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-slate-500">{config.label}</span>
                {a.user_name && (
                  <span className="text-xs text-slate-400">por {a.user_name}</span>
                )}
                <span className="text-xs text-slate-400">
                  {new Date(a.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {a.done && (
                  <span className="inline-flex items-center gap-0.5 text-xs text-green-600">
                    <CheckCircle2 className="w-3 h-3" /> Concluído
                  </span>
                )}
              </div>

              {a.subject && (
                <p className="text-sm font-medium text-slate-800 mt-0.5">{a.subject}</p>
              )}
              {a.body && (
                <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{a.body}</p>
              )}

              {a.due_at && (
                <div className={`flex items-center gap-1 mt-1 text-xs ${isOverdue ? 'text-red-500' : 'text-amber-600'}`}>
                  <Clock className="w-3 h-3" />
                  <span>
                    {isOverdue ? 'Venceu em ' : 'Agendado: '}
                    {new Date(a.due_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}

              {(a.due_at || a.type === 'call' || a.type === 'meeting') && !a.done && (
                <form action={markActivityDone.bind(null, a.id, revalidatePath)} className="mt-1">
                  <button
                    type="submit"
                    className="text-xs text-slate-400 hover:text-green-600 transition-colors"
                  >
                    ✓ Marcar como feito
                  </button>
                </form>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
