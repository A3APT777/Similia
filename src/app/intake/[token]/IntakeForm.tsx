'use client'

import { useState, useEffect, useRef } from 'react'
import { submitIntake } from '@/lib/actions/intake'
import { IntakeAnswers, IntakeType } from '@/types'

// ─── Типы полей ───────────────────────────────────────────────────────────────

type FieldType = 'textarea' | 'text' | 'date' | 'tel' | 'chips' | 'scale'

type Field = {
  key: string
  label: string
  placeholder?: string
  type: FieldType
  options?: string[]
  required?: boolean
}

type Step = {
  title: string
  subtitle: string
  fields: Field[]
}

// ─── Шаг с личными данными (общий для обоих типов) ───────────────────────────

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
        placeholder: 'Стресс, переохлаждение, переезд, потеря близкого, болезнь...',
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
        placeholder: 'Жгучее, давящее, колющее, тянущее, пульсирующее, сжимающее...',
      },
      {
        key: 'location',
        label: 'Где именно?',
        type: 'text',
        placeholder: 'Голова, живот, спина, справа, слева...',
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
    subtitle: 'Это называется модальности — ключевое в гомеопатии',
    fields: [
      {
        key: 'worse_from',
        label: 'Что ухудшает самочувствие?',
        type: 'textarea',
        placeholder: 'Холод, тепло, движение, покой, одиночество, шум, определённая еда, вечер, ночь...',
      },
      {
        key: 'better_from',
        label: 'Что улучшает?',
        type: 'textarea',
        placeholder: 'Тепло, свежий воздух, движение, отдых, общение, горячий душ...',
      },
      {
        key: 'time_worse',
        label: 'В какое время суток хуже всего?',
        type: 'text',
        placeholder: 'Утром после пробуждения, в полночь, после обеда...',
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
        key: 'perspiration',
        label: 'Потливость',
        type: 'chips',
        options: ['Почти не потею', 'Нормальная', 'Повышенная', 'Очень сильная'],
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
        placeholder: 'Легко засыпаете? Просыпаетесь ночью? В какое время? Качество сна...',
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
        placeholder: 'Солёное, сладкое, острое, кислое, молочное, мясо...',
      },
      {
        key: 'food_aversions',
        label: 'Что не переносите или вызывает реакцию?',
        type: 'text',
        placeholder: 'Жирное, молоко, яйца, определённые фрукты...',
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
        placeholder: 'Подавленность, тревога, раздражительность, апатия, спокойствие...',
      },
      {
        key: 'stress',
        label: 'Как вы реагируете на стресс?',
        type: 'textarea',
        placeholder: 'Уходите в себя, плачете, злитесь, становитесь активнее, заболеваете...',
      },
      {
        key: 'fears',
        label: 'Есть ли страхи или постоянные тревоги?',
        type: 'textarea',
        placeholder: 'Темноты, одиночества, болезни, смерти, будущего, осуждения...',
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
        placeholder: 'Что важного было в истории вашего здоровья?',
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
        placeholder: 'Диабет, онкология, гипертония, туберкулёз...',
      },
    ],
  },
]

// ─── Шаги анкеты острого случая ───────────────────────────────────────────────

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

// ─── Конфигурация по типу ─────────────────────────────────────────────────────

const CONFIG = {
  primary: {
    steps: [PERSONAL_STEP, ...PRIMARY_STEPS],
    welcomeTitle: 'Анкета первичного приёма',
    welcomeText: 'Врач приглашает вас заполнить анкету. Ваши ответы помогут провести консультацию максимально точно — уделите 10–15 минут.',
    icon: '📋',
  },
  acute: {
    steps: [PERSONAL_STEP, ...ACUTE_STEPS],
    welcomeTitle: 'Анкета острого случая',
    welcomeText: 'Короткая анкета для острого состояния. Ответьте максимально подробно — это займёт 5–7 минут.',
    icon: '⚡',
  },
}

// ─── Компонент ────────────────────────────────────────────────────────────────

type Props = {
  token: string
  patientName: string
  type: IntakeType
}

export default function IntakeForm({ token, patientName, type }: Props) {
  const cfg = CONFIG[type]
  const STEPS = cfg.steps
  const isAcute = type === 'acute'

  const btnClass = isAcute
    ? 'bg-orange-500 hover:bg-orange-600 text-white'
    : 'bg-emerald-600 hover:bg-emerald-700 text-white'

  const chipActiveClass = isAcute
    ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
    : 'bg-emerald-600 text-white border-emerald-600 shadow-sm'

  const progressClass = isAcute ? 'bg-orange-500' : 'bg-emerald-500'
  const focusRingClass = isAcute ? 'focus:border-orange-400 focus:ring-orange-500/10' : 'focus:border-emerald-400 focus:ring-emerald-500/10'

  const DRAFT_KEY = `intake_draft_${token}`
  const restoredRef = useRef(false)

  const [step, setStep] = useState(-1)
  const [answers, setAnswers] = useState<IntakeAnswers>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)
  const [draftRestored, setDraftRestored] = useState(false)

  // Восстанавливаем черновик из localStorage при первом рендере
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
    } catch {
      // localStorage недоступен или данные повреждены — игнорируем
    }
  }, [DRAFT_KEY])

  // Сохраняем черновик при каждом изменении ответов или шага
  useEffect(() => {
    if (done) return
    try {
      if (Object.keys(answers).length > 0) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ step, answers }))
      }
    } catch {
      // localStorage недоступен — игнорируем
    }
  }, [answers, step, done, DRAFT_KEY])

  const totalSteps = STEPS.length
  const currentStep = STEPS[step]

  function setField(key: string, value: string) {
    setAnswers(prev => ({ ...prev, [key]: value }))
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
        await submitIntake(token, answers)
        try { localStorage.removeItem(DRAFT_KEY) } catch { /* игнорируем */ }
        setDone(true)
      } catch {
        setSubmitError('Не удалось отправить анкету. Проверьте соединение и попробуйте ещё раз.')
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
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
      </div>
    )
  }

  // ── Приветствие ──
  if (step === -1) {
    return (
      <div className={`min-h-screen flex items-center justify-center px-4 py-12 ${isAcute ? 'bg-gradient-to-br from-orange-50 via-white to-white' : 'bg-gradient-to-br from-emerald-50 via-white to-white'}`}>
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-[#0d1f14] flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl leading-none">{cfg.icon}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {patientName ? `${patientName.split(' ')[0]}, здравствуйте!` : 'Здравствуйте!'}
            </h1>
            <p className="text-gray-500 text-sm leading-relaxed">{cfg.welcomeText}</p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5 space-y-3">
            {[
              { icon: isAcute ? '⚡' : '📋', text: `${totalSteps} разделов — займёт около ${isAcute ? '5–7' : '10–15'} минут` },
              { icon: '🔒', text: 'Ответы видит только ваш врач' },
              { icon: '✏️', text: 'Пишите своими словами, как умеете' },
              { icon: '💚', text: 'Чем подробнее — тем точнее назначение' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg leading-none">{item.icon}</span>
                <p className="text-sm text-gray-600">{item.text}</p>
              </div>
            ))}
          </div>

          {/* Согласие на обработку персональных данных (152-ФЗ) */}
          <label className="flex items-start gap-3 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={consentGiven}
              onChange={e => setConsentGiven(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 accent-emerald-600 shrink-0"
            />
            <span className="text-xs text-gray-500 leading-relaxed">
              Я согласен(а) на обработку моих персональных данных (ФИО, дата рождения, контактная информация, сведения о здоровье) в соответствии с Федеральным законом №152-ФЗ «О персональных данных». Данные используются исключительно для оказания медицинской помощи и не передаются третьим лицам.
            </span>
          </label>

          {/* Баннер восстановленного черновика */}
          {draftRestored && (
            <div className={`mb-3 flex items-start gap-2.5 rounded-xl px-4 py-3 text-sm border ${isAcute ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
              <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
              <span>Найден незавершённый черновик — продолжите с того места, где остановились.</span>
            </div>
          )}

          <button
            onClick={() => draftRestored ? setStep(step) : setStep(0)}
            disabled={!consentGiven}
            className={`w-full font-semibold text-sm py-3.5 rounded-xl transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed ${btnClass}`}
          >
            {draftRestored ? 'Продолжить заполнение →' : 'Начать заполнение →'}
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
    <div className="min-h-screen bg-gray-50">
      {/* Прогресс-бар */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100">
        <div
          className={`h-1 transition-all duration-500 ${progressClass}`}
          style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
        />
        <div className="px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleBack}
            className="text-sm text-gray-400 hover:text-gray-700 flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Назад
          </button>
          <span className="text-xs text-gray-400 font-medium">{step + 1} / {totalSteps}</span>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-32">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900">{currentStep.title}</h2>
          {currentStep.subtitle && (
            <p className="text-sm text-gray-400 mt-1">{currentStep.subtitle}</p>
          )}
        </div>

        <div className="space-y-5">
          {currentStep.fields.map(field => (
            <div key={field.key} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
              <label className="block text-sm font-medium text-gray-800 mb-3 leading-snug">
                {field.label}
                {field.required && <span className="text-emerald-500 ml-1">*</span>}
              </label>

              {field.type === 'textarea' && (
                <textarea
                  value={answers[field.key] || ''}
                  onChange={e => setField(field.key, e.target.value)}
                  rows={3}
                  placeholder={field.placeholder}
                  className={`w-full text-sm text-gray-800 placeholder-gray-300 border border-gray-200 rounded-xl px-3.5 py-2.5 resize-none focus:outline-none focus:ring-4 transition-all ${focusRingClass}`}
                />
              )}

              {(field.type === 'text' || field.type === 'tel') && (
                <input
                  type={field.type}
                  value={answers[field.key] || ''}
                  onChange={e => setField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className={`w-full text-sm text-gray-800 placeholder-gray-300 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-4 transition-all ${focusRingClass}`}
                />
              )}

              {field.type === 'date' && (
                <input
                  type="date"
                  value={answers[field.key] || ''}
                  onChange={e => setField(field.key, e.target.value)}
                  className={`w-full text-sm text-gray-800 border border-gray-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-4 transition-all ${focusRingClass}`}
                />
              )}

              {field.type === 'chips' && field.options && (
                <div className="flex flex-wrap gap-2">
                  {field.options.map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setField(field.key, answers[field.key] === opt ? '' : opt)}
                      className={`text-sm px-4 py-2 rounded-xl border font-medium transition-all ${
                        answers[field.key] === opt
                          ? chipActiveClass
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-gray-50'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {field.type === 'scale' && (
                <div>
                  <div className="flex gap-1.5 mb-2">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setField(field.key, String(n))}
                        className={`flex-1 h-10 rounded-lg border text-sm font-semibold transition-all ${
                          answers[field.key] === String(n)
                            ? n <= 3 ? 'bg-emerald-500 text-white border-emerald-500'
                              : n <= 6 ? 'bg-amber-400 text-white border-amber-400'
                              : 'bg-red-500 text-white border-red-500'
                            : 'border-gray-200 text-gray-500 bg-gray-50'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-300 px-0.5">
                    <span>Почти не мешает</span>
                    <span>Невыносимо</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Кнопка внизу */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-4">
        <div className="max-w-lg mx-auto space-y-3">
          {submitError && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <p className="text-sm text-red-600">{submitError}</p>
            </div>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed() || submitting}
            className={`w-full font-semibold text-sm py-3.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm ${btnClass}`}
          >
            {submitting ? 'Отправляю...' : step === totalSteps - 1 ? 'Отправить анкету' : 'Далее →'}
          </button>
        </div>
      </div>
    </div>
  )
}
