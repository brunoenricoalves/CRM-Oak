import { describe, it, expect } from 'vitest'
import { isTokenExpired } from '@/lib/utils/token'

describe('isTokenExpired', () => {
  it('retorna true para data no passado', () => {
    expect(isTokenExpired('2000-01-01T00:00:00Z')).toBe(true)
  })

  it('retorna false para data no futuro', () => {
    const future = new Date(Date.now() + 1000 * 60 * 60).toISOString()
    expect(isTokenExpired(future)).toBe(false)
  })

  it('lança erro para string inválida', () => {
    expect(() => isTokenExpired('not-a-date')).toThrow('Invalid expiresAt')
  })
})
