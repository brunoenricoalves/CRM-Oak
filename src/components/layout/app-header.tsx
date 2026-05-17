import { createClient } from '@/lib/supabase/server'
import { logout } from '@/server/actions/auth'
import { Button } from '@/components/ui/button'
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
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1">
            {userName}
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <form action={logout}>
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
