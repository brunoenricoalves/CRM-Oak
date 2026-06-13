'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'
import { z } from 'zod'

const stageSchema = z.object({
  name: z.string().min(1, 'Nome obrigatório'),
  color: z.string().optional().or(z.literal('')),
})

export async function createStage(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const parsed = stageSchema.safeParse({
    name: formData.get('name'),
    color: formData.get('color') || undefined,
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: existing } = await supabase
    .from('pipeline_stages')
    .select('position')
    .eq('org_id', orgId)
    .order('position', { ascending: false })
    .limit(1)

  const position = existing && existing.length > 0 ? existing[0].position + 1000 : 1000

  const { error } = await supabase.from('pipeline_stages').insert({
    name: parsed.data.name,
    color: parsed.data.color || null,
    org_id: orgId,
    position,
  })
  if (error) return { error: error.message }

  revalidatePath('/settings/pipeline')
  return { success: true }
}

export async function deleteStage(id: string): Promise<void> {
  const orgId = await getActiveOrgId()
  if (!orgId) return

  const supabase = await createClient()
  await supabase.from('pipeline_stages').delete().eq('id', id).eq('org_id', orgId)

  revalidatePath('/settings/pipeline')
}

export async function inviteMember(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const email = (formData.get('email') as string)?.trim()
  const role = (formData.get('role') as string) || 'member'
  if (!email) return { error: 'Email obrigatório' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: token, error } = await supabase.rpc('create_invitation', {
    p_org_id: orgId,
    p_email: email,
    p_role: role,
  })
  if (error) return { error: error.message }

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: emailError } = await resend.emails.send({
    from: 'CRM <noreply@oakagencia.com.br>',
    to: email,
    subject: 'Você foi convidado para um CRM',
    html: `<p>Clique para aceitar o convite: <a href="${inviteUrl}">${inviteUrl}</a></p>`,
  })
  if (emailError) return { error: emailError.message }

  return { success: true }
}

export async function updateStageProbability(stageId: string, probability: number) {
  const orgId = await getActiveOrgId()
  if (!orgId) return

  const supabase = await createClient()
  await supabase
    .from('pipeline_stages')
    .update({ probability })
    .eq('id', stageId)
    .eq('org_id', orgId)

  revalidatePath('/settings/pipeline')
}

export async function updateOrgName(_prev: unknown, formData: FormData) {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  const name = (formData.get('name') as string)?.trim()
  if (!name || name.length < 2) return { error: 'Nome deve ter ao menos 2 caracteres' }

  const supabase = await createClient()
  const { error } = await supabase.from('organizations').update({ name }).eq('id', orgId)

  if (error) return { error: error.message }
  revalidatePath('/settings')
  return { success: true }
}
