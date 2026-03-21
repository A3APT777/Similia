import { chromium } from '@playwright/test'
import { mkdirSync } from 'fs'
import { join } from 'path'

const BASE = 'http://localhost:3000'
const DIR = join(process.cwd(), 'screenshots')

// Публичные страницы (без авторизации)
const PUBLIC_PAGES = [
  { name: '01-landing', url: '/' },
  { name: '02-login', url: '/login' },
  { name: '03-register', url: '/register' },
  { name: '04-pricing', url: '/pricing' },
  { name: '05-privacy', url: '/privacy' },
  { name: '06-terms', url: '/terms' },
]

async function run() {
  mkdirSync(DIR, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })

  // Публичные страницы
  for (const p of PUBLIC_PAGES) {
    const page = await context.newPage()
    await page.goto(`${BASE}${p.url}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)
    await page.screenshot({ path: join(DIR, `${p.name}.png`), fullPage: true })
    console.log(`✓ ${p.name}`)
    await page.close()
  }

  // Авторизованные страницы — нужен логин
  const loginPage = await context.newPage()
  await loginPage.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  // Очистить welcome/tour чтобы не мешали скриншотам
  await loginPage.evaluate(() => {
    localStorage.setItem('welcome_shown', '1')
    localStorage.setItem('site_tour_done', '1')
    localStorage.setItem('onboarding_dismissed', '1')
  })
  await loginPage.fill('#login-email', 'triarta@mail.ru')
  await loginPage.fill('#login-password', '123123')
  await loginPage.click('button[type="submit"]')
  await loginPage.waitForURL('**/dashboard', { timeout: 30000 })
  // Ждём полной загрузки
  await loginPage.waitForTimeout(3000)
  console.log('✓ Logged in')

  const AUTH_PAGES = [
    { name: '07-dashboard', url: '/dashboard' },
    { name: '08-settings', url: '/settings' },
    { name: '09-referral', url: '/referral' },
    { name: '10-repertory', url: '/repertory' },
  ]

  for (const p of AUTH_PAGES) {
    await loginPage.goto(`${BASE}${p.url}`, { waitUntil: 'networkidle' })
    await loginPage.waitForTimeout(2000)
    await loginPage.screenshot({ path: join(DIR, `${p.name}.png`), fullPage: true })
    console.log(`✓ ${p.name}`)
  }

  await browser.close()
  console.log(`\nСкриншоты сохранены в ${DIR}`)
}

run().catch(console.error)
