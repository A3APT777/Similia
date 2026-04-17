'use client'

import { useState } from 'react'
import { submitPreVisitSurvey } from '@/lib/actions/surveys'

// Конфигурация вопросов
const SURVEY_SECTIONS = [
  {
    title: 'Общая реакция на препарат',
    questions: [
      {
        id: 'general_reaction',
        text: 'Заметили ли вы какие-либо изменения в самочувствии после приёма назначенного препарата? Опишите своими словами — что изменилось, когда это произошло, как долго длилось.',
        type: 'textarea' as const,
        required: true,
      },
      {
        id: 'initial_aggravation',
        text: 'Было ли кратковременное ухудшение (обострение) в первые 1–3 дня после приёма?',
        type: 'select_with_text' as const,
        required: true,
        options: [
          'Нет, ничего не обострялось',
          'Да, усилились имеющиеся жалобы',
          'Да, появились новые ощущения',
          'Затрудняюсь ответить',
        ],
      },
      {
        id: 'overall_change',
        text: 'Как вы оцениваете своё общее самочувствие СЕЙЧАС по сравнению с тем, каким оно было ДО приёма препарата?',
        type: 'scale_pm5' as const,
        required: true,
      },
    ],
  },
  {
    title: 'Психика и эмоциональное состояние',
    questions: [
      {
        id: 'emotional_state',
        text: 'Изменилось ли ваше эмоциональное состояние после приёма? Настроение, тревожность, раздражительность, уверенность в себе, мотивация, отношение к окружающим — опишите то, что заметили.',
        type: 'textarea' as const,
        required: true,
      },
      {
        id: 'energy_level',
        text: 'Как вы оцениваете свой уровень энергии и жизненных сил сейчас?',
        type: 'scale_10' as const,
        required: true,
        labels: { min: 'Истощение', max: 'Прилив сил' },
      },
      {
        id: 'dreams',
        text: 'Видели ли вы необычные или запоминающиеся сны после приёма препарата? Если да — опишите кратко.',
        type: 'textarea' as const,
        required: false,
      },
    ],
  },
  {
    title: 'Общие симптомы',
    questions: [
      {
        id: 'sleep',
        text: 'Сон (засыпание, пробуждения, качество, в какое время просыпаетесь)',
        type: 'change_with_comment' as const,
        required: true,
      },
      {
        id: 'appetite',
        text: 'Аппетит (усилился, снизился, новые пищевые желания или отвращения)',
        type: 'change_with_comment' as const,
        required: true,
      },
      {
        id: 'thirst',
        text: 'Жажда (пьёте больше или меньше, предпочтение горячего/холодного)',
        type: 'change_with_comment' as const,
        required: true,
      },
      {
        id: 'sweating',
        text: 'Потоотделение (больше, меньше, изменился запах, локализация)',
        type: 'change_with_comment' as const,
        required: true,
      },
      {
        id: 'thermoregulation',
        text: 'Терморегуляция (стали мерзнуть больше/меньше, переносимость жары/холода)',
        type: 'change_with_comment' as const,
        required: true,
      },
      {
        id: 'discharges',
        text: 'Были ли какие-либо выделения, которых раньше не было или которые изменились? (насморк, высыпания на коже, изменения стула, менструальные выделения)',
        type: 'textarea' as const,
        required: false,
      },
    ],
  },
  {
    title: 'Порядок изменения симптомов',
    questions: [
      {
        id: 'symptom_order',
        text: 'Если у вас было несколько жалоб — в каком порядке они менялись? Что улучшилось первым, что последним? Что, возможно, пока не изменилось?',
        type: 'textarea' as const,
        required: true,
      },
      {
        id: 'old_symptoms_returned',
        text: 'Вернулись ли какие-то старые симптомы или ощущения, которые были у вас раньше (месяцы или годы назад), но потом прошли?',
        type: 'yes_no_text' as const,
        required: false,
      },
    ],
  },
  {
    title: 'Основная жалоба',
    questions: [
      {
        id: 'main_complaint_change',
        text: 'Основная жалоба, с которой вы обратились — как она изменилась?',
        type: 'scale_pm5_with_text' as const,
        required: true,
      },
      {
        id: 'new_symptoms',
        text: 'Появились ли новые жалобы или симптомы, которых не было до приёма препарата? Если да — опишите: что именно, когда появилось, беспокоит ли сейчас.',
        type: 'textarea' as const,
        required: false,
      },
    ],
  },
  {
    title: 'Приём препарата и внешние факторы',
    questions: [
      {
        id: 'compliance',
        text: 'Принимали ли вы препарат точно так, как было назначено?',
        type: 'select_with_text' as const,
        required: true,
        options: [
          'Да, всё по назначению',
          'Нет, были отклонения',
        ],
      },
      {
        id: 'other_medications',
        text: 'Принимали ли вы за это время какие-либо другие лекарства, БАДы, вакцины, или проходили процедуры (стоматолог, массаж, физиотерапия)?',
        type: 'yes_no_text' as const,
        required: true,
      },
      {
        id: 'life_events',
        text: 'Были ли за этот период значимые события в жизни (стрессы, болезни, травмы, конфликты, потери)?',
        type: 'textarea' as const,
        required: false,
      },
    ],
  },
]

// Построение секций из кастомных полей врача
function buildSectionsFromCustom(fields: import('@/lib/actions/questionnaire-templates').TemplateField[]) {
  const CHUNK = 5
  const sections = []
  for (let i = 0; i < fields.length; i += CHUNK) {
    const chunk = fields.slice(i, i + CHUNK)
    sections.push({
      title: i === 0 ? 'Основные вопросы' : `Вопросы (${Math.floor(i / CHUNK) + 1})`,
      questions: chunk.map(f => ({
        id: f.id,
        label: f.label,
        type: f.type === 'scale' ? 'scale' as const
          : f.type === 'select' ? 'choice' as const
          : 'text' as const,
        required: f.required,
        hint: f.hint,
        options: f.options,
        scaleMin: f.scaleMin || 1,
        scaleMax: f.scaleMax || 10,
      })),
    })
  }
  return sections
}

type Answers = Record<string, string | number | { choice: string; comment: string } | { value: boolean; comment: string } | { scale: number; comment: string }>

export default function PreVisitSurveyForm({ token, patientName, customFields }: { token: string; patientName: string; customFields?: import('@/lib/actions/questionnaire-templates').TemplateField[] }) {
  const [currentSection, setCurrentSection] = useState(0)
  const [answers, setAnswers] = useState<Answers>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // Если есть кастомные поля — строим секции из них
  const sections = customFields ? buildSectionsFromCustom(customFields) : SURVEY_SECTIONS
  const section = sections[currentSection]
  const totalSections = sections.length
  const progress = Math.round(((currentSection + 1) / totalSections) * 100)

  function updateAnswer(id: string, value: Answers[string]) {
    setAnswers(prev => ({ ...prev, [id]: value }))
  }

  function canProceed(): boolean {
    return section.questions.every(q => {
      if (!q.required) return true
      const val = answers[q.id]
      if (val === undefined || val === null || val === '') return false
      if (typeof val === 'object' && 'choice' in val && !val.choice) return false
      if (typeof val === 'object' && 'scale' in val && val.scale === undefined) return false
      return true
    })
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError('')
    try {
      await submitPreVisitSurvey(token, answers)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при отправке')
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--sim-bg)' }}>
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: 'rgba(45,106,79,0.08)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--sim-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h1 className="text-[28px] font-light mb-2" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-text)' }}>Спасибо, {patientName}!</h1>
          <p className="text-[13px]" style={{ color: 'var(--sim-text-muted)' }}>Ваши ответы отправлены врачу. Он изучит их перед приёмом.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ backgroundColor: 'var(--sim-bg)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-6">
          <h1 className="text-xl sm:text-2xl font-normal" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-forest)' }}>Предконсультационный опросник</h1>
          <p className="text-sm text-(--sim-text-muted) mt-1">{patientName}, пожалуйста, заполните перед визитом</p>
        </div>

        {/* Прогресс */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-(--sim-text-muted) mb-1">
            <span>{section.title}</span>
            <span>{currentSection + 1} / {totalSections}</span>
          </div>
          <div className="h-[3px] rounded-full bg-[rgba(0,0,0,0.06)]">
            <div className="h-[3px] rounded-full transition-all duration-300" style={{ width: `${progress}%`, backgroundColor: 'var(--sim-green)' }} />
          </div>
        </div>

        {/* Секция вопросов */}
        <div className="rounded-xl p-5 sm:p-8 mb-6" style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)' }}>
          <h2 className="text-[20px] font-light mb-6" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-text)' }}>{section.title}</h2>

          <div className="space-y-6">
            {section.questions.map(q => (
              <div key={q.id}>
                <label className="block text-sm font-medium text-(--sim-text) mb-2">
                  {q.text}
                  {q.required && <span className="text-red-400 ml-1">*</span>}
                </label>

                {q.type === 'textarea' && (
                  <textarea
                    rows={3}
                    value={(answers[q.id] as string) || ''}
                    onChange={e => updateAnswer(q.id, e.target.value)}
                    className="w-full rounded-xl border border-(--sim-border) px-4 py-3 text-sm focus:outline-none transition-all duration-200 resize-none"
                    placeholder="Ваш ответ..."
                  />
                )}

                {q.type === 'scale_10' && (
                  <div>
                    <div className="flex justify-between text-xs text-(--sim-text-muted) mb-2">
                      <span>{(q as { labels?: { min: string; max: string } }).labels?.min || '1'}</span>
                      <span>{(q as { labels?: { min: string; max: string } }).labels?.max || '10'}</span>
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => updateAnswer(q.id, n)}
                          className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                            answers[q.id] === n
                              ? 'text-white'
                              : 'bg-[rgba(0,0,0,0.03)] text-(--sim-text-muted) hover:bg-[rgba(0,0,0,0.06)]'
                          }`}
                          style={answers[q.id] === n ? { backgroundColor: 'var(--sim-green)' } : undefined}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {q.type === 'scale_pm5' && (
                  <div>
                    <div className="flex justify-between text-xs text-(--sim-text-muted) mb-2">
                      <span>Значительно хуже</span>
                      <span>Без изменений</span>
                      <span>Значительно лучше</span>
                    </div>
                    <div className="grid grid-cols-5 sm:grid-cols-11 gap-1">
                      {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => updateAnswer(q.id, n)}
                          className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                            answers[q.id] === n
                              ? 'text-white'
                              : n < 0 ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : n > 0 ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-[rgba(0,0,0,0.03)] text-(--sim-text-muted) hover:bg-[rgba(0,0,0,0.06)]'
                          }`}
                          style={answers[q.id] === n ? { backgroundColor: n < 0 ? '#dc2626' : n > 0 ? 'var(--sim-green)' : '#6b7280' } : undefined}
                        >
                          {n > 0 ? `+${n}` : n}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {q.type === 'scale_pm5_with_text' && (
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-xs text-(--sim-text-muted) mb-2">
                        <span>Значительно хуже</span>
                        <span>Без изменений</span>
                        <span>Значительно лучше</span>
                      </div>
                      <div className="grid grid-cols-5 sm:grid-cols-11 gap-1">
                        {[-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5].map(n => {
                          const current = answers[q.id] as { scale: number; comment: string } | undefined
                          return (
                            <button
                              key={n}
                              type="button"
                              onClick={() => updateAnswer(q.id, { scale: n, comment: current?.comment || '' })}
                              className={`py-2 rounded-xl text-xs font-medium transition-colors ${
                                current?.scale === n
                                  ? 'text-white'
                                  : n < 0 ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                  : n > 0 ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-[rgba(0,0,0,0.03)] text-(--sim-text-muted) hover:bg-[rgba(0,0,0,0.06)]'
                              }`}
                              style={current?.scale === n ? { backgroundColor: n < 0 ? '#dc2626' : n > 0 ? 'var(--sim-green)' : '#6b7280' } : undefined}
                            >
                              {n > 0 ? `+${n}` : n}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <textarea
                      rows={2}
                      value={(answers[q.id] as { scale: number; comment: string })?.comment || ''}
                      onChange={e => {
                        const current = answers[q.id] as { scale: number; comment: string } | undefined
                        updateAnswer(q.id, { scale: current?.scale ?? 0, comment: e.target.value })
                      }}
                      className="w-full rounded-xl border border-(--sim-border) px-4 py-3 text-sm focus:outline-none transition-all duration-200 resize-none"
                      placeholder="Опишите подробнее..."
                    />
                  </div>
                )}

                {q.type === 'select_with_text' && (
                  <div className="space-y-2">
                    {(q as { options?: string[] }).options?.map(opt => {
                      const current = answers[q.id] as { choice: string; comment: string } | undefined
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => updateAnswer(q.id, { choice: opt, comment: current?.comment || '' })}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-colors ${
                            current?.choice === opt
                              ? 'text-white'
                              : 'bg-[rgba(0,0,0,0.02)] text-(--sim-text) hover:bg-[rgba(0,0,0,0.03)]'
                          }`}
                          style={current?.choice === opt ? { backgroundColor: 'var(--sim-green)' } : undefined}
                        >
                          {opt}
                        </button>
                      )
                    })}
                    {(answers[q.id] as { choice: string; comment: string })?.choice &&
                     (answers[q.id] as { choice: string; comment: string }).choice !== (q as { options?: string[] }).options?.[0] && (
                      <textarea
                        rows={2}
                        value={(answers[q.id] as { choice: string; comment: string })?.comment || ''}
                        onChange={e => {
                          const current = answers[q.id] as { choice: string; comment: string }
                          updateAnswer(q.id, { ...current, comment: e.target.value })
                        }}
                        className="w-full rounded-xl border border-(--sim-border) px-4 py-3 text-sm focus:outline-none transition-all duration-200 resize-none"
                        placeholder="Уточните..."
                      />
                    )}
                  </div>
                )}

                {q.type === 'change_with_comment' && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {['Улучшилось', 'Ухудшилось', 'Без изменений', 'Не обращал(а) внимания'].map(opt => {
                        const current = answers[q.id] as { choice: string; comment: string } | undefined
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => updateAnswer(q.id, { choice: opt, comment: current?.comment || '' })}
                            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                              current?.choice === opt
                                ? 'text-white'
                                : 'bg-[rgba(0,0,0,0.03)] text-(--sim-text-muted) hover:bg-[rgba(0,0,0,0.06)]'
                            }`}
                            style={current?.choice === opt ? {
                              backgroundColor: opt === 'Улучшилось' ? 'var(--sim-green)' : opt === 'Ухудшилось' ? '#dc2626' : '#6b7280'
                            } : undefined}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                    {(answers[q.id] as { choice: string; comment: string })?.choice &&
                     (answers[q.id] as { choice: string; comment: string }).choice !== 'Без изменений' &&
                     (answers[q.id] as { choice: string; comment: string }).choice !== 'Не обращал(а) внимания' && (
                      <textarea
                        rows={2}
                        value={(answers[q.id] as { choice: string; comment: string })?.comment || ''}
                        onChange={e => {
                          const current = answers[q.id] as { choice: string; comment: string }
                          updateAnswer(q.id, { ...current, comment: e.target.value })
                        }}
                        className="w-full rounded-xl border border-(--sim-border) px-4 py-3 text-sm focus:outline-none transition-all duration-200 resize-none"
                        placeholder="Опишите подробнее..."
                      />
                    )}
                  </div>
                )}

                {q.type === 'yes_no_text' && (
                  <div className="space-y-2">
                    <div className="flex gap-3">
                      {['Да', 'Нет'].map(opt => {
                        const current = answers[q.id] as { value: boolean; comment: string } | undefined
                        const isSelected = (opt === 'Да' && current?.value === true) || (opt === 'Нет' && current?.value === false)
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => updateAnswer(q.id, { value: opt === 'Да', comment: current?.comment || '' })}
                            className={`px-6 py-2 rounded-xl text-sm font-medium transition-colors ${
                              isSelected ? 'text-white' : 'bg-[rgba(0,0,0,0.03)] text-(--sim-text-muted) hover:bg-[rgba(0,0,0,0.06)]'
                            }`}
                            style={isSelected ? { backgroundColor: 'var(--sim-green)' } : undefined}
                          >
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                    {(answers[q.id] as { value: boolean; comment: string })?.value === true && (
                      <textarea
                        rows={2}
                        value={(answers[q.id] as { value: boolean; comment: string })?.comment || ''}
                        onChange={e => updateAnswer(q.id, { value: true, comment: e.target.value })}
                        className="w-full rounded-xl border border-(--sim-border) px-4 py-3 text-sm focus:outline-none transition-all duration-200 resize-none"
                        placeholder="Расскажите подробнее..."
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Навигация */}
        {error && (
          <div className="rounded-xl px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 mb-4">{error}</div>
        )}

        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => setCurrentSection(s => s - 1)}
            disabled={currentSection === 0}
            className="px-5 py-3 rounded-full text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-colors duration-200"
            style={{ color: 'var(--sim-text-muted)' }}
          >
            ← Назад
          </button>

          {currentSection < totalSections - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentSection(s => s + 1)}
              disabled={!canProceed()}
              className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Далее →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
              className="btn btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Отправка...' : 'Отправить ответы'}
            </button>
          )}
        </div>

        <p className="text-center text-xs text-(--sim-text-muted) mt-6">
          Ваши ответы конфиденциальны и доступны только вашему врачу
        </p>
        <div className="text-center mt-4">
          <a href="https://simillia.ru" className="text-xs hover:underline" style={{ color: 'var(--sim-text-hint)' }} target="_blank" rel="noopener noreferrer">
            Simillia.ru — цифровой кабинет гомеопата
          </a>
        </div>
      </div>
    </div>
  )
}
