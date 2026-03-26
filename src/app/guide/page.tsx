'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'

type Slide = {
  part: string
  title: string
  description: string
  image: string                // Основное изображение
  focus?: { image: string; label: string }  // Кроп-деталь
  pair?: { image: string; label: string }   // Второе изображение (до→после)
}

const G = '/guide/final'

const slides: Slide[] = [
  // ═══ ЗНАКОМСТВО ═══
  {
    part: 'Знакомство',
    image: `${G}/01-landing.png`,
    focus: { image: `${G}/01-cta.png`, label: 'Нажмите «Начать работу»' },
    title: 'Добро пожаловать',
    description: 'Similia — цифровой кабинет для гомеопата. Нажмите «Начать работу» в правом верхнем углу сайта.',
  },
  {
    part: 'Знакомство',
    image: `${G}/02-register.png`,
    focus: { image: `${G}/02-form.png`, label: 'Заполните форму' },
    title: 'Регистрация',
    description: 'Введите имя, email и пароль. Поставьте галочку согласия. На почту придёт письмо — нажмите ссылку для подтверждения.',
  },
  {
    part: 'Знакомство',
    image: `${G}/03-dashboard.png`,
    title: 'Ваш рабочий стол',
    description: 'После входа — дашборд со списком пациентов, статистикой и быстрыми действиями. Для знакомства есть демо-пациент.',
  },
  {
    part: 'Знакомство',
    image: `${G}/03-dashboard.png`,
    focus: { image: `${G}/04-sidebar.png`, label: 'Меню навигации' },
    title: 'Навигация',
    description: 'Слева — меню: Главная, Пациенты, Реперторий, AI-анализ, Настройки. Чем больше пациентов — тем больше функций открывается.',
  },

  // ═══ ДОБАВЛЕНИЕ ПАЦИЕНТА ═══
  {
    part: 'Добавить пациента',
    image: `${G}/05-add-btn.png`,
    pair: { image: `${G}/05-add-dropdown.png`, label: 'Откроется меню' },
    title: 'Как добавить пациента',
    description: 'Нажмите «+ Добавить пациента». Три варианта: отправить анкету новому, предконсультационный опросник существующему, или заполнить карточку вручную.',
  },
  {
    part: 'Добавить пациента',
    image: `${G}/06-patient-form.png`,
    title: 'Заполнить вручную',
    description: 'Имя, дата рождения, пол, телефон. Конституциональный тип — система подскажет. Нажмите «Сохранить».',
  },
  {
    part: 'Добавить пациента',
    image: `${G}/btn-анкета-острого.png`,
    pair: { image: `${G}/07-intake-link.png`, label: 'Появится ссылка для отправки' },
    title: 'Отправить анкету по ссылке',
    description: 'Нажмите «Анкета» на карточке пациента. Появится ссылка — скопируйте и отправьте в мессенджер. Пациент заполнит анкету сам, данные появятся в карточке.',
  },
  {
    part: 'Добавить пациента',
    image: `${G}/btn-записать-на-приём.png`,
    pair: { image: `${G}/10-schedule-form.png`, label: 'Форма записи на приём' },
    title: 'Запись через ссылку',
    description: 'Нажмите «Записать на приём». Выберите дату и время. Или отправьте пациенту ссылку — он сам выберет из вашего расписания.',
  },

  // ═══ КАРТОЧКА ПАЦИЕНТА ═══
  {
    part: 'Карточка пациента',
    image: `${G}/08-patient-card.png`,
    focus: { image: `${G}/08-hero.png`, label: 'Информация о пациенте' },
    title: 'Всё в одном месте',
    description: 'Карточка: имя, возраст, конституция, текущее лечение, динамика. Нажмите на пациента в списке чтобы открыть.',
  },
  {
    part: 'Карточка пациента',
    image: `${G}/08-patient-card.png`,
    focus: { image: `${G}/09-actions.png`, label: 'Кнопки действий' },
    title: 'Быстрые действия',
    description: '«Начать повторный приём» — консультация. «Записать на приём» — планирует визит. «Анкета острого случая» — для экстренных обращений. «Подробный опросник» — перед визитом. «Быстрый опрос» — самочувствие.',
  },
  {
    part: 'Карточка пациента',
    image: `${G}/11-intakes-section.png`,
    title: 'Анкеты и история',
    description: 'Ниже — заполненные анкеты, история консультаций. Всё что пациент заполнил по ссылке появляется автоматически.',
  },
  {
    part: 'Карточка пациента',
    image: `${G}/btn-подробный-опросник.png`,
    pair: { image: `${G}/12-survey-link.png`, label: 'Появится ссылка на опросник' },
    title: 'Опросник перед визитом',
    description: 'Нажмите «Подробный опросник (15 мин)». Пациент ответит: состояние, реакция на препарат, сон, аппетит, настроение. Ответы появятся в консультации.',
  },

  // ═══ КОНСУЛЬТАЦИЯ ═══
  {
    part: 'Консультация',
    image: `${G}/btn-начать-повторный.png`,
    pair: { image: `${G}/13-consultation.png`, label: 'Откроется редактор консультации' },
    title: 'Начинаем приём',
    description: 'Нажмите «Начать повторный приём». Откроется редактор: слева жалобы, справа контекст. Автосохранение каждые 2 секунды.',
  },
  {
    part: 'Консультация',
    image: `${G}/14-complaints.png`,
    title: 'Запись жалоб',
    description: 'Основная жалоба — верхнее поле. Ниже раскройте: «С чего началось», «Хуже от / Лучше от», «Психика», «Общие симптомы».',
  },
  {
    part: 'Консультация',
    image: `${G}/14-right-panel.png`,
    title: 'Правая панель — контекст',
    description: 'Справа — предыдущее назначение, ответы опросника, история. Не нужно листать карточку — всё перед глазами.',
  },
  {
    part: 'Консультация',
    image: `${G}/13-consultation.png`,
    title: 'Пример: хронический случай',
    description: 'Женщина 42 года. Головные боли слева, хуже от солнца, лучше от давления. Плачет наедине, хуже от утешения. Желание солёного. Горе 2 года назад.',
  },

  // ═══ РЕПЕРТОРИЙ ═══
  {
    part: 'Реперторий',
    image: `${G}/17-repertory.png`,
    title: 'Реперторий Кента — 74 000+ рубрик',
    description: 'Отдельная страница для глубокого анализа. Поиск на русском и английском, фильтры по главам.',
  },
  {
    part: 'Реперторий',
    image: `${G}/17-repertory-results.png`,
    title: 'Поиск и анализ',
    description: 'Введите «головная боль» или «headache left». Нажмите + для добавления. Жирный = подтверждён клинически. Кнопка E — элиминация.',
  },

  // ═══ НАЗНАЧЕНИЕ ═══
  {
    part: 'Назначение',
    image: `${G}/16-prescription.png`,
    title: 'Выписываем препарат',
    description: 'Внизу консультации: препарат (система подскажет), потенция (6C–LM6), форма (сухая доза, раствор, ольфакция), гранулы.',
  },
  {
    part: 'Назначение',
    image: `${G}/13-consultation.png`,
    title: 'Отправка пациенту',
    description: '«Завершить приём» → «Отправить назначение». Пациент получит ссылку с препаратом и правилами приёма.',
  },

  // ═══ AI ═══
  {
    part: 'AI-анализ',
    image: `${G}/18-ai.png`,
    title: 'AI-ассистент',
    description: 'Опишите случай своими словами. AI предложит топ-5 препаратов с обоснованием. Как второе мнение коллеги.',
  },

  // ═══ НАСТРОЙКИ ═══
  {
    part: 'Настройки',
    image: `${G}/19-settings.png`,
    title: 'Настройте под себя',
    description: 'Расписание (дни, часы), правила приёма (отправляются пациенту), напоминания, экспорт данных, смена пароля.',
  },

  // ═══ РЕФЕРАЛЫ ═══
  {
    part: 'Рефералы',
    image: `${G}/20-referral.png`,
    focus: { image: `${G}/20-ref-link.png`, label: 'Ваша реферальная ссылка' },
    title: 'Пригласите коллегу',
    description: 'Скопируйте ссылку, отправьте коллеге. При оплате — вам +7 дней, ему +14 дней.',
  },

  // ═══ ТАРИФЫ ═══
  {
    part: 'Тарифы',
    image: `${G}/21-pricing.png`,
    title: 'Тарифы',
    description: 'Бесплатно: 5 пациентов. Стандарт (490 ₽/мес): безлимит. AI Pro (1 990 ₽/мес): + AI-анализ. Бета — Стандарт бесплатно.',
  },

  // ═══ ФИНАЛ ═══
  {
    part: 'Начните',
    image: `${G}/01-landing.png`,
    title: 'Всё готово',
    description: 'Анкеты до визита, реперторий в консультации, назначения по ссылке, контроль самочувствия. Попробуйте бесплатно.',
  },
]

export default function GuidePage() {
  const [current, setCurrent] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const slide = slides[current]
  const parts = [...new Set(slides.map(s => s.part))]
  const currentPartIndex = parts.indexOf(slide.part)

  const goNext = useCallback(() => setCurrent(c => Math.min(slides.length - 1, c + 1)), [])
  const goPrev = useCallback(() => setCurrent(c => Math.max(0, c - 1)), [])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); goNext() }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goPrev() }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [goNext, goPrev])

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [current])

  const imgStyle = { width: '100%' as const, height: 'auto' as const, display: 'block' as const }
  const cardStyle = { borderRadius: '12px', overflow: 'hidden' as const, border: '1px solid #e8e0d4', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }
  const focusCardStyle = { borderRadius: '10px', overflow: 'hidden' as const, border: '1.5px solid rgba(45,106,79,0.25)', boxShadow: '0 2px 16px rgba(45,106,79,0.08)', maxWidth: '600px' }
  const labelStyle = { fontSize: '11px', fontWeight: 600 as const, textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: '8px', display: 'flex', alignItems: 'center' as const, gap: '6px' }
  const lineStyle = { display: 'inline-block', width: '16px', height: '2px', borderRadius: '1px' }

  return (
    <div
      style={{ minHeight: '100vh', backgroundColor: '#faf8f5' }}
      onTouchStart={e => setTouchStart(e.touches[0].clientX)}
      onTouchEnd={e => { const d = touchStart - e.changedTouches[0].clientX; if (d > 60) goNext(); if (d < -60) goPrev() }}
    >
      {/* Прогресс */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: '3px', backgroundColor: '#e8e0d4' }}>
        <div style={{ height: '100%', width: `${((current + 1) / slides.length) * 100}%`, backgroundColor: '#2d6a4f', transition: 'width 0.4s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 99, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', backgroundColor: 'rgba(250,248,245,0.92)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link href="/" style={{ fontSize: '13px', color: '#8a7e6c', textDecoration: 'none' }}>← На главную</Link>
          <span style={{ width: '1px', height: '16px', backgroundColor: '#e8e0d4' }} />
          <span style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.12em', color: '#2d6a4f' }}>{slide.part}</span>
        </div>
        <span style={{ fontSize: '12px', color: '#8a7e6c', fontVariantNumeric: 'tabular-nums' }}>{current + 1} / {slides.length}</span>
      </header>

      {/* Контент */}
      <main style={{ maxWidth: '880px', margin: '0 auto', padding: '32px 20px 80px' }}>

        {/* Пара: до → после */}
        {slide.pair ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div>
              <div style={{ ...labelStyle, color: '#8a7e6c' }}><span style={{ ...lineStyle, backgroundColor: '#8a7e6c' }} />Нажмите</div>
              <div style={cardStyle}><Image src={slide.image} alt="" width={700} height={500} style={imgStyle} priority /></div>
            </div>
            <div>
              <div style={{ ...labelStyle, color: '#2d6a4f' }}><span style={{ ...lineStyle, backgroundColor: '#2d6a4f' }} />{slide.pair.label}</div>
              <div style={focusCardStyle}><Image src={slide.pair.image} alt="" width={700} height={500} style={imgStyle} /></div>
            </div>
          </div>
        ) : (
          <>
            {/* Основное изображение */}
            <div onClick={goNext} style={{ ...cardStyle, cursor: 'pointer', marginBottom: slide.focus ? '16px' : '24px' }}>
              <Image src={slide.image} alt={slide.title} width={1440} height={900} style={imgStyle} priority />
            </div>

            {/* Кроп-фокус */}
            {slide.focus && (
              <div style={{ marginBottom: '24px' }}>
                <div style={{ ...labelStyle, color: '#2d6a4f' }}><span style={{ ...lineStyle, backgroundColor: '#2d6a4f' }} />{slide.focus.label}</div>
                <div style={focusCardStyle}><Image src={slide.focus.image} alt={slide.focus.label} width={800} height={400} style={imgStyle} /></div>
              </div>
            )}
          </>
        )}

        {/* Навигация */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', gap: '16px' }}>
          <button onClick={goPrev} disabled={current === 0} style={{ fontSize: '13px', fontWeight: 500, padding: '10px 20px', borderRadius: '100px', border: '1px solid #e8e0d4', backgroundColor: 'transparent', color: current === 0 ? '#d4cdc2' : '#1a1a0a', cursor: current === 0 ? 'default' : 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>← Назад</button>
          <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' as const, justifyContent: 'center' }}>
            {slides.map((_, i) => (
              <button key={i} onClick={() => setCurrent(i)} aria-label={`Слайд ${i + 1}`} style={{ width: i === current ? '18px' : '5px', height: '5px', borderRadius: '100px', border: 'none', padding: 0, backgroundColor: i === current ? '#2d6a4f' : i < current ? 'rgba(45,106,79,0.25)' : '#e8e0d4', cursor: 'pointer', transition: 'all 0.3s' }} />
            ))}
          </div>
          {current < slides.length - 1 ? (
            <button onClick={goNext} style={{ fontSize: '13px', fontWeight: 500, padding: '10px 20px', borderRadius: '100px', border: 'none', backgroundColor: '#1e3a2f', color: '#f7f3ed', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>Далее →</button>
          ) : (
            <Link href="/register" style={{ fontSize: '13px', fontWeight: 500, padding: '10px 20px', borderRadius: '100px', backgroundColor: '#1e3a2f', color: '#f7f3ed', textDecoration: 'none', flexShrink: 0 }}>Попробовать →</Link>
          )}
        </div>

        {/* Текст */}
        <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '28px', fontWeight: 400, color: '#1a1a0a', marginBottom: '8px', letterSpacing: '-0.02em', lineHeight: 1.2 }}>{slide.title}</h1>
        <p style={{ fontSize: '15px', lineHeight: 1.75, color: '#6b5f4f', maxWidth: '640px' }}>{slide.description}</p>

        {/* Секции */}
        <div style={{ display: 'flex', gap: '6px', marginTop: '28px', flexWrap: 'wrap' as const }}>
          {parts.map((part, i) => (
            <button key={part} onClick={() => setCurrent(slides.findIndex(s => s.part === part))} style={{ fontSize: '11px', fontWeight: 500, padding: '5px 12px', borderRadius: '100px', border: i === currentPartIndex ? '1px solid rgba(45,106,79,0.3)' : '1px solid #e8e0d4', backgroundColor: i === currentPartIndex ? 'rgba(45,106,79,0.06)' : 'transparent', color: i === currentPartIndex ? '#2d6a4f' : '#8a7e6c', cursor: 'pointer', transition: 'all 0.2s' }}>{part}</button>
          ))}
        </div>
        <div style={{ textAlign: 'center', padding: '24px 0 0', fontSize: '11px', color: '#b5a99a' }}>← → клавиатура · свайп · клик по картинке</div>
      </main>
    </div>
  )
}
