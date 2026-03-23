'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export const TOUR_BLOCKS = [
  { id: 'intro', emoji: '🏠', label: 'Знакомство с сервисом', startStep: 0, endStep: 2 },
  { id: 'patient', emoji: '👤', label: 'Работа с пациентом', startStep: 3, endStep: 7 },
  { id: 'consultation', emoji: '🩺', label: 'Консультация', startStep: 8, endStep: 16 },
  { id: 'after', emoji: '💊', label: 'После приёма', startStep: 17, endStep: 20 },
  { id: 'repertory', emoji: '📖', label: 'Полный реперторий', startStep: 21, endStep: 24 },
  { id: 'settings', emoji: '⚙️', label: 'Настройки и тарифы', startStep: 25, endStep: 31 },
] as const

type TourStep = {
  page: string | RegExp       // на какой странице показывать
  navigateTo?: string         // куда перейти перед показом
  emoji: string
  title: string
  body: string
  highlight?: string          // data-tour="xxx"
  waitForClick?: string       // ждать клика на элемент
  position?: 'center' | 'bottom-right' | 'bottom-left' | 'top-right'
}

const STEPS: TourStep[] = [
  // ── Блок 1: Знакомство (0-2) ──
  { page: '/dashboard', emoji: '👋', title: 'Добро пожаловать в Similia!', body: 'Это ваш цифровой кабинет гомеопата. Карточки пациентов, консультации, реперторий Кента — всё в одном месте.\n\nДавайте пройдёмся по основным функциям.', position: 'center' },
  { page: '/dashboard', emoji: '📊', title: 'Ваш рабочий стол', body: 'Дашборд — ваше утро. Вверху — приёмы на сегодня, пациенты, кто без назначения. Внизу — список пациентов с поиском.', highlight: 'stats' },
  { page: '/dashboard', emoji: '🧭', title: 'Навигация', body: 'Слева — меню: дашборд, реперторий, настройки, рефералы. Внизу — кнопка «Обучение» для повтора любого блока.', highlight: 'nav-dashboard' },

  // ── Блок 2: Пациент (3-7) ──
  { page: '/dashboard', emoji: '👤', title: 'Откройте демо-пациента', body: 'Нажмите на любого пациента в списке — откроется его карточка.', highlight: 'patient-list', waitForClick: 'patient-list' },
  { page: /^\/patients\/[^/]+$/, emoji: '📋', title: 'Карточка пациента', body: 'Вся информация: текущее лечение, динамика, анкеты, история. Кнопки PDF и Редактировать — справа вверху.', highlight: 'patient-hero' },
  { page: /^\/patients\/[^/]+$/, emoji: '📨', title: 'Действия с пациентом', body: 'Три кнопки:\n• Анкета — первичная или для острого случая\n• Запланировать — запись на приём\n• Подробный опросник — перед повторным визитом\n\nКаждая создаёт ссылку для пациента.', highlight: 'action-buttons' },
  { page: /^\/patients\/[^/]+$/, emoji: '📝', title: 'Куда попадают данные', body: '• Первичная и острая анкета → раздел «Анкеты пациента» внизу карточки\n• Опросник перед визитом → правая панель консультации\n\nВрач видит ответы пациента до начала приёма.' },
  { page: '/dashboard', navigateTo: '/dashboard', emoji: '➕', title: 'Как добавить пациента', body: 'Три способа:\n• «Первичная анкета» — ссылка новому пациенту\n• «Из базы» — опросник существующему\n• «Добавить вручную» — создать карточку', highlight: 'questionnaire-btn' },

  // ── Блок 3: Консультация (8-15) ──
  { page: '/dashboard', emoji: '🩺', title: 'Откройте пациента', body: 'Нажмите на любого демо-пациента.', highlight: 'patient-list', waitForClick: 'patient-list' },
  { page: /^\/patients\/[^/]+$/, emoji: '🩺', title: 'Начните приём', body: 'Нажмите «Начать повторный приём».', highlight: 'new-consultation', waitForClick: 'new-consultation' },
  { page: /\/consultations\//, emoji: '📝', title: 'Консультация', body: 'Слева — жалобы, модальности, психика. Справа — контекст и ответы опросника.\n\nДанные сохраняются автоматически каждые 2 секунды.' },
  { page: /\/consultations\//, emoji: '✍️', title: 'Поля для записи', body: 'Основная жалоба, с чего началось, хуже от, лучше от, психика и эмоции, общие симптомы. Заполняйте то что рассказывает пациент.', highlight: 'complaints' },
  { page: /\/consultations\//, emoji: '🔄', title: 'Хронический / Острый', body: 'Эта кнопка переключает тип консультации. Хронический — для повторных визитов. Острый — для острого случая (другие поля, другой цвет).', highlight: 'type-toggle' },
  { page: /\/consultations\//, emoji: '📖', title: 'Откройте реперторий', body: 'Нажмите «Реперторий» на панели инструментов.', highlight: 'open-repertory', waitForClick: 'open-repertory' },
  { page: /\/consultations\//, emoji: '🔍', title: 'Мини-реперторий', body: 'Ищите на русском или английском. Нажмите + чтобы добавить рубрику в анализ. Добавьте 3-5 рубрик → появится топ препаратов.', highlight: 'mini-search' },
  { page: /\/consultations\//, emoji: '📊', title: 'Анализ и вес', body: 'Кнопки E, 1, 2, 3 — вес рубрики и элиминация. Чем больше вес — тем важнее симптом при подборе. Нажмите на препарат → назначить.', highlight: 'mini-analysis' },
  { page: /\/consultations\//, emoji: '💊', title: 'Назначение', body: 'Препарат, потенция (6C–10M, LM), дозировка, форма приёма. Всё сохраняется автоматически.', highlight: 'inline-rx' },

  // ── Блок 4: После приёма (15-18) ──
  { page: /\/consultations\//, emoji: '✅', title: 'Завершение', body: 'Прокрутите вниз и нажмите «Завершить». Появится экран с кнопкой «Отправить назначение пациенту» — с правилами приёма.', highlight: 'finish-btn' },
  { page: /\/consultations\//, emoji: '📩', title: 'Назначение пациенту', body: 'Пациент получит ссылку с: препарат, потенция, дозировка + правила (кофе, мята, камфора). Правила настраиваются в Настройках.' },
  { page: /\/consultations\//, emoji: '📅', title: 'Запись на визит', body: 'На карточке пациента кнопка «Запланировать» — выберите дату и время. Приём появится в календаре на дашборде.' },
  { page: /^\/patients\/[^/]+$/, navigateTo: 'back-to-patient', emoji: '📋', title: 'Опросник перед визитом', body: 'Через 2-3 недели отправьте подробный опросник: реакция на препарат, динамика, сон, аппетит. Ответы появятся в правой панели следующей консультации.', highlight: 'intake-link' },

  // ── Блок 5: Полный реперторий (19-22) ──
  { page: /^\/patients\/[^/]+$/, emoji: '📖', title: 'Полный реперторий', body: 'В меню слева «Реперторий» — полная версия с 74 000+ рубриками. Поиск на русском и английском, фильтр по главам.', highlight: 'nav-repertory' },
  { page: /^\/patients\/[^/]+$/, emoji: '🔤', title: 'Поиск', body: 'Введите симптом — «головная боль» или «headache». Русский стемминг найдёт все формы слова.' },
  { page: /^\/patients\/[^/]+$/, emoji: '🎓', title: 'Грейды', body: 'Каждый препарат имеет грейд:\n• Жирный (3) — хорошо подтверждён\n• Курсив (2) — подтверждён\n• Обычный (1) — упоминается' },
  { page: /^\/patients\/[^/]+$/, emoji: '⚖️', title: 'Вес и элиминация', body: 'Добавляйте рубрики, ставьте вес (1-3). Элиминация оставит только препараты во ВСЕХ рубриках.' },

  // ── Блок 6: Настройки (23-29) ──
  { page: /\/settings/, navigateTo: '/settings', emoji: '⚙️', title: 'Настройки', body: 'Расписание приёмов, напоминания, правила приёма, учёт оплат.', highlight: 'nav-settings' },
  { page: /\/settings/, emoji: '📅', title: 'Расписание', body: 'Рабочие дни, время, длительность, перерыв. Пациенты увидят свободные слоты при записи.' },
  { page: /\/settings/, emoji: '💊', title: 'Правила приёма', body: 'Текст который пациент видит с назначением. Исключить кофе, мяту, камфору. Можно редактировать.' },
  { page: /\/referral/, navigateTo: '/referral', emoji: '🤝', title: 'Реферальная программа', body: 'Ваша уникальная ссылка. Отправьте коллеге → он оплатит → вам +7 дней, ему +14 дней Стандарта.', highlight: 'nav-referral' },
  { page: /\/referral/, emoji: '💰', title: 'Тарифы', body: 'Бесплатно: до 5 пациентов.\nСтандарт: 290 ₽/мес — безлимит, PDF, запись, напоминания.\n\nБета-тестеры: Стандарт бесплатно до 31 мая 2026.' },
  { page: /\/referral/, emoji: '📜', title: 'Документы', body: 'Оферта и Политика конфиденциальности — в меню внизу. Данные в России (152-ФЗ). Поддержка: simillia@mail.ru' },
  { page: /\/referral/, emoji: '✅', title: 'Вы готовы!', body: 'Вы знаете основы Similia:\n✓ Карточка и анкеты\n✓ Консультация и автосохранение\n✓ Реперторий и анализ\n✓ Назначение пациенту\n✓ Запись и опросы\n✓ Настройки и тарифы\n\nОбучение — кнопка в сайдбаре.', position: 'center' },
]

const STORAGE_KEY = 'onboarding_step'
const TOTAL = STEPS.length

export default function InteractiveTour() {
  const [step, setStep] = useState<number>(-1)
  const [visible, setVisible] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved !== null) {
      const n = parseInt(saved, 10)
      if (n >= 0 && n < TOTAL) setStep(n)
    }
  }, [])

  // Навигация при смене шага
  useEffect(() => {
    if (step < 0 || step >= TOTAL) return
    const cfg = STEPS[step]
    if (cfg.navigateTo === 'back-to-patient') {
      // Вернуться на карточку пациента из консультации
      const match = pathname.match(/\/patients\/([^/]+)/)
      if (match && pathname.includes('/consultations/')) {
        router.push(`/patients/${match[1]}`)
      }
    } else if (cfg.navigateTo && !pathname.startsWith(cfg.navigateTo)) {
      router.push(cfg.navigateTo)
    }
  }, [step])

  // Видимость
  useEffect(() => {
    if (step < 0 || step >= TOTAL) { setVisible(false); return }
    const cfg = STEPS[step]
    const match = cfg.page instanceof RegExp ? cfg.page.test(pathname) : pathname === cfg.page
    // Показываем на любой авторизованной странице (тур — глобальный)
    const isAuth = ['/dashboard', '/patients', '/repertory', '/settings', '/referral'].some(p => pathname.startsWith(p))
    setVisible(match || isAuth)
  }, [step, pathname])

  // Подсветка + скролл
  useEffect(() => {
    document.querySelectorAll('.tour-highlight').forEach(e => e.classList.remove('tour-highlight'))
    if (!visible || step < 0 || step >= TOTAL) return
    const cfg = STEPS[step]
    if (!cfg.highlight) return
    // Пробуем найти элемент с несколькими попытками (страница может грузиться)
    let attempt = 0
    const maxAttempts = 5
    const tryHighlight = () => {
      const el = document.querySelector(`[data-tour="${cfg.highlight}"]`)
      if (el) {
        el.classList.add('tour-highlight')
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      } else if (attempt < maxAttempts) {
        attempt++
        setTimeout(tryHighlight, 800)
      }
    }
    const timer = setTimeout(tryHighlight, 600)
    return () => clearTimeout(timer)
  }, [step, visible])

  // Клик
  useEffect(() => {
    if (!visible || step < 0 || step >= TOTAL) return
    const cfg = STEPS[step]
    if (!cfg.waitForClick) return
    function onClick(e: Event) {
      const t = e.target as HTMLElement
      if (t.closest(`[data-tour="${cfg.waitForClick}"]`)) goNext()
    }
    const timer = setTimeout(() => document.addEventListener('click', onClick, true), 500)
    return () => { clearTimeout(timer); document.removeEventListener('click', onClick, true) }
  }, [step, visible])

  const goNext = useCallback(() => {
    document.querySelectorAll('.tour-highlight').forEach(e => e.classList.remove('tour-highlight'))
    const next = step + 1
    if (next >= TOTAL) {
      localStorage.removeItem(STORAGE_KEY)
      localStorage.setItem('site_tour_done', '1')
      setStep(-1)
      return
    }
    localStorage.setItem(STORAGE_KEY, String(next))
    setStep(next)
  }, [step])

  const goBack = useCallback(() => {
    if (step <= 0) return
    document.querySelectorAll('.tour-highlight').forEach(e => e.classList.remove('tour-highlight'))
    localStorage.setItem(STORAGE_KEY, String(step - 1))
    setStep(step - 1)
  }, [step])

  const skipTour = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.setItem('site_tour_done', '1')
    localStorage.setItem('welcome_shown', '1')
    setStep(-1)
    document.querySelectorAll('.tour-highlight').forEach(e => e.classList.remove('tour-highlight'))
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape' && visible) skipTour() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, skipTour])

  if (!visible || step < 0 || step >= TOTAL) return null

  const cfg = STEPS[step]
  const isLast = step === TOTAL - 1
  const isWaiting = !!cfg.waitForClick
  const progress = ((step + 1) / TOTAL) * 100
  const block = TOUR_BLOCKS.find(b => step >= b.startStep && step <= b.endStep)

  const pos = cfg.position === 'center'
    ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
    : cfg.position === 'bottom-left' ? 'bottom-6 left-6'
    : cfg.position === 'top-right' ? 'top-20 right-6'
    : 'bottom-6 right-6'

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-[9998] h-1" style={{ backgroundColor: 'rgba(45,106,79,0.15)' }}>
        <div className="h-1 transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: 'var(--sim-green)' }} />
      </div>
      <div className="fixed inset-0 z-[9990] pointer-events-none" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }} />
      <div className={`fixed z-[9999] w-[360px] max-w-[calc(100vw-2rem)] ${pos}`} style={{ animation: 'tourSlideIn 0.3s ease both' }}>
        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--sim-bg)', border: '1px solid var(--sim-border)', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
          <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: 'var(--sim-forest)' }}>
            <div className="flex items-center gap-2">
              <span className="text-base">{cfg.emoji}</span>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{block?.label} · {step + 1}/{TOTAL}</span>
            </div>
            <button onClick={skipTour} className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Пропустить ✕</button>
          </div>
          <div className="px-5 py-4">
            <h3 className="text-lg mb-2" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-forest)' }}>{cfg.title}</h3>
            <p className="text-sm leading-relaxed whitespace-pre-line" style={{ color: 'var(--sim-text-sec)' }}>{cfg.body}</p>
            {isWaiting && (
              <p className="text-xs mt-3 flex items-center gap-1.5" style={{ color: 'var(--sim-amber)' }}>
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--sim-amber)' }} />
                Выполните действие для продолжения
              </p>
            )}
          </div>
          <div className="px-5 pb-4 flex items-center justify-between">
            <div>{step > 0 && <button onClick={goBack} className="text-sm" style={{ color: 'var(--sim-text-hint)' }}>← Назад</button>}</div>
            {!isWaiting && <button onClick={goNext} className="px-5 py-2 rounded-2xl text-sm font-medium text-white hover:opacity-90 transition-all" style={{ backgroundColor: 'var(--sim-green)' }}>{isLast ? 'Завершить ✓' : 'Далее →'}</button>}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes tourSlideIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .tour-highlight { position: relative; z-index: 9995 !important; box-shadow: 0 0 0 4px rgba(220,38,38,0.6), 0 0 20px rgba(220,38,38,0.2) !important; border-radius: 12px; animation: tourPulse 1.5s ease-in-out infinite; }
        @keyframes tourPulse { 0%, 100% { box-shadow: 0 0 0 4px rgba(220,38,38,0.6), 0 0 20px rgba(220,38,38,0.2); } 50% { box-shadow: 0 0 0 6px rgba(220,38,38,0.4), 0 0 30px rgba(220,38,38,0.15); } }
      `}</style>
    </>
  )
}

export function startTourFromStep(step: number) {
  localStorage.setItem(STORAGE_KEY, String(step))
  const cfg = STEPS[step]
  if (cfg?.navigateTo && cfg.navigateTo !== 'back-to-patient') {
    window.location.href = cfg.navigateTo
  } else {
    window.location.href = '/dashboard'
  }
}

export function startFullTour() {
  localStorage.removeItem('welcome_shown')
  localStorage.setItem(STORAGE_KEY, '0')
  window.location.href = '/dashboard'
}
