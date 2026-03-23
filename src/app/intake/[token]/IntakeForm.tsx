'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { submitIntake, bookIntakeAppointment, submitDoctorIntake } from '@/lib/actions/intake'
import { getBookedSlots } from '@/lib/actions/newPatient'
import { generateSlots, ScheduleConfig } from '@/lib/slots'
import { IntakeAnswers, IntakeType } from '@/types'

// ─── Типы полей ───────────────────────────────────────────────────────────────

type FieldType = 'textarea' | 'text' | 'date' | 'tel' | 'chips' | 'chips-multi' | 'scale'

type Field = {
  key: string
  label: string
  placeholder?: string
  type: FieldType
  options?: string[]
  required?: boolean
  hint?: string
}

type Step = {
  title: string
  subtitle: string
  fields: Field[]
}

// ─── Шаг с личными данными ────────────────────────────────────────────────────

const PERSONAL_STEP: Step = {
  title: 'Ваши данные',
  subtitle: 'Эта информация нужна для создания вашей карточки у врача',
  fields: [
    {
      key: 'patient_name',
      label: 'Полное имя (ФИО)',
      type: 'text',
      placeholder: 'Иванова Анна Петровна',
      required: true,
    },
    {
      key: 'patient_birth_date',
      label: 'Дата рождения',
      type: 'date',
      required: true,
    },
    {
      key: 'patient_phone',
      label: 'Телефон',
      type: 'tel',
      placeholder: '+7 (999) 123-45-67',
      required: true,
    },
    {
      key: 'patient_email',
      label: 'Email (необязательно)',
      type: 'text',
      placeholder: 'example@mail.ru',
    },
  ],
}

// ─── Шаги первичной анкеты ────────────────────────────────────────────────────

const PRIMARY_STEPS: Step[] = [
  {
    title: 'Главные жалобы',
    subtitle: 'Расскажите своими словами, что вас беспокоит',
    fields: [
      {
        key: 'chief_complaint',
        label: 'Что вас беспокоит больше всего?',
        type: 'textarea',
        placeholder: 'Опишите подробно — здесь нет правильных или неправильных ответов...',
        required: true,
      },
      {
        key: 'duration',
        label: 'Как давно это продолжается?',
        type: 'text',
        placeholder: 'Например: 3 месяца, с детства, после стресса год назад...',
      },
      {
        key: 'cause',
        label: 'Как вы думаете, что могло стать причиной?',
        type: 'textarea',
        placeholder: 'Стресс, переохлаждение, переезд, потеря близкого, болезнь, прививка, операция...',
        hint: 'Момент, после которого всё изменилось — это очень важно для подбора лечения',
      },
    ],
  },
  {
    title: 'Характерное',
    subtitle: 'Эти детали помогают выбрать именно ваш препарат',
    fields: [
      {
        key: 'consolation',
        label: 'Утешение — как вы реагируете, когда вам плохо и кто-то вас жалеет?',
        type: 'chips',
        options: ['Становится легче, хочется внимания', 'Нейтрально', 'Раздражает, хочется побыть одному'],
        hint: 'Реакция на утешение — один из ключевых симптомов в гомеопатии',
      },
      {
        key: 'concomitants',
        label: 'Есть ли симптомы, которые появляются одновременно с основной жалобой?',
        type: 'textarea',
        placeholder: 'Например: во время головной боли тошнит; при боли в животе хочется лежать согнувшись; при тревоге потеют ладони...',
      },
      {
        key: 'peculiar',
        label: 'Есть ли что-то странное или необычное в ваших симптомах?',
        type: 'textarea',
        placeholder: 'Например: тепло улучшает, хотя при воспалении обычно наоборот; боль исчезает при еде; хуже от покоя, лучше от движения...',
        hint: 'Нетипичные, странные особенности, которые вас самих удивляют — они особенно ценны',
      },
    ],
  },
  {
    title: 'Ощущения',
    subtitle: 'Чем точнее вы опишете — тем точнее будет назначение',
    fields: [
      {
        key: 'sensation',
        label: 'Как можно описать само ощущение?',
        type: 'textarea',
        placeholder: 'Жгучее, давящее, колющее, тянущее, пульсирующее, сжимающее, сверлящее...',
      },
      {
        key: 'location',
        label: 'Где именно?',
        type: 'text',
        placeholder: 'Голова, живот, спина, справа, слева, снаружи, глубоко внутри...',
      },
      {
        key: 'radiation',
        label: 'Отдаёт ли куда-то?',
        type: 'text',
        placeholder: 'Если не отдаёт — оставьте пустым',
      },
      {
        key: 'intensity',
        label: 'Насколько это вам мешает жить?',
        type: 'scale',
      },
    ],
  },
  {
    title: 'Что влияет на симптомы',
    subtitle: 'Что ухудшает и улучшает ваше состояние — это ключевое для подбора лечения',
    fields: [
      {
        key: 'worse_from',
        label: 'Что ухудшает самочувствие?',
        type: 'textarea',
        placeholder: 'Холод, тепло, движение, покой, одиночество, шум, определённая еда, вечер, ночь, перед грозой...',
      },
      {
        key: 'better_from',
        label: 'Что улучшает?',
        type: 'textarea',
        placeholder: 'Тепло, свежий воздух, движение, отдых, общение, горячий душ, давление на больное место...',
      },
      {
        key: 'time_worse',
        label: 'В какое время суток хуже всего?',
        type: 'text',
        placeholder: 'Утром после пробуждения, в 3 ночи, после обеда, на закате...',
      },
    ],
  },
  {
    title: 'Общее состояние',
    subtitle: 'В гомеопатии важно всё тело, а не только симптом',
    fields: [
      {
        key: 'thermal',
        label: 'Как вы переносите температуру?',
        type: 'chips',
        options: ['Сильно мёрзну', 'Слегка мёрзну', 'Нейтрально', 'Обычно жарко', 'Всегда очень жарко'],
      },
      {
        key: 'thirst',
        label: 'Жажда',
        type: 'chips',
        options: ['Почти не пью', 'Пью умеренно', 'Пью много', 'Постоянно хочу пить'],
      },
      {
        key: 'thirst_temp',
        label: 'Какое питьё предпочитаете?',
        type: 'chips',
        options: ['Только холодное', 'Прохладное', 'Комнатной температуры', 'Тёплое', 'Только горячее'],
      },
      {
        key: 'perspiration',
        label: 'Потливость',
        type: 'chips',
        options: ['Почти не потею', 'Нормальная', 'Повышенная', 'Очень сильная'],
      },
      {
        key: 'perspiration_where',
        label: 'Где потеете больше всего? (необязательно)',
        type: 'text',
        placeholder: 'Голова, подмышки, ладони, стопы, всё тело, грудь...',
      },
      {
        key: 'perspiration_when',
        label: 'Когда больше потеете?',
        type: 'chips',
        options: ['Ночью во сне', 'При малейшем усилии', 'От волнения', 'Во время еды', 'Нет особого паттерна'],
      },
      {
        key: 'energy',
        label: 'Как меняется энергия в течение дня?',
        type: 'textarea',
        placeholder: 'Утром тяжело вставать? Усталость после обеда? Вечером бодрее?',
      },
    ],
  },
  {
    title: 'Сон и питание',
    subtitle: 'Эти детали помогают найти нужный препарат',
    fields: [
      {
        key: 'sleep',
        label: 'Как вы спите?',
        type: 'textarea',
        placeholder: 'Легко засыпаете? Просыпаетесь ночью? В какое время? Любимая поза? Качество сна...',
      },
      {
        key: 'dreams',
        label: 'Есть ли характерные или повторяющиеся сны?',
        type: 'text',
        placeholder: 'Если есть — опишите коротко, если нет — оставьте пустым',
      },
      {
        key: 'food_desires',
        label: 'Что вы очень любите есть?',
        type: 'text',
        placeholder: 'Солёное, сладкое, острое, кислое, молочное, мясо, яйца, жирное...',
      },
      {
        key: 'food_aversions',
        label: 'Что не переносите или вызывает реакцию?',
        type: 'text',
        placeholder: 'Жирное, молоко, яйца, определённые фрукты, мясо...',
      },
    ],
  },
  {
    title: 'Психоэмоциональное',
    subtitle: 'В гомеопатии душа и тело неразделимы',
    fields: [
      {
        key: 'emotional',
        label: 'Как вы себя чувствуете эмоционально последнее время?',
        type: 'textarea',
        placeholder: 'Подавленность, тревога, раздражительность, апатия, спокойствие, беспокойство...',
      },
      {
        key: 'stress',
        label: 'Как вы реагируете на стресс?',
        type: 'textarea',
        placeholder: 'Уходите в себя, плачете, злитесь, становитесь активнее, заболеваете...',
      },
      {
        key: 'weeping',
        label: 'Слёзы — как у вас с этим?',
        type: 'chips',
        options: ['Плачу легко, часто', 'Плачу, но только наедине', 'Редко, с трудом', 'Почти никогда не плачу'],
        hint: 'Это важный психический симптом',
      },
      {
        key: 'company',
        label: 'Когда вам плохо — вы предпочитаете?',
        type: 'chips',
        options: ['Быть рядом с людьми, не оставаться одному', 'Нейтрально', 'Побыть в тишине и одиночестве'],
      },
      {
        key: 'fears',
        label: 'Есть ли страхи или постоянные тревоги?',
        type: 'textarea',
        placeholder: 'Темноты, одиночества, болезни, смерти, высоты, будущего, осуждения, потери близких...',
      },
    ],
  },
  {
    title: 'Физиология',
    subtitle: 'Несколько конкретных вопросов о работе организма',
    fields: [
      {
        key: 'digestion',
        label: 'Как работает пищеварение?',
        type: 'textarea',
        placeholder: 'Вздутие, изжога, тяжесть после еды, тошнота, отрыжка, какие продукты провоцируют...',
      },
      {
        key: 'stool',
        label: 'Стул',
        type: 'chips',
        options: ['Регулярный, без проблем', 'Склонность к запорам', 'Склонность к послаблению', 'Чередуется'],
      },
      {
        key: 'menstrual',
        label: 'Для женщин: менструальный цикл (необязательно)',
        type: 'textarea',
        placeholder: 'Регулярность, болезненность, обильность, что меняется в самочувствии до/после/во время цикла...',
      },
      {
        key: 'skin',
        label: 'Кожа, ногти, волосы — есть ли особенности?',
        type: 'text',
        placeholder: 'Сухость, жирность, экзема, сыпи, ломкость ногтей, выпадение волос...',
      },
    ],
  },
  {
    title: 'История здоровья',
    subtitle: 'Последний раздел — совсем немного',
    fields: [
      {
        key: 'past_illnesses',
        label: 'Перенесённые болезни, операции, травмы',
        type: 'textarea',
        placeholder: 'Что важного было в истории вашего здоровья? Частые ангины, операции, переломы, тяжёлые инфекции...',
      },
      {
        key: 'medications',
        label: 'Принимаете ли сейчас какие-то лекарства или добавки?',
        type: 'text',
        placeholder: 'Если нет — оставьте пустым',
      },
      {
        key: 'allergies',
        label: 'Аллергии',
        type: 'text',
        placeholder: 'На лекарства, продукты, пыльцу, другое...',
      },
      {
        key: 'family_history',
        label: 'Болезни у родителей, бабушек, дедушек',
        type: 'text',
        placeholder: 'Диабет, онкология, гипертония, туберкулёз, психические расстройства...',
      },
    ],
  },
]

// ─── Шаги острого случая ──────────────────────────────────────────────────────

const ACUTE_STEPS: Step[] = [
  {
    title: 'Что случилось',
    subtitle: 'Опишите ситуацию — максимально подробно',
    fields: [
      {
        key: 'acute_complaint',
        label: 'Что беспокоит прямо сейчас?',
        type: 'textarea',
        placeholder: 'Опишите всё, что чувствуете...',
        required: true,
      },
      {
        key: 'onset',
        label: 'Когда началось?',
        type: 'text',
        placeholder: 'Сегодня утром, вчера вечером, 2 часа назад...',
      },
      {
        key: 'speed',
        label: 'Как быстро развилось?',
        type: 'chips',
        options: ['Внезапно (за минуты)', 'Быстро (за несколько часов)', 'Постепенно (день-два)'],
      },
      {
        key: 'trigger',
        label: 'Что могло спровоцировать?',
        type: 'textarea',
        placeholder: 'Промокли под дождём, испугались, переели, переохладились, сильный стресс, травма...',
      },
    ],
  },
  {
    title: 'Ощущения',
    subtitle: 'Подробнее о том, что происходит в теле',
    fields: [
      {
        key: 'main_symptom',
        label: 'Опишите главное ощущение',
        type: 'textarea',
        placeholder: 'Жгучая боль, давление в груди, ломота, озноб, тошнота, резь...',
      },
      {
        key: 'location',
        label: 'Где именно?',
        type: 'text',
        placeholder: 'Горло, живот, голова, всё тело...',
      },
      {
        key: 'radiation',
        label: 'Отдаёт куда-то?',
        type: 'text',
        placeholder: 'Если нет — оставьте пустым',
      },
      {
        key: 'intensity',
        label: 'Насколько сильно?',
        type: 'scale',
      },
    ],
  },
  {
    title: 'Что влияет',
    subtitle: 'Модальности — даже в остром случае это важно',
    fields: [
      {
        key: 'worse_from',
        label: 'Что ухудшает прямо сейчас?',
        type: 'textarea',
        placeholder: 'Холод, тепло, движение, прикосновение, свет, шум, глотание...',
      },
      {
        key: 'better_from',
        label: 'Что помогает или облегчает?',
        type: 'textarea',
        placeholder: 'Тепло, холодный компресс, лежать неподвижно, давление на больное место...',
      },
      {
        key: 'position',
        label: 'Какое положение тела комфортнее?',
        type: 'chips',
        options: ['Лежать', 'Сидеть', 'Стоять', 'Двигаться', 'Скрючиться', 'Без разницы'],
      },
      {
        key: 'consolation',
        label: 'Когда вам плохо — хочется чтобы кто-то был рядом?',
        type: 'chips',
        options: ['Да, присутствие успокаивает', 'Безразлично', 'Нет, хочу побыть одному'],
      },
    ],
  },
  {
    title: 'Температура и озноб',
    subtitle: 'Важно для точного подбора препарата',
    fields: [
      {
        key: 'fever',
        label: 'Есть ли температура?',
        type: 'chips',
        options: ['Нет, нормальная', 'Субфебрильная (37–38°)', 'Высокая (38–39°)', 'Очень высокая (39°+)'],
      },
      {
        key: 'chills',
        label: 'Озноб?',
        type: 'chips',
        options: ['Нет', 'Лёгкий', 'Сильный', 'Чередуется с жаром', 'Внутренний, но кожа горячая'],
      },
      {
        key: 'thirst',
        label: 'Жажда во время болезни?',
        type: 'chips',
        options: ['Совсем не хочу пить', 'Маленькими частыми глотками', 'Пью много и часто', 'Только холодное', 'Только тёплое'],
      },
      {
        key: 'sweating',
        label: 'Потоотделение',
        type: 'chips',
        options: ['Сухая горячая кожа', 'Немного потею', 'Сильно потею', 'Холодный пот'],
      },
    ],
  },
  {
    title: 'Сопутствующее',
    subtitle: 'Последний раздел',
    fields: [
      {
        key: 'other_symptoms',
        label: 'Другие симптомы',
        type: 'textarea',
        placeholder: 'Насморк (какой?), кашель (сухой/влажный), тошнота, рвота, сыпь, головная боль...',
      },
      {
        key: 'discharge',
        label: 'Есть ли выделения? Опишите',
        type: 'text',
        placeholder: 'Цвет, консистенция, запах — если нет, оставьте пустым',
      },
      {
        key: 'behavior',
        label: 'Как вы себя ведёте во время болезни?',
        type: 'textarea',
        placeholder: 'Хочется тишины и темноты, нужно чтобы кто-то был рядом, беспокойство, вялость, плаксивость...',
      },
      {
        key: 'appetite_acute',
        label: 'Аппетит',
        type: 'chips',
        options: ['Совсем нет', 'Снижен', 'Нормальный', 'Хочется чего-то конкретного'],
      },
    ],
  },
]

// ─── Конфигурация ─────────────────────────────────────────────────────────────

const CONFIG = {
  primary: {
    steps: [PERSONAL_STEP, ...PRIMARY_STEPS],
    welcomeTitle: 'Анкета первичного приёма',
    welcomeText: 'Врач приглашает вас заполнить анкету. Ваши ответы помогут провести консультацию максимально точно — уделите 15–20 минут.',
    icon: '📋',
  },
  acute: {
    steps: [PERSONAL_STEP, ...ACUTE_STEPS],
    welcomeTitle: 'Анкета острого случая',
    welcomeText: 'Короткая анкета для острого состояния. Ответьте максимально подробно — это займёт 5–7 минут.',
    icon: '⚡',
  },
}

// ─── Вспомогательная функция для дат бронирования ────────────────────────────

function getSelectableDates(schedule: ScheduleConfig, count = 21): string[] {
  const DAY_MAP: Record<number, string> = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' }
  const dates: string[] = []
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let d = new Date(today)
  d.setDate(d.getDate() + 1) // начинаем с завтра
  while (dates.length < count) {
    const key = DAY_MAP[d.getDay()]
    if (schedule.working_days.includes(key)) {
      dates.push(d.toISOString().split('T')[0])
    }
    d.setDate(d.getDate() + 1)
    if (d.getTime() - today.getTime() > 60 * 24 * 60 * 60 * 1000) break
  }
  return dates
}

function formatDateRu(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'short' })
}

// ─── Блок бронирования ────────────────────────────────────────────────────────

type BookingState = 'idle' | 'loading' | 'ready' | 'booking' | 'booked' | 'skipped' | 'error'

function BookingSection({ token, schedule, doctorId }: { token: string; schedule: ScheduleConfig; doctorId: string }) {
  const selectableDates = getSelectableDates(schedule)
  const [selectedDate, setSelectedDate] = useState('')
  const [slots, setSlots] = useState<string[]>([])
  const [selectedTime, setSelectedTime] = useState('')
  const [bookingState, setBookingState] = useState<BookingState>('idle')
  const [bookedDate, setBookedDate] = useState('')
  const [skipped, setSkipped] = useState(false)

  useEffect(() => {
    if (!selectedDate) return
    setBookingState('loading')
    setSelectedTime('')
    getBookedSlots(doctorId, selectedDate).then(booked => {
      const available = generateSlots(schedule, selectedDate, booked)
      setSlots(available)
      setBookingState('ready')
    })
  }, [selectedDate, doctorId, schedule])

  async function handleBook() {
    if (!selectedDate || !selectedTime) return
    setBookingState('booking')
    const result = await bookIntakeAppointment(token, selectedDate, selectedTime)
    if (result.success) {
      setBookedDate(result.appointmentDate || '')
      setBookingState('booked')
    } else {
      setBookingState('error')
    }
  }

  if (skipped) return null

  if (bookingState === 'booked') {
    return (
      <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
          <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-emerald-800">Вы записаны!</p>
        <p className="text-sm text-emerald-600 mt-1">{bookedDate}</p>
      </div>
    )
  }

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
      <p className="text-sm font-semibold text-gray-900 mb-1">Записаться на первичную консультацию</p>
      <p className="text-xs text-gray-400 mb-4">Необязательно — можно пропустить и договориться отдельно</p>

      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Выберите дату</p>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-1 px-1">
        {selectableDates.slice(0, 14).map(d => (
          <button
            key={d}
            onClick={() => setSelectedDate(d)}
            className={`shrink-0 px-3 py-2 rounded-2xl border text-xs font-medium transition-all ${
              selectedDate === d
                ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]'
                : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-gray-50'
            }`}
          >
            {formatDateRu(d)}
          </button>
        ))}
      </div>

      {bookingState === 'loading' && (
        <p className="text-xs text-gray-400 text-center py-3">Загружаю доступные слоты...</p>
      )}

      {bookingState === 'ready' && slots.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-3">На эту дату нет свободных мест</p>
      )}

      {bookingState === 'ready' && slots.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Выберите время</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {slots.map(t => (
              <button
                key={t}
                onClick={() => setSelectedTime(t)}
                className={`px-4 py-2 rounded-2xl border text-sm font-medium transition-all ${
                  selectedTime === t
                    ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-gray-50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </>
      )}

      {bookingState === 'error' && (
        <p className="text-xs text-red-500 mb-3">Не удалось записаться. Попробуйте другое время или свяжитесь с врачом.</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleBook}
          disabled={!selectedDate || !selectedTime || bookingState === 'booking'}
          className="flex-1 bg-[#2d6a4f] hover:bg-[#1a3020] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold py-3 rounded-2xl transition-colors"
        >
          {bookingState === 'booking' ? 'Записываю...' : 'Записаться'}
        </button>
        <button
          onClick={() => setSkipped(true)}
          className="px-4 py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Пропустить
        </button>
      </div>
    </div>
  )
}

// ─── Основной компонент ───────────────────────────────────────────────────────

type Props = {
  token: string
  patientName: string
  type: IntakeType
  prefilled?: { name?: string; phone?: string; birth_date?: string; email?: string }
  schedule?: ScheduleConfig | null
  doctorId?: string
  doctorPatientId?: string
  initialAnswers?: IntakeAnswers
}

export default function IntakeForm({ token, patientName, type, prefilled, schedule, doctorId, doctorPatientId, initialAnswers }: Props) {
  const router = useRouter()
  const isDoctorMode = !!doctorPatientId
  const cfg = CONFIG[type]
  const STEPS = (prefilled || isDoctorMode) ? cfg.steps.filter(s => s !== PERSONAL_STEP) : cfg.steps
  const isAcute = type === 'acute'

  const btnClass = isAcute
    ? 'bg-orange-500 hover:bg-orange-600 text-white'
    : 'bg-[#2d6a4f] hover:bg-[#1a3020] text-white'

  const chipActiveClass = isAcute
    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
    : 'bg-[#2d6a4f] text-white border-[#2d6a4f] shadow-sm'

  const progressClass = isAcute ? 'bg-orange-500' : 'bg-[#2d6a4f]'
  const focusRingClass = isAcute
    ? 'focus:border-orange-400 focus:ring-orange-500/10'
    : 'focus:border-emerald-400 focus:ring-[#2d6a4f]/30/10'

  const DRAFT_KEY = isDoctorMode ? `intake_doctor_draft_${doctorPatientId}_${type}` : `intake_draft_${token}`
  const restoredRef = useRef(false)

  const [step, setStep] = useState(() => isDoctorMode ? 0 : -1)
  const [answers, setAnswers] = useState<IntakeAnswers>(() => {
    if (initialAnswers && Object.keys(initialAnswers).length > 0) return initialAnswers
    if (!prefilled) return {}
    const init: IntakeAnswers = {}
    if (prefilled.name) init.patient_name = prefilled.name
    if (prefilled.phone) init.patient_phone = prefilled.phone
    if (prefilled.birth_date) init.patient_birth_date = prefilled.birth_date
    if (prefilled.email) init.patient_email = prefilled.email
    return init
  })
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [consentGiven, setConsentGiven] = useState(isDoctorMode)
  const [draftRestored, setDraftRestored] = useState(false)

  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return
      const draft = JSON.parse(raw) as { step: number; answers: IntakeAnswers }
      if (draft.answers && Object.keys(draft.answers).length > 0) {
        setAnswers(draft.answers)
        if (typeof draft.step === 'number' && draft.step >= 0) {
          setStep(draft.step)
          setDraftRestored(true)
        }
      }
    } catch { /* игнорируем */ }
  }, [DRAFT_KEY])

  useEffect(() => {
    if (done) return
    try {
      if (Object.keys(answers).length > 0) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, answers }))
      }
    } catch { /* игнорируем */ }
  }, [answers, step, done, DRAFT_KEY])

  const totalSteps = STEPS.length
  const currentStep = STEPS[step]

  function setField(key: string, value: string) {
    setAnswers(prev => ({ ...prev, [key]: value }))
  }

  function toggleMultiChip(key: string, opt: string) {
    const current = answers[key] ? answers[key].split(',').map(s => s.trim()).filter(Boolean) : []
    const next = current.includes(opt) ? current.filter(s => s !== opt) : [...current, opt]
    setAnswers(prev => ({ ...prev, [key]: next.join(', ') }))
  }

  function canProceed(): boolean {
    if (step < 0) return true
    return currentStep.fields.filter(f => f.required).every(f => (answers[f.key] || '').trim().length > 0)
  }

  async function handleNext() {
    if (step < totalSteps - 1) {
      setStep(s => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      setSubmitting(true)
      setSubmitError('')
      try {
        if (isDoctorMode) {
          await submitDoctorIntake(doctorPatientId!, type, answers)
          try { localStorage.removeItem(DRAFT_KEY) } catch { /* игнорируем */ }
          router.push(`/patients/${doctorPatientId}`)
        } else {
          await submitIntake(token, answers)
          try { localStorage.removeItem(DRAFT_KEY) } catch { /* игнорируем */ }
          setDone(true)
        }
      } catch {
        setSubmitError('Не удалось сохранить анкету. Проверьте соединение и попробуйте ещё раз.')
      } finally {
        setSubmitting(false)
      }
    }
  }

  function handleBack() {
    setStep(s => Math.max(-1, s - 1))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ── Готово ──
  if (done) {
    const showBooking = schedule && doctorId
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Анкета отправлена!</h1>
            <p className="text-gray-500 text-sm leading-relaxed">
              Спасибо за подробные ответы. Врач ознакомится с ними до консультации.
            </p>
          </div>

          {showBooking && (
            <BookingSection token={token} schedule={schedule} doctorId={doctorId} />
          )}
        </div>
      </div>
    )
  }

  // ── Приветствие ──
  if (step === -1) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 py-8 ${isAcute ? 'bg-gradient-to-br from-orange-50 via-white to-white' : 'bg-gradient-to-br from-emerald-50 via-white to-white'}`}>
        <div className="max-w-sm w-full">
          {/* Шапка */}
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-[#0d1f14] flex items-center justify-center shrink-0">
              <span className="text-lg leading-none">{cfg.icon}</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 leading-tight">
                {patientName ? `${patientName.split(' ')[0]}, здравствуйте!` : 'Здравствуйте!'}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">{cfg.welcomeTitle}</p>
            </div>
          </div>

          <p className="text-sm text-gray-500 leading-relaxed mb-4">{cfg.welcomeText}</p>

          {prefilled && (
            <div className="mb-3 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs border bg-emerald-50 border-emerald-200 text-emerald-700">
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Личные данные уже заполнены — только медицинская часть.</span>
            </div>
          )}

          {/* Инфо-блок */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 mb-4">
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: isAcute ? '⚡' : '📋', text: `${totalSteps} разделов · ${isAcute ? '5–7' : '15–20'} мин` },
                { icon: '🔒', text: 'Только ваш врач' },
                { icon: '✏️', text: 'Своими словами' },
                { icon: '💚', text: 'Подробнее = точнее' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-base leading-none">{item.icon}</span>
                  <p className="text-xs text-gray-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Согласие */}
          {!isDoctorMode && (
            <label className="flex items-start gap-2.5 cursor-pointer mb-4">
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={e => setConsentGiven(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-emerald-600 shrink-0"
              />
              <span className="text-[12px] text-gray-400 leading-relaxed">
                Согласен(а) на обработку персональных данных, включая трансграничную передачу (ст. 12 ФЗ-152), в соответствии с <a href="/privacy" target="_blank" className="text-emerald-600 underline">политикой конфиденциальности</a>. Данные используются только для оказания медицинской помощи и не передаются третьим лицам.
              </span>
            </label>
          )}

          {draftRestored && (
            <div className={`mb-3 flex items-center gap-2 rounded-2xl px-3 py-2.5 text-xs border ${isAcute ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
              <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>Найден незавершённый черновик — продолжите с места остановки.</span>
            </div>
          )}

          <button
            onClick={() => draftRestored ? setStep(step) : setStep(0)}
            disabled={!consentGiven}
            className={`w-full font-semibold text-sm py-3 rounded-2xl transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${btnClass}`}
          >
            {draftRestored ? 'Продолжить →' : 'Начать заполнение →'}
          </button>

          {draftRestored && (
            <button
              onClick={() => {
                try { localStorage.removeItem(DRAFT_KEY) } catch { /* игнорируем */ }
                setAnswers({})
                setStep(0)
                setDraftRestored(false)
              }}
              className="w-full text-xs text-gray-400 hover:text-gray-600 mt-2 transition-colors"
            >
              Начать заново
            </button>
          )}
        </div>
      </div>
    )
  }

  // ── Шаги ──
  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div
          className={`h-1 transition-all duration-500 ${progressClass}`}
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
        <div className="px-4 py-2 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </button>
          <span className="text-xs text-gray-400 font-medium">Шаг {step + 1} из {totalSteps}: {currentStep.title}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 pb-24">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-900">{currentStep.title}</h2>
          {currentStep.subtitle && (
            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{currentStep.subtitle}</p>
          )}
        </div>

        {/* Все поля шага — одна карточка с разделителями */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
          {currentStep.fields.map((field, fieldIdx) => (
            <div
              key={field.key}
              className={`px-4 py-3.5 ${fieldIdx < currentStep.fields.length - 1 ? 'border-b border-gray-100' : ''}`}
            >
              <label className="block text-[13px] font-semibold text-gray-700 mb-1 leading-snug">
                {field.label}
                {field.required && <span className="text-red-400 ml-1">*</span>}
              </label>
              {field.hint && (
                <p className="text-[12px] text-gray-500 mb-2 leading-relaxed">{field.hint}</p>
              )}

              {field.type === 'textarea' && (
                <textarea
                  value={answers[field.key] || ''}
                  onChange={e => setField(field.key, e.target.value)}
                  rows={3}
                  placeholder={field.placeholder}
                  className={`w-full text-sm text-gray-800 placeholder-gray-300 border border-gray-200 rounded-2xl px-3 py-2 resize-none focus:outline-none focus:ring-4 transition-all ${focusRingClass}`}
                />
              )}

              {(field.type === 'text' || field.type === 'tel') && (
                <input
                  type={field.type}
                  value={answers[field.key] || ''}
                  onChange={e => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={`w-full text-sm text-gray-800 placeholder-gray-300 border border-gray-200 rounded-2xl px-3 py-2 focus:outline-none focus:ring-4 transition-all ${focusRingClass}`}
                />
              )}

              {field.type === 'date' && (
                <input
                  type="date"
                  value={answers[field.key] || ''}
                  onChange={e => setField(field.key, e.target.value)}
                  className={`w-full text-sm text-gray-800 border border-gray-200 rounded-2xl px-3 py-2 focus:outline-none focus:ring-4 transition-all ${focusRingClass}`}
                />
              )}

              {field.type === 'chips' && field.options && (
                <div className="flex flex-wrap gap-1.5">
                  {field.options.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setField(field.key, answers[field.key] === opt ? '' : opt)}
                      className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                        answers[field.key] === opt
                          ? chipActiveClass
                          : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-gray-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {field.type === 'chips-multi' && field.options && (
                <div className="flex flex-wrap gap-1.5">
                  {field.options.map(opt => {
                    const selected = (answers[field.key] || '').split(',').map(s => s.trim()).includes(opt)
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleMultiChip(field.key, opt)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                          selected
                            ? chipActiveClass
                            : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-gray-50'
                        }`}
                      >
                        {opt}
                      </button>
                    )
                  })}
                </div>
              )}

              {field.type === 'scale' && (
                <div>
                  <div className="grid grid-cols-5 sm:grid-cols-10 gap-1 mb-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setField(field.key, String(n))}
                        className={`h-9 rounded-lg border text-xs font-semibold transition-all ${
                          answers[field.key] === String(n)
                            ? n <= 3 ? 'bg-[#2d6a4f] text-white border-emerald-500'
                              : n <= 6 ? 'bg-amber-400 text-white border-amber-400'
                              : 'bg-red-500 text-white border-red-500'
                            : 'border-gray-200 text-gray-500 bg-gray-50'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[12px] text-gray-300">
                    <span>Почти не мешает</span>
                    <span>Невыносимо</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-3">
        <div className="max-w-lg mx-auto space-y-3">
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed() || submitting}
            className={`w-full font-semibold text-sm py-3.5 rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm ${btnClass}`}
          >
            {submitting ? 'Отправляю...' : step === totalSteps - 1 ? 'Отправить анкету' : 'Далее →'}
          </button>
        </div>
      </div>
    </div>
  )
}
