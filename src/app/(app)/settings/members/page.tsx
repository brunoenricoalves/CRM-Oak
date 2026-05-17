import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InviteForm } from './invite-form'
import Link from 'next/link'

export default async function MembersSettingsPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: members } = await supabase
    .from('org_members')
    .select('user_id, role, invited_at')
    .eq('org_id', orgId!)
    .order('invited_at')

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700">
          ← Configurações
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Membros</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Membros da equipe ({members?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {(members ?? []).map((m) => (
              <li
                key={m.user_id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-md"
              >
                <span className="text-sm font-mono text-slate-600">
                  {m.user_id.slice(0, 8)}...
                </span>
                <Badge variant={m.role === 'admin' ? 'default' : 'secondary'}>{m.role}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <InviteForm />
    </div>
  )
}
