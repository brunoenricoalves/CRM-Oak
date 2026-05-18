import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { getActiveOrg } from '@/lib/org'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const org = await getActiveOrg()
  if (!org) redirect('/login')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userName = user?.user_metadata?.name ?? user?.email ?? 'Usuário'

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar orgName={org.name} userName={userName} />
      <main className="flex-1 p-8 min-w-0 overflow-auto">{children}</main>
    </div>
  )
}
