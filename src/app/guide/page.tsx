'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

const G = '/guide/new'

type Annotation = {
  top: number; left: number; width: number; height: number
  label: string
}

type GuideImage = {
  desktop: string
  mobile: string
  alt: string
  annotations?: Annotation[] // только на десктопе
}

type Section = {
  id: string
  nav: string
  title: string
  subtitle: string
  images: GuideImage[]
  steps: string[]
  extra?: { label: string; items: string[] }[]
}

const sections: Section[] = [
  {
    id: 'start',
    nav: 'Начало',
    title: 'Начало работы',
    subtitle: 'Регистрация занимает 30 секунд. После входа вы увидите рабочий стол — список пациентов, статистику и приёмы на сегодня. Для знакомства мы создали демо-пациента с заполненной историей.',
    images: [
      { desktop: `${G}/s1-register.png`, mobile: `${G}/m-register.png`, alt: 'Регистрация',
        annotations: [
          { top: 25, left: 53, width: 38, height: 45, label: 'Имя, email, пароль → Зарегистрироваться' },
        ]},
      { desktop: `${G}/s1-dashboard.png`, mobile: `${G}/m-dashboard.png`, alt: 'Рабочий стол',
        annotations: [
          { top: 2, left: 14, width: 74, height: 9, label: 'Демо-пациент — нажмите «Открыть карточку»' },
        ]},
    ],
    steps: [
      'Нажмите «Начать работу» на главной странице сайта',
      'Введите ваше имя, email и придумайте пароль',
      'Готово — вы на рабочем столе',
      'Откройте карточку демо-пациента — посмотрите как выглядит заполненная карточка с историей приёмов',
    ],
  },
  {
    id: 'patients',
    nav: 'Пациенты',
    title: 'Карточка пациента',
    subtitle: 'Все данные пациента в одной карточке: жалобы, консультации, назначения, динамика лечения. Больше не нужно искать записи в папках и тетрадях.',
    images: [
      { desktop: `${G}/s2-patient-card.png`, mobile: `${G}/m-patient-card.png`, alt: 'Карточка пациента',
        annotations: [
          { top: 16, left: 14, width: 55, height: 9, label: '«Начать повторный приём»' },
          { top: 27, left: 14, width: 68, height: 7, label: 'Анкеты, запись на приём, опросник' },
        ]},
    ],
    steps: [
      'На рабочем столе нажмите «+ Добавить пациента»',
      'Заполните имя и контакты — или отправьте пациенту ссылку на анкету, он заполнит сам',
      'Нажмите на имя пациента в списке — откроется карточка',
      'В карточке вверху — кнопки действий, ниже — вся история приёмов и анкет',
    ],
  },
  {
    id: 'forms',
    nav: 'Анкеты',
    title: 'Анкеты и опросники',
    subtitle: 'Отправьте пациенту ссылку в WhatsApp или Telegram — он заполнит анкету дома, в удобное время. Когда придёт на приём, вы уже будете знать жалобы, анамнез и модальности.',
    images: [],
    steps: [
      'Откройте карточку пациента',
      'Выберите тип анкеты (кнопки под именем пациента — см. раздел выше)',
      'Скопируйте появившуюся ссылку → отправьте пациенту',
      'Когда пациент заполнит — ответы появятся в карточке автоматически',
    ],
    extra: [
      { label: 'Три типа анкет', items: [
        'Анкета острого случая — когда пациент обращается с острой жалобой. Короткая, 5 минут',
        'Подробный опросник (15 мин) — перед плановым визитом: сон, аппетит, настроение, реакция на препарат, новые симптомы',
        'Быстрый опрос — всего 3 вопроса: стало лучше, хуже или без изменений. Для контроля между приёмами',
      ]},
    ],
  },
  {
    id: 'consultation',
    nav: 'Приём',
    title: 'Консультация',
    subtitle: 'Записывайте приём как обычно — система сохраняет каждое слово автоматически. После приёма не нужно ничего переписывать — всё уже в карточке.',
    images: [
      { desktop: `${G}/s4-consultation.png`, mobile: `${G}/m-consultation.png`, alt: 'Редактор консультации',
        annotations: [
          { top: 30, left: 1, width: 56, height: 25, label: 'Основная жалоба и симптомы' },
          { top: 2, left: 59, width: 39, height: 20, label: 'Контекст: прошлый приём, опросник' },
        ]},
    ],
    steps: [
      'В карточке пациента нажмите «Начать повторный приём»',
      'Запишите основную жалобу — что беспокоит пациента',
      'Раскройте секции ниже: «Хуже от / Лучше от», «Психика», «Общие симптомы»',
      'Справа — контекст: что назначали в прошлый раз, что пациент ответил в опроснике',
      'Всё сохраняется автоматически — можно закрыть и вернуться позже',
    ],
    extra: [
      { label: 'Хронический или острый приём', items: [
        'Переключатель вверху страницы — выберите тип приёма',
        'Хронический — полная консультация: жалобы, анамнез, модальности, психика',
        'Острый — короткий: жалоба, препарат, дозировка. Для экстренных обращений',
      ]},
    ],
  },
  {
    id: 'repertory',
    nav: 'Реперторий',
    title: 'Реперторий Кента',
    subtitle: 'Полный реперторий Кента — 74 000 рубрик на русском и английском. Вместо того чтобы листать книгу, наберите два слова в поиске.',
    images: [
      { desktop: `${G}/s5-repertory.png`, mobile: `${G}/m-repertory.png`, alt: 'Реперторий — поиск',
        annotations: [
          { top: 1, left: 13, width: 55, height: 6, label: 'Поиск — русский или английский' },
          { top: 10, left: 13, width: 70, height: 5, label: 'Фильтры по главам реперторий' },
        ]},
    ],
    steps: [
      'В меню слева нажмите «Реперторий». Или прямо в консультации — кнопка «Реперторий» справа',
      'Введите симптом: «головная боль слева», «headache left», «кашель ночью»',
      'Нажмите + рядом с нужной рубрикой — она добавится в анализ',
      'Откройте вкладку «Анализ» — там топ препараты по выбранным рубрикам',
    ],
    extra: [
      { label: 'Полезно знать', items: [
        'Жирный шрифт рядом с препаратом — подтверждён клинически (grade 3–4 по Кенту)',
        'Кнопка E рядом с рубрикой — элиминация: препарат обязан быть в этой рубрике, иначе выбывает',
        'Можно фильтровать по главам: Психика, Голова, Грудь, Конечности и другие',
        'Поиск работает и на русском, и на английском — можно комбинировать',
      ]},
    ],
  },
  {
    id: 'prescription',
    nav: 'Назначение',
    title: 'Назначение препарата',
    subtitle: 'Выпишите препарат и отправьте пациенту ссылку — он увидит название, дозировку и правила приёма. Чётко, читаемо, не потеряется.',
    images: [
      { desktop: `${G}/s6-prescription-ctx.png`, mobile: `${G}/m-consultation.png`, alt: 'Назначение внизу консультации',
        annotations: [
          { top: 32, left: 2, width: 52, height: 8, label: 'Препарат — начните набирать название' },
          { top: 42, left: 2, width: 35, height: 8, label: 'Потенция' },
          { top: 92, left: 2, width: 36, height: 7, label: '«Завершить консультацию»' },
        ]},
    ],
    steps: [
      'Внизу страницы консультации — раздел «Назначение»',
      'Начните набирать название препарата — система предложит варианты',
      'Выберите потенцию (6C, 30C, 200C, 1M, LM и другие) и форму приёма',
      'Нажмите «Завершить консультацию»',
      'На следующем экране — кнопка «Отправить назначение пациенту». Пациент получит ссылку с препаратом и вашими правилами приёма',
    ],
  },
  {
    id: 'ai',
    nav: 'AI-анализ',
    title: 'AI-анализ случая',
    subtitle: 'Опишите случай своими словами — система проанализирует симптомы и предложит топ-5 препаратов с обоснованием. Как если бы вы посоветовались с опытным коллегой.',
    images: [
      { desktop: `${G}/s7-ai.png`, mobile: `${G}/m-ai.png`, alt: 'AI-анализ',
        annotations: [
          { top: 25, left: 15, width: 65, height: 15, label: 'Опишите случай — жалобы, модальности, психику' },
        ]},
    ],
    steps: [
      'В меню слева нажмите «AI-анализ»',
      'Опишите случай своими словами — как рассказали бы коллеге: жалобы, что ухудшает и улучшает, психическое состояние, анамнез',
      'Чем подробнее опишете — тем точнее результат. Укажите модальности и peculiar-симптомы',
      'Нажмите «Анализировать» — через несколько секунд получите топ-5 препаратов',
      'AI — это второе мнение, не замена вашему клиническому опыту. Используйте вместе с реперторием',
    ],
    extra: [
      { label: 'Как писать для лучшего результата', items: [
        'Укажите этиологию — «после горя», «после травмы», «с тех пор как...»',
        'Опишите модальности — «хуже утром», «лучше от движения», «хуже в тёплой комнате»',
        'Упомяните психику — «плачет одна», «раздражительный», «страх темноты»',
        'Добавьте peculiar — необычные, характерные симптомы: «одна щека красная, другая бледная»',
      ]},
    ],
  },
  {
    id: 'settings',
    nav: 'Настройки',
    title: 'Настройки',
    subtitle: 'Настройте систему под свою практику: расписание для онлайн-записи, правила приёма препаратов, шаблоны анкет, напоминания о повторных визитах.',
    images: [
      { desktop: `${G}/s8-settings.png`, mobile: `${G}/m-settings.png`, alt: 'Настройки',
        annotations: [
          { top: 30, left: 13, width: 75, height: 20, label: 'Расписание — пациенты записываются сами' },
        ]},
    ],
    steps: [],
    extra: [
      { label: 'Что можно настроить', items: [
        'Расписание приёмов — укажите рабочие дни, часы и длительность. Пациенты смогут записываться сами по ссылке, без звонков',
        'Правила приёма — текст который пациент получит вместе с назначением. Например: «Рассасывать 3 гранулы за 30 мин до еды»',
        'Шаблоны анкет — добавляйте свои вопросы: текстовые поля, чекбоксы, шкалы. Пациент увидит их при заполнении анкеты',
        'Напоминания — система подсветит пациентов, которые давно не приходили',
        'Экспорт — скачайте все данные одной кнопкой',
      ]},
    ],
  },
]

// Скриншот с аннотациями (десктоп) / мобильный скриншот (мобиле)
function AnnotatedImage({ image }: { image: GuideImage }) {
  return (
    <>
      {/* Десктоп — с аннотациями */}
      <div className="hidden sm:block relative sm:pt-7" style={{ borderRadius: '12px', border: '1px solid #e8e0d4', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'visible' }}>
        <div style={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Image src={image.desktop} alt={image.alt} width={1440} height={900} style={{ width: '100%', height: 'auto', display: 'block' }} />
        </div>
        {image.annotations?.map((a, i) => (
          <div key={i} className="absolute pointer-events-none" style={{ top: `calc(28px + ${a.top}%)`, left: `${a.left}%`, width: `${a.width}%`, height: `${a.height}%`, border: '2.5px solid rgba(45,106,79,0.5)', borderRadius: '8px', backgroundColor: 'rgba(45,106,79,0.04)' }}>
            <span className="absolute font-medium px-2.5 py-1 rounded-md whitespace-nowrap" style={{ bottom: '100%', left: '4px', marginBottom: '4px', backgroundColor: '#2d6a4f', color: '#fff', fontSize: '11px', lineHeight: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
              {a.label}
            </span>
          </div>
        ))}
      </div>

      {/* Мобиле — мобильный скриншот без аннотаций */}
      <div className="sm:hidden" style={{ borderRadius: '12px', border: '1px solid #e8e0d4', boxShadow: '0 4px 20px rgba(0,0,0,0.05)', overflow: 'hidden', maxWidth: '320px', margin: '0 auto' }}>
        <Image src={image.mobile} alt={image.alt} width={390} height={844} style={{ width: '100%', height: 'auto', display: 'block' }} />
      </div>
    </>
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
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      { rootMargin: '-30% 0px -60% 0px' }
    )
    for (const s of sections) {
      const el = sectionRefs.current[s.id]
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!navRef.current) return
    const btn = navRef.current.querySelector(`[data-nav="${activeId}"]`)
    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeId])

  function scrollTo(id: string) {
    const el = sectionRefs.current[id]
    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 120, behavior: 'smooth' })
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#faf8f5' }}>
      <header className="sticky top-0 z-50" style={{ backgroundColor: 'rgba(250,248,245,0.95)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
        <div className="max-w-4xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" className="text-sm no-underline" style={{ color: '#8a7e6c' }}>← На главную</Link>
          <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#2d6a4f' }}>Руководство</span>
        </div>
        <nav ref={navRef} className="max-w-4xl mx-auto px-5 pb-3 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {sections.map(s => (
            <button key={s.id} data-nav={s.id} onClick={() => scrollTo(s.id)} className="shrink-0 text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all" style={{ backgroundColor: activeId === s.id ? 'rgba(45,106,79,0.08)' : 'transparent', borderColor: activeId === s.id ? 'rgba(45,106,79,0.25)' : '#e8e0d4', color: activeId === s.id ? '#2d6a4f' : '#8a7e6c' }}>
              {s.nav}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-10">
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

            <h2 className="text-2xl sm:text-3xl mb-3" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, color: '#1a1a0a' }}>
              {section.title}
            </h2>
            <p className="text-base mb-6" style={{ color: '#6b5f4f', lineHeight: 1.75, maxWidth: '640px' }}>
              {section.subtitle}
            </p>

            {section.images.length > 0 && (
              <div className={`mb-8 ${section.images.length > 1 ? 'space-y-4' : ''}`}>
                {section.images.map((img, i) => (
                  <AnnotatedImage key={i} image={img} />
                ))}
              </div>
            )}

            {section.steps.length > 0 && (
              <ol className="space-y-3 mb-6">
                {section.steps.map((step, i) => (
                  <li key={i} className="flex gap-3 items-start">
                    <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold" style={{ backgroundColor: 'rgba(45,106,79,0.08)', color: '#2d6a4f' }}>{i + 1}</span>
                    <span className="text-sm pt-0.5" style={{ color: '#4a4a3a', lineHeight: 1.65 }}>{step}</span>
                  </li>
                ))}
              </ol>
            )}

            {section.extra?.map((block, bi) => (
              <div key={bi} className="mt-6 rounded-xl px-5 py-4" style={{ backgroundColor: 'rgba(45,106,79,0.03)', border: '1px solid rgba(45,106,79,0.08)' }}>
                {block.label && <div className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: '#2d6a4f' }}>{block.label}</div>}
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

        <div className="text-center py-16">
          <div className="mb-2 h-px mx-auto" style={{ maxWidth: '100px', backgroundColor: '#e8e0d4' }} />
          <h2 className="text-2xl sm:text-3xl mb-4 mt-8" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 400, color: '#1a1a0a' }}>
            Попробуйте бесплатно
          </h2>
          <p className="text-sm mb-6" style={{ color: '#8a7e6c' }}>
            5 пациентов, без карты. Все до 31.05.2026 получают тариф Стандарт бесплатно.
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
