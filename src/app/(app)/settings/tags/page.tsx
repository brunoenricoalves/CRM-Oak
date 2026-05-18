import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { createTag, deleteTag } from '@/server/actions/tag'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import { TagBadge } from '@/components/tags/tag-badge'
import { CreateTagForm } from './create-tag-form'

export default async function TagsPage() {
  const orgId = await getActiveOrgId()
  const supabase = await createClient()

  const { data: tags } = await supabase
    .from('tags')
    .select('id, name, color')
    .eq('org_id', orgId!)
    .order('name')

  return (
    <div>
      <div className="mb-6">
        <Link href="/settings" className="text-sm text-slate-500 hover:text-slate-700">← Configurações</Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-2">Tags</h1>
        <p className="text-slate-500 text-sm mt-1">Crie tags para classificar contatos, empresas e negócios.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">Nova tag</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateTagForm action={createTag} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-slate-700">
              Tags existentes ({tags?.length ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!tags || tags.length === 0 ? (
              <p className="text-sm text-slate-400 py-2">Nenhuma tag criada.</p>
            ) : (
              <div className="space-y-2">
                {tags.map((tag) => (
                  <div key={tag.id} className="flex items-center justify-between">
                    <TagBadge tag={tag} />
                    <form action={deleteTag.bind(null, tag.id)}>
                      <Button variant="ghost" size="sm" type="submit" className="text-red-400 hover:text-red-600 h-7 w-7 p-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
