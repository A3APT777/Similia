'use client'

import type { PreVisitSurvey } from '@/types'

const SECTION_LABELS: Record<string, string> = {
  general_reaction: 'Общая реакция на препарат',
  initial_aggravation: 'Обострение в первые дни',
  overall_change: 'Общее самочувствие (шкала)',
  emotional_state: 'Эмоциональное состояние',
  energy_level: 'Уровень энергии (шкала)',
  dreams: 'Сны',
  sleep: 'Сон',
  appetite: 'Аппетит',
  thirst: 'Жажда',
  sweating: 'Потоотделение',
  thermoregulation: 'Терморегуляция',
  discharges: 'Выделения',
  symptom_order: 'Порядок изменения симптомов',
  old_symptoms_returned: 'Возврат старых симптомов',
  main_complaint_change: 'Основная жалоба (шкала)',
  new_symptoms: 'Новые симптомы',
  compliance: 'Приём препарата',
  other_medications: 'Другие лекарства/процедуры',
  life_events: 'Значимые события',
}

function formatValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'

  if (typeof value === 'string') return value
  if (typeof value === 'number') {
    if (key === 'energy_level') return `${value}/10`
    if (key === 'overall_change' || key === 'main_complaint_change') {
      if (typeof value === 'number') return value > 0 ? `+${value}` : `${value}`
    }
    return String(value)
  }

  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>

    // scale_pm5_with_text
    if ('scale' in obj && 'comment' in obj) {
      const s = Number(obj.scale)
      const scaleStr = s > 0 ? `+${s}` : `${s}`
      return obj.comment ? `${scaleStr} — ${obj.comment}` : scaleStr
    }

    // select_with_text / change_with_comment
    if ('choice' in obj && 'comment' in obj) {
      return obj.comment ? `${obj.choice}: ${obj.comment}` : String(obj.choice)
    }

    // yes_no_text
    if ('value' in obj && 'comment' in obj) {
      const yn = obj.value ? 'Да' : 'Нет'
      return obj.comment ? `${yn} — ${obj.comment}` : yn
    }
  }

  return JSON.stringify(value)
}

function getScaleColor(key: string, value: unknown): string | undefined {
  let num: number | undefined

  if (typeof value === 'number') num = value
  if (typeof value === 'object' && value && 'scale' in value) num = Number((value as Record<string, unknown>).scale)

  if (num === undefined) return undefined
  if (key === 'energy_level') return num >= 7 ? 'var(--sim-green)' : num <= 3 ? '#dc2626' : '#d97706'
  if (num > 0) return 'var(--sim-green)'
  if (num < 0) return '#dc2626'
  return '#6b7280'
}

export default function PreVisitSurveyPanel({ survey, lang }: { survey: PreVisitSurvey; lang: 'ru' | 'en' }) {
  const answers = survey.answers as Record<string, unknown> | null
  if (!answers) return null

  const completedDate = survey.completed_at
    ? new Date(survey.completed_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
    : ''

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid #c6e5cc' }}>
      <div className="px-3 py-2 flex items-center justify-between" style={{ backgroundColor: '#e8f5ec' }}>
        <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--sim-green)' }}>
          {lang === 'ru' ? 'Ответы пациента' : 'Patient answers'}
        </span>
        {completedDate && (
          <span className="text-xs" style={{ color: '#6b7280' }}>{completedDate}</span>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {Object.entries(answers).map(([key, value]) => {
          if (value === null || value === undefined || value === '') return null
          const label = SECTION_LABELS[key] || key
          const color = getScaleColor(key, value)

          return (
            <div key={key} className="px-3 py-2">
              <div className="text-xs font-medium mb-0.5" style={{ color: 'var(--sim-text-hint)' }}>{label}</div>
              <div
                className="text-sm leading-relaxed"
                style={{ color: color || '#374151' }}
              >
                {formatValue(key, value)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
