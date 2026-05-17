import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { MessageSquare, Phone, Mail, Users } from 'lucide-react'

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

  let query = supabase
    .from('activities')
    .select('id, type, body, created_at')
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

  return (
    <div className="space-y-4">
      {activities.map((a) => {
        const config = typeConfig[a.type as keyof typeof typeConfig] ?? typeConfig.note
        const Icon = config.icon
        return (
          <div key={a.id} className="flex gap-3">
            <div className={`mt-0.5 ${config.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500">{config.label}</span>
                <span className="text-xs text-slate-400">
                  {new Date(a.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-sm text-slate-700 mt-0.5 whitespace-pre-wrap">{a.body}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
