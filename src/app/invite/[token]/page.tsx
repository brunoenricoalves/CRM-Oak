import { createClient } from '@/lib/supabase/server'
import { acceptInvite } from '@/server/actions/invite'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !token) notFound()

  let inv: { org_name: string; role: string } | null = null

  try {
    const supabase = await createClient()
    const { data: invite, error } = await supabase.rpc('get_invitation_by_token', { p_token: token })
    if (error || !invite || invite.length === 0) notFound()
    inv = invite[0]
  } catch (err) {
    // Re-throw Next.js internal control-flow errors (redirect, notFound, etc.)
    // They carry a `digest` property — regular errors do not.
    if (err !== null && typeof err === 'object' && 'digest' in err) throw err
    notFound()
  }

  if (!inv) notFound()

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
