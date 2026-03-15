'use client'

import { useState, useRef, useEffect } from 'react'

// ─── Полные шаблоны ───────────────────────────────────────────────────────────

const FULL_TEMPLATES = [
  {
    id: 'primary',
    label: 'Первичный приём',
    description: 'Полный сбор анамнеза',
    icon: '📋',
    text: `ЖАЛОБЫ
—

ОЩУЩЕНИЯ
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
Просыпание:

СОПУТСТВУЮЩИЕ СИМПТОМЫ
—

НАЗНАЧЕНИЕ
Препарат:
Потенция:
Дозировка:
Повтор: `,
  },
  {
    id: 'repeat',
    label: 'Повторный приём',
    description: 'Динамика после лечения',
    icon: '🔄',
    text: `ДИНАМИКА С ПРОШЛОГО ПРИЁМА
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
Энергия:

ТЕКУЩИЕ ЖАЛОБЫ
—

НАЗНАЧЕНИЕ
Препарат:
Потенция:
Изменение схемы: `,
  },
  {
    id: 'acute',
    label: 'Острое состояние',
    description: 'Быстрый острый случай',
    icon: '⚡',
    text: `ОСТРЫЕ ЖАЛОБЫ
—

НАЧАЛО
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
Настроение/поведение:

НАЗНАЧЕНИЕ
Препарат:
Потенция:
Дозировка: `,
  },
  {
    id: 'child',
    label: 'Ребёнок',
    description: 'Детский приём',
    icon: '👶',
    text: `ЖАЛОБЫ (со слов родителя)
—

КАК ВЕДЁТ СЕБЯ РЕБЁНОК
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
Соответствует возрасту:

НАЗНАЧЕНИЕ
Препарат:
Потенция:
Дозировка: `,
  },
]

// ─── Быстрые секции (вставляются по отдельности) ──────────────────────────────

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

// ─── Пропсы ───────────────────────────────────────────────────────────────────

type Props = {
  onInsert: (text: string) => void
  consultationType?: 'chronic' | 'acute'
}

// ─── Компонент ────────────────────────────────────────────────────────────────

export default function TemplateMenu({ onInsert, consultationType = 'chronic' }: Props) {
  // Рекомендуемый шаблон зависит от типа консультации
  const recommendedId = consultationType === 'acute' ? 'acute' : 'primary'
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Закрываем при клике вне меню
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleInsert(text: string) {
    onInsert(text)
    setOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
          open
            ? 'bg-emerald-600 text-white border-emerald-600'
            : 'border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50'
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Шаблон
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-80 bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-900/10 z-30 overflow-hidden">

          {/* Полные шаблоны */}
          <div className="px-3 pt-3 pb-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
              Полные шаблоны
            </p>
            <div className="space-y-0.5">
              {FULL_TEMPLATES.map(tpl => {
                const isRecommended = tpl.id === recommendedId
                return (
                  <button
                    key={tpl.id}
                    onClick={() => handleInsert(tpl.text)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors group ${
                      isRecommended ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base leading-none shrink-0">{tpl.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium transition-colors ${isRecommended ? 'text-emerald-700' : 'text-gray-800 group-hover:text-emerald-700'}`}>
                          {tpl.label}
                        </p>
                        {isRecommended && (
                          <span className="text-[9px] font-bold uppercase tracking-wide text-emerald-500 bg-emerald-100 px-1.5 py-0.5 rounded">
                            Рекомендован
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400">{tpl.description}</p>
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
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-2 px-1">
              Добавить раздел
            </p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SECTIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => handleInsert(s.text)}
                  className="text-xs text-gray-600 border border-gray-200 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 rounded-lg transition-all"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
