import Link from 'next/link'
import { Suspense } from 'react'

// ─── Иконки ───────────────────────────────────────────────────────────────

const Logo = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#2d6a4f" opacity="0.9" />
    <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#1a3020" opacity="0.65" />
    <path d="M18 8 Q18 18 18 28" stroke="#1a3020" strokeWidth="0.8" strokeLinecap="round" />
  </svg>
)

const ArrowRight = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
  </svg>
)

// ─── Макет приложения ─────────────────────────────────────────────────────

function AppMockup() {
  return (
    <div className="relative w-full max-w-[540px] mx-auto select-none pointer-events-none lp-mockup" aria-hidden="true">
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(45,106,79,0.18)', backgroundColor: '#f0ebe3', boxShadow: '0 32px 64px rgba(26,48,32,0.22)' }}>

        {/* Адресная строка */}
        <div className="flex items-center gap-2 px-4 py-2.5" style={{ backgroundColor: '#e8e2d8', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'rgba(220,100,100,0.5)' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'rgba(220,180,50,0.5)' }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'rgba(80,190,100,0.5)' }} />
          </div>
          <div className="flex-1 mx-2 bg-white/60 rounded-md px-3 py-1 text-gray-500 font-mono" style={{ fontSize: '10px' }}>
            similia.ru/patients/42/consultations
          </div>
        </div>

        {/* Шапка */}
        <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: 'white', borderBottom: '1px solid #ede8e0' }}>
          <div className="flex items-center gap-2">
            <Logo size={16} />
            <span style={{ fontFamily: 'Georgia, serif', fontSize: '13px', color: 'var(--sim-forest)', fontWeight: 500 }}>Similia</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full flex items-center justify-center text-white font-bold" style={{ fontSize: '8px', backgroundColor: 'var(--sim-green)' }}>Д</div>
            <span style={{ fontSize: '10px', color: '#6b7280' }}>Доктор Смирнова</span>
          </div>
        </div>

        {/* Заголовок консультации */}
        <div className="px-4 py-2.5 flex items-center justify-between" style={{ backgroundColor: '#faf7f2', borderBottom: '1px solid #ede8e0' }}>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sim-forest)' }}>Иванова Наталья · Приём №7</div>
            <div style={{ fontSize: '10px', color: 'var(--sim-text-hint)', marginTop: '2px' }}>18 марта 2026 · хроническое</div>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '8px', backgroundColor: 'rgba(45,106,79,0.1)', color: 'var(--sim-green)' }}>✓ Сохранено</div>
        </div>

        {/* Два столбца */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px' }}>

          {/* Левая панель */}
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', borderRight: '1px solid #ede8e0', backgroundColor: '#f8f7f4' }}>

            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7a6e64', marginBottom: '4px' }}>Основная жалоба</div>
              <div style={{ borderRadius: '8px', padding: '7px 10px', fontSize: '11px', backgroundColor: 'white', border: '1px solid #6ee7b7', boxShadow: '0 0 0 2px rgba(110,231,183,0.1)', lineHeight: 1.5, color: '#3a2e1a' }}>
                Мигрень 2–3 раза в месяц, правосторонняя, пульсирующая.
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#c0392b', opacity: 0.8, marginBottom: '4px' }}>Хуже от</div>
                <div style={{ borderRadius: '8px', padding: '6px 10px', fontSize: '11px', backgroundColor: 'white', border: '1px solid #f3ede8', lineHeight: 1.5, color: '#3a2e1a' }}>яркий свет, шум</div>
              </div>
              <div>
                <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#16a34a', opacity: 0.8, marginBottom: '4px' }}>Лучше от</div>
                <div style={{ borderRadius: '8px', padding: '6px 10px', fontSize: '11px', backgroundColor: 'white', border: '1px solid #f3ede8', lineHeight: 1.5, color: '#3a2e1a' }}>темнота, сон</div>
              </div>
            </div>

            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#7a6e64', marginBottom: '4px' }}>Психика</div>
              <div style={{ borderRadius: '8px', padding: '6px 10px', fontSize: '11px', backgroundColor: 'white', border: '1px solid #f3ede8', lineHeight: 1.5, color: '#3a2e1a' }}>раздражительность накануне приступа</div>
            </div>

            <div style={{ borderRadius: '10px', padding: '8px 12px', backgroundColor: 'rgba(45,106,79,0.08)', border: '1px solid rgba(45,106,79,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--sim-green)' }}>Назначение</div>
              <div style={{ flex: 1 }} />
              <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--sim-forest)' }}>Nat-m · 200C</div>
              <div style={{ fontSize: '10px', color: 'var(--sim-text-hint)' }}>1 гранула</div>
            </div>
          </div>

          {/* Правая панель */}
          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: 'white' }}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#7a6e64', marginBottom: '6px' }}>Динамика</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginBottom: '6px' }}>
                {([['3↑','#16a34a'], ['0↓','#dc2626'], ['1+','#6b5e45'], ['2✓','#2d6a4f']] as [string,string][]).map(([v, c]) => (
                  <div key={v} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: c }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, padding: '4px 8px', borderRadius: '8px', textAlign: 'center', backgroundColor: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>УЛУЧШЕНИЕ</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {([['↑','мигрень','лучше','#16a34a'],['✓','тошнота','прошло','#2d6a4f'],['↑','сон','лучше','#16a34a'],['=','боль в шее','как было','#9a8a6a']] as [string,string,string,string][]).map(([icon, text, sub, c]) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, width: '12px', color: c }}>{icon}</span>
                  <span style={{ fontSize: '10px', color: '#3a2e1a' }}>{text}</span>
                  <span style={{ fontSize: '9px', marginLeft: 'auto', color: 'var(--sim-text-hint)' }}>{sub}</span>
                </div>
              ))}
            </div>

            <div style={{ paddingTop: '6px', borderTop: '1px solid #ede8e0' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', color: '#7a6e64', marginBottom: '6px' }}>Реперторий</div>
              {['Head: Pain, pulsating', 'Mind: Irritability', 'Head: Light agg.'].map(r => (
                <div key={r} style={{ padding: '3px 6px', borderRadius: '6px', fontSize: '9px', backgroundColor: '#f0ebe3', color: '#5a7060', marginBottom: '3px' }}>{r}</div>
              ))}
            </div>
          </div>
        </div>

        {/* Футер */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 16px', backgroundColor: '#f8f7f4', borderTop: '1px solid #ede8e0' }}>
          <div style={{ fontSize: '10px', color: 'var(--sim-text-hint)' }}>Контроль через 4 нед · Отправить опрос</div>
          <div style={{ fontSize: '10px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px', color: 'white', backgroundColor: 'var(--sim-green)' }}>Завершить приём</div>
        </div>
      </div>

      {/* Плавающие бейджи */}
      <div className="lp-badge-bottom" style={{ position: 'absolute', bottom: '-14px', left: '-16px', backgroundColor: 'white', borderRadius: '14px', padding: '8px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #f0ebe3', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '18px' }}>📬</span>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>Опрос самочувствия</div>
          <div style={{ fontSize: '10px', color: '#9ca3af' }}>Иванова ответила · 2 мин назад</div>
        </div>
      </div>
      <div className="lp-badge-top" style={{ position: 'absolute', top: '-12px', right: '-12px', backgroundColor: 'white', borderRadius: '14px', padding: '8px 12px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #f0ebe3' }}>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--sim-green)' }}>📋 Анкета получена</div>
        <div style={{ fontSize: '10px', color: '#9ca3af' }}>Петров · до первого приёма</div>
      </div>
    </div>
  )
}

// ─── Мобильный макет ─────────────────────────────────────────────────────

function AppMockupMobile() {
  return (
    <div className="select-none pointer-events-none mx-auto" style={{ maxWidth: '360px' }}>
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(45,106,79,0.18)', backgroundColor: '#f0ebe3', boxShadow: '0 16px 40px rgba(26,48,32,0.18)' }}>

        {/* Адресная строка */}
        <div className="flex items-center gap-2 px-3 py-2" style={{ backgroundColor: '#e8e2d8', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(220,100,100,0.5)' }} />
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(220,180,50,0.5)' }} />
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(80,190,100,0.5)' }} />
          </div>
          <div className="flex-1 mx-2 bg-white/60 rounded px-2 py-0.5 font-mono" style={{ fontSize: '9px', color: '#9ca3af' }}>
            similia.ru/patients/42
          </div>
        </div>

        {/* Шапка */}
        <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: 'white', borderBottom: '1px solid #ede8e0' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sim-forest)', fontFamily: 'Georgia, serif' }}>Иванова Наталья · Приём №7</div>
          <div style={{ fontSize: '9px', fontWeight: 600, padding: '2px 7px', borderRadius: '6px', backgroundColor: 'rgba(45,106,79,0.1)', color: 'var(--sim-green)' }}>✓ Сохранено</div>
        </div>

        {/* Форма */}
        <div className="p-3 space-y-2.5" style={{ backgroundColor: '#f8f7f4' }}>

          <div>
            <div style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#7a6e64', marginBottom: '3px' }}>Основная жалоба</div>
            <div style={{ borderRadius: '7px', padding: '6px 9px', fontSize: '11px', backgroundColor: 'white', border: '1px solid #6ee7b7', lineHeight: 1.5, color: '#3a2e1a' }}>
              Мигрень 2–3 раза в месяц, правосторонняя, пульсирующая.
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', color: '#c0392b', opacity: 0.8, marginBottom: '3px' }}>Хуже от</div>
              <div style={{ borderRadius: '7px', padding: '5px 9px', fontSize: '11px', backgroundColor: 'white', border: '1px solid #f3ede8', color: '#3a2e1a' }}>яркий свет, шум</div>
            </div>
            <div>
              <div style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', color: '#16a34a', opacity: 0.8, marginBottom: '3px' }}>Лучше от</div>
              <div style={{ borderRadius: '7px', padding: '5px 9px', fontSize: '11px', backgroundColor: 'white', border: '1px solid #f3ede8', color: '#3a2e1a' }}>темнота, сон</div>
            </div>
          </div>

          {/* Назначение */}
          <div style={{ borderRadius: '9px', padding: '8px 12px', backgroundColor: 'rgba(45,106,79,0.08)', border: '1px solid rgba(45,106,79,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--sim-green)' }}>Назначение</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--sim-forest)' }}>Nat-m · 200C</div>
            <div style={{ fontSize: '9px', color: 'var(--sim-text-hint)' }}>1 гранула</div>
          </div>

          {/* Мини-динамика */}
          <div style={{ borderRadius: '9px', padding: '8px 12px', backgroundColor: 'white', border: '1px solid #ede8e0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '9px', color: '#7a6e64', fontWeight: 600 }}>Динамика</div>
            <div style={{ display: 'flex', gap: '10px' }}>
              {([['3↑','#16a34a'], ['0↓','#dc2626'], ['2✓','#2d6a4f']] as [string,string][]).map(([v, c]) => (
                <span key={v} style={{ fontSize: '12px', fontWeight: 700, color: c }}>{v}</span>
              ))}
            </div>
            <div style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px', backgroundColor: 'rgba(22,163,74,0.1)', color: '#16a34a' }}>УЛУЧШЕНИЕ</div>
          </div>
        </div>

        {/* Футер */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 12px', backgroundColor: '#f8f7f4', borderTop: '1px solid #ede8e0' }}>
          <div style={{ fontSize: '9px', color: 'var(--sim-text-hint)' }}>Контроль через 4 нед</div>
          <div style={{ fontSize: '10px', fontWeight: 600, padding: '4px 10px', borderRadius: '7px', color: 'white', backgroundColor: 'var(--sim-green)' }}>Завершить приём</div>
        </div>
      </div>

      {/* Бейдж */}
      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white', borderRadius: '12px', padding: '8px 14px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)', border: '1px solid #f0ebe3', width: 'fit-content', marginLeft: 'auto', marginRight: 'auto' }}>
        <span style={{ fontSize: '16px' }}>📬</span>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>Опрос самочувствия</div>
          <div style={{ fontSize: '10px', color: '#9ca3af' }}>Иванова ответила · 2 мин назад</div>
        </div>
      </div>
    </div>
  )
}

// ─── Данные ───────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>,
    title: 'Реперторий — 74 000+ рубрик',
    desc: 'Repertorium Publicum прямо в браузере. Поиск за секунду, анализ препаратов по весу, назначение одним кликом.',
  },
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
    title: 'Карточки пациентов',
    desc: 'Полная история: жалобы, назначения, динамика по каждому приёму. Открываете карточку — сразу видите всё.',
  },
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" /></svg>,
    title: 'Анкета до приёма',
    desc: 'Пациент заполняет дома — приходит уже описанным. Экономит 20 минут на каждой первичной консультации.',
  },
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    title: 'Опрос самочувствия',
    desc: 'Ссылка после приёма — пациент отвечает за пару минут. Динамика видна в карточке: лучше, хуже, без изменений.',
  },
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.776 48.776 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></svg>,
    title: 'Фото-динамика',
    desc: 'Фото кожи, языка или глаз — до и после. Пациент видит прогресс, которого не замечал сам.',
  },
  {
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>,
    title: 'Расписание приёмов',
    desc: 'Все записи на одном экране. Планируйте из карточки пациента — без бумажного ежедневника.',
  },
]

const VS_ROWS = [
  { label: 'Поиск по пациенту', excel: 'Ctrl+F по строкам', hc: 'Мгновенный поиск' },
  { label: 'Анкета до приёма', excel: 'Ручной ввод на приёме', hc: 'Пациент заполняет сам' },
  { label: 'Опрос самочувствия', excel: 'Звонок вручную', hc: 'Ссылка — пару минут' },
  { label: 'Доступ с телефона', excel: 'Только с компьютера', hc: 'Любое устройство' },
  { label: 'Фото динамики', excel: 'Папка в галерее', hc: 'В карточке пациента' },
  { label: 'Расписание', excel: 'Бумажный ежедневник', hc: 'Встроенный календарь' },
  { label: 'Безопасность данных', excel: 'Файл на компьютере', hc: 'Шифрование, бэкап в РФ' },
]

const PAIN_POINTS = [
  { emoji: '😓', title: 'После приёма — ещё час за компьютером', desc: 'Перенести записи из блокнота в таблицу, найти прошлый реперторий, вспомнить что назначали полгода назад...' },
  { emoji: '🔍', title: 'Реперторий в одном окне, карточка в другом', desc: 'Три открытые вкладки, переключение туда-сюда, потеря фокуса — и это в середине консультации с пациентом.' },
  { emoji: '📞', title: 'Как они себя чувствуют? — только звонить', desc: 'Через 3 недели после назначения вы не знаете, было ли улучшение, пока не позвоните или не ждёте следующего приёма.' },
]

// ─── Страница (серверный компонент) ──────────────────────────────────────

import RefCookieSetter from '@/components/RefCookieSetter'

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-parchment)' }}>
      <Suspense><RefCookieSetter /></Suspense>

      {/* Skip to content — для навигации с клавиатуры */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:text-sm" style={{ color: 'var(--sim-green)' }}>
        Перейти к содержимому
      </a>

      <style>{`
        @keyframes lp-fadeup {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lp-fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .lp-hero-text { animation: lp-fadeup 0.6s ease both; }
        .lp-hero-sub  { animation: lp-fadeup 0.6s 0.1s ease both; }
        .lp-hero-cta  { animation: lp-fadeup 0.5s 0.2s ease both; }
        .lp-hero-note { animation: lp-fadein 0.6s 0.4s ease both; }
        .lp-mockup    { animation: lp-fadeup 0.7s 0.15s ease both; }
        .lp-badge-bottom { animation: lp-fadeup 0.5s 0.8s ease both; animation-fill-mode: both; }
        .lp-badge-top    { animation: lp-fadeup 0.5s 1.0s ease both; animation-fill-mode: both; }
        .lp-feat-card { transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s; }
        .lp-feat-card:hover { border-color: #d4c9b8 !important; box-shadow: 0 4px 16px rgba(0,0,0,0.08); transform: translateY(-2px); }
        .lp-btn { transition: filter 0.2s, box-shadow 0.2s, transform 0.2s; }
        .lp-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .lp-btn-green:hover { box-shadow: 0 8px 32px rgba(45,106,79,0.3); }
        .lp-btn-gold:hover { box-shadow: 0 8px 32px rgba(200,160,53,0.35); }
        .lp-btn-outline:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.08); background-color: rgba(255,255,255,0.05); }
      `}</style>

      {/* ─── Навбар ─── */}
      <header className="sticky top-0 z-40 border-b" style={{ backgroundColor: 'rgba(247,243,237,0.92)', backdropFilter: 'blur(12px)', borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={24} />
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: '500', color: 'var(--sim-forest)', letterSpacing: '0.02em' }}>Similia</span>
          </Link>
          <nav aria-label="Основная навигация" className="flex items-center gap-3">
            <Link href="/demo" className="btn btn-ai btn-sm hidden sm:inline-flex ai-pulse" style={{ animationDuration: '3s' }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
              AI-демо
            </Link>
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Войти</Link>
            <Link href="/register" className="lp-btn lp-btn-green text-sm font-semibold text-white px-4 py-2 rounded-xl" style={{ backgroundColor: 'var(--sim-green)' }}>
              Попробовать бесплатно
            </Link>
          </nav>
        </div>
      </header>

      <main id="main-content">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden pt-12 pb-8 sm:pt-20 sm:pb-16" style={{ backgroundColor: 'var(--color-parchment)' }}>
        <div aria-hidden="true" style={{ position: 'absolute', top: 0, right: 0, width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,106,79,0.07) 0%, transparent 70%)', transform: 'translate(200px, -200px)', pointerEvents: 'none' }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Текст */}
            <div>
              <div className="lp-hero-text inline-flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full mb-6" style={{ backgroundColor: 'rgba(45,106,79,0.1)', border: '1px solid rgba(45,106,79,0.2)', color: 'var(--sim-green)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: '#10b981' }} />
                Бесплатно во время бета-теста
              </div>

              <h1 className="lp-hero-text text-[38px] sm:text-[52px] font-light leading-[1.08] text-gray-900 mb-6" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', letterSpacing: '-0.02em' }}>
                Думайте о пациенте.<br />
                <span style={{ color: 'var(--sim-green)' }}>Не о том, что вы забыли записать.</span>
              </h1>

              <p className="lp-hero-sub text-[17px] leading-relaxed mb-8" style={{ color: 'var(--sim-text-sec)', maxWidth: '420px' }}>
                Карточка пациента, реперторий и опрос самочувствия — в одном окне. Всё сохраняется само, пока вы работаете.
              </p>

              <div className="lp-hero-cta flex flex-wrap items-center gap-3 mb-5">
                <Link href="/register" className="lp-btn lp-btn-green inline-flex items-center gap-2 text-white font-semibold px-6 py-3.5 rounded-xl text-sm" style={{ backgroundColor: 'var(--sim-green)', boxShadow: '0 4px 24px rgba(45,106,79,0.3)' }}>
                  Начать бесплатно
                  <ArrowRight />
                </Link>
                <Link href="/login" className="lp-btn lp-btn-outline inline-flex items-center gap-2 font-medium px-6 py-3.5 rounded-xl text-sm border bg-white" style={{ color: '#4b5563', borderColor: '#e5e7eb' }}>
                  Уже есть аккаунт
                </Link>
              </div>

              <p className="lp-hero-note text-xs text-gray-500">
                Без карты · Регистрация за 1 минуту · Демо-данные включены
              </p>
            </div>

            {/* Макет десктоп */}
            <div className="hidden lg:block">
              <AppMockup />
            </div>

            {/* Макет мобайл */}
            <div className="lg:hidden mt-2">
              <AppMockupMobile />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Боль ─── */}
      <section className="py-16 sm:py-20 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-light text-gray-900 mb-3" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>Узнаёте себя?</h2>
            <p className="text-sm text-gray-500">Это проблемы большинства практикующих гомеопатов</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {PAIN_POINTS.map((p) => (
              <div key={p.title} className="bg-white rounded-2xl p-6 border border-gray-100">
                <div className="text-3xl mb-4">{p.emoji}</div>
                <h3 className="font-semibold text-gray-900 mb-2 leading-snug">{p.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <p className="text-base font-medium mb-4" style={{ color: 'var(--sim-green)' }}>Similia решает все три — в одном приложении</p>
            <Link href="/register" className="lp-btn lp-btn-green inline-flex items-center gap-2 text-white font-semibold px-6 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--sim-green)', boxShadow: '0 4px 20px rgba(45,106,79,0.25)' }}>
              Попробовать — это бесплатно <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── VS ─── */}
      <section className="py-16 sm:py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-light text-gray-900 mb-3 text-center" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>Почему не Excel или тетрадь?</h2>
          <p className="text-center text-sm text-gray-500 mb-10">Сравните, как изменится ваша работа</p>
          <div className="relative overflow-x-auto rounded-2xl shadow-sm">
            {/* Индикатор скролла на мобильном */}
            <p className="text-center text-xs text-gray-400 mb-2 sm:hidden">← свайпните для просмотра →</p>
            <div className="bg-white border border-gray-100 overflow-hidden min-w-[480px]">
              <div className="grid grid-cols-3 border-b border-gray-100">
                <div className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider" />
                <div className="px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center border-l border-gray-100">Excel / тетрадь</div>
                <div className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-center border-l border-gray-100" style={{ color: 'var(--sim-green)' }}>Similia</div>
              </div>
              {VS_ROWS.map((row, i) => (
                <div key={i} className={`grid grid-cols-3 border-b border-gray-50 last:border-b-0 ${i % 2 !== 0 ? 'bg-gray-50/40' : ''}`}>
                  <div className="px-5 py-3.5 text-sm font-medium text-gray-700">{row.label}</div>
                  <div className="px-5 py-3.5 text-sm text-gray-500 border-l border-gray-100">
                    <span className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      {row.excel}
                    </span>
                  </div>
                  <div className="px-5 py-3.5 text-sm border-l border-gray-100 font-medium" style={{ color: 'var(--sim-green)' }}>
                    <span className="flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#2d6a4f" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                      {row.hc}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Цифры ─── */}
      <section className="border-y py-10" style={{ backgroundColor: 'white', borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 text-center">
            {[
              { num: '20 мин', label: 'Экономия на первичном приёме' },
              { num: '74 000+', label: 'Рубрик в реперториуме' },
              { num: '152-ФЗ', label: 'Данные хранятся в России' },
            ].map(s => (
              <div key={s.label}>
                <p className="text-2xl sm:text-3xl font-light mb-1" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-green)' }}>{s.num}</p>
                <p className="text-xs text-gray-600">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Как это работает ─── */}
      <section className="py-16 sm:py-20 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-light text-gray-900 mb-10 text-center" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>Как это работает</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Добавьте пациента', desc: 'Введите имя и контакты. Отправьте ссылку на анкету — пациент заполнит дома сам, вы получите подробные данные ещё до приёма.' },
              { step: '02', title: 'Проведите консультацию', desc: 'Записывайте симптомы, ищите рубрики в реперториуме, назначайте препарат с потенцией и схемой прямо в карточке.' },
              { step: '03', title: 'Следите за результатом', desc: 'Через 2–3 недели — ссылка на опрос. Пациент отвечает за пару минут. Цепочка: назначение → реакция → следующий шаг.' },
            ].map((s) => (
              <div key={s.step}>
                <div className="text-5xl font-light mb-4 leading-none" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'rgba(45,106,79,0.15)' }}>{s.step}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Возможности ─── */}
      <section className="py-16 sm:py-20 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-light text-gray-900 mb-3" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>Всё что нужно практикующему гомеопату</h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">Никакого лишнего. Только то, что реально используется в ежедневной работе.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="lp-feat-card bg-white rounded-2xl p-6 border border-gray-100">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(45,106,79,0.08)', color: 'var(--sim-green)' }}>{f.icon}</div>
                <h3 className="font-semibold text-gray-900 text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/register" className="lp-btn lp-btn-green inline-flex items-center gap-2 text-white font-semibold px-7 py-3.5 rounded-xl text-sm" style={{ backgroundColor: 'var(--sim-green)', boxShadow: '0 4px 20px rgba(45,106,79,0.25)' }}>
              Начать — займёт 1 минуту <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Цены ─── */}
      <section className="py-16 sm:py-20 border-t" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <h2 className="text-3xl sm:text-4xl font-light text-gray-900 mb-3 text-center" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>Сколько это стоит?</h2>
          <p className="text-center text-sm text-gray-500 mb-10">Честно и прозрачно</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="rounded-2xl p-6 border-2" style={{ backgroundColor: 'rgba(45,106,79,0.04)', borderColor: 'rgba(45,106,79,0.3)' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(45,106,79,0.12)', color: 'var(--sim-green)' }}>Сейчас</span>
                <span className="text-3xl font-light" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-green)' }}>0 ₽</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Полный доступ бесплатно</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">Всё работает в полном объёме. Мы в открытой бете и собираем обратную связь от практикующих врачей.</p>
              <ul className="space-y-2 mb-5">
                {['Неограниченное число пациентов', 'Реперторий — 74 000+ рубрик', 'Анкеты, опросы, фото-динамика', 'Данные в России (152-ФЗ)'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#2d6a4f" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className="lp-btn lp-btn-green w-full inline-flex items-center justify-center gap-2 text-white font-semibold px-5 py-3 rounded-xl text-sm" style={{ backgroundColor: 'var(--sim-green)' }}>
                Зарегистрироваться бесплатно <ArrowRight />
              </Link>
            </div>
            <div className="rounded-2xl p-6 border bg-white" style={{ borderColor: '#2d6a4f' }}>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: 'var(--sim-green)' }}>Стандарт</span>
                <div className="text-right">
                  <span className="text-3xl font-light" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-forest)' }}>290 ₽/мес</span>
                  <span className="block text-xs text-gray-400">или 2 900 ₽/год</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--sim-forest)' }}>Безлимитный доступ</h3>
              <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--sim-text-sec)' }}>Безлимит пациентов, экспорт PDF, онлайн-запись, напоминания. Бета-тестеры получают бесплатный доступ.</p>
              <ul className="space-y-2 mb-5">
                {['Безлимит пациентов', 'Экспорт карточки в PDF', 'Онлайн-запись пациентов', 'Напоминания о визитах'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--sim-forest)' }}>
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="#2d6a4f" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/pricing" className="lp-btn lp-btn-green w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: 'var(--sim-green)' }}>Подробнее о тарифах <ArrowRight /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl px-8 sm:px-14 py-12 sm:py-16 text-center" style={{ backgroundColor: 'var(--sim-forest)' }}>
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 30% 50%, rgba(45,106,79,0.3) 0%, transparent 60%)', pointerEvents: 'none' }} />
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-5xl font-light text-white mb-4" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}>Начните прямо сейчас</h2>
              <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: 'rgba(255,255,255,0.70)' }}>Бесплатно · Регистрация займёт минуту · Демо-пациенты уже ждут внутри</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link href="/register" className="lp-btn lp-btn-gold inline-flex items-center gap-2 font-semibold px-8 py-3.5 rounded-xl text-sm" style={{ backgroundColor: 'var(--sim-amber)', color: 'var(--sim-forest)' }}>
                  Создать аккаунт <ArrowRight />
                </Link>
                <Link href="/login" className="lp-btn lp-btn-outline text-sm font-medium px-6 py-3.5 rounded-xl border" style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.85)' }}>Войти</Link>
              </div>
              <p className="text-xs mt-5" style={{ color: 'rgba(255,255,255,0.70)' }}>Первые пользователи получат льготные условия при переходе на платную версию</p>
            </div>
          </div>
        </div>
      </section>

      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t py-10" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Logo size={20} />
                <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '17px', fontWeight: 500, color: 'var(--sim-forest)' }}>Similia</span>
              </div>
              <p className="text-xs text-gray-600">Цифровой кабинет гомеопата · Данные в РФ</p>
              <p className="text-xs text-gray-600 mt-1">© 2026 Similia</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-2">Документы</p>
                <div className="flex flex-col gap-0.5">
                  <Link href="/privacy" className="text-xs text-gray-600 hover:text-gray-900 py-1 transition-colors">Политика конфиденциальности</Link>
                  <Link href="/terms" className="text-xs text-gray-600 hover:text-gray-900 py-1 transition-colors">Публичная оферта</Link>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-2">Аккаунт</p>
                <div className="flex flex-col gap-0.5">
                  <Link href="/login" className="text-xs text-gray-600 hover:text-gray-900 py-1 transition-colors">Войти</Link>
                  <Link href="/register" className="text-xs text-gray-600 hover:text-gray-900 py-1 transition-colors">Зарегистрироваться</Link>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-2">Поддержка</p>
                <div className="flex flex-col gap-0.5">
                  <a href="mailto:simillia@mail.ru" className="text-xs text-gray-600 hover:text-gray-900 py-1 transition-colors">simillia@mail.ru</a>
                  <span className="text-xs text-gray-600">Версия 1.1 бета</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
