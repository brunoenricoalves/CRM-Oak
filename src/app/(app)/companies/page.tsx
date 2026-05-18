import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteCompany } from '@/server/actions/company'
import { AvatarInitials } from '@/components/ui/avatar-initials'
import { SearchInput } from '@/components/ui/search-input'
import { buttonVariants } from '@/components/ui/button'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function CompaniesPage({ searchParams }: Props) {
  const { q } = await searchParams
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  let query = supabase
    .from('companies')
    .select('id, name, domain, industry, size, created_at')
    .eq('org_id', orgId!)
    .order('name')

  if (q) query = query.ilike('name', `%${q}%`)

  const { data: companies } = await query

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
          <p className="text-slate-500 text-sm mt-0.5">{companies?.length ?? 0} empresa(s)</p>
        </div>
        <Link href="/companies/new" className={buttonVariants()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova empresa
        </Link>
      </div>

      <div className="mb-4">
        <Suspense>
          <SearchInput placeholder="Buscar empresas..." defaultValue={q} />
        </Suspense>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {!companies || companies.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium">
              {q ? `Nenhum resultado para "${q}"` : 'Nenhuma empresa ainda'}
            </p>
            {!q && <p className="text-sm mt-1">Cadastre sua primeira empresa para começar</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Nome</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Setor</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Domínio</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Tamanho</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Criado em</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="group border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/companies/${c.id}`} className="flex items-center gap-3 hover:text-blue-700">
                      <AvatarInitials name={c.name} size="sm" />
                      <span className="font-medium text-slate-900">{c.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.industry ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{c.domain ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{c.size ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link
                        href={`/companies/${c.id}/edit`}
                        className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <form action={deleteCompany.bind(null, c.id)}>
                        <button
                          type="submit"
                          className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </form>
                    </div>
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
