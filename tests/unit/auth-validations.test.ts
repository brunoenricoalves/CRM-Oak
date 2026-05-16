import { describe, it, expect } from 'vitest'
import { signupSchema, loginSchema } from '@/lib/validations/auth'

describe('signupSchema', () => {
  it('aceita dados válidos', () => {
    const result = signupSchema.safeParse({
      name: 'Bruno Alves',
      orgName: 'Oak Agência',
      email: 'bruno@oakagencia.com.br',
      password: 'Senha123!',
    })
    expect(result.success).toBe(true)
  })

  it('rejeita email inválido', () => {
    const result = signupSchema.safeParse({
      name: 'Bruno',
      orgName: 'Oak',
      email: 'not-an-email',
      password: 'Senha123!',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('email')
  })

  it('rejeita senha menor que 8 caracteres', () => {
    const result = signupSchema.safeParse({
      name: 'Bruno',
      orgName: 'Oak',
      email: 'bruno@oak.com',
      password: '123',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0].path).toContain('password')
  })
})

describe('loginSchema', () => {
  it('aceita email e senha válidos', () => {
    const result = loginSchema.safeParse({
      email: 'bruno@oak.com',
      password: 'Senha123!',
    })
    expect(result.success).toBe(true)
  })
})
