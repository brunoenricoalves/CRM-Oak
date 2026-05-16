'use server'

import { redirect } from 'next/navigation'
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

  // 1. Criar usuário no Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name } },
  })
  if (authError || !authData.user) return { error: authError?.message ?? 'Erro ao criar conta' }

  // 2. Criar org via SECURITY DEFINER function (bypassa RLS)
  const admin = createAdminClient()
  const slug = generateSlug(parsed.data.orgName)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: orgError } = await (admin as any).rpc('create_org_and_admin', {
    p_name: parsed.data.orgName,
    p_slug: slug,
    p_user_id: authData.user.id,
  })
  if (orgError) return { error: 'Erro ao criar organização' }

  redirect('/dashboard')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
