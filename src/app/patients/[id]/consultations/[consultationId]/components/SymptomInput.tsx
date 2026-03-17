'use client'

import { useState, useRef } from 'react'
import { StructuredSymptom, SymptomCategory, SymptomDynamics } from '@/types'
import { useLanguage } from '@/hooks/useLanguage'

const CATEGORY_OPTIONS: { value: SymptomCategory; ru: string; en: string; color: string }[] = [
  { value: 'chief_complaint', ru: 'Жалоба',    en: 'Complaint',   color: '#dc2626' },
  { value: 'mental',          ru: 'Психика',    en: 'Mental',      color: '#2563eb' },
  { value: 'modality_worse',  ru: 'Хуже от',   en: 'Worse',       color: '#ea580c' },
  { value: 'modality_better', ru: 'Лучше от',  en: 'Better',      color: '#059669' },
  { value: 'general',         ru: 'Общее',      en: 'General',     color: '#6b7280' },
  { value: 'concomitant',     ru: 'Сопутств.', en: 'Concomitant', color: '#9333ea' },
  { value: 'other',           ru: 'Другое',     en: 'Other',       color: '#9ca3af' },
]

const DYNAMICS_OPTIONS: { value: SymptomDynamics; icon: string; ru: string; en: string; color: string }[] = [
  { value: 'new',      icon: '+', ru: 'Новое',    en: 'New',      color: '#2563eb' },
  { value: 'better',   icon: '↑', ru: 'Лучше',   en: 'Better',   color: '#059669' },
  { value: 'worse',    icon: '↓', ru: 'Хуже',    en: 'Worse',    color: '#dc2626' },
  { value: 'same',     icon: '=', ru: 'Как было', en: 'Same',    color: '#9ca3af' },
  { value: 'resolved', icon: '✓', ru: 'Прошло',  en: 'Resolved', color: '#0d9488' },
]

type Props = {
  symptoms: StructuredSymptom[]
  onChange: (symptoms: StructuredSymptom[]) => void
  previousSymptoms?: StructuredSymptom[]
  defaultCategory?: SymptomCategory
}

export default function SymptomInput({ symptoms, onChange, previousSymptoms = [], defaultCategory = 'chief_complaint' }: Props) {
  const { lang } = useLanguage()
  const [input, setInput] = useState('')
  const [category, setCategory] = useState<SymptomCategory>(defaultCategory)
  const [showCategoryPicker, setShowCategoryPicker] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const prevIds = new Set(previousSymptoms.map(s => s.id))

  function addSymptom() {
    const label = input.trim()
    if (!label) return
    const id = crypto.randomUUID()
    const dynamics: SymptomDynamics = prevIds.has(id) ? 'same' : 'new'
    const newSym: StructuredSymptom = { id, label, category, dynamics, createdAt: new Date().toISOString() }
    onChange([...symptoms, newSym])
    setInput('')
    inputRef.current?.focus()
  }

  function removeSymptom(id: string) {
    onChange(symptoms.filter(s => s.id !== id))
  }

  function updateDynamics(id: string, dynamics: SymptomDynamics) {
    onChange(symptoms.map(s => s.id === id ? { ...s, dynamics } : s))
    setExpandedId(null)
  }

  function updateCategory(id: string, cat: SymptomCategory) {
    onChange(symptoms.map(s => s.id === id ? { ...s, category: cat } : s))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') { e.preventDefault(); addSymptom() }
    if (e.key === 'Backspace' && !input && symptoms.length > 0) {
      removeSymptom(symptoms[symptoms.length - 1].id)
    }
  }

  const catCfg = CATEGORY_OPTIONS.find(c => c.value === category) || CATEGORY_OPTIONS[0]

  return (
    <div className="mt-2">
      {/* Теги симптомов */}
      {symptoms.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {symptoms.map(sym => {
            const dynCfg = DYNAMICS_OPTIONS.find(d => d.value === sym.dynamics)
            const catLabel = CATEGORY_OPTIONS.find(c => c.value === sym.category)
            const isExpanded = expandedId === sym.id

            return (
              <div key={sym.id} className="inline-flex items-center gap-1 text-[11px] pl-1.5 pr-1 py-1.5 rounded-lg border" style={{ backgroundColor: '#faf7f2', borderColor: '#e0dcd4' }}>
                {/* Dynamics — всегда видны, клик переключает */}
                <div className="flex items-center gap-0.5">
                  {isExpanded ? (
                    DYNAMICS_OPTIONS.map(d => (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => updateDynamics(sym.id, d.value)}
                        className="w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center rounded text-[10px] font-bold transition-all"
                        style={{
                          color: sym.dynamics === d.value ? '#fff' : d.color,
                          backgroundColor: sym.dynamics === d.value ? d.color : d.color + '18',
                        }}
                        title={d[lang]}
                      >
                        {d.icon}
                      </button>
                    ))
                  ) : (
                    <button
                      type="button"
                      onClick={() => setExpandedId(sym.id)}
                      className="w-6 h-6 sm:w-5 sm:h-5 flex items-center justify-center rounded text-[10px] font-bold transition-all hover:opacity-80"
                      style={{ color: dynCfg?.color || '#9ca3af', backgroundColor: (dynCfg?.color || '#9ca3af') + '18' }}
                      title={lang === 'ru' ? 'Изменить динамику' : 'Change dynamics'}
                    >
                      {dynCfg?.icon || '?'}
                    </button>
                  )}
                </div>

                {/* Метка */}
                <span className="text-gray-700 mx-0.5">{sym.label}</span>

                {/* Категория — кликабельный тег */}
                <button
                  type="button"
                  onClick={() => {
                    const idx = CATEGORY_OPTIONS.findIndex(c => c.value === sym.category)
                    const next = CATEGORY_OPTIONS[(idx + 1) % CATEGORY_OPTIONS.length]
                    updateCategory(sym.id, next.value)
                  }}
                  className="text-[8px] uppercase tracking-wider px-1 py-0.5 rounded transition-opacity hover:opacity-70"
                  style={{ color: catLabel?.color || '#999', backgroundColor: (catLabel?.color || '#999') + '18' }}
                  title={lang === 'ru' ? 'Сменить категорию' : 'Change category'}
                >
                  {catLabel?.[lang] || sym.category}
                </button>

                {/* Удалить */}
                <button
                  type="button"
                  onClick={() => removeSymptom(sym.id)}
                  className="w-5 h-5 sm:w-4 sm:h-4 flex items-center justify-center rounded hover:bg-gray-200 transition-colors opacity-40 hover:opacity-100"
                >
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Строка ввода: поле в фокусе, категория вторична */}
      <div className="flex gap-1.5 items-center">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={lang === 'ru' ? 'Добавить симптом — Enter' : 'Add symptom — Enter'}
          className="flex-1 text-[12px] px-2.5 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/10 transition-all placeholder-gray-300"
          style={{ fontSize: '16px' }}
        />

        {/* Категория — только при наличии текста, иначе почти не видна */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCategoryPicker(v => !v)}
            className="text-[10px] px-2 py-1.5 rounded-lg border transition-all"
            style={{
              color: input.trim() ? catCfg.color : '#c8bfb4',
              borderColor: input.trim() ? catCfg.color + '40' : '#e5e0d8',
              backgroundColor: input.trim() ? catCfg.color + '08' : 'transparent',
            }}
            title={lang === 'ru' ? 'Категория симптома' : 'Symptom category'}
          >
            {catCfg[lang]}
          </button>
          {showCategoryPicker && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-gray-200 py-1 min-w-[130px]">
              {CATEGORY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setCategory(opt.value); setShowCategoryPicker(false) }}
                  className="w-full text-left px-3 py-1.5 text-[11px] transition-colors hover:bg-gray-50 flex items-center gap-2"
                  style={{ color: opt.color, fontWeight: category === opt.value ? 600 : 400 }}
                >
                  {category === opt.value && <span className="text-[8px]">✓</span>}
                  {opt[lang]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
