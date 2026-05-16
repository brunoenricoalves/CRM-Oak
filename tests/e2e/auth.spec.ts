import { test, expect } from '@playwright/test'

const uniqueEmail = () => `test+${Date.now()}@example.com`

test.describe('Auth flow', () => {
  test('signup cria conta e organização', async ({ page }) => {
    await page.goto('/signup')

    await page.fill('[name=name]', 'Teste Usuario')
    await page.fill('[name=orgName]', 'Org Teste E2E')
    await page.fill('[name=email]', uniqueEmail())
    await page.fill('[name=password]', 'Senha123!')
    await page.click('[type=submit]')

    await expect(page).toHaveURL('/dashboard', { timeout: 10000 })
  })

  test('login com credenciais inválidas mostra erro', async ({ page }) => {
    await page.goto('/login')

    await page.fill('[name=email]', 'nao@existe.com')
    await page.fill('[name=password]', 'senhaerrada')
    await page.click('[type=submit]')

    await expect(page.getByText('Email ou senha inválidos')).toBeVisible()
  })

  test('redireciona para /login quando não autenticado', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })
})
