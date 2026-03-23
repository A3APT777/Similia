'use client'

import { useState, useRef, useEffect } from 'react'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

// ─── Тип структурированного шаблона ─────────────────────────────────────────

export type StructuredTemplate = {
  complaints: string
  observations: string
  notes: string
  recommendations: string
}

// ─── Полные шаблоны (структурированные) ─────────────────────────────────────

const FULL_TEMPLATES: {
  id: string
  labelKey: string
  descKey: string
  icon: string
  fields: StructuredTemplate
}[] = [
  {
    id: 'primary',
    labelKey: 'primary',
    descKey: 'primaryDesc',
    icon: '📋',
    fields: {
      complaints: 'ЖАЛОБЫ\n—\n',
      observations: `ОЩУЩЕНИЯ
Характер:
Локализация:
Иррадиация:
Интенсивность (1–10):

МОДАЛЬНОСТИ
Хуже от:
Лучше от:
Время ухудшения:
Погода/температура:

ЭТИОЛОГИЯ
Что спровоцировало:

ПСИХОЭМОЦИОНАЛЬНОЕ
Настроение:
Страхи:
Тревоги:
Реакция на стресс:
Характер:

ОБЩЕЕ СОСТОЯНИЕ
Температурный режим:
Энергия:
Жажда:
Потливость:
Зябкость/жаркость:

АППЕТИТ
Желания:
Отвращения:
Аппетит:

СОН
Засыпание:
Сновидения:
Положение:
Просыпание:`,
      notes: 'СОПУТСТВУЮЩИЕ СИМПТОМЫ\n—\n',
      recommendations: '',
    },
  },
  {
    id: 'repeat',
    labelKey: 'followup',
    descKey: 'followupDesc',
    icon: '🔄',
    fields: {
      complaints: 'ТЕКУЩИЕ ЖАЛОБЫ\n—\n',
      observations: `ДИНАМИКА С ПРОШЛОГО ПРИЁМА
Общее самочувствие:

ИЗМЕНЕНИЯ В СИМПТОМАХ
Стало лучше:
Стало хуже:
Новые симптомы:
Прошло совсем:

РЕАКЦИЯ НА ПРЕПАРАТ
Когда почувствовал(а) изменения:
Как долго держался эффект:

ПСИХОЭМОЦИОНАЛЬНОЕ
Изменения в настроении:
Сон:
Энергия:`,
      notes: '',
      recommendations: '',
    },
  },
  {
    id: 'acute',
    labelKey: 'acuteState',
    descKey: 'acuteStateDesc',
    icon: '⚡',
    fields: {
      complaints: 'ОСТРЫЕ ЖАЛОБЫ\n—\n',
      observations: `НАЧАЛО
Когда началось:
Как быстро развилось:
Этиология (причина):

СИМПТОМЫ
Главный симптом:
Сопутствующие:

МОДАЛЬНОСТИ
Хуже от:
Лучше от:

ОБЩЕЕ
Температура:
Жажда:
Настроение/поведение:`,
      notes: '',
      recommendations: '',
    },
  },
  {
    id: 'child',
    labelKey: 'child',
    descKey: 'childDesc',
    icon: '👶',
    fields: {
      complaints: 'ЖАЛОБЫ (со слов родителя)\n—\n',
      observations: `КАК ВЕДЁТ СЕБЯ РЕБЁНОК
Активность:
Капризность:
Контактность:

СИМПТОМЫ
Основное:
Сопутствующее:

МОДАЛЬНОСТИ
Хуже от:
Лучше от:

ПИТАНИЕ
Аппетит:
Желания/отвращения:
Грудное/искусственное (для младенцев):

СОН
Качество:
Ночные пробуждения:
Страхи ночью:

ФИЗИЧЕСКОЕ РАЗВИТИЕ
Соответствует возрасту:`,
      notes: '',
      recommendations: '',
    },
  },
]

// ─── Быстрые секции (вставляются по отдельности в notes) ────────────────────

const QUICK_SECTIONS = [
  { id: 'complaints',    label: 'Жалобы',             text: 'ЖАЛОБЫ\n—\n' },
  { id: 'sensations',   label: 'Ощущения',            text: 'ОЩУЩЕНИЯ\nХарактер: \nЛокализация: \nИррадиация: \n' },
  { id: 'modalities',   label: 'Модальности',         text: 'МОДАЛЬНОСТИ\nХуже от: \nЛучше от: \nВремя: \n' },
  { id: 'etiology',     label: 'Этиология',           text: 'ЭТИОЛОГИЯ\nЧто спровоцировало: \n' },
  { id: 'mental',       label: 'Психоэмоциональное',  text: 'ПСИХОЭМОЦИОНАЛЬНОЕ\nНастроение: \nСтрахи: \nТревоги: \nСтресс: \n' },
  { id: 'general',      label: 'Общее состояние',     text: 'ОБЩЕЕ СОСТОЯНИЕ\nТемпературный режим: \nЭнергия: \nЖажда: \nПотливость: \n' },
  { id: 'sleep',        label: 'Сон',                 text: 'СОН\nЗасыпание: \nСновидения: \nПросыпание: \n' },
  { id: 'appetite',     label: 'Аппетит',             text: 'АППЕТИТ\nЖелания: \nОтвращения: \nАппетит: \n' },
  { id: 'prescription', label: 'Назначение',          text: 'НАЗНАЧЕНИЕ\nПрепарат: \nПотенция: \nДозировка: \nПовтор: \n' },
]

// ─── Пропсы ─────────────────────────────────────────────────────────────────

type Props = {
  onInsertStructured: (template: StructuredTemplate) => void
  onInsertText: (text: string) => void
  consultationType?: 'chronic' | 'acute'
  currentFields: { complaints: string; observations: string; notes: string; recommendations: string }
}

// ─── Компонент ──────────────────────────────────────────────────────────────

export default function TemplateMenu({ onInsertStructured, onInsertText, consultationType = 'chronic', currentFields }: Props) {
  const { lang } = useLanguage()
  // Рекомендуемый шаблон зависит от типа консультации
  const recommendedId = consultationType === 'acute' ? 'acute' : 'primary'
  const [open, setOpen] = useState(false)
  const [confirmTemplate, setConfirmTemplate] = useState<StructuredTemplate | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Закрываем при клике вне меню
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
        setConfirmTemplate(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Проверка: есть ли данные в целевых полях
  function hasExistingContent(fields: StructuredTemplate): boolean {
    const keys: (keyof StructuredTemplate)[] = ['complaints', 'observations', 'notes', 'recommendations']
    return keys.some(k => fields[k] && currentFields[k].trim().length > 0)
  }

  function handleFullTemplate(fields: StructuredTemplate) {
    if (hasExistingContent(fields)) {
      // Показываем диалог подтверждения
      setConfirmTemplate(fields)
    } else {
      // Все поля пустые — применяем сразу
      onInsertStructured(fields)
      setOpen(false)
    }
  }

  function handleReplace() {
    if (confirmTemplate) {
      onInsertStructured(confirmTemplate)
    }
    setConfirmTemplate(null)
    setOpen(false)
  }

  function handleAppend() {
    if (confirmTemplate) {
      // Добавляем с разделителем \n\n
      const merged: StructuredTemplate = {
        complaints: currentFields.complaints.trim() && confirmTemplate.complaints
          ? currentFields.complaints + '\n\n' + confirmTemplate.complaints
          : currentFields.complaints || confirmTemplate.complaints,
        observations: currentFields.observations.trim() && confirmTemplate.observations
          ? currentFields.observations + '\n\n' + confirmTemplate.observations
          : currentFields.observations || confirmTemplate.observations,
        notes: currentFields.notes.trim() && confirmTemplate.notes
          ? currentFields.notes + '\n\n' + confirmTemplate.notes
          : currentFields.notes || confirmTemplate.notes,
        recommendations: currentFields.recommendations.trim() && confirmTemplate.recommendations
          ? currentFields.recommendations + '\n\n' + confirmTemplate.recommendations
          : currentFields.recommendations || confirmTemplate.recommendations,
      }
      onInsertStructured(merged)
    }
    setConfirmTemplate(null)
    setOpen(false)
  }

  function handleCancel() {
    setConfirmTemplate(null)
  }

  function handleQuickInsert(text: string) {
    onInsertText(text)
    setOpen(false)
  }

  const labels = lang === 'ru'
    ? { replace: 'Заменить', append: 'Добавить', cancel: 'Отмена', fieldsNotEmpty: 'Некоторые поля уже заполнены' }
    : { replace: 'Replace', append: 'Append', cancel: 'Cancel', fieldsNotEmpty: 'Some fields already have content' }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
          open
            ? 'bg-[#2d6a4f] text-white border-[#2d6a4f]'
            : 'border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {t(lang).templates.template}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-80 bg-[#ede7dd] border border-gray-100 rounded-2xl shadow-xl shadow-gray-900/10 z-30 overflow-hidden">

          {/* Диалог подтверждения (если поля не пустые) */}
          {confirmTemplate && (
            <div className="px-3 pt-3 pb-3 border-b border-gray-200 bg-amber-50/60">
              <p className="text-xs text-amber-700 font-medium mb-2">{labels.fieldsNotEmpty}</p>
              <div className="flex gap-1.5">
                <button
                  onClick={handleReplace}
                  className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                >
                  {labels.replace}
                </button>
                <button
                  onClick={handleAppend}
                  className="flex-1 text-xs font-semibold py-1.5 rounded-lg bg-[#2d6a4f] text-white hover:bg-[#2d6a4f] transition-colors"
                >
                  {labels.append}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {labels.cancel}
                </button>
              </div>
            </div>
          )}

          {/* Полные шаблоны */}
          {!confirmTemplate && (
            <>
              <div className="px-3 pt-3 pb-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
                  {t(lang).templates.fullTemplates}
                </p>
                <div className="space-y-0.5">
                  {FULL_TEMPLATES.map(tpl => {
                    const isRecommended = tpl.id === recommendedId
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => handleFullTemplate(tpl.fields)}
                        className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors group ${
                          isRecommended ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span className="text-base leading-none shrink-0">{tpl.icon}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-medium transition-colors ${isRecommended ? 'text-emerald-700' : 'text-gray-800 group-hover:text-emerald-700'}`}>
                              {(t(lang).templates as Record<string, any>)[tpl.labelKey]}
                            </p>
                            {isRecommended && (
                              <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-500 bg-emerald-100 px-1.5 py-0.5 rounded">
                                {t(lang).templates.recommended}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{(t(lang).templates as Record<string, any>)[tpl.descKey]}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Разделитель */}
              <div className="border-t border-gray-100 mx-3" />

              {/* Быстрые секции */}
              <div className="px-3 pt-2 pb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
                  {t(lang).templates.addSection}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_SECTIONS.map(s => (
                    <button
                      key={s.id}
                      onClick={() => handleQuickInsert(s.text)}
                      className="text-xs text-gray-600 border border-gray-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded-lg transition-all"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
