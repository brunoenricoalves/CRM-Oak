import { createClient } from '@/lib/supabase/server'
import { acceptInvite } from '@/server/actions/invite'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  let inv: { org_name: string; role: string } | null = null

  try {
    const supabase = await createClient()
    const { data: invite, error } = await supabase.rpc('get_invitation_by_token', { p_token: token })
    if (error || !invite || invite.length === 0) {
      redirect('/login?error=invite_invalid')
    }
    inv = invite[0]
  } catch (err: unknown) {
    // rethrow Next.js redirect/notFound errors
    const message = err instanceof Error ? err.message : ''
    if (message.includes('NEXT_REDIRECT') || message.includes('NEXT_NOT_FOUND')) throw err
    redirect('/login?error=invite_invalid')
  }

  if (!inv) redirect('/login?error=invite_invalid')

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Convite para {inv.org_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600">
            Você foi convidado como <strong>{inv.role}</strong> para a organização <strong>{inv.org_name}</strong>.
          </p>
          <form action={acceptInvite.bind(null, token)}>
            <Button type="submit" className="w-full">Aceitar convite</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
