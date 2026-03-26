import Link from 'next/link'
import type { Metadata } from 'next'
import CheckoutButton from './CheckoutButton'
import Logo from '@/components/Logo'

export const metadata: Metadata = {
  title: 'Тарифы — Similia',
  description: 'Цены и тарифы сервиса Similia для гомеопатов',
}

function Check() {
  return (
    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function PricingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f3ed' }}>

      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: 'rgba(247,243,237,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={28} />
            <span className="heading-serif text-[22px] font-light" style={{ color: 'var(--sim-forest)', letterSpacing: '0.04em' }}>Similia</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="text-[14px] px-5 py-2.5 rounded-full transition-colors" style={{ color: '#8a7e6c' }}>Войти</Link>
            <Link href="/register" className="text-[14px] font-medium text-white px-6 py-2.5 rounded-full transition-all hover:shadow-lg" style={{ backgroundColor: 'var(--sim-green)' }}>Начать</Link>
          </nav>
        </div>
      </header>

      <main className="pt-32 pb-24">
        <div className="max-w-[1000px] mx-auto px-6">

          {/* Заголовок */}
          <div className="text-center mb-6">
            <p className="text-[13px] font-medium tracking-[0.15em] uppercase mb-4" style={{ color: 'var(--sim-green)' }}>Тарифы</p>
            <h1 className="heading-serif text-[clamp(36px,5vw,56px)] font-light leading-[1.1] mb-4" style={{ letterSpacing: '-0.02em', color: 'var(--sim-text)' }}>
              Без обязательств.
            </h1>
            <p className="text-[16px] max-w-[400px] mx-auto" style={{ color: '#8a7e6c' }}>
              Без карты, без обязательств. Перейдите на Стандарт когда будете готовы.
            </p>
          </div>

          {/* Баннер бета */}
          <div className="max-w-[600px] mx-auto mb-16 rounded-full px-6 py-3 text-center" style={{ backgroundColor: 'rgba(45,106,79,0.08)', border: '1px solid rgba(45,106,79,0.12)' }}>
            <p className="text-[13px] font-medium" style={{ color: 'var(--sim-green)' }}>
              Все пользователи получают Стандарт бесплатно до 31 мая 2026
            </p>
          </div>

          {/* Карточки */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-16">

            {/* Free */}
            <div className="rounded-xl p-8" style={{ backgroundColor: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <p className="text-[12px] font-medium tracking-[0.1em] uppercase mb-3" style={{ color: '#8a7e6c' }}>Базовый</p>
              <div className="mb-6">
                <span className="heading-serif text-[40px] font-light" style={{ color: 'var(--sim-text)' }}>0 ₽</span>
              </div>
              <ul className="space-y-3 mb-8">
                {['До 5 пациентов', 'Реперторий Кента', 'Карточки и консультации', 'Анкеты и опросы'].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-[14px]" style={{ color: 'var(--sim-text)' }}>
                    <Check />{f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block text-center text-[14px] font-medium py-3.5 rounded-full transition-all duration-200 text-[#2d6a4f] hover:bg-[#2d6a4f] hover:text-white" style={{ border: '1px solid #2d6a4f' }}>
                Зарегистрироваться
              </Link>
            </div>

            {/* Standard */}
            <div className="rounded-xl p-8 relative" style={{ backgroundColor: 'var(--sim-forest)', border: '1px solid rgba(45,106,79,0.4)' }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-semibold tracking-wide" style={{ backgroundColor: 'var(--sim-green)', color: 'white' }}>
                Рекомендуем
              </div>
              <p className="text-[12px] font-medium tracking-[0.1em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>Стандарт</p>
              <div className="mb-1">
                <span className="heading-serif text-[40px] font-light text-white">290 ₽</span>
                <span className="text-[14px] ml-1" style={{ color: 'rgba(255,255,255,0.4)' }}>/мес</span>
              </div>
              <p className="text-[12px] mb-6" style={{ color: 'rgba(255,255,255,0.5)' }}>или 2 900 ₽/год</p>
              <ul className="space-y-3 mb-8">
                {['Безлимит пациентов', 'Онлайн-запись', 'Экспорт в PDF', 'Напоминания', 'Поддержка по email'].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-[14px]" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    <span style={{ color: '#7dd4a8' }}><Check /></span>{f}
                  </li>
                ))}
              </ul>
              <div className="space-y-2">
                <CheckoutButton
                  period="monthly"
                  label="290 ₽/мес"
                  className="block w-full text-center py-3.5 rounded-full text-[14px] font-semibold transition-all hover:opacity-90"
                  style={{ backgroundColor: '#ffffff', color: 'var(--sim-forest)' }}
                />
                <CheckoutButton
                  period="yearly"
                  label="2 900 ₽/год"
                  className="block w-full text-center py-3.5 rounded-full text-[14px] font-medium transition-colors hover:bg-white/20"
                  style={{ color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.3)' }}
                />
              </div>
            </div>

            {/* AI Pro — футуристичная карточка */}
            <style>{`
              @keyframes aiGradientBorder { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
              @keyframes aiShimmerLine { 0%{left:-50%} 100%{left:150%} }
            `}</style>
            <div className="group relative rounded-2xl p-px transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_80px_rgba(99,102,241,0.2)]">
              <div className="absolute inset-0 rounded-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 25%, #a78bfa 50%, #6366f1 75%, #818cf8 100%)', backgroundSize: '300% 300%', animation: 'aiGradientBorder 4s ease infinite' }} />
              <div className="absolute -inset-1 rounded-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-700 blur-xl" style={{ background: 'linear-gradient(135deg, #6366f1, #a78bfa, #6366f1)' }} />
              <div className="relative rounded-2xl p-8 flex flex-col overflow-hidden" style={{ backgroundColor: '#0f0b2e' }}>
                <div className="absolute top-0 left-0 right-0 h-px overflow-hidden">
                  <div style={{ animation: 'aiShimmerLine 3s ease-in-out infinite', background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.6), transparent)', height: '1px', width: '50%', position: 'absolute' }} />
                </div>
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 50% at 80% 20%, rgba(99,102,241,0.12) 0%, transparent 70%)' }} />
                <div className="relative z-10 inline-flex items-center gap-1.5 self-start px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider mb-6" style={{ backgroundColor: 'rgba(99,102,241,0.15)', color: '#a78bfa', border: '1px solid rgba(99,102,241,0.2)' }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                  AI PRO
                </div>
                <div className="relative z-10 mb-1">
                  <span className="heading-serif text-[40px] font-light text-white">1 990 ₽</span>
                  <span className="text-[14px] text-white/40 ml-1">/мес</span>
                </div>
                <p className="relative z-10 text-[12px] text-white/40 mb-6">всё из Стандарта + AI-движок</p>
                <ul className="relative z-10 space-y-3 mb-8 flex-1">
                  {['Безлимит AI-консультаций', '8-линзовый MDRI-анализ', 'AI-гомеопат + арбитр', 'Персональные AI-анкеты', 'Рекомендация потенции'].map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-[14px] text-white/80">
                      <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="#a78bfa" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="relative z-10 space-y-2">
                  <CheckoutButton plan="ai_pro" period="monthly" label="1 990 ₽/мес" className="block w-full text-center py-3.5 rounded-full text-[14px] font-semibold text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:-translate-y-px" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' }} />
                  <CheckoutButton plan="ai_pro" period="yearly" label="19 900 ₽/год — выгоднее" className="block w-full text-center py-3.5 rounded-full text-[14px] font-medium transition-all duration-200 text-white/60 hover:text-white hover:bg-white/10" style={{ border: '1px solid rgba(129,140,248,0.2)' }} />
                </div>
              </div>
            </div>
          </div>

          {/* AI пакеты */}
          <div id="packages" className="max-w-[700px] mx-auto rounded-xl p-8" style={{ backgroundColor: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.04)' }}>
            <div className="text-center mb-6">
              <h2 className="heading-serif text-[24px] font-light mb-2" style={{ color: 'var(--sim-text)' }}>
                Пакеты AI-консультаций
              </h2>
              <p className="text-[14px]" style={{ color: '#8a7e6c' }}>
                Без подписки на AI Pro
              </p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[
                { count: 5, price: 299, per: '60 ₽/шт', plan: 'ai_pack_5' as const },
                { count: 15, price: 749, per: '50 ₽/шт', plan: 'ai_pack_15' as const },
                { count: 50, price: 1990, per: '40 ₽/шт', plan: 'ai_pack_50' as const },
              ].map(pkg => (
                <div key={pkg.count} className="text-center">
                  <p className="heading-serif text-[28px] font-light mb-0.5" style={{ color: 'var(--sim-green)' }}>{pkg.count}</p>
                  <p className="text-[12px] mb-3" style={{ color: '#8a7e6c' }}>{pkg.per}</p>
                  <CheckoutButton
                    plan={pkg.plan}
                    label={`${pkg.price} ₽`}
                    className="w-full text-[13px] font-medium py-2.5 rounded-full transition-colors text-[#2d6a4f] hover:bg-[#2d6a4f] hover:text-white"
                    style={{ border: '1px solid rgba(45,106,79,0.2)' }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Реферал */}
          <div className="max-w-[500px] mx-auto mt-8 text-center">
            <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--sim-green)' }}>
              Приведи коллегу — получи +7 дней
            </p>
            <p className="text-[13px]" style={{ color: '#8a7e6c' }}>
              <Link href="/referral" className="underline underline-offset-2">Реферальная программа</Link>
            </p>
          </div>

          <div className="text-center mt-12 space-y-3">
            <p className="text-[13px]" style={{ color: '#8a7e6c' }}>
              Уже есть аккаунт? <Link href="/login" className="underline underline-offset-2" style={{ color: 'var(--sim-green)' }}>Войти</Link>
            </p>
            <div className="flex items-center justify-center gap-2 text-[12px]" style={{ color: 'var(--sim-text-muted)' }}>
              <span>Данные в России</span>
              <span style={{ opacity: 0.3 }}>·</span>
              <span>152-ФЗ</span>
              <span style={{ opacity: 0.3 }}>·</span>
              <span>Шифрование</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
