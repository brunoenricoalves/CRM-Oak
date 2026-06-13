import { Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { deleteCompany } from '@/server/actions/company'
import { AvatarInitials } from '@/components/ui/avatar-initials'
import { SearchInput } from '@/components/ui/search-input'
import { Plus, Pencil, Trash2 } from 'lucide-react'

interface Props {
  searchParams: Promise<{ q?: string }>
}

const surface = {
  background: 'var(--surface)',
  border: '1px solid var(--surface-border)',
  borderRadius: 14,
  overflow: 'hidden' as const,
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
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-syne)', color: 'var(--text-primary)' }}>
            Empresas
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {companies?.length ?? 0} empresa(s)
          </p>
        </div>
        <Link
          href="/companies/new"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{ background: 'var(--accent1)', color: '#fff' }}
        >
          <Plus className="w-4 h-4" />
          Nova empresa
        </Link>
      </div>

      <div className="mb-4">
        <Suspense>
          <SearchInput placeholder="Buscar empresas..." defaultValue={q} />
        </Suspense>
      </div>

      <div style={surface}>
        {!companies || companies.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-lg font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {q ? `Nenhum resultado para "${q}"` : 'Nenhuma empresa ainda'}
            </p>
            {!q && <p className="text-sm mt-1" style={{ color: 'var(--text-dim)' }}>Cadastre sua primeira empresa para começar</p>}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)', background: 'rgba(255,255,255,0.02)' }}>
                {['Nome', 'Setor', 'Domínio', 'Tamanho', 'Criado em', ''].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wide"
                    style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {companies.map((c) => (
                <tr key={c.id} className="group transition-colors hover:bg-white/[0.025]"
                  style={{ borderBottom: '1px solid var(--surface-border)' }}
                >
                  <td className="px-4 py-3">
                    <Link href={`/companies/${c.id}`} className="flex items-center gap-3">
                      <AvatarInitials name={c.name} size="sm" />
                      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>{c.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{c.industry ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{c.domain ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>{c.size ?? '—'}</td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-dim)' }}>
                    {new Date(c.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/companies/${c.id}/edit`}
                        className="p-1.5 rounded transition-colors"
                        style={{ color: 'var(--text-dim)' }}
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <form action={deleteCompany.bind(null, c.id)}>
                        <button type="submit" className="p-1.5 rounded transition-colors"
                          style={{ color: 'var(--text-dim)' }}>
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
