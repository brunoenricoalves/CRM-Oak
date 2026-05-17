import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { AppHeader } from '@/components/layout/app-header'
import { getActiveOrg } from '@/lib/org'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const org = await getActiveOrg()
  if (!org) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AppHeader orgName={org.name} />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
