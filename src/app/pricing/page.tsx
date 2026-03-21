import Link from 'next/link'
import type { Metadata } from 'next'
import CheckoutButton from './CheckoutButton'

export const metadata: Metadata = {
  title: 'Тарифы — Similia',
  description: 'Цены и тарифы сервиса Similia для гомеопатов',
}

const CHECK = (
  <svg className="w-5 h-5 shrink-0" style={{ color: 'var(--sim-green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
)

const LOCK = (
  <svg className="w-5 h-5 shrink-0" style={{ color: 'var(--sim-text-hint)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
  </svg>
)

function Feature({ text, included, dark }: { text: string; included: boolean; dark?: boolean }) {
  const checkIcon = dark
    ? <svg className="w-5 h-5 shrink-0" style={{ color: '#7dd4a8' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
    : CHECK
  const lockIcon = dark
    ? <svg className="w-5 h-5 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>
    : LOCK
  return (
    <li className="flex items-start gap-3">
      {included ? checkIcon : lockIcon}
      <span className="text-sm" style={{ color: dark ? (included ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)') : (included ? '#1a1a0a' : '#9a8a6a') }}>{text}</span>
    </li>
  )
}

export default function PricingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0ebe3' }}>
      <header className="border-b" style={{ backgroundColor: 'rgba(247,243,237,0.92)', backdropFilter: 'blur(12px)', borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <svg width={24} height={24} viewBox="0 0 36 36" fill="none" aria-hidden="true">
              <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#2d6a4f" opacity="0.9" />
              <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#1a3020" opacity="0.65" />
            </svg>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '18px', fontWeight: 500, color: 'var(--sim-forest)' }}>Similia</span>
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-5xl font-light mb-4" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-forest)' }}>
            Простые тарифы
          </h1>
          <p className="text-sm sm:text-base max-w-md mx-auto" style={{ color: 'var(--sim-text-sec)' }}>
            Начните бесплатно — перейдите на Стандарт когда понадобится больше
          </p>
        </div>

        <div className="max-w-3xl mx-auto mb-8 rounded-xl px-5 py-4 text-center" style={{ backgroundColor: 'rgba(45,106,79,0.08)', border: '1px solid rgba(45,106,79,0.15)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--sim-green)' }}>
            🎁 Все зарегистрированные пользователи получают тариф Стандарт бесплатно до 31 мая 2026
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {/* Free */}
          <div className="rounded-2xl p-6" style={{ backgroundColor: 'white', border: '1px solid var(--sim-border)' }}>
            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--sim-text-hint)' }}>Бесплатный</p>
            <p className="text-3xl font-light mb-1" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-forest)' }}>0 ₽</p>
            <p className="text-xs mb-6" style={{ color: 'var(--sim-text-hint)' }}>навсегда</p>

            <ul className="space-y-3 mb-8">
              <Feature text="До 3 пациентов" included />
              <Feature text="Реперторий (74 000+ рубрик)" included />
              <Feature text="Карточки и консультации" included />
              <Feature text="Демо-пациенты для обучения" included />
              <Feature text="Онлайн-запись" included={false} />
              <Feature text="Экспорт в PDF" included={false} />
              <Feature text="AI-анализ" included={false} />
            </ul>

            <Link
              href="/register"
              className="block w-full text-center py-3 rounded-xl text-sm font-semibold transition-colors"
              style={{ border: '1px solid var(--sim-border)', color: 'var(--sim-forest)' }}
            >
              Начать бесплатно
            </Link>
          </div>

          {/* Standard */}
          <div className="rounded-2xl p-6 relative" style={{ backgroundColor: 'var(--sim-forest)', border: '2px solid #2d6a4f' }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--sim-amber)', color: 'var(--sim-forest)' }}>
              Рекомендуем
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Стандарт</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-light" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'white' }}>490 ₽</span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>/мес</span>
            </div>
            <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>или 4 900 ₽/год (−17%)</p>

            <ul className="space-y-3 mb-8">
              <Feature text="Безлимит пациентов" included dark />
              <Feature text="Реперторий (74 000+ рубрик)" included dark />
              <Feature text="Онлайн-запись" included dark />
              <Feature text="Экспорт в PDF" included dark />
              <Feature text="Напоминания о визитах" included dark />
              <Feature text="Поддержка по email" included dark />
              <Feature text="AI-анализ" included={false} dark />
            </ul>

            <div className="space-y-2">
              <CheckoutButton
                period="monthly"
                label="490 ₽/мес"
                className="block w-full text-center py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--sim-amber)', color: 'var(--sim-forest)' }}
              />
              <CheckoutButton
                period="yearly"
                label="4 900 ₽/год (−17%)"
                className="block w-full text-center py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'rgba(200,160,53,0.15)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(200,160,53,0.3)' }}
              />
            </div>
          </div>

          {/* AI Pro */}
          <div className="rounded-2xl p-6 relative" style={{ backgroundColor: '#1e1b4b', border: '2px solid #6366f1' }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#6366f1', color: 'white' }}>
              ✨ AI
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(165,160,255,0.6)' }}>AI Pro</p>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-3xl font-light" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'white' }}>1 990 ₽</span>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>/мес</span>
            </div>
            <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.35)' }}>включает всё из Стандарта</p>

            <ul className="space-y-3 mb-8">
              <Feature text="Всё из Стандарта" included dark />
              <Feature text="Безлимит AI-консультаций" included dark />
              <Feature text="8-линзовый MDRI-анализ" included dark />
              <Feature text="AI-гомеопат + арбитр" included dark />
              <Feature text="Персональные AI-анкеты" included dark />
              <Feature text="Рекомендация потенции" included dark />
              <Feature text="Приоритетная поддержка" included dark />
            </ul>

            <div className="space-y-2">
              <CheckoutButton
                plan="ai_pro"
                period="monthly"
                label="1 990 ₽/мес"
                className="block w-full text-center py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#6366f1', color: 'white' }}
              />
              <CheckoutButton
                plan="ai_pro"
                period="yearly"
                label="19 900 ₽/год (−17%)"
                className="block w-full text-center py-3 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(99,102,241,0.3)' }}
              />
            </div>
          </div>
        </div>

        {/* Пакеты AI-консультаций */}
        <div id="packages" className="max-w-3xl mx-auto mt-12 rounded-2xl p-6 sm:p-8" style={{ backgroundColor: 'white', border: '1px solid rgba(99,102,241,0.15)' }}>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-light mb-2" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: '#1e1b4b' }}>
              Пакеты AI-консультаций
            </h2>
            <p className="text-sm" style={{ color: 'var(--sim-text-sec)' }}>
              Для тарифов Бесплатный и Стандарт — без подписки на AI Pro
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { count: 5, price: 299, per: '60 ₽/шт', plan: 'ai_pack_5' as const },
              { count: 15, price: 749, per: '50 ₽/шт', plan: 'ai_pack_15' as const },
              { count: 50, price: 1990, per: '40 ₽/шт', plan: 'ai_pack_50' as const },
            ].map(pkg => (
              <div key={pkg.count} className="rounded-xl p-4 text-center" style={{ border: '1px solid rgba(99,102,241,0.15)', backgroundColor: 'rgba(99,102,241,0.03)' }}>
                <p className="text-2xl font-bold mb-1" style={{ color: '#6366f1' }}>{pkg.count}</p>
                <p className="text-xs text-gray-500 mb-3">{pkg.per}</p>
                <CheckoutButton
                  plan={pkg.plan}
                  label={`${pkg.price} ₽`}
                  className="w-full text-xs font-semibold py-2 rounded-lg transition-colors"
                  style={{ backgroundColor: 'rgba(99,102,241,0.1)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.2)' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Реферальная программа */}
        <div className="max-w-3xl mx-auto mt-8 rounded-2xl p-6 text-center" style={{ backgroundColor: 'rgba(45,106,79,0.06)', border: '1px solid rgba(45,106,79,0.12)' }}>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--sim-green)' }}>
            🎁 Приведи коллегу — получи бонус
          </p>
          <p className="text-xs" style={{ color: 'var(--sim-text-sec)' }}>
            +5 дней Стандарта + 1 бесплатная AI-консультация за каждого оплатившего реферала
          </p>
        </div>

        <div className="text-center mt-10">
          <p className="text-xs" style={{ color: 'var(--sim-text-hint)' }}>
            Уже есть аккаунт? <Link href="/login" className="underline" style={{ color: 'var(--sim-green)' }}>Войти</Link>
          </p>
        </div>
      </main>
    </div>
  )
}
