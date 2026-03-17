'use client'

import { useState, useRef } from 'react'
import { StructuredSymptom, SymptomCategory, SymptomDynamics } from '@/types'
import { useLanguage } from '@/hooks/useLanguage'

const CATEGORY_OPTIONS: { value: SymptomCategory; ru: string; en: string; color: string }[] = [
  { value: 'chief_complaint', ru: 'Жалоба', en: 'Complaint', color: '#dc2626' },
  { value: 'concomitant', ru: 'Сопутств.', en: 'Concomitant', color: '#9333ea' },
  { value: 'modality_worse', ru: 'Хуже', en: 'Worse', color: '#ea580c' },
  { value: 'modality_better', ru: 'Лучше', en: 'Better', color: '#059669' },
  { value: 'mental', ru: 'Психика', en: 'Mental', color: '#2563eb' },
  { value: 'general', ru: 'Общее', en: 'General', color: '#6b7280' },
  { value: 'sleep', ru: 'Сон', en: 'Sleep', color: '#7c3aed' },
  { value: 'appetite', ru: 'Аппетит', en: 'Appetite', color: '#ca8a04' },
  { value: 'observation', ru: 'Наблюд.', en: 'Observ.', color: '#0891b2' },
  { value: 'other', ru: 'Другое', en: 'Other', color: '#9ca3af' },
]

const DYNAMICS_OPTIONS: { value: SymptomDynamics; icon: string; ru: string; en: string; color: string }[] = [
  { value: 'new', icon: '+', ru: 'Новое', en: 'New', color: '#2563eb' },
  { value: 'better', icon: '↑', ru: 'Лучше', en: 'Better', color: '#059669' },
  { value: 'worse', icon: '↓', ru: 'Хуже', en: 'Worse', color: '#dc2626' },
  { value: 'same', icon: '=', ru: 'Как было', en: 'Same', color: '#9ca3af' },
  { value: 'resolved', icon: '✓', ru: 'Прошло', en: 'Resolved', color: '#059669' },
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
  const inputRef = useRef<HTMLInputElement>(null)
  const prevIds = new Set(previousSymptoms.map(s => s.id))

  function addSymptom() {
    const label = input.trim()
    if (!label) return
    const id = crypto.randomUUID()
    const dynamics: SymptomDynamics = prevIds.has(id) ? 'same' : 'new'
    const newSym: StructuredSymptom = {
      id,
      label,
      category,
      dynamics,
      createdAt: new Date().toISOString(),
    }
    onChange([...symptoms, newSym])
    setInput('')
    inputRef.current?.focus()
  }

  function removeSymptom(id: string) {
    onChange(symptoms.filter(s => s.id !== id))
  }

  function updateDynamics(id: string, dynamics: SymptomDynamics) {
    onChange(symptoms.map(s => s.id === id ? { ...s, dynamics } : s))
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
            return (
              <div key={sym.id} className="group relative inline-flex items-center gap-1 text-[11px] pl-2 pr-1 py-1 rounded-lg border transition-all" style={{ backgroundColor: '#faf7f2', borderColor: '#e0dcd4' }}>
                {/* Dynamics icon */}
                {dynCfg && (
                  <span className="font-bold text-[10px]" style={{ color: dynCfg.color }}>{dynCfg.icon}</span>
                )}
                {/* Label */}
                <span className="text-gray-700">{sym.label}</span>
                {/* Category badge */}
                <span className="text-[8px] uppercase tracking-wider px-1 py-0.5 rounded" style={{ color: catLabel?.color || '#999', backgroundColor: (catLabel?.color || '#999') + '15' }}>
                  {catLabel?.[lang] || sym.category}
                </span>
                {/* Dynamics selector (on hover) */}
                <div className="hidden group-hover:flex items-center gap-0.5 ml-0.5">
                  {DYNAMICS_OPTIONS.map(d => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => updateDynamics(sym.id, d.value)}
                      className="w-4 h-4 flex items-center justify-center rounded text-[9px] font-bold transition-all hover:scale-110"
                      style={{
                        color: sym.dynamics === d.value ? '#fff' : d.color,
                        backgroundColor: sym.dynamics === d.value ? d.color : 'transparent',
                      }}
                      title={d[lang]}
                    >
                      {d.icon}
                    </button>
                  ))}
                </div>
                {/* Remove */}
                <button
                  type="button"
                  onClick={() => removeSymptom(sym.id)}
                  className="w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 transition-colors opacity-30 group-hover:opacity-100 ml-0.5"
                >
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Ввод */}
      <div className="flex gap-1.5 items-center">
        {/* Category picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCategoryPicker(v => !v)}
            className="text-[10px] font-semibold px-2 py-1.5 rounded-lg border transition-all"
            style={{ color: catCfg.color, borderColor: catCfg.color + '40', backgroundColor: catCfg.color + '08' }}
          >
            {catCfg[lang]}
          </button>
          {showCategoryPicker && (
            <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl shadow-lg border border-gray-200 py-1 min-w-[120px]">
              {CATEGORY_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setCategory(opt.value); setShowCategoryPicker(false) }}
                  className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${category === opt.value ? 'font-semibold' : ''}`}
                  style={{ color: opt.color }}
                >
                  {opt[lang]}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={lang === 'ru' ? '+ симптом...' : '+ symptom...'}
          className="flex-1 text-[12px] px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/10 transition-all placeholder-gray-300"
        />
        {input.trim() && (
          <button type="button" onClick={addSymptom} className="text-[10px] font-semibold px-2 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: '#2d6a4f' }}>
            Enter
          </button>
        )}
      </div>
    </div>
  )
}
