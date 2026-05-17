import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { buttonVariants } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { SearchInput } from '@/components/ui/search-input'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function CompaniesPage({ searchParams }: Props) {
  const { q } = await searchParams
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  let query = supabase
    .from('companies')
    .select('id, name, domain, industry, size')
    .eq('org_id', orgId!)
    .order('name')

  if (q) query = query.ilike('name', `%${q}%`)

  const { data: companies } = await query

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">Empresas</h1>
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

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {!companies || companies.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <p className="text-lg font-medium">
              {q ? `Nenhuma empresa encontrada para "${q}"` : 'Nenhuma empresa ainda'}
            </p>
            {!q && <p className="text-sm mt-1">Cadastre sua primeira empresa para começar</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Domínio</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Setor</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Tamanho</th>
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/companies/${c.id}`}
                      className="font-medium text-slate-900 hover:text-blue-600"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{c.domain ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{c.industry ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-500">{c.size ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
