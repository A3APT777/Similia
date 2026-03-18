import Link from 'next/link'

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    title: 'Реперторий — 8 500 рубрик',
    desc: 'Repertorium Publicum прямо в браузере. Поиск за секунду, анализ препаратов по весу, назначение одним кликом.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    title: 'Карточки пациентов',
    desc: 'Полная история: жалобы, назначения, динамика по каждому приёму. Открываете карточку — сразу видите всё.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    title: 'Анкета до приёма',
    desc: 'Пациент заполняет анкету дома — приходит уже описанным. Экономит 20 минут на каждой первичной консультации.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Опрос самочувствия',
    desc: 'Ссылка после приёма — пациент отвечает за 30 секунд. Динамика видна в карточке: лучше, хуже, без изменений.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
      </svg>
    ),
    title: 'Фото-динамика',
    desc: 'Фото кожи, языка или глаз — до и после. Пациент видит прогресс, которого не замечал сам.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    title: 'Расписание приёмов',
    desc: 'Все записи на одном экране. Планируйте прямо из карточки пациента — без отдельных таблиц и бумажного ежедневника.',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3.75h3m-6-7.5h.008v.008H7.5V6zm0 3.75h.008v.008H7.5V9.75z" />
      </svg>
    ),
    title: 'Конституциональный тип',
    desc: 'Тип, рубрики реперториума, реакция на предыдущий препарат — всё в одной консультации, всё под рукой.',
  },
]

const TESTIMONIALS = [
  {
    text: 'Раньше вела всех в тетради. Теперь открываю Similia — и за минуту вижу всю историю пациента с прошлого года. Особенно ценно, что вижу что я назначала и какая была реакция.',
    name: 'Елена Мартынова',
    role: 'Гомеопат, 12 лет практики · Москва',
    initial: 'Е',
  },
  {
    text: 'Функция опроса самочувствия — это именно то, чего не хватало. Пациент отвечает по ссылке, я вижу результат в карточке. Экономит 10 минут на каждом повторном приёме.',
    name: 'Андрей Воронин',
    role: 'Классический гомеопат · Санкт-Петербург',
    initial: 'А',
  },
  {
    text: 'Анкета до приёма экономит 20 минут на каждой первичке. Пациент заполняет дома спокойно, без спешки — я получаю подробные ответы вместо отрывистых «да/нет» на приёме.',
    name: 'Светлана Козлова',
    role: 'Гомеопат-педиатр · Казань',
    initial: 'С',
  },
]

const VS_ROWS = [
  { label: 'Поиск по пациенту', excel: 'Ctrl+F по строкам', hc: 'Мгновенный поиск' },
  { label: 'Анкета до приёма', excel: 'Ручной ввод на приёме', hc: 'Пациент заполняет сам' },
  { label: 'Опрос самочувствия', excel: 'Звонок или сообщение вручную', hc: 'Ссылка — 30 секунд' },
  { label: 'Доступ с телефона', excel: 'Только с компьютера', hc: 'Любое устройство' },
  { label: 'Фото динамики', excel: 'Папка в галерее', hc: 'В карточке пациента' },
  { label: 'Расписание', excel: 'Бумажный ежедневник', hc: 'Встроенный календарь' },
  { label: 'Безопасность данных', excel: 'Файл на компьютере', hc: 'Шифрование, бэкап в РФ' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-bg)' }}>

      {/* ─── Навбар ─── */}
      <header className="sticky top-0 z-40 border-b" style={{ backgroundColor: 'rgba(247,243,237,0.92)', backdropFilter: 'blur(12px)', borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <svg width="24" height="24" viewBox="0 0 36 36" fill="none">
              <ellipse cx="13" cy="18" rx="7" ry="11"
                transform="rotate(-15 13 18)"
                fill="#2d6a4f" opacity="0.9"/>
              <ellipse cx="23" cy="18" rx="7" ry="11"
                transform="rotate(15 23 18)"
                fill="#1a3020" opacity="0.65"/>
              <path d="M18 8 Q18 18 18 28"
                stroke="#1a3020" strokeWidth="0.8"
                strokeLinecap="round"/>
            </svg>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: '500', color: '#1a3020', letterSpacing: '0.02em' }}>Similia</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors hidden sm:block">
              Войти
            </Link>
            <Link href="/register" className="text-sm font-semibold text-white px-4 py-2 rounded-xl transition-colors" style={{ backgroundColor: 'var(--color-primary)' }}>
              Зарегистрироваться
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-10 sm:pt-24 sm:pb-14">
          <div className="max-w-2xl relative z-10">
            <div className="inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6" style={{ backgroundColor: 'rgba(45,106,79,0.1)', borderColor: 'rgba(45,106,79,0.2)', color: 'var(--color-primary)', border: '1px solid rgba(45,106,79,0.2)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Сейчас полностью бесплатно
            </div>

            <h1 className="text-[40px] sm:text-[56px] font-light leading-[1.1] text-gray-900 mb-6" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
              Вся история пациента —<br />
              <span style={{ color: 'var(--color-primary)' }}>за один взгляд</span>
            </h1>
            <p style={{
              fontFamily: 'Georgia, serif',
              fontSize: '14px',
              color: '#2d6a4f',
              fontStyle: 'italic',
              marginTop: '6px',
              opacity: 0.8
            }}>
              Similia similibus curantur
            </p>
            <p className="text-[17px] text-gray-500 leading-relaxed mb-8 max-w-lg">
              Журнал пациентов, анкеты до приёма, опрос самочувствия, фото-динамика, реперторий — всё в одном месте. Создан для практикующего гомеопата.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all shadow-lg"
                style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 4px 24px rgba(45,106,79,0.3)' }}
              >
                Попробовать Similia
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 text-gray-600 font-medium px-6 py-3 rounded-xl text-sm border border-gray-200 hover:border-gray-300 transition-all bg-white">
                Уже есть аккаунт
              </Link>
            </div>
            <p className="text-xs text-gray-400 mt-4">Бесплатно во время бета · Без карты · Демо-данные включены</p>
            <p className="text-xs mt-2" style={{ color: 'var(--color-primary)', opacity: 0.7 }}>
              Первые пользователи получат льготные условия при переходе на платную версию
            </p>
          </div>

          <div
            className="absolute right-0 top-8 w-80 h-80 sm:w-[420px] sm:h-[420px] bg-no-repeat bg-contain bg-right-top opacity-20 pointer-events-none hidden sm:block"
            style={{ backgroundImage: 'url(/illustrations/chamomile.jpg)' }}
          />
        </div>
      </section>

      {/* ─── Цифры ─── */}
      <section className="border-y py-10" style={{ backgroundColor: 'white', borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-3 gap-8 text-center">
            {[
              { num: '20 мин', label: 'Экономия на каждой первичке' },
              { num: 'Бесплатно', label: 'На весь период бета-теста' },
              { num: '152-ФЗ', label: 'Данные хранятся в России' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-2xl sm:text-3xl font-light mb-1" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--color-primary)' }}>{s.num}</p>
                <p className="text-xs text-gray-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── VS сравнение ─── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-light text-gray-900 mb-3 text-center" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
            Почему не Excel или тетрадь?
          </h2>
          <p className="text-center text-sm text-gray-400 mb-10">Сравните, как изменится ваша работа</p>

          <div className="overflow-x-auto rounded-2xl shadow-sm">
          <div className="bg-white border border-gray-100 overflow-hidden min-w-[480px]">
            {/* Заголовок таблицы */}
            <div className="grid grid-cols-3 border-b border-gray-100">
              <div className="px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider"></div>
              <div className="px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider text-center border-l border-gray-100">Excel / тетрадь</div>
              <div className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-center border-l border-gray-100" style={{ color: 'var(--color-primary)' }}>Similia</div>
            </div>
            {VS_ROWS.map((row, i) => (
              <div
                key={i}
                className={`grid grid-cols-3 border-b border-gray-50 last:border-b-0 ${i % 2 === 0 ? '' : 'bg-gray-50/40'}`}
              >
                <div className="px-5 py-3.5 text-sm font-medium text-gray-700">{row.label}</div>
                <div className="px-5 py-3.5 text-sm text-gray-400 border-l border-gray-100">
                  <span className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {row.excel}
                  </span>
                </div>
                <div className="px-5 py-3.5 text-sm border-l border-gray-100 font-medium" style={{ color: 'var(--color-primary)' }}>
                  <span className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--color-primary)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {row.hc}
                  </span>
                </div>
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      {/* ─── Возможности ─── */}
      <section className="py-16 sm:py-20 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-light text-gray-900 mb-3" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
              Всё что нужно практикующему гомеопату
            </h2>
            <p className="text-gray-400 text-sm max-w-md mx-auto">Никакого лишнего. Только то, что реально используется в ежедневной работе.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: 'rgba(45,106,79,0.08)', color: 'var(--color-primary)' }}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>

          {/* Второй CTA — сразу после фич */}
          <div className="mt-10 text-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 text-white font-semibold px-7 py-3.5 rounded-xl text-sm transition-all shadow-md"
              style={{ backgroundColor: 'var(--color-primary)', boxShadow: '0 4px 20px rgba(45,106,79,0.25)' }}
            >
              Начать — займёт 1 минуту
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Как это работает ─── */}
      <section className="py-16 sm:py-20 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-light text-gray-900 mb-10 text-center" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
            Как это работает
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 relative">
            {[
              { step: '01', title: 'Добавьте пациента', desc: 'Введите имя и контакты. Отправьте ссылку на анкету — пациент заполнит дома сам, вы получите подробные данные ещё до приёма.' },
              { step: '02', title: 'Проведите консультацию', desc: 'Записывайте симптомы, ищите рубрики в реперториуме, назначайте препарат с потенцией и схемой прямо в карточке.' },
              { step: '03', title: 'Следите за результатом', desc: 'Через 2–3 недели — ссылка на опрос. Пациент отвечает за 30 секунд. Цепочка: назначение → реакция → следующий шаг.' },
            ].map((s, i) => (
              <div key={i} className="relative">
                <div className="text-5xl font-light mb-4 leading-none" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'rgba(45,106,79,0.15)' }}>{s.step}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Прозрачность о цене ─── */}
      <section className="py-16 sm:py-20 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-light text-gray-900 mb-3 text-center" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
            Сколько это стоит?
          </h2>
          <p className="text-center text-sm text-gray-400 mb-10">Честно и прозрачно</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Сейчас */}
            <div className="rounded-2xl p-6 border-2" style={{ backgroundColor: 'rgba(45,106,79,0.04)', borderColor: 'rgba(45,106,79,0.3)' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(45,106,79,0.12)', color: 'var(--color-primary)' }}>Сейчас</span>
                <span className="text-3xl font-light" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--color-primary)' }}>0 ₽</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Полный доступ бесплатно</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">Всё работает в полном объёме. Мы в открытой бете и собираем обратную связь от практикующих врачей.</p>
              <ul className="space-y-2 mb-5">
                {['Неограниченное число пациентов', 'Реперторий — 8 500 рубрик', 'Анкеты, опросы, фото-динамика', 'Данные в России (152-ФЗ)'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--color-primary)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="w-full inline-flex items-center justify-center gap-2 text-white font-semibold px-5 py-3 rounded-xl text-sm transition-all" style={{ backgroundColor: 'var(--color-primary)' }}>
                Зарегистрироваться бесплатно
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              </Link>
            </div>

            {/* Потом */}
            <div className="rounded-2xl p-6 border" style={{ backgroundColor: 'white', borderColor: '#e5e7eb' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-gray-100 text-gray-400">После бета</span>
                <span className="text-3xl font-light text-gray-300" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>≈ 690 ₽/мес</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-400 mb-2">Платная версия</h3>
              <p className="text-sm text-gray-400 leading-relaxed mb-4">Появится позже. Те, кто зарегистрировался в бета — получат постоянную скидку или будут grandfathered на льготных условиях.</p>
              <ul className="space-y-2 mb-5">
                {['Всё из бесплатной версии', 'Приоритетная поддержка', 'Ранний доступ к новым функциям', 'Льготная цена навсегда'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-400">
                    <svg className="w-4 h-4 shrink-0 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="w-full inline-flex items-center justify-center px-5 py-3 rounded-xl text-sm text-gray-300 border border-gray-100">
                Скоро
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA финал ─── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl px-8 sm:px-14 py-12 sm:py-16 text-center" style={{ backgroundColor: 'var(--color-sidebar)' }}>
            <div
              className="absolute inset-0 bg-no-repeat bg-cover bg-center opacity-[0.06] pointer-events-none"
              style={{ backgroundImage: 'url(/illustrations/arnica.jpg)' }}
            />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-5xl font-light text-white mb-4" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>
                Начните прямо сейчас
              </h2>
              <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: 'rgba(255,255,255,0.45)' }}>
                Бесплатно · Регистрация займёт минуту · Демо-пациенты уже ждут внутри
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/register" className="inline-flex items-center gap-2 font-semibold px-8 py-3.5 rounded-xl text-sm transition-all" style={{ backgroundColor: 'var(--color-amber)', color: 'var(--color-sidebar)' }}>
                  Создать аккаунт
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
                <Link href="/login" className="text-sm font-medium px-6 py-3.5 rounded-xl border transition-all" style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}>
                  Войти
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t py-10" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg width="20" height="20" viewBox="0 0 36 36" fill="none">
                  <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#2d6a4f" opacity="0.9"/>
                  <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#1a3020" opacity="0.65"/>
                  <path d="M18 8 Q18 18 18 28" stroke="#1a3020" strokeWidth="0.8" strokeLinecap="round"/>
                </svg>
                <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '17px', fontWeight: 500, color: '#1a3020' }}>Similia</span>
              </div>
              <p className="text-xs text-gray-400">Цифровой кабинет гомеопата · Данные в РФ</p>
              <p className="text-xs text-gray-300 mt-1">© 2026 Similia</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-300 mb-2">Документы</p>
                <div className="flex flex-col gap-1.5">
                  <Link href="/privacy" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Политика конфиденциальности</Link>
                  <Link href="/terms" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Публичная оферта</Link>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-300 mb-2">Аккаунт</p>
                <div className="flex flex-col gap-1.5">
                  <Link href="/login" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Войти</Link>
                  <Link href="/register" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">Зарегистрироваться</Link>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-300 mb-2">Поддержка</p>
                <div className="flex flex-col gap-1.5">
                  <a href="mailto:simillia@mail.ru" className="text-xs text-gray-400 hover:text-gray-700 transition-colors">simillia@mail.ru</a>
                  <span className="text-xs text-gray-300">Версия 1.0 бета</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
