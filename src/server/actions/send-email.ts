// src/server/actions/send-email.ts
'use server'

import { Resend } from 'resend'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getActiveOrgId } from '@/lib/org'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(
  dealId: string,
  to: string,
  subject: string,
  body: string
): Promise<{ error?: string }> {
  const orgId = await getActiveOrgId()
  if (!orgId) return { error: 'Sem organização ativa' }

  if (!to.trim() || !subject.trim() || !body.trim())
    return { error: 'Destinatário, assunto e corpo são obrigatórios' }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(to.trim()))
    return { error: 'Endereço de e-mail inválido' }

  const from = process.env.RESEND_FROM
  if (!from) return { error: 'Configuração de e-mail ausente (RESEND_FROM)' }

  const { error: resendError } = await resend.emails.send({
    from,
    to: to.trim(),
    subject: subject.trim(),
    html: body.replace(/\n/g, '<br>'),
  })

  if (resendError) return { error: resendError?.message ?? 'Erro ao enviar e-mail' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Usuário não autenticado' }

  const { error: activityError } = await supabase.from('activities').insert({
    org_id: orgId,
    type: 'email',
    body: `**${subject.trim()}**\n\n${body.trim()}`,
    deal_id: dealId,
    user_id: user.id,
  })
  if (activityError) return { error: 'Falha ao registrar atividade' }

  revalidatePath(`/deals/${dealId}`)
  return {}
}
