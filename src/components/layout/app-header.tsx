import { createClient } from '@/lib/supabase/server'
import { logout } from '@/server/actions/auth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown } from 'lucide-react'

export async function AppHeader({ orgName }: { orgName: string }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userName = user?.user_metadata?.name ?? user?.email ?? 'Usuário'

  return (
    <header className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6">
      <div className="text-sm text-slate-500">{orgName}</div>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md hover:bg-slate-100 transition-colors outline-none">
          {userName}
          <ChevronDown className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem>
            <form action={logout} className="w-full">
              <button type="submit" className="w-full text-left">
                Sair
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
