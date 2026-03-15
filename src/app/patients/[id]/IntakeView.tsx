'use client'

import { useState } from 'react'
import { IntakeAnswers, IntakeType } from '@/types'

type Section = {
  title: string
  fields: { key: string; label: string }[]
}

const PRIMARY_SECTIONS: Section[] = [
  {
    title: 'Главные жалобы',
    fields: [
      { key: 'chief_complaint', label: 'Жалобы' },
      { key: 'duration', label: 'Как давно' },
      { key: 'cause', label: 'Причина (со слов пациента)' },
    ],
  },
  {
    title: 'Ощущения',
    fields: [
      { key: 'sensation', label: 'Характер ощущения' },
      { key: 'location', label: 'Локализация' },
      { key: 'radiation', label: 'Иррадиация' },
      { key: 'intensity', label: 'Интенсивность' },
    ],
  },
  {
    title: 'Модальности',
    fields: [
      { key: 'worse_from', label: 'Хуже от' },
      { key: 'better_from', label: 'Лучше от' },
      { key: 'time_worse', label: 'Время ухудшения' },
    ],
  },
  {
    title: 'Общее состояние',
    fields: [
      { key: 'thermal', label: 'Температурный режим' },
      { key: 'thirst', label: 'Жажда' },
      { key: 'perspiration', label: 'Потливость' },
      { key: 'energy', label: 'Энергия' },
    ],
  },
  {
    title: 'Сон и питание',
    fields: [
      { key: 'sleep', label: 'Сон' },
      { key: 'dreams', label: 'Сновидения' },
      { key: 'food_desires', label: 'Желания в еде' },
      { key: 'food_aversions', label: 'Отвращения в еде' },
    ],
  },
  {
    title: 'Психоэмоциональное',
    fields: [
      { key: 'emotional', label: 'Эмоциональное состояние' },
      { key: 'stress', label: 'Реакция на стресс' },
      { key: 'fears', label: 'Страхи и тревоги' },
    ],
  },
  {
    title: 'История здоровья',
    fields: [
      { key: 'past_illnesses', label: 'Болезни, операции, травмы' },
      { key: 'medications', label: 'Лекарства' },
      { key: 'allergies', label: 'Аллергии' },
      { key: 'family_history', label: 'Семейная история' },
    ],
  },
]

const ACUTE_SECTIONS: Section[] = [
  {
    title: 'Начало',
    fields: [
      { key: 'acute_complaint', label: 'Жалобы' },
      { key: 'onset', label: 'Когда началось' },
      { key: 'speed', label: 'Скорость развития' },
      { key: 'trigger', label: 'Провоцирующий фактор' },
    ],
  },
  {
    title: 'Симптомы',
    fields: [
      { key: 'main_symptom', label: 'Главное ощущение' },
      { key: 'location', label: 'Локализация' },
      { key: 'radiation', label: 'Иррадиация' },
      { key: 'intensity', label: 'Интенсивность' },
    ],
  },
  {
    title: 'Модальности',
    fields: [
      { key: 'worse_from', label: 'Хуже от' },
      { key: 'better_from', label: 'Лучше от' },
      { key: 'position', label: 'Положение тела' },
    ],
  },
  {
    title: 'Температура и озноб',
    fields: [
      { key: 'fever', label: 'Температура' },
      { key: 'chills', label: 'Озноб' },
      { key: 'thirst', label: 'Жажда' },
      { key: 'sweating', label: 'Потоотделение' },
    ],
  },
  {
    title: 'Сопутствующее',
    fields: [
      { key: 'other_symptoms', label: 'Другие симптомы' },
      { key: 'discharge', label: 'Выделения' },
      { key: 'behavior', label: 'Поведение при болезни' },
      { key: 'appetite_acute', label: 'Аппетит' },
    ],
  },
]

type Props = {
  answers: IntakeAnswers
  completedAt: string | null
  type: IntakeType
}

export default function IntakeView({ answers, completedAt, type }: Props) {
  const [expanded, setExpanded] = useState(false)
  const isAcute = type === 'acute'
  const sections = isAcute ? ACUTE_SECTIONS : PRIMARY_SECTIONS

  const dateStr = completedAt
    ? new Date(completedAt).toLocaleDateString('ru-RU', {
        timeZone: 'Europe/Moscow',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  const borderClass = isAcute ? 'border-orange-200' : 'border-violet-200'
  const bgClass = isAcute ? 'bg-orange-50' : 'bg-violet-50'
  const headerBorderClass = isAcute ? 'border-orange-200' : 'border-violet-200'
  const iconBgClass = isAcute ? 'bg-orange-500' : 'bg-violet-600'
  const titleClass = isAcute ? 'text-orange-800' : 'text-violet-800'
  const dateClass = isAcute ? 'text-orange-500' : 'text-violet-500'
  const dividerClass = isAcute ? 'divide-orange-100' : 'divide-violet-100'
  const sectionLabelClass = isAcute ? 'text-orange-400' : 'text-violet-400'
  const fieldLabelClass = isAcute ? 'text-orange-500' : 'text-violet-500'

  return (
    <div className={`border rounded-2xl overflow-hidden ${borderClass} ${bgClass}`}>
      {/* Шапка — кликабельная */}
      <button
        onClick={() => setExpanded(v => !v)}
        className={`w-full px-5 py-3.5 flex items-center justify-between transition-colors hover:brightness-95 ${expanded ? `border-b ${headerBorderClass}` : ''}`}
      >
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconBgClass}`}>
            {isAcute ? (
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            )}
          </div>
          <span className={`text-sm font-semibold ${titleClass}`}>
            {isAcute ? 'Анкета острого случая' : 'Анкета первичного приёма'}
          </span>
          {dateStr && <span className={`text-xs ${dateClass}`}>{dateStr}</span>}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${dateClass} ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Секции — только когда развёрнуто */}
      {expanded && (
        <div className="px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-4">
          {sections.flatMap(section =>
            section.fields
              .filter(f => answers[f.key]?.trim())
              .map(field => (
                <div key={field.key} className="min-w-0">
                  <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${sectionLabelClass}`}>
                    {field.label}
                  </p>
                  <p className="text-sm text-gray-800 leading-snug">
                    {field.key === 'intensity' ? `${answers[field.key]} / 10` : answers[field.key]}
                  </p>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  )
}
