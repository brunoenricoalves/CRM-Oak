import { describe, it, expect } from 'vitest'
import { generateSlug } from '@/lib/utils/slug'

describe('generateSlug', () => {
  it('converte texto para slug lowercase', () => {
    expect(generateSlug('Oak Agência')).toBe('oak-agencia')
  })

  it('remove caracteres especiais', () => {
    expect(generateSlug('Hello, World!')).toBe('hello-world')
  })

  it('colapsa múltiplos hífens', () => {
    expect(generateSlug('foo  bar')).toBe('foo-bar')
  })

  it('remove espaços no início e fim', () => {
    expect(generateSlug(' foo ')).toBe('foo')
  })

  it('remove hífens no início e fim', () => {
    expect(generateSlug('-foo-')).toBe('foo')
  })
})
