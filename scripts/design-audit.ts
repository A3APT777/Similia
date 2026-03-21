import { chromium } from '@playwright/test'
import { mkdirSync } from 'fs'
import { join } from 'path'

const BASE = 'https://simillia.ru'
const DIR = join(process.cwd(), 'screenshots-design')

async function run() {
  mkdirSync(DIR, { recursive: true })

  const browser = await chromium.launch({ headless: true })

  // ═══ Десктоп (1440x900) ═══
  console.log('\n🖥️  ДЕСКТОП (1440×900)\n')
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const dp = await desktop.newPage()

  // Публичные
  for (const [name, url] of [
    ['d-01-landing', '/'],
    ['d-02-login', '/login'],
    ['d-03-register', '/register'],
    ['d-04-pricing', '/pricing'],
  ]) {
    await dp.goto(`${BASE}${url}`, { waitUntil: 'networkidle' })
    await dp.waitForTimeout(1500)
    // Закрыть cookie баннер если есть
    const cookieBtn = dp.locator('text=Принять').first()
    if (await cookieBtn.isVisible().catch(() => false)) await cookieBtn.click()
    await dp.waitForTimeout(500)
    await dp.screenshot({ path: join(DIR, `${name}.png`), fullPage: true })
    console.log(`  ✓ ${name}`)
  }

  // Логин
  await dp.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await dp.evaluate(() => {
    localStorage.setItem('welcome_shown', '1')
    localStorage.setItem('site_tour_done', '1')
    localStorage.setItem('onboarding_dismissed', '1')
  })
  await dp.fill('#login-email', 'triarta@mail.ru')
  await dp.fill('#login-password', '123123')
  await dp.click('button[type="submit"]')
  await dp.waitForURL('**/dashboard', { timeout: 15000 })
  await dp.waitForTimeout(3000)
  const cookieBtn2 = dp.locator('text=Принять').first()
  if (await cookieBtn2.isVisible().catch(() => false)) await cookieBtn2.click()

  for (const [name, url] of [
    ['d-05-dashboard', '/dashboard'],
    ['d-06-settings', '/settings'],
    ['d-07-referral', '/referral'],
    ['d-08-repertory', '/repertory'],
  ]) {
    await dp.goto(`${BASE}${url}`, { waitUntil: 'networkidle' })
    await dp.waitForTimeout(2000)
    await dp.screenshot({ path: join(DIR, `${name}.png`), fullPage: true })
    console.log(`  ✓ ${name}`)
  }

  // Карточка пациента
  await dp.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  await dp.waitForTimeout(2000)
  const patientLink = dp.locator('[data-tour="patient-list"] a').first()
  if (await patientLink.isVisible().catch(() => false)) {
    await patientLink.click()
    await dp.waitForTimeout(3000)
    await dp.screenshot({ path: join(DIR, 'd-09-patient.png'), fullPage: true })
    console.log('  ✓ d-09-patient')

    // Консультация
    const startBtn = dp.locator('[data-tour="new-consultation"]').first()
    if (await startBtn.isVisible().catch(() => false)) {
      await startBtn.click()
      await dp.waitForTimeout(3000)
      await dp.screenshot({ path: join(DIR, 'd-10-consultation.png'), fullPage: true })
      console.log('  ✓ d-10-consultation')
    }
  }

  await desktop.close()

  // ═══ Мобильный (375x812 — iPhone) ═══
  console.log('\n📱 МОБИЛЬНЫЙ (375×812)\n')
  const mobile = await browser.newContext({
    viewport: { width: 375, height: 812 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)',
  })
  const mp = await mobile.newPage()

  for (const [name, url] of [
    ['m-01-landing', '/'],
    ['m-02-login', '/login'],
    ['m-03-pricing', '/pricing'],
  ]) {
    await mp.goto(`${BASE}${url}`, { waitUntil: 'networkidle' })
    await mp.waitForTimeout(1500)
    const cb = mp.locator('text=Принять').first()
    if (await cb.isVisible().catch(() => false)) await cb.click()
    await mp.waitForTimeout(500)
    await mp.screenshot({ path: join(DIR, `${name}.png`), fullPage: true })
    console.log(`  ✓ ${name}`)
  }

  // Мобильный логин
  await mp.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await mp.evaluate(() => {
    localStorage.setItem('welcome_shown', '1')
    localStorage.setItem('site_tour_done', '1')
    localStorage.setItem('onboarding_dismissed', '1')
  })
  await mp.fill('#login-email', 'triarta@mail.ru')
  await mp.fill('#login-password', '123123')
  await mp.click('button[type="submit"]')
  await mp.waitForURL('**/dashboard', { timeout: 15000 })
  await mp.waitForTimeout(3000)
  const cb3 = mp.locator('text=Принять').first()
  if (await cb3.isVisible().catch(() => false)) await cb3.click()

  for (const [name, url] of [
    ['m-04-dashboard', '/dashboard'],
    ['m-05-settings', '/settings'],
    ['m-06-referral', '/referral'],
  ]) {
    await mp.goto(`${BASE}${url}`, { waitUntil: 'networkidle' })
    await mp.waitForTimeout(2000)
    await mp.screenshot({ path: join(DIR, `${name}.png`), fullPage: true })
    console.log(`  ✓ ${name}`)
  }

  await mobile.close()
  await browser.close()

  console.log(`\n📸 Скриншоты сохранены в ${DIR}`)
  console.log('Десктоп: 10 страниц, Мобильный: 6 страниц\n')
}

run().catch(console.error)
