'use client'

import { useState, useRef } from 'react'
import { StructuredSymptom } from '@/types'
import { useLanguage } from '@/hooks/useLanguage'

// Generate stable ID from label
function makeId(label: string): string {
  return label.toLowerCase().trim()
    .replace(/[^a-zа-яё0-9\s]/gi, '')
    .replace(/\s+/g, '-')
    .substring(0, 60)
}

type Props = {
  section: StructuredSymptom['section']
  symptoms: StructuredSymptom[]
  onChange: (symptoms: StructuredSymptom[]) => void
  previousSymptoms?: StructuredSymptom[] // for showing status badges
}

export default function SymptomTags({ section, symptoms, onChange, previousSymptoms = [] }: Props) {
  const { lang } = useLanguage()
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const sectionSymptoms = symptoms.filter(s => s.section === section)
  const prevIds = new Set(previousSymptoms.filter(s => s.section === section).map(s => s.id))

  function addSymptom() {
    const label = input.trim()
    if (!label) return
    const id = makeId(label)
    // Don't add duplicates
    if (symptoms.some(s => s.id === id)) {
      setInput('')
      return
    }
    const newSym: StructuredSymptom = { id, label, section, category: section === 'complaints' ? 'chief_complaint' : section === 'observations' ? 'observation' : 'other', createdAt: new Date().toISOString() }
    onChange([...symptoms, newSym])
    setInput('')
    inputRef.current?.focus()
  }

  function removeSymptom(id: string) {
    onChange(symptoms.filter(s => !(s.id === id && s.section === section)))
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      addSymptom()
    }
    // Backspace on empty input removes last tag
    if (e.key === 'Backspace' && !input && sectionSymptoms.length > 0) {
      removeSymptom(sectionSymptoms[sectionSymptoms.length - 1].id)
    }
  }

  return (
    <div className="mt-1.5">
      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {sectionSymptoms.map(sym => {
          const isNew = !prevIds.has(sym.id)
          const isFromPrev = prevIds.has(sym.id)
          return (
            <span
              key={sym.id}
              className="inline-flex items-center gap-1 text-[11px] pl-2 pr-1 py-0.5 rounded-md border transition-all group"
              style={{
                backgroundColor: isNew ? '#eff6ff' : '#f9fafb',
                borderColor: isNew ? '#bfdbfe' : '#e5e7eb',
                color: isNew ? '#1e40af' : '#374151',
              }}
            >
              {sym.label}
              {isFromPrev && (
                <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0" title={lang === 'ru' ? 'Был на прошлом приёме' : 'Was on previous visit'} />
              )}
              <button
                type="button"
                onClick={() => removeSymptom(sym.id)}
                className="w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 transition-colors opacity-40 group-hover:opacity-100"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </span>
          )
        })}
      </div>

      {/* Input */}
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={lang === 'ru' ? '+ добавить симптом...' : '+ add symptom...'}
          className="flex-1 text-[12px] px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/10 transition-all placeholder-gray-300"
        />
        {input.trim() && (
          <button
            type="button"
            onClick={addSymptom}
            className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg transition-all"
            style={{ backgroundColor: 'rgba(45,106,79,0.1)', color: '#2d6a4f' }}
          >
            Enter ↵
          </button>
        )}
      </div>
    </div>
  )
}
