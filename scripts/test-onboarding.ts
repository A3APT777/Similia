import { chromium } from '@playwright/test'

const BASE = 'http://localhost:3000'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  let passed = 0
  let failed = 0

  function ok(name: string) { passed++; console.log(`  ✅ ${name}`) }
  function fail(name: string, err: string) { failed++; console.log(`  ❌ ${name}: ${err}`) }

  async function check(name: string, fn: () => Promise<boolean>) {
    try {
      const result = await fn()
      if (result) ok(name)
      else fail(name, 'условие не выполнено')
    } catch (e: any) {
      fail(name, e.message?.slice(0, 100))
    }
  }

  // ═══ Логин ═══
  console.log('\n🔑 Логин...')
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.evaluate(() => {
    localStorage.clear()
  })
  await page.fill('#login-email', 'triarta@mail.ru')
  await page.fill('#login-password', '123123')
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 15000 })
  console.log('  ✅ Залогинился\n')

  // Очистить ВСЁ для чистого теста
  await page.evaluate(() => {
    localStorage.clear()
  })
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(3000)

  // ═══ WelcomeScreen ═══
  console.log('👋 WelcomeScreen...')
  await check('WelcomeScreen виден', async () => {
    // Ждём до 5 секунд
    for (let i = 0; i < 5; i++) {
      const el = page.locator('text=Добро пожаловать').first()
      if (await el.isVisible().catch(() => false)) return true
      await page.waitForTimeout(1000)
    }
    return false
  })

  await check('Кнопка «Начать знакомство» видна', async () => {
    return await page.locator('text=Начать знакомство').first().isVisible()
  })

  // Нажимаем «Начать знакомство»
  const startBtn = page.locator('text=Начать знакомство').first()
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click()
    await page.waitForTimeout(1500)
    // WelcomeScreen перезагружает страницу
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {})
    await page.waitForTimeout(3000)
  } else {
    // Если WelcomeScreen не показался — запустим тур вручную
    await page.evaluate(() => {
      localStorage.setItem('onboarding_step', '0')
    })
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForTimeout(3000)
  }

  // ═══ InteractiveTour ═══
  console.log('\n🎓 InteractiveTour...')

  // Проверяем что тур запустился
  await check('Прогресс-бар виден', async () => {
    const bar = page.locator('.fixed.top-0.left-0.right-0')
    return await bar.first().isVisible()
  })

  // Проходим информационные шаги (нажимаем «Далее»)
  let stepNum = 0
  const MAX_STEPS = 32

  for (let i = 0; i < MAX_STEPS; i++) {
    // Проверяем есть ли панель тура
    const tourPanel = page.locator('text=Далее →').first()
    const skipBtn = page.locator('text=Пропустить').first()
    const waitingIndicator = page.locator('text=Выполните действие').first()
    const finishBtn = page.locator('text=Завершить ✓').first()

    const hasDaleeBtn = await tourPanel.isVisible().catch(() => false)
    const hasWaiting = await waitingIndicator.isVisible().catch(() => false)
    const hasFinish = await finishBtn.isVisible().catch(() => false)

    if (hasFinish) {
      // Последний шаг
      await check(`Шаг ${i + 1}: финальный экран`, async () => {
        return await page.locator('text=Вы готовы').isVisible()
      })
      await finishBtn.click()
      await page.waitForTimeout(500)
      stepNum = i + 1
      break
    }

    if (hasWaiting) {
      // Ожидает действия пользователя
      const stepTitle = await page.locator('.text-lg').first().textContent().catch(() => '?')
      console.log(`  ⏳ Шаг ${i + 1}: «${stepTitle}» — ждёт действия`)

      if (stepTitle?.includes('Откройте демо-пациента') || stepTitle?.includes('Откройте пациента')) {
        // Ждём загрузки списка пациентов (до 10 сек)
        let patientFound = false
        for (let attempt = 0; attempt < 10; attempt++) {
          const patientLink = page.locator('[data-tour="patient-list"] a').first()
          if (await patientLink.isVisible().catch(() => false)) {
            await patientLink.click()
            await page.waitForTimeout(3000)
            ok(`Шаг ${i + 1}: клик на пациента`)
            patientFound = true
            break
          }
          await page.waitForTimeout(1000)
        }
        if (!patientFound) {
          fail(`Шаг ${i + 1}`, 'не найден пациент для клика после 10 попыток')
          if (await skipBtn.isVisible().catch(() => false)) await skipBtn.click()
          break
        }
      } else if (stepTitle?.includes('Начните приём')) {
        let found = false
        for (let attempt = 0; attempt < 10; attempt++) {
          const startBtnEl = page.locator('[data-tour="new-consultation"]').first()
          if (await startBtnEl.isVisible().catch(() => false)) {
            await startBtnEl.click()
            await page.waitForTimeout(3000)
            ok(`Шаг ${i + 1}: клик на начать приём`)
            found = true
            break
          }
          await page.waitForTimeout(1000)
        }
        if (!found) {
          fail(`Шаг ${i + 1}`, 'кнопка начать приём не найдена после 10 попыток')
          if (await skipBtn.isVisible().catch(() => false)) await skipBtn.click()
          break
        }
      } else if (stepTitle?.includes('Откройте реперторий')) {
        const repBtn = page.locator('[data-tour="open-repertory"]').first()
        if (await repBtn.isVisible().catch(() => false)) {
          await repBtn.click()
          await page.waitForTimeout(2000)
          ok(`Шаг ${i + 1}: клик на реперторий`)
        } else {
          fail(`Шаг ${i + 1}`, 'кнопка реперторий не найдена')
          if (await skipBtn.isVisible().catch(() => false)) await skipBtn.click()
          break
        }
      } else {
        fail(`Шаг ${i + 1}`, `неизвестное ожидание: ${stepTitle}`)
        if (await skipBtn.isVisible().catch(() => false)) await skipBtn.click()
        break
      }
      continue
    }

    if (hasDaleeBtn) {
      const stepTitle = await page.locator('.text-lg').first().textContent().catch(() => '?')

      // Проверяем подсветку если есть
      const highlight = await page.locator('.tour-highlight').first().isVisible().catch(() => false)
      const highlightInfo = highlight ? ' (подсветка ✓)' : ''

      ok(`Шаг ${i + 1}: «${stepTitle}»${highlightInfo}`)
      await tourPanel.click()
      await page.waitForTimeout(800)
      stepNum = i + 1
      continue
    }

    // Ничего не видно — тур завершился или потерялся
    console.log(`  ⚠️ Шаг ${i + 1}: панель тура не найдена — тур завершён или потерян`)
    stepNum = i
    break
  }

  // ═══ Проверка data-tour атрибутов ═══
  console.log('\n🏷️ Проверка data-tour атрибутов...')

  // Вернёмся на дашборд для проверки
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(2000)

  const dashboardTours = ['stats', 'patient-list', 'questionnaire-btn']
  for (const attr of dashboardTours) {
    await check(`data-tour="${attr}" на дашборде`, async () => {
      const el = page.locator(`[data-tour="${attr}"]`).first()
      return await el.isVisible().catch(() => false)
    })
  }

  // Сайдбар
  const sidebarTours = ['nav-dashboard', 'nav-repertory', 'nav-settings', 'nav-referral']
  for (const attr of sidebarTours) {
    await check(`data-tour="${attr}" в сайдбаре`, async () => {
      const el = page.locator(`[data-tour="${attr}"]`).first()
      return await el.count() > 0
    })
  }

  // ═══ TourMenu ═══
  console.log('\n📚 TourMenu в сайдбаре...')
  await check('Кнопка «Обучение» видна', async () => {
    return await page.locator('text=Обучение').first().isVisible()
  })

  await page.click('text=Обучение')
  await page.waitForTimeout(500)

  await check('Меню открылось (6 блоков + полный тур)', async () => {
    const items = await page.locator('text=Знакомство с сервисом').count()
    return items > 0
  })

  // ═══ Итоги ═══
  console.log(`\n${'═'.repeat(50)}`)
  console.log(`📊 Результаты: ${passed} ✅ / ${failed} ❌ (шагов пройдено: ${stepNum})`)
  console.log(`${'═'.repeat(50)}\n`)

  await browser.close()
  process.exit(failed > 0 ? 1 : 0)
}

run().catch(err => {
  console.error('Ошибка:', err)
  process.exit(1)
})
