import Link from 'next/link'
import { Suspense } from 'react'
import RefCookieSetter from '@/components/RefCookieSetter'

// ─── Логотип ───
const Logo = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#2d6a4f" opacity="0.9" />
    <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#1a3020" opacity="0.65" />
    <path d="M18 8 Q18 18 18 28" stroke="#1a3020" strokeWidth="0.8" strokeLinecap="round" />
  </svg>
)

// ─── Иконка стрелка ───
const ArrowIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
  </svg>
)

// ─── Иконка галочка ───
const CheckIcon = () => (
  <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="#2d6a4f" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

export default function LandingPage() {
  return (
    <div className="landing-root">
      <Suspense><RefCookieSetter /></Suspense>

      {/* Скип-линк для accessibility */}
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-white focus:shadow-lg focus:text-sm" style={{ color: '#2d6a4f' }}>
        Перейти к содержимому
      </a>

      <style>{`
        .landing-root {
          background-color: #f7f3ed;
          color: #1a1a0a;
          font-family: var(--font-geist-sans, 'Geist', -apple-system, sans-serif);
          overflow-x: hidden;
        }

        .lr-serif {
          font-family: 'Cormorant Garamond', Georgia, serif;
        }

        /* Анимации */
        @keyframes lr-reveal {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lr-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lr-ai-border { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes aiShimmerLine { 0%{left:-50%} 100%{left:150%} }

        .lr-reveal { animation: lr-reveal 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .lr-delay-1 { animation-delay: 0.1s; }
        .lr-delay-2 { animation-delay: 0.2s; }
        .lr-delay-3 { animation-delay: 0.35s; }
        .lr-delay-4 { animation-delay: 0.5s; }
        .lr-fade { animation: lr-fade 1s 0.4s ease both; }
      `}</style>

      {/* ═══ Навбар ═══ */}
      <header className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: 'rgba(247,243,237,0.85)', backdropFilter: 'blur(20px) saturate(1.8)', WebkitBackdropFilter: 'blur(20px) saturate(1.8)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={28} />
            <span className="lr-serif text-[22px] font-light" style={{ color: '#1a3020', letterSpacing: '0.04em' }}>Similia</span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link href="/demo" className="hidden sm:inline-flex px-4 py-2 rounded-full text-[14px] transition-colors" style={{ color: '#8a7e6c' }}>AI-демо</Link>
            <Link href="/pricing" className="hidden sm:inline-flex px-4 py-2 rounded-full text-[14px] transition-colors" style={{ color: '#8a7e6c' }}>Тарифы</Link>
            <Link href="/login" className="px-4 py-2 rounded-full text-[14px] transition-colors" style={{ color: '#8a7e6c' }}>Войти</Link>
            <Link href="/register" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-[14px] font-medium text-white transition-all hover:shadow-lg hover:-translate-y-px" style={{ backgroundColor: '#2d6a4f' }}>
              Начать
            </Link>
          </nav>
        </div>
      </header>

      <main id="main">

      {/* ═══ Hero ═══ */}
      <section className="min-h-[100vh] flex flex-col justify-center relative pt-16">
        <div className="max-w-[1200px] mx-auto px-6 w-full">
          <div className="max-w-[720px]">

            <p className="lr-reveal text-[11px] font-medium tracking-[0.2em] uppercase mb-8" style={{ color: '#2d6a4f' }}>
              Цифровой кабинет гомеопата
            </p>

            <h1 className="lr-reveal lr-delay-1 lr-serif text-[clamp(42px,6vw,80px)] font-light leading-[1.05] mb-8" style={{ letterSpacing: '-0.03em' }}>
              Думайте<br />
              о пациенте.
            </h1>

            <p className="lr-reveal lr-delay-2 text-[18px] leading-[1.7] mb-12" style={{ color: '#8a7e6c', maxWidth: '480px' }}>
              Карточки, реперторий Кента, анкеты, назначения&nbsp;— всё в одном месте. Автосохранение, пока вы работаете.
            </p>

            <div className="lr-reveal lr-delay-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6">
              <Link href="/register" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-[14px] font-medium text-white transition-all hover:shadow-[0_12px_40px_rgba(45,106,79,0.3)] hover:-translate-y-0.5" style={{ backgroundColor: '#2d6a4f' }}>
                Начать работу
                <ArrowIcon />
              </Link>
              <Link href="/login" className="px-6 py-3.5 rounded-full text-[14px] transition-colors hover:text-[#1a1a0a]" style={{ color: '#8a7e6c' }}>
                Уже есть аккаунт
              </Link>
            </div>

            <p className="lr-reveal lr-delay-4 text-[12px] tracking-wide" style={{ color: '#8a7e6c', opacity: 0.6 }}>
              Без карты · Регистрация за минуту · Данные в России
            </p>
          </div>
        </div>

        {/* Декоративный градиент */}
        <div aria-hidden="true" className="lr-fade absolute top-0 right-0 w-[50vw] h-full pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 70% 40%, rgba(45,106,79,0.12) 0%, transparent 70%)' }} />
      </section>

      {/* ═══ Метрики ═══ */}
      <section className="py-24 sm:py-32">
        <div className="max-w-[900px] mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-16 sm:gap-8 text-center">
            {[
              { num: '74 482', label: 'рубрики', sub: 'Repertorium Publicum' },
              { num: '2 сек', label: 'автосохранение', sub: 'Без кнопки «Сохранить»' },
              { num: '0 ₽', label: 'бесплатный старт', sub: 'До 5 пациентов навсегда' },
            ].map((item, i) => (
              <div key={i}>
                <div className="lr-serif text-[clamp(48px,8vw,72px)] font-light leading-none" style={{ color: '#2d6a4f', letterSpacing: '-0.03em' }}>
                  {item.num}
                </div>
                <p className="text-[15px] font-medium mt-3" style={{ color: '#1a1a0a' }}>{item.label}</p>
                <p className="text-[13px] mt-1" style={{ color: '#8a7e6c' }}>{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Возможности ═══ */}
      <section className="py-24 sm:py-32">
        <div className="max-w-[1200px] mx-auto px-6">

          <p className="text-[11px] font-medium tracking-[0.2em] uppercase mb-4" style={{ color: '#2d6a4f' }}>
            Возможности
          </p>
          <h2 className="lr-serif text-[clamp(32px,4vw,56px)] font-light leading-[1.1] mb-20" style={{ letterSpacing: '-0.02em', maxWidth: '600px' }}>
            Всё что нужно.<br />
            Ничего лишнего.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                num: '01',
                title: 'Реперторий Кента',
                desc: '74 482 рубрики. Поиск на русском и латыни. Грейды, вес, элиминация — как в настольном софте, но в браузере.',
              },
              {
                num: '02',
                title: 'Карточки пациентов',
                desc: 'Жалобы, назначения, динамика — вся история в одном месте. Откройте карточку и сразу увидите полную картину.',
              },
              {
                num: '03',
                title: 'Анкета до приёма',
                desc: 'Отправьте ссылку — пациент заполнит дома за 15 минут. На приёме вы уже знаете жалобы, модальности, психику.',
              },
              {
                num: '04',
                title: 'Динамика лечения',
                desc: 'Опрос самочувствия после приёма. Пациент отвечает за 2 минуты. Вы видите прогресс без звонков.',
              },
            ].map((f, i) => (
              <div key={i} className="p-10 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)]" style={{ backgroundColor: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.04)' }}>
                <div className="text-[11px] font-medium tracking-[0.15em] uppercase mb-6" style={{ color: '#2d6a4f' }}>
                  {f.num}
                </div>
                <h3 className="text-[18px] font-medium mb-3" style={{ color: '#1a1a0a' }}>{f.title}</h3>
                <p className="text-[15px] leading-[1.7]" style={{ color: '#8a7e6c' }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Цитата ═══ */}
      <section className="py-24 sm:py-32">
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <blockquote className="lr-serif text-[clamp(28px,4vw,44px)] font-light leading-[1.3] italic" style={{ letterSpacing: '-0.01em', color: '#1a1a0a' }}>
            «Similia similibus curantur»
          </blockquote>
          <p className="text-[14px] mt-6" style={{ color: '#8a7e6c' }}>
            Подобное лечится подобным — Ганеман, 1796
          </p>
          <p className="text-[15px] mt-8 leading-[1.7] max-w-[520px] mx-auto" style={{ color: '#8a7e6c' }}>
            Мы создали инструмент, который следует этому принципу: простой, точный, созданный для врача-гомеопата.
          </p>
        </div>
      </section>

      {/* ═══ AI секция ═══ */}
      <section className="py-24 sm:py-32" style={{ backgroundColor: '#1a3020' }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[11px] font-medium tracking-[0.2em] uppercase mb-4" style={{ color: 'rgba(255,255,255,0.5)' }}>
                AI-ассистент
              </p>
              <h2 className="lr-serif text-[clamp(32px,4vw,52px)] font-light text-white leading-[1.1] mb-6" style={{ letterSpacing: '-0.02em' }}>
                Консенсус<br />трёх моделей.
              </h2>
              <p className="text-[16px] leading-[1.7] mb-8" style={{ color: 'rgba(255,255,255,0.6)' }}>
                MDRI Engine анализирует случай через 8 линз: Kent, Polarity, Hierarchy, Constellation, Negative, Miasm, Relationships, Potency. Параллельно работает AI-гомеопат. При разногласии — арбитраж.
              </p>
              <div className="flex items-center gap-8 mb-10">
                <div>
                  <div className="lr-serif text-[40px] font-light text-white">76%</div>
                  <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>top-1 точность</p>
                </div>
                <div style={{ width: '1px', height: '40px', backgroundColor: 'rgba(255,255,255,0.15)' }} />
                <div>
                  <div className="lr-serif text-[40px] font-light text-white">94%</div>
                  <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.5)' }}>top-3 точность</p>
                </div>
              </div>
              <Link href="/demo" className="inline-flex items-center gap-2 text-[14px] font-medium text-white px-8 py-3.5 rounded-full transition-all hover:bg-white/10" style={{ border: '1px solid rgba(255,255,255,0.25)' }}>
                Попробовать AI-демо
                <ArrowIcon />
              </Link>
            </div>

            {/* Линзы — видимы и на мобильных */}
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3">
                {['Kent', 'Polarity', 'Hierarchy', 'Constellation', 'Miasm', 'Potency', 'Negative', 'Relations'].map((lens, i) => (
                  <div key={i} className="px-4 py-3 rounded-xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <p className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>{lens}</p>
                  </div>
                ))}
              </div>
              <p className="text-[12px] mt-4 text-center" style={{ color: 'rgba(255,255,255,0.35)' }}>8 линз анализа</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Безопасность ═══ */}
      <section className="py-24 sm:py-32">
        <div className="max-w-[900px] mx-auto px-6 text-center">
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase mb-4" style={{ color: '#2d6a4f' }}>
            Безопасность
          </p>
          <h2 className="lr-serif text-[clamp(32px,4vw,48px)] font-light leading-[1.1] mb-6" style={{ letterSpacing: '-0.02em' }}>
            Ваши данные под защитой.
          </h2>
          <p className="text-[16px] mb-16 max-w-[520px] mx-auto leading-relaxed" style={{ color: '#8a7e6c' }}>
            Мы понимаем ответственность за хранение медицинских данных. Безопасность — не функция, а основа сервиса.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
            {[
              { icon: '🇷🇺', title: 'Хранение в России', desc: 'Серверы в РФ. Соответствие 152-ФЗ о персональных данных.' },
              { icon: '🔒', title: 'Шифрование', desc: 'HTTPS, авторизация по email/паролю, сессии через cookies.' },
              { icon: '👤', title: 'Изоляция', desc: 'Каждый врач видит только своих пациентов. Мы не имеем доступа.' },
              { icon: '📥', title: 'Экспорт', desc: 'Скачайте данные в PDF в любой момент. Данные принадлежат вам.' },
            ].map((item, i) => (
              <div key={i} className="p-6 rounded-2xl transition-all duration-300 hover:-translate-y-1" style={{ backgroundColor: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                <div className="text-2xl mb-4">{item.icon}</div>
                <p className="text-[14px] font-medium mb-2" style={{ color: '#1a1a0a' }}>{item.title}</p>
                <p className="text-[13px] leading-relaxed" style={{ color: '#8a7e6c' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Тарифы ═══ */}
      <section className="py-24 sm:py-32">
        <div className="max-w-[1000px] mx-auto px-6 text-center">
          <p className="text-[11px] font-medium tracking-[0.2em] uppercase mb-4" style={{ color: '#2d6a4f' }}>
            Тарифы
          </p>
          <h2 className="lr-serif text-[clamp(32px,4vw,48px)] font-light leading-[1.1] mb-4" style={{ letterSpacing: '-0.02em' }}>
            Без обязательств.
          </h2>
          <p className="text-[16px] mb-4" style={{ color: '#8a7e6c' }}>
            Без карты, без обязательств. Перейдите на Стандарт когда будете готовы.
          </p>
          <p className="inline-block text-[13px] font-medium px-4 py-1.5 rounded-full mb-16" style={{ backgroundColor: 'rgba(45,106,79,0.08)', color: '#2d6a4f' }}>
            Все пользователи получают Стандарт бесплатно до 31 мая 2026
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
            {/* Базовый */}
            <div className="p-8 rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.5)', border: '1px solid rgba(0,0,0,0.06)' }}>
              <p className="text-[11px] font-medium tracking-[0.15em] uppercase mb-3" style={{ color: '#8a7e6c' }}>Базовый</p>
              <div className="lr-serif text-[40px] font-light mb-1" style={{ color: '#1a1a0a' }}>0 ₽</div>
              <p className="text-[13px] mb-6" style={{ color: '#8a7e6c' }}>навсегда</p>
              <ul className="space-y-3 mb-8">
                {['До 5 пациентов', 'Реперторий Кента', 'Карточки и консультации', 'Анкеты и опросы'].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-[14px]" style={{ color: '#1a1a0a' }}>
                    <CheckIcon />{f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block text-center text-[14px] font-medium py-3.5 rounded-full transition-all text-[#2d6a4f] hover:bg-[#2d6a4f] hover:text-white" style={{ border: '1px solid #2d6a4f' }}>
                Зарегистрироваться
              </Link>
            </div>

            {/* Стандарт */}
            <div className="p-8 rounded-2xl relative" style={{ backgroundColor: '#1a3020' }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[11px] font-semibold tracking-wide text-white" style={{ backgroundColor: '#2d6a4f' }}>
                Рекомендуем
              </div>
              <p className="text-[11px] font-medium tracking-[0.15em] uppercase mb-3" style={{ color: 'rgba(255,255,255,0.6)' }}>Стандарт</p>
              <div className="mb-1">
                <span className="lr-serif text-[40px] font-light text-white">290 ₽</span>
                <span className="text-[14px] ml-1" style={{ color: 'rgba(255,255,255,0.5)' }}>/мес</span>
              </div>
              <p className="text-[13px] mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>или 2 900 ₽/год</p>
              <ul className="space-y-3 mb-8">
                {['Безлимит пациентов', 'Онлайн-запись', 'Экспорт в PDF', 'Напоминания', 'Поддержка'].map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-[14px]" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="#7dd4a8" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block text-center text-[14px] font-semibold py-3.5 rounded-full transition-all hover:opacity-90" style={{ backgroundColor: '#ffffff', color: '#1a3020' }}>
                Подключить
              </Link>
            </div>

            {/* AI Pro — футуристичная карточка */}
            <div className="group relative rounded-2xl p-px transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_25px_80px_rgba(99,102,241,0.2)]">
              <div className="absolute inset-0 rounded-2xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 25%, #a78bfa 50%, #6366f1 75%, #818cf8 100%)', backgroundSize: '300% 300%', animation: 'lr-ai-border 4s ease infinite' }} />
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
                  <span className="lr-serif text-[40px] font-light text-white">1 990 ₽</span>
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
                <div className="relative z-10">
                  <Link href="/pricing" className="block w-full text-center py-3.5 rounded-full text-[14px] font-semibold text-white transition-all duration-300 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:-translate-y-px" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)' }}>
                    Подробнее
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <p className="text-[13px] mt-8" style={{ color: '#8a7e6c' }}>
            <Link href="/pricing" className="underline underline-offset-2 transition-colors hover:text-[#2d6a4f]">
              Все тарифы и пакеты AI-консультаций →
            </Link>
          </p>
        </div>
      </section>

      {/* ═══ Финальный CTA ═══ */}
      <section className="py-32 sm:py-40 text-center">
        <div className="max-w-[600px] mx-auto px-6">
          <h2 className="lr-serif text-[clamp(36px,5vw,64px)] font-light leading-[1.1] mb-8" style={{ letterSpacing: '-0.03em' }}>
            Начните вести<br />пациентов иначе.
          </h2>
          <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-[15px] font-medium text-white transition-all hover:shadow-[0_12px_40px_rgba(45,106,79,0.3)] hover:-translate-y-0.5" style={{ backgroundColor: '#2d6a4f' }}>
            Начать работу
            <ArrowIcon />
          </Link>
        </div>
      </section>

      </main>

      {/* ═══ Footer ═══ */}
      <footer style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="max-w-[1200px] mx-auto px-6 py-12">
          <div className="flex flex-col sm:flex-row justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <Logo size={20} />
                <span className="lr-serif text-[17px]" style={{ color: '#1a3020' }}>Similia</span>
              </div>
              <p className="text-[13px]" style={{ color: '#8a7e6c' }}>Цифровой кабинет гомеопата</p>
              <p className="text-[13px] mt-1" style={{ color: '#8a7e6c' }}>Данные хранятся в России · © 2026</p>
            </div>
            <div className="flex gap-12">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.15em] mb-3" style={{ color: '#8a7e6c' }}>Продукт</p>
                <div className="flex flex-col gap-2">
                  <Link href="/pricing" className="text-[14px] transition-colors hover:text-[#1a1a0a]" style={{ color: '#8a7e6c' }}>Тарифы</Link>
                  <Link href="/demo" className="text-[14px] transition-colors hover:text-[#1a1a0a]" style={{ color: '#8a7e6c' }}>AI-демо</Link>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.15em] mb-3" style={{ color: '#8a7e6c' }}>Документы</p>
                <div className="flex flex-col gap-2">
                  <Link href="/privacy" className="text-[14px] transition-colors hover:text-[#1a1a0a]" style={{ color: '#8a7e6c' }}>Конфиденциальность</Link>
                  <Link href="/terms" className="text-[14px] transition-colors hover:text-[#1a1a0a]" style={{ color: '#8a7e6c' }}>Оферта</Link>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.15em] mb-3" style={{ color: '#8a7e6c' }}>Контакт</p>
                <div className="flex flex-col gap-2">
                  <a href="mailto:simillia@mail.ru" className="text-[14px] transition-colors hover:text-[#1a1a0a]" style={{ color: '#8a7e6c' }}>simillia@mail.ru</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
