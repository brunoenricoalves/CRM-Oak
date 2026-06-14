'use server'

import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { signupSchema, loginSchema } from '@/lib/validations/auth'
import { generateSlug } from '@/lib/utils/slug'

export async function login(formData: FormData) {
  const raw = { email: formData.get('email'), password: formData.get('password') }
  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) return { error: 'Email ou senha inválidos' }

  const { data: memberships } = await supabase
    .from('org_members')
    .select('org_id')
    .limit(1)

  if (memberships && memberships.length > 0) {
    const cookieStore = await cookies()
    cookieStore.set('active_org_id', memberships[0].org_id, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    })
  }

  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const raw = {
    name: formData.get('name'),
    orgName: formData.get('orgName'),
    email: formData.get('email'),
    password: formData.get('password'),
  }
  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createClient()

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name } },
  })
  if (authError || !authData.user) return { error: authError?.message ?? 'Erro ao criar conta' }

  const admin = createAdminClient()
  const slug = generateSlug(parsed.data.orgName)
  const { data: orgId, error: orgError } = await admin.rpc('create_org_and_admin', {
    p_name: parsed.data.orgName,
    p_slug: slug,
    p_user_id: authData.user.id,
  })
  if (orgError) return { error: 'Erro ao criar organização' }

  if (orgId) {
    const cookieStore = await cookies()
    cookieStore.set('active_org_id', orgId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    })

    await admin.from('pipeline_stages').insert([
      { org_id: orgId, name: 'Prospecção',   position: 1000, probability: 10 },
      { org_id: orgId, name: 'Qualificação', position: 2000, probability: 25 },
      { org_id: orgId, name: 'Proposta',     position: 3000, probability: 50 },
      { org_id: orgId, name: 'Negociação',   position: 4000, probability: 75 },
      { org_id: orgId, name: 'Fechamento',   position: 5000, probability: 90 },
    ])
  }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  const cookieStore = await cookies()
  cookieStore.delete('active_org_id')
  redirect('/login')
}

export async function resetPassword(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()
  if (!email) return { error: 'Informe seu e-mail' }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback?next=/reset-password`,
  })
  if (error) return { error: 'Erro ao enviar e-mail. Tente novamente.' }
  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirm = formData.get('confirm') as string
  if (!password || password.length < 8) return { error: 'Senha deve ter ao menos 8 caracteres' }
  if (password !== confirm) return { error: 'As senhas não conferem' }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) return { error: 'Não foi possível atualizar a senha. Tente novamente.' }
  redirect('/dashboard')
}
