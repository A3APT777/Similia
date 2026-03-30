'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const G = '/guide/new'

type Annotation = {
  // Позиция в % от размера картинки
  top: number; left: number; width: number; height: number
  label: string
}

type GuideImage = {
  src: string
  alt: string
  annotations?: Annotation[]
}

type Section = {
  id: string
  nav: string
  title: string
  subtitle: string
  images: GuideImage[]   // Несколько картинок (регистрация + дашборд)
  steps: string[]
  extra?: { label: string; items: string[] }[]
}

const sections: Section[] = [
  {
    id: 'start',
    nav: 'Начало',
    title: 'Начало работы',
    subtitle: 'Регистрация занимает 30 секунд. После входа — рабочий стол с демо-пациентом.',
    images: [
      { src: `${G}/s1-register.png`, alt: 'Страница регистрации',
        annotations: [
          { top: 18, left: 52, width: 42, height: 55, label: 'Заполните имя, email и пароль' },
        ]},
      { src: `${G}/s1-dashboard.png`, alt: 'Рабочий стол после входа',
        annotations: [
          { top: 3, left: 13, width: 75, height: 8, label: 'Демо-пациент — откройте карточку' },
        ]},
    ],
    steps: [
      'Нажмите «Начать работу» на главной странице',
      'Введите имя, email и пароль → нажмите «Зарегистрироваться»',
      'Вы на рабочем столе — здесь список пациентов, статистика и приёмы на сегодня',
      'Мы создали демо-пациента с заполненной историей — откройте карточку чтобы увидеть как всё устроено',
    ],
  },
  {
    id: 'patients',
    nav: 'Пациенты',
    title: 'Пациенты',
    subtitle: 'Все данные пациента в одной карточке — жалобы, консультации, назначения, динамика. Не нужно искать в папках.',
    images: [
      { src: `${G}/s2-patient-card.png`, alt: 'Карточка пациента',
        annotations: [
          { top: 18, left: 13, width: 60, height: 8, label: 'Кнопка «Начать повторный приём»' },
          { top: 28, left: 13, width: 70, height: 6, label: 'Кнопки: анкеты, запись, опросник' },
        ]},
    ],
    steps: [
      'На рабочем столе нажмите «+ Добавить пациента»',
      'Три варианта: заполнить вручную, отправить анкету по ссылке или записать на приём',
      'Нажмите на имя пациента — откроется карточка со всей историей',
      'В карточке: кнопки действий вверху, история консультаций и анкет ниже',
    ],
  },
  {
    id: 'forms',
    nav: 'Анкеты',
    title: 'Анкеты и опросники',
    subtitle: 'Отправьте ссылку в WhatsApp — пациент заполнит анкету дома. Вы придёте на приём уже подготовленным.',
    images: [
      { src: `${G}/s2-patient-card.png`, alt: 'Кнопки анкет в карточке пациента',
        annotations: [
          { top: 28, left: 13, width: 20, height: 6, label: 'Анкета острого случая' },
          { top: 28, left: 34, width: 18, height: 6, label: 'Быстрый опрос' },
          { top: 28, left: 53, width: 28, height: 6, label: 'Подробный опросник' },
        ]},
    ],
    steps: [
      'Откройте карточку пациента',
      'Нажмите нужный тип анкеты — появится ссылка',
      'Скопируйте ссылку → отправьте пациенту в WhatsApp или Telegram',
      'Когда пациент заполнит — данные появятся в карточке автоматически',
    ],
    extra: [
      { label: 'Три типа анкет', items: [
        'Анкета острого случая — когда пациент обращается с острой проблемой',
        'Подробный опросник (15 мин) — перед плановым визитом: сон, аппетит, настроение, реакция на препарат',
        'Быстрый опрос — 3 вопроса: стало лучше, хуже или без изменений',
      ]},
    ],
  },
  {
    id: 'consultation',
    nav: 'Приём',
    title: 'Консультация',
    subtitle: 'Пишите как обычно — система сохраняет автоматически. Не нужно переписывать после приёма.',
    images: [
      { src: `${G}/s4-consultation.png`, alt: 'Редактор консультации',
        annotations: [
          { top: 30, left: 1, width: 58, height: 55, label: 'Жалобы, модальности, психика' },
          { top: 3, left: 60, width: 38, height: 30, label: 'Контекст: предыдущий приём, опросник' },
        ]},
    ],
    steps: [
      'Откройте карточку пациента → нажмите «Начать повторный приём»',
      'Слева — поля для записи: основная жалоба, модальности, психика, общие симптомы',
      'Справа — контекст: предыдущее назначение, ответы опросника, история',
      'Всё сохраняется автоматически — просто пишите',
    ],
    extra: [
      { label: 'Хронический или острый', items: [
        'Переключатель вверху страницы',
        'Хронический — полный приём с анамнезом',
        'Острый — быстрый: жалоба, препарат, дозировка',
      ]},
    ],
  },
  {
    id: 'repertory',
    nav: 'Реперторий',
    title: 'Реперторий Кента',
    subtitle: '74 000 рубрик — весь реперторий в одном поиске. Наберите 2 слова вместо того чтобы листать книгу.',
    images: [
      { src: `${G}/s5-repertory.png`, alt: 'Поиск в реперторие',
        annotations: [
          { top: 1, left: 13, width: 55, height: 6, label: 'Введите симптом на русском или английском' },
          { top: 10, left: 13, width: 70, height: 5, label: 'Фильтры по главам' },
        ]},
    ],
    steps: [
      'В меню слева нажмите «Реперторий» (или в консультации — кнопка «Реперторий» справа)',
      'Введите симптом: «головная боль», «headache left», «кашель ночью»',
      'Нажмите + рядом с рубрикой чтобы добавить в анализ',
      'В разделе «Анализ» — топ препараты по выбранным рубрикам',
    ],
    extra: [
      { label: 'Подсказки', items: [
        'Жирный шрифт = препарат подтверждён клинически (grade 3–4)',
        'Кнопка E = элиминация: препарат должен быть в этой рубрике',
        'Фильтры по главам: Mind, Head, Chest и другие',
      ]},
    ],
  },
  {
    id: 'prescription',
    nav: 'Назначение',
    title: 'Назначение препарата',
    subtitle: 'Пациент получает ссылку с препаратом и правилами приёма — чётко, читаемо, не потеряется.',
    images: [
      { src: `${G}/s6-prescription.png`, alt: 'Форма назначения',
        annotations: [
          { top: 17, left: 1, width: 60, height: 8, label: 'Начните набирать — система подскажет' },
          { top: 26, left: 1, width: 40, height: 8, label: 'Потенция' },
          { top: 36, left: 1, width: 30, height: 7, label: 'Форма приёма' },
          { top: 85, left: 1, width: 40, height: 8, label: '«Завершить консультацию»' },
        ]},
    ],
    steps: [
      'Внизу консультации: начните набирать название — система подскажет',
      'Выберите потенцию, форму (гранулы, раствор, ольфакция), количество',
      'Нажмите «Завершить консультацию»',
      'Нажмите «Отправить назначение пациенту» — появится ссылка',
      'Пациент увидит: препарат, дозировку и ваши правила приёма',
    ],
  },
  {
    id: 'ai',
    nav: 'AI-анализ',
    title: 'AI-анализ случая',
    subtitle: 'Как второе мнение коллеги — опишите случай словами, система предложит топ-5 препаратов с обоснованием.',
    images: [
      { src: `${G}/s7-ai.png`, alt: 'AI-анализ',
        annotations: [
          { top: 25, left: 15, width: 65, height: 15, label: 'Опишите случай своими словами' },
        ]},
    ],
    steps: [
      'В меню слева — «AI-анализ»',
      'Опишите случай своими словами: жалобы, модальности, психику, анамнез',
      'Нажмите «Анализировать» — система покажет топ-5 препаратов',
      'Это не замена реперторию — используйте вместе для проверки',
    ],
  },
  {
    id: 'settings',
    nav: 'Настройки',
    title: 'Настройки',
    subtitle: 'Пациенты записываются сами по ссылке — без звонков. Настройте расписание, правила приёма, шаблоны анкет.',
    images: [
      { src: `${G}/s8-settings.png`, alt: 'Настройки',
        annotations: [
          { top: 30, left: 13, width: 75, height: 20, label: 'Расписание — пациенты увидят свободные слоты' },
        ]},
    ],
    steps: [],
    extra: [
      { label: '', items: [
        'Расписание — рабочие дни, часы, длительность приёма. Пациенты увидят свободные слоты',
        'Правила приёма — текст который пациент получит вместе с назначением',
        'Шаблоны анкет — добавляйте свои вопросы в анкеты',
        'Экспорт данных — скачать все данные',
      ]},
    ],
  },
]

// Компонент скриншота с аннотациями
function AnnotatedImage({ image }: { image: GuideImage }) {
  return (
    <div className="relative overflow-hidden" style={{ borderRadius: '12px', border: '1px solid #e8e0d4', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
      <Image
        src={image.src}
        alt={image.alt}
        width={1440}
        height={900}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      />
      {image.annotations?.map((a, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={{
            top: `${a.top}%`,
            left: `${a.left}%`,
            width: `${a.width}%`,
            height: `${a.height}%`,
            border: '2px solid rgba(45,106,79,0.6)',
            borderRadius: '8px',
            backgroundColor: 'rgba(45,106,79,0.04)',
          }}
        >
          <span
            className="absolute text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap"
            style={{
              top: '-12px',
              left: '8px',
              backgroundColor: '#2d6a4f',
              color: '#fff',
              fontSize: '10px',
              lineHeight: '18px',
            }}
          >
            {a.label}
          </span>
        </div>
      ))}
    </div>
  )
}

export default function GuidePage() {
  const [activeId, setActiveId] = useState(sections[0].id)
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const navRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id)
          }
        }
      },
      { rootMargin: '-30% 0px -60% 0px' }
    )
    for (const section of sections) {
      const el = sectionRefs.current[section.id]
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!navRef.current) return
    const activeBtn = navRef.current.querySelector(`[data-nav="${activeId}"]`)
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }, [activeId])

  function scrollTo(id: string) {
    const el = sectionRefs.current[id]
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 120
      window.scrollTo({ top, behavior: 'smooth' })
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf8f5' }}>
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ backgroundColor: 'rgba(250,248,245,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" className="text-sm no-underline" style={{ color: '#8a7e6c' }}>← На главную</Link>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#2d6a4f' }}>Руководство</span>
        </div>
        <nav ref={navRef} className="max-w-4xl mx-auto px-5 pb-3 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {sections.map(s => (
            <button
              key={s.id}
              data-nav={s.id}
              onClick={() => scrollTo(s.id)}
              className="shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all"
              style={{
                backgroundColor: activeId === s.id ? 'rgba(45,106,79,0.08)' : 'transparent',
                borderColor: activeId === s.id ? 'rgba(45,106,79,0.25)' : '#e8e0d4',
                color: activeId === s.id ? '#2d6a4f' : '#8a7e6c',
              }}
            >
              {s.nav}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-10">
        {/* Вступление */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl mb-4" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, color: '#1a1a0a', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
            Как работать<br />в Similia
          </h1>
          <p className="text-base mx-auto" style={{ color: '#8a7e6c', maxWidth: '480px', lineHeight: 1.7 }}>
            Пошаговое руководство по всем функциям.<br />
            Нажмите на раздел выше или листайте вниз.
          </p>
        </div>

        {sections.map((section, idx) => (
          <section key={section.id} id={section.id} ref={el => { sectionRefs.current[section.id] = el }} className="mb-20">
            {idx > 0 && (
              <div className="mb-10 flex items-center gap-4">
                <div className="flex-1 h-px" style={{ backgroundColor: '#e8e0d4' }} />
                <span className="text-xs font-medium uppercase tracking-widest" style={{ color: '#b5a99a' }}>{idx + 1} / {sections.length}</span>
                <div className="flex-1 h-px" style={{ backgroundColor: '#e8e0d4' }} />
              </div>
            )}

            <h2 className="text-2xl sm:text-3xl mb-3" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, color: '#1a1a0a', letterSpacing: '-0.01em' }}>
              {section.title}
            </h2>
            <p className="text-base mb-6" style={{ color: '#6b5f4f', lineHeight: 1.75, maxWidth: '640px' }}>
              {section.subtitle}
            </p>

            {/* Скриншоты с аннотациями */}
            <div className={`mb-8 ${section.images.length > 1 ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : ''}`}>
              {section.images.map((img, i) => (
                <AnnotatedImage key={i} image={img} />
              ))}
            </div>

            {/* Шаги */}
            {section.steps.length > 0 && (
              <ol className="space-y-3 mb-6">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: 'rgba(45,106,79,0.08)', color: '#2d6a4f' }}>
                      {i + 1}
                    </span>
                    <span className="text-sm pt-0.5" style={{ color: '#4a4a3a', lineHeight: 1.65 }}>{step}</span>
                  </li>
                ))}
              </ol>
            )}

            {section.extra?.map((block, bi) => (
              <div key={bi} className="mt-6 rounded-xl px-5 py-4" style={{ backgroundColor: 'rgba(45,106,79,0.03)', border: '1px solid rgba(45,106,79,0.08)' }}>
                {block.label && (
                  <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#2d6a4f' }}>{block.label}</div>
                )}
                <ul className="space-y-2">
                  {block.items.map((item, ii) => (
                    <li key={ii} className="text-sm flex gap-2 items-start" style={{ color: '#4a4a3a', lineHeight: 1.65 }}>
                      <span style={{ color: '#2d6a4f', marginTop: '2px' }}>•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ))}

        {/* CTA */}
        <div className="text-center py-16">
          <div className="mb-2 h-px mx-auto" style={{ maxWidth: '100px', backgroundColor: '#e8e0d4' }} />
          <h2 className="text-2xl sm:text-3xl mb-4 mt-8" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, color: '#1a1a0a' }}>
            Попробуйте бесплатно
          </h2>
          <p className="text-sm mb-6" style={{ color: '#8a7e6c' }}>
            5 пациентов, без карты. Все до 31.05.2026 получают Стандарт бесплатно.
          </p>
          <Link href="/register" className="inline-block text-sm font-medium px-8 py-3 rounded-full no-underline transition-all hover:scale-105" style={{ backgroundColor: '#1e3a2f', color: '#f7f3ed' }}>
            Начать работу →
          </Link>
          <div className="mt-6 flex justify-center gap-6">
            <Link href="/pricing" className="text-xs no-underline" style={{ color: '#2d6a4f' }}>Тарифы</Link>
            <Link href="mailto:simillia@mail.ru" className="text-xs no-underline" style={{ color: '#8a7e6c' }}>simillia@mail.ru</Link>
          </div>
        </div>
      </main>
    </div>
  )
}
