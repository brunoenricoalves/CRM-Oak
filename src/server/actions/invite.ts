'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { inviteSchema } from '@/lib/validations/invite'
export async function sendInvite(orgId: string, formData: FormData) {
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()

  const { data: token, error } = await supabase.rpc('create_invitation', {
    p_org_id: orgId,
    p_email: parsed.data.email,
    p_role: parsed.data.role,
  })
  if (error) return { error: error.message }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`
  const { error: emailError } = await resend.emails.send({
    from: 'CRM <noreply@oakagencia.com.br>',
    to: parsed.data.email,
    subject: 'Você foi convidado para um CRM',
    html: `<p>Clique para aceitar o convite: <a href="${inviteUrl}">${inviteUrl}</a></p>`,
  })
  if (emailError) return { error: emailError.message }

  return { success: true }
}

export async function acceptInvite(token: string): Promise<void> {
  const supabase = await createClient()

  const { error } = await supabase.rpc('accept_invitation', {
    p_token: token,
  })
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/dashboard')
}
