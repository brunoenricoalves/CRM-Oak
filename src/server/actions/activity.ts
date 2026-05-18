'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { activitySchema } from '@/lib/validations/activity'

export async function createActivity(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const raw = {
    type: formData.get('type'),
    body: formData.get('body'),
    contact_id: formData.get('contact_id') || undefined,
    company_id: formData.get('company_id') || undefined,
    deal_id: formData.get('deal_id') || undefined,
  }

  const parsed = activitySchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const userName = user.user_metadata?.name || user.email || 'Usuário'

  const { error } = await supabase.from('activities').insert({
    type: parsed.data.type,
    body: parsed.data.body,
    org_id: orgId,
    user_id: user.id,
    user_name: userName,
    contact_id: parsed.data.contact_id || null,
    company_id: parsed.data.company_id || null,
    deal_id: parsed.data.deal_id || null,
  })
  if (error) return { error: error.message }

  const path = parsed.data.deal_id
    ? `/deals/${parsed.data.deal_id}`
    : parsed.data.contact_id
      ? `/contacts/${parsed.data.contact_id}`
      : parsed.data.company_id
        ? `/companies/${parsed.data.company_id}`
        : '/dashboard'

  revalidatePath(path)
  return { success: true }
}
