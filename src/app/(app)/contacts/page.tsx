import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function ContactsPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, name, email, phone, updated_at, companies(name)')
    .eq('org_id', orgId!)
    .order('name')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Contatos</h1>
        <Link href="/contacts/new" className={buttonVariants()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo contato
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {!contacts || contacts.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium">Nenhum contato ainda</p>
            <p className="text-sm mt-1">Crie seu primeiro contato para começar</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Telefone</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Empresa</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/contacts/${c.id}`}
                      className="font-medium text-slate-900 hover:text-blue-600"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.email ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {(c.companies as { name: string } | null)?.name ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
