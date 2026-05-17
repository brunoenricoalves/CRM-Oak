import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { sendInvite } from '@/server/actions/invite'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

      <Card>
        <CardHeader>
          <CardTitle>Convidar membro</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={sendInvite.bind(null, orgId!)} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                placeholder="nome@empresa.com"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="role">Papel</Label>
              <select
                id="role"
                name="role"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                defaultValue="member"
              >
                <option value="member">Membro</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <Button type="submit">Enviar convite</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
