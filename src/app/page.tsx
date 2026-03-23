import Link from 'next/link'
import { Suspense } from 'react'
import RefCookieSetter from '@/components/RefCookieSetter'

// ─── Logo ───
const Logo = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#2d6a4f" opacity="0.9" />
    <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#1a3020" opacity="0.65" />
    <path d="M18 8 Q18 18 18 28" stroke="#1a3020" strokeWidth="0.8" strokeLinecap="round" />
  </svg>
)

export default function LandingPage() {
  return (
    <div className="landing-root">
      <Suspense><RefCookieSetter /></Suspense>

      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-white focus:shadow-lg focus:text-sm" style={{ color: 'var(--sim-green)' }}>
        Перейти к содержимому
      </a>

      <style>{`
        .landing-root {
          --lr-bg: #f7f3ed;
          --lr-fg: #1a1a0a;
          --lr-muted: #8a7e6c;
          --lr-green: #2d6a4f;
          --lr-forest: #1a3020;
          --lr-border: rgba(0,0,0,0.06);
          background-color: var(--lr-bg);
          color: var(--lr-fg);
          font-family: var(--font-geist-sans, 'Geist', -apple-system, sans-serif);
          overflow-x: hidden;
        }

        .lr-serif {
          font-family: 'Cormorant Garamond', Georgia, serif;
        }

        /* Анимации */
        @keyframes lr-reveal {
          from { opacity: 0; transform: translateY(32px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes lr-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes lr-line {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }

        .lr-reveal { animation: lr-reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .lr-reveal-1 { animation-delay: 0.1s; }
        .lr-reveal-2 { animation-delay: 0.2s; }
        .lr-reveal-3 { animation-delay: 0.35s; }
        .lr-reveal-4 { animation-delay: 0.5s; }
        .lr-fade { animation: lr-fade 1s 0.6s ease both; }

        /* Навбар */
        .lr-nav {
          backdrop-filter: blur(20px) saturate(1.8);
          -webkit-backdrop-filter: blur(20px) saturate(1.8);
        }

        /* Кнопки */
        .lr-btn-primary {
          background-color: var(--lr-green);
          color: white;
          padding: 14px 32px;
          border-radius: 100px;
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0.01em;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .lr-btn-primary:hover {
          background-color: var(--lr-forest);
          box-shadow: 0 12px 40px rgba(45,106,79,0.3);
          transform: translateY(-2px);
        }

        .lr-btn-ghost {
          color: var(--lr-muted);
          padding: 14px 24px;
          border-radius: 100px;
          font-size: 14px;
          font-weight: 400;
          transition: color 0.2s;
        }
        .lr-btn-ghost:hover { color: var(--lr-fg); }

        /* Feature card */
        .lr-feature {
          padding: 40px;
          border-radius: 20px;
          background: rgba(255,255,255,0.5);
          border: 1px solid rgba(0,0,0,0.04);
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .lr-feature:hover {
          background: rgba(255,255,255,0.8);
          border-color: rgba(45,106,79,0.15);
          transform: translateY(-4px);
          box-shadow: 0 20px 60px rgba(0,0,0,0.06);
        }

        /* Вертикальная линия */
        .lr-vline {
          width: 1px;
          height: 80px;
          background: linear-gradient(to bottom, transparent, var(--lr-green), transparent);
          margin: 0 auto;
          animation: lr-line 1s 0.5s ease both;
          transform-origin: top;
        }

        /* Число-акцент */
        .lr-num {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 72px;
          font-weight: 300;
          line-height: 1;
          color: var(--lr-green);
          letter-spacing: -0.03em;
        }

        /* Горизонтальный скролл */
        .lr-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ═══ Nav ═══ */}
      <header className="lr-nav fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: 'rgba(247,243,237,0.85)', borderBottom: '1px solid var(--lr-border)' }}>
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Logo size={28} />
            <span className="lr-serif text-[22px] font-light" style={{ color: 'var(--lr-forest)', letterSpacing: '0.04em' }}>Similia</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/demo" className="lr-btn-ghost hidden sm:inline-flex">AI-демо</Link>
            <Link href="/pricing" className="lr-btn-ghost hidden sm:inline-flex">Тарифы</Link>
            <Link href="/login" className="lr-btn-ghost">Войти</Link>
            <Link href="/register" className="lr-btn-primary">Начать</Link>
          </nav>
        </div>
      </header>

      <main id="main">

      {/* ═══ Hero — полноэкранный, минимальный ═══ */}
      <section className="min-h-[100vh] flex flex-col justify-center relative pt-16">
        <div className="max-w-[1200px] mx-auto px-6 w-full">
          <div className="max-w-[720px]">

            <p className="lr-reveal text-[13px] font-medium tracking-[0.15em] uppercase mb-8" style={{ color: 'var(--lr-green)' }}>
              Цифровой кабинет гомеопата
            </p>

            <h1 className="lr-reveal lr-reveal-1 lr-serif text-[clamp(42px,6vw,80px)] font-light leading-[1.05] mb-8" style={{ letterSpacing: '-0.03em' }}>
              Думайте<br />
              о пациенте.
            </h1>

            <p className="lr-reveal lr-reveal-2 text-[18px] leading-[1.7] mb-12" style={{ color: 'var(--lr-muted)', maxWidth: '480px' }}>
              Карточки, реперторий Кента, анкеты, назначения&nbsp;— всё в одном месте. Автосохранение, пока вы работаете.
            </p>

            <div className="lr-reveal lr-reveal-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-6">
              <Link href="/register" className="lr-btn-primary">
                Попробовать бесплатно
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                </svg>
              </Link>
              <Link href="/login" className="lr-btn-ghost">Уже есть аккаунт</Link>
            </div>

            <p className="lr-reveal lr-reveal-4 text-[12px] tracking-wide" style={{ color: 'var(--lr-muted)', opacity: 0.6 }}>
              Без карты · Регистрация за минуту · Данные в России
            </p>
          </div>
        </div>

        {/* Декоративный градиент */}
        <div aria-hidden="true" className="lr-fade absolute top-0 right-0 w-[50vw] h-full pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 60% at 70% 40%, rgba(45,106,79,0.06) 0%, transparent 70%)' }} />
      </section>

      {/* ═══ Разделитель ═══ */}
      <div className="lr-vline" />

      {/* ═══ Числа — три метрики ═══ */}
      <section className="py-24 sm:py-32">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-16 sm:gap-8 text-center">
            {[
              { num: '74 482', label: 'рубрики в реперториуме', sub: 'Repertorium Publicum' },
              { num: '2 сек', label: 'автосохранение', sub: 'Без кнопки «Сохранить»' },
              { num: '0 ₽', label: 'бесплатный старт', sub: 'До 5 пациентов навсегда' },
            ].map((item, i) => (
              <div key={i}>
                <div className="lr-num">{item.num}</div>
                <p className="text-[15px] font-medium mt-3" style={{ color: 'var(--lr-fg)' }}>{item.label}</p>
                <p className="text-[13px] mt-1" style={{ color: 'var(--lr-muted)' }}>{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Возможности — крупные блоки ═══ */}
      <section className="py-24 sm:py-32">
        <div className="max-w-[1200px] mx-auto px-6">

          <p className="text-[13px] font-medium tracking-[0.15em] uppercase mb-4" style={{ color: 'var(--lr-green)' }}>
            Возможности
          </p>
          <h2 className="lr-serif text-[clamp(32px,4vw,56px)] font-light leading-[1.1] mb-20" style={{ letterSpacing: '-0.02em', maxWidth: '600px' }}>
            Всё что нужно.<br />
            Ничего лишнего.
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                title: 'Реперторий Кента',
                desc: '74 482 рубрики. Поиск на русском и латыни. Грейды, вес, элиминация — как в настольном софте, но в браузере.',
              },
              {
                title: 'Карточки пациентов',
                desc: 'Жалобы, назначения, динамика — вся история в одном месте. Откройте карточку и сразу увидите полную картину.',
              },
              {
                title: 'Анкета до приёма',
                desc: 'Отправьте ссылку — пациент заполнит дома за 15 минут. На приёме вы уже знаете жалобы, модальности, психику.',
              },
              {
                title: 'Динамика лечения',
                desc: 'Опрос самочувствия после приёма. Пациент отвечает за 2 минуты. Вы видите прогресс без звонков.',
              },
            ].map((f, i) => (
              <div key={i} className="lr-feature">
                <div className="text-[13px] font-medium tracking-[0.1em] mb-6" style={{ color: 'var(--lr-green)' }}>
                  0{i + 1}
                </div>
                <h3 className="text-[18px] font-medium mb-3">{f.title}</h3>
                <p className="text-[15px] leading-[1.7]" style={{ color: 'var(--lr-muted)' }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Разделитель ═══ */}
      <div className="lr-vline" />

      {/* ═══ Цитата / философия ═══ */}
      <section className="py-24 sm:py-32">
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <blockquote className="lr-serif text-[clamp(28px,4vw,44px)] font-light leading-[1.3] italic" style={{ letterSpacing: '-0.01em', color: 'var(--lr-fg)' }}>
            «Similia similibus curantur»
          </blockquote>
          <p className="text-[14px] mt-6" style={{ color: 'var(--lr-muted)' }}>
            Подобное лечится подобным — Ганеман, 1796
          </p>
          <p className="text-[15px] mt-8 leading-[1.7] max-w-[520px] mx-auto" style={{ color: 'var(--lr-muted)' }}>
            Мы создали инструмент, который следует этому принципу: простой, точный, созданный для врача-гомеопата. Не для отчётности — для практики.
          </p>
        </div>
      </section>

      {/* ═══ AI секция ═══ */}
      <section className="py-24 sm:py-32" style={{ backgroundColor: 'var(--lr-forest)' }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[13px] font-medium tracking-[0.15em] uppercase mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
                AI-ассистент
              </p>
              <h2 className="lr-serif text-[clamp(32px,4vw,52px)] font-light text-white leading-[1.1] mb-6" style={{ letterSpacing: '-0.02em' }}>
                Консенсус<br />трёх моделей.
              </h2>
              <p className="text-[16px] leading-[1.7] mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
                MDRI Engine анализирует случай через 8 линз: Kent, Polarity, Hierarchy, Constellation, Negative, Miasm, Relationships, Potency. Параллельно работает AI-гомеопат. При разногласии — арбитраж.
              </p>
              <div className="flex items-center gap-6 mb-8">
                <div>
                  <div className="lr-serif text-[40px] font-light text-white">76%</div>
                  <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>top-1 точность</p>
                </div>
                <div style={{ width: '1px', height: '40px', backgroundColor: 'rgba(255,255,255,0.15)' }} />
                <div>
                  <div className="lr-serif text-[40px] font-light text-white">94%</div>
                  <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.4)' }}>top-3 точность</p>
                </div>
              </div>
              <Link href="/demo" className="inline-flex items-center gap-2 text-[14px] font-medium text-white px-8 py-4 rounded-full transition-all hover:bg-white/10" style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
                Попробовать AI-демо
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                </svg>
              </Link>
            </div>
            <div className="hidden lg:block">
              <div className="grid grid-cols-2 gap-3">
                {['Kent', 'Polarity', 'Hierarchy', 'Constellation', 'Miasm', 'Potency', 'Negative', 'Relations'].map((lens, i) => (
                  <div key={i} className="px-4 py-3 rounded-2xl text-center" style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <p className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{lens}</p>
                  </div>
                ))}
              </div>
              <p className="text-[12px] mt-4 text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>8 линз анализа</p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Тарифы — простые ═══ */}
      <section className="py-24 sm:py-32">
        <div className="max-w-[800px] mx-auto px-6 text-center">
          <p className="text-[13px] font-medium tracking-[0.15em] uppercase mb-4" style={{ color: 'var(--lr-green)' }}>
            Тарифы
          </p>
          <h2 className="lr-serif text-[clamp(32px,4vw,48px)] font-light leading-[1.1] mb-6" style={{ letterSpacing: '-0.02em' }}>
            Начните бесплатно.
          </h2>
          <p className="text-[16px] mb-16" style={{ color: 'var(--lr-muted)' }}>
            5 пациентов бесплатно навсегда. Стандарт — от 290 ₽/мес.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-left max-w-[600px] mx-auto">
            <div className="lr-feature">
              <p className="text-[13px] font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--lr-muted)' }}>Бесплатно</p>
              <div className="lr-serif text-[36px] font-light mb-4">0 ₽</div>
              <ul className="space-y-2 text-[14px]" style={{ color: 'var(--lr-muted)' }}>
                <li>5 пациентов</li>
                <li>Реперторий Кента</li>
                <li>Анкеты и опросы</li>
              </ul>
              <Link href="/register" className="block mt-6 text-center text-[14px] font-medium py-3 rounded-full transition-all hover:bg-[var(--lr-green)] hover:text-white" style={{ border: '1px solid var(--lr-green)', color: 'var(--lr-green)' }}>
                Начать бесплатно
              </Link>
            </div>
            <div className="lr-feature" style={{ backgroundColor: 'var(--lr-forest)', border: 'none' }}>
              <p className="text-[13px] font-medium uppercase tracking-wider mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>Стандарт</p>
              <div className="lr-serif text-[36px] font-light text-white mb-4">290 ₽<span className="text-[16px] font-normal" style={{ color: 'rgba(255,255,255,0.4)' }}>/мес</span></div>
              <ul className="space-y-2 text-[14px]" style={{ color: 'rgba(255,255,255,0.6)' }}>
                <li>Безлимит пациентов</li>
                <li>Онлайн-запись</li>
                <li>Экспорт PDF</li>
              </ul>
              <Link href="/register" className="block mt-6 text-center text-[14px] font-medium py-3 rounded-full text-white transition-colors hover:bg-white/10" style={{ border: '1px solid rgba(255,255,255,0.2)' }}>
                Попробовать
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Финальный CTA ═══ */}
      <section className="py-32 sm:py-40 text-center">
        <div className="max-w-[600px] mx-auto px-6">
          <h2 className="lr-serif text-[clamp(36px,5vw,64px)] font-light leading-[1.1] mb-8" style={{ letterSpacing: '-0.03em' }}>
            Начните вести<br />пациентов иначе.
          </h2>
          <Link href="/register" className="lr-btn-primary text-[15px]">
            Попробовать бесплатно
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
            </svg>
          </Link>
        </div>
      </section>

      </main>

      {/* ═══ Footer ═══ */}
      <footer style={{ borderTop: '1px solid var(--lr-border)' }}>
        <div className="max-w-[1200px] mx-auto px-6 py-12">
          <div className="flex flex-col sm:flex-row justify-between gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <Logo size={20} />
                <span className="lr-serif text-[17px]" style={{ color: 'var(--lr-forest)' }}>Similia</span>
              </div>
              <p className="text-[13px]" style={{ color: 'var(--lr-muted)' }}>Цифровой кабинет гомеопата</p>
              <p className="text-[13px] mt-1" style={{ color: 'var(--lr-muted)' }}>Данные хранятся в России · © 2026</p>
            </div>
            <div className="flex gap-12">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--lr-muted)' }}>Продукт</p>
                <div className="flex flex-col gap-2">
                  <Link href="/pricing" className="text-[14px] transition-colors hover:text-[var(--lr-fg)]" style={{ color: 'var(--lr-muted)' }}>Тарифы</Link>
                  <Link href="/demo" className="text-[14px] transition-colors hover:text-[var(--lr-fg)]" style={{ color: 'var(--lr-muted)' }}>AI-демо</Link>
                </div>
              </div>
              <div>
                <p className="text-[12px] font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--lr-muted)' }}>Документы</p>
                <div className="flex flex-col gap-2">
                  <Link href="/privacy" className="text-[14px] transition-colors hover:text-[var(--lr-fg)]" style={{ color: 'var(--lr-muted)' }}>Конфиденциальность</Link>
                  <Link href="/terms" className="text-[14px] transition-colors hover:text-[var(--lr-fg)]" style={{ color: 'var(--lr-muted)' }}>Оферта</Link>
                </div>
              </div>
              <div>
                <p className="text-[12px] font-medium uppercase tracking-wider mb-3" style={{ color: 'var(--lr-muted)' }}>Контакт</p>
                <div className="flex flex-col gap-2">
                  <a href="mailto:simillia@mail.ru" className="text-[14px] transition-colors hover:text-[var(--lr-fg)]" style={{ color: 'var(--lr-muted)' }}>simillia@mail.ru</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
