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

  const accentColor = isAcute ? '#f97316' : '#c8a035'
  const accentBg = isAcute ? 'rgba(249,115,22,0.08)' : 'rgba(200,160,53,0.08)'

  return (
    <div style={{
      backgroundColor: '#f0ebe3',
      border: `1px solid ${accentColor}`,
      borderLeft: `4px solid ${accentColor}`,
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      {/* Шапка — кликабельная */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between transition-colors"
        style={{
          padding: '14px 16px',
          borderBottom: expanded ? `1px solid ${accentColor}` : 'none',
          backgroundColor: expanded ? accentBg : 'transparent',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: accentColor }}>
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
          <span className="font-semibold" style={{ fontSize: '15px', color: '#1a1a0a' }}>
            {isAcute ? 'Анкета острого случая' : 'Анкета первичного приёма'}
          </span>
          {dateStr && <span style={{ fontSize: '13px', color: '#9a8a6a' }}>{dateStr}</span>}
        </div>
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          style={{ color: '#2d6a4f' }}
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
                  <p className="font-bold uppercase tracking-wider mb-0.5" style={{ fontSize: '10px', color: accentColor }}>
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
