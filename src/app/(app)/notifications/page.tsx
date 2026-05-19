import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { markNotificationRead, markAllNotificationsRead } from '@/server/actions/notification'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, TrendingUp, CheckSquare, User, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const typeConfig = {
  mention: { icon: MessageSquare, color: 'text-blue-500' },
  deal_won: { icon: TrendingUp, color: 'text-green-500' },
  deal_lost: { icon: TrendingUp, color: 'text-red-500' },
  task_due: { icon: CheckSquare, color: 'text-amber-500' },
  assigned: { icon: User, color: 'text-purple-500' },
} as const

export default async function NotificationsPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, title, body, link, read, created_at')
    .eq('org_id', orgId!)
    .eq('user_id', user?.id ?? '')
    .order('created_at', { ascending: false })
    .limit(50)

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notificações</h1>
          {unreadCount > 0 && (
            <p className="text-slate-500 text-sm mt-1">{unreadCount} não lida{unreadCount !== 1 ? 's' : ''}</p>
          )}
        </div>
        {unreadCount > 0 && (
          <form action={markAllNotificationsRead}>
            <Button variant="outline" size="sm" type="submit">
              Marcar todas como lidas
            </Button>
          </form>
        )}
      </div>

      {!notifications || notifications.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">Nenhuma notificação ainda</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const config = typeConfig[n.type as keyof typeof typeConfig] ?? typeConfig.mention
            const Icon = config.icon
            const content = (
              <div className={cn(
                'flex items-start gap-3 p-4 rounded-xl border transition-colors',
                n.read
                  ? 'bg-white border-slate-100 hover:border-slate-200'
                  : 'bg-blue-50 border-blue-100 hover:border-blue-200'
              )}>
                <div className={cn('mt-0.5 shrink-0', config.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm', n.read ? 'text-slate-700' : 'font-medium text-slate-900')}>
                    {n.title}
                  </p>
                  {n.body && <p className="text-xs text-slate-500 mt-0.5">{n.body}</p>}
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(n.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                {!n.read && (
                  <form action={markNotificationRead.bind(null, n.id)}>
                    <button type="submit" className="text-xs text-blue-500 hover:text-blue-700 shrink-0">
                      Lida
                    </button>
                  </form>
                )}
              </div>
            )

            return n.link ? (
              <Link key={n.id} href={n.link}>{content}</Link>
            ) : (
              <div key={n.id}>{content}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
