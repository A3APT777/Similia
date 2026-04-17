'use client'

import { useState } from 'react'
import { IntakeAnswers, IntakeType } from '@/types'
import { t } from '@/lib/shared/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import { submitDoctorIntake } from '@/lib/actions/intake'

type Section = {
  title: string
  fields: { key: string; label: string; multiline?: boolean }[]
}

const PRIMARY_SECTIONS: Section[] = [
  {
    title: 'Жалобы и история',
    fields: [
      { key: 'chief_complaint', label: 'Жалобы', multiline: true },
      { key: 'duration', label: 'Хронология', multiline: true },
      { key: 'time_worse', label: 'Время ухудшений' },
    ],
  },
  {
    title: 'Характер и эмоции',
    fields: [
      { key: 'character', label: 'Характер', multiline: true },
      { key: 'fears', label: 'Страхи и тревоги', multiline: true },
      { key: 'consolation', label: 'Реакция на утешение' },
      { key: 'company', label: 'Одиночество / компания' },
      { key: 'weeping', label: 'Слёзы' },
    ],
  },
  {
    title: 'Сон',
    fields: [
      { key: 'sleep', label: 'Сон', multiline: true },
      { key: 'sleep_behavior', label: 'Поведение во сне' },
      { key: 'dreams', label: 'Сновидения' },
    ],
  },
  {
    title: 'Термика и чувствительность',
    fields: [
      { key: 'thermal', label: 'Термика' },
      { key: 'heat_cold', label: 'Жара/холод', multiline: true },
      { key: 'sea', label: 'Море' },
      { key: 'allergies', label: 'Аллергии', multiline: true },
    ],
  },
  {
    title: 'Питание и жажда',
    fields: [
      { key: 'food_desires', label: 'Пищевые пристрастия', multiline: true },
      { key: 'food_aversions', label: 'Отвращения в еде' },
      { key: 'thirst', label: 'Жажда' },
      { key: 'thirst_temp', label: 'Предпочтение питья' },
    ],
  },
  {
    title: 'Потоотделение и энергия',
    fields: [
      { key: 'perspiration', label: 'Потоотделение' },
      { key: 'perspiration_where', label: 'Где потеет' },
      { key: 'energy', label: 'Энергия', multiline: true },
    ],
  },
  {
    title: 'Иммунитет и лечение',
    fields: [
      { key: 'immunity', label: 'Иммунитет', multiline: true },
      { key: 'past_illnesses', label: 'История лечения', multiline: true },
      { key: 'medications', label: 'Текущие препараты' },
      { key: 'surgeries', label: 'Операции и травмы', multiline: true },
    ],
  },
  {
    title: 'Наследственность и прививки',
    fields: [
      { key: 'family_history', label: 'Заболевания в роду', multiline: true },
      { key: 'vaccines', label: 'Прививки', multiline: true },
    ],
  },
  {
    title: 'Беременность и роды',
    fields: [
      { key: 'mother_pregnancy', label: 'Беременность мамы', multiline: true },
      { key: 'birth_process', label: 'Родовой процесс', multiline: true },
    ],
  },
  {
    title: 'Физиология',
    fields: [
      { key: 'digestion', label: 'Пищеварение', multiline: true },
      { key: 'stool', label: 'Стул' },
      { key: 'menstrual', label: 'Менструальный цикл', multiline: true },
      { key: 'menstrual_cycle', label: 'Менструальный цикл (регулярность)', multiline: true },
      { key: 'menstrual_character', label: 'Характер менструаций', multiline: true },
      { key: 'menstrual_concomitant', label: 'Сопутствующие симптомы при менструации', multiline: true },
      { key: 'gynecological_history', label: 'Гинекологический анамнез', multiline: true },
      { key: 'skin', label: 'Кожа / ногти / волосы' },
    ],
  },
  {
    title: 'Прививки и детские болезни',
    fields: [
      { key: 'vaccinations', label: 'Прививки', multiline: true },
      { key: 'childhood_diseases', label: 'Детские болезни', multiline: true },
    ],
  },
]

const ACUTE_SECTIONS: Section[] = [
  {
    title: 'Начало',
    fields: [
      { key: 'acute_complaint', label: 'Жалобы', multiline: true },
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
      { key: 'intensity', label: 'Интенсивность (0–10)' },
    ],
  },
  {
    title: 'Модальности',
    fields: [
      { key: 'worse_from', label: 'Хуже от' },
      { key: 'better_from', label: 'Лучше от' },
      { key: 'position', label: 'Положение тела' },
      { key: 'consolation', label: 'Реакция на присутствие' },
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
  patientId?: string
}

export default function IntakeView({ answers, completedAt, type, patientId, customLabels }: Props & { customLabels?: Record<string, string> }) {
  const { lang } = useLanguage()
  const [expanded, setExpanded] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [localAnswers, setLocalAnswers] = useState<IntakeAnswers>(answers)
  const [saving, setSaving] = useState(false)

  // Если есть кастомные labels — подменяем в секциях
  const baseSections = type === 'acute' ? ACUTE_SECTIONS : PRIMARY_SECTIONS
  const sections = customLabels
    ? baseSections.map(s => ({
        ...s,
        fields: s.fields.map(f => ({
          ...f,
          label: customLabels[f.key] || f.label,
        })),
      }))
    : baseSections

  const dateStr = completedAt
    ? new Date(completedAt).toLocaleDateString('ru-RU', {
        timeZone: 'Europe/Moscow',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : ''

  const accentColor = type === 'acute' ? '#f97316' : '#c8a035'
  const accentBg = type === 'acute' ? 'rgba(249,115,22,0.08)' : 'rgba(200,160,53,0.08)'

  const displayAnswers = editMode ? localAnswers : answers
  const totalFilled = sections.flatMap(s => s.fields).filter(f => answers[f.key]?.trim()).length

  function handleFieldChange(key: string, value: string) {
    setLocalAnswers(prev => ({ ...prev, [key]: value }))
  }

  function handleCancel() {
    setLocalAnswers(answers)
    setEditMode(false)
  }

  async function handleSave() {
    if (!patientId) return
    setSaving(true)
    try {
      await submitDoctorIntake(patientId, type, localAnswers)
      setEditMode(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      backgroundColor: 'var(--sim-bg, #faf8f5)',
      border: `1px solid ${accentColor}`,
      borderLeft: `4px solid ${accentColor}`,
      borderRadius: '8px',
      overflow: 'hidden',
    }}>
      {/* Шапка */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: '12px 16px',
          borderBottom: expanded ? `1px solid ${accentColor}` : 'none',
          backgroundColor: expanded ? accentBg : 'transparent',
        }}
      >
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex items-center gap-2 flex-1 min-w-0"
        >
          <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: accentColor }}>
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {type === 'acute' ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              )}
            </svg>
          </div>
          <span className="font-semibold truncate" style={{ fontSize: '15px', color: 'var(--sim-text)' }}>
            {type === 'acute' ? t(lang).intake.acuteIntakeTitle : t(lang).intake.primaryIntake}
          </span>
          {dateStr && <span className="shrink-0" style={{ fontSize: '13px', color: 'var(--sim-text-hint)' }}>{dateStr}</span>}
          <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ backgroundColor: accentColor + '20', color: accentColor }}>
            {totalFilled} полей
          </span>
          <svg
            className={`w-4 h-4 transition-transform shrink-0 ml-auto ${expanded ? 'rotate-180' : ''}`}
            style={{ color: 'var(--sim-green)' }}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Кнопки редактирования */}
        {patientId && expanded && (
          <div className="flex items-center gap-1.5 ml-3 shrink-0">
            {editMode ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all disabled:opacity-60"
                  style={{ backgroundColor: 'var(--sim-green)', color: '#fff' }}
                >
                  {saving ? 'Сохраняю...' : 'Сохранить'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={saving}
                  className="text-xs font-medium px-2.5 py-1.5 rounded-full transition-all"
                  style={{ backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--sim-text-sec)' }}
                >
                  Отмена
                </button>
              </>
            ) : (
              <button
                onClick={() => { setExpanded(true); setEditMode(true) }}
                className="text-xs font-medium px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5"
                style={{ backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--sim-text-sec)' }}
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
                Редактировать
              </button>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className="px-5 py-4 space-y-5">
          {sections.map(section => {
            const fieldsToShow = editMode
              ? section.fields
              : section.fields.filter(f => displayAnswers[f.key]?.trim())
            if (fieldsToShow.length === 0) return null
            return (
              <div key={section.title}>
                <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: accentColor }}>
                  {section.title}
                </p>
                <div className={editMode ? 'space-y-3' : 'grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3'}>
                  {fieldsToShow.map(field => (
                    <div key={field.key} className="min-w-0">
                      <p className="font-semibold mb-0.5" style={{ fontSize: '11px', color: 'var(--sim-text-hint)' }}>
                        {field.label}
                      </p>
                      {editMode ? (
                        <textarea
                          value={localAnswers[field.key] || ''}
                          onChange={e => handleFieldChange(field.key, e.target.value)}
                          rows={field.multiline ? 3 : 1}
                          className="w-full rounded-xl px-3 py-2 text-sm resize-none"
                          style={{
                            border: '1px solid var(--sim-border)',
                            backgroundColor: '#fff',
                            color: 'var(--sim-text)',
                            minHeight: field.multiline ? '72px' : '36px',
                            lineHeight: '1.4',
                          }}
                        />
                      ) : (
                        <p className="text-sm text-gray-800 leading-snug">
                          {field.key === 'intensity' ? `${displayAnswers[field.key]} / 10` : displayAnswers[field.key]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {editMode && (
            <div className="flex items-center gap-2 pt-2" style={{ borderTop: `1px solid ${accentColor}30` }}>
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-sm font-semibold px-4 py-2 rounded-xl transition-all disabled:opacity-60"
                style={{ backgroundColor: 'var(--sim-green)', color: '#fff' }}
              >
                {saving ? 'Сохраняю...' : 'Сохранить изменения'}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="text-sm font-medium px-3 py-2 rounded-xl"
                style={{ backgroundColor: 'rgba(0,0,0,0.06)', color: 'var(--sim-text-sec)' }}
              >
                Отмена
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
