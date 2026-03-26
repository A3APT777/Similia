'use client'

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import { savePrescription } from '@/lib/actions/consultations'
import { searchRemediesDB, RemedyResult } from '@/lib/actions/remedies'
import { useLanguage } from '@/hooks/useLanguage'

const POTENCY_CHIPS = ['6C', '12C', '30C', '200C', '1M', '10M', 'LM1', 'LM2', 'LM3', 'LM6']

const LABELS = {
  ru: { remedy: 'Препарат', potency: 'Потенция', pellets: 'Гранулы', dosage: 'Дозировка', title: 'Назначение', saved: 'Сохранено' },
  en: { remedy: 'Remedy', potency: 'Potency', pellets: 'Pellets', dosage: 'Dosage', title: 'Prescription', saved: 'Saved' },
}

type Props = {
  consultationId: string
  onSaved?: (remedy: string, potency: string, dosage: string) => void
  assignedRemedy?: string
  initialRemedy?: string | null
  initialPotency?: string | null
  initialDosage?: string | null
  initialPellets?: number | null
}

export default function InlineRx({ consultationId, onSaved, assignedRemedy, initialRemedy, initialPotency, initialDosage, initialPellets }: Props) {
  const { lang } = useLanguage()
  const L = LABELS[lang] || LABELS.en

  const [remedy, setRemedy] = useState(initialRemedy || '')
  const [potency, setPotency] = useState(
    initialPotency && POTENCY_CHIPS.includes(initialPotency) ? initialPotency : ''
  )
  const [customPotency, setCustomPotency] = useState(
    initialPotency && !POTENCY_CHIPS.includes(initialPotency) ? initialPotency : ''
  )
  const [pellets, setPellets] = useState(initialPellets || 3)
  const [dosage, setDosage] = useState(initialDosage || '')

  const [suggestions, setSuggestions] = useState<RemedyResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useLayoutEffect(() => {
    if (assignedRemedy) {
      setRemedy(assignedRemedy)
      setSuggestions([])
      setShowSuggestions(false)
      setSaveStatus('idle')
      inputRef.current?.focus()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedRemedy])

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  function handleRemedyChange(value: string) {
    setRemedy(value)
    setActiveSuggestion(-1)
    setSaveStatus('idle')
    clearTimeout(searchDebounceRef.current)
    if (!value.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    setSearching(true)
    searchDebounceRef.current = setTimeout(async () => {
      const results = await searchRemediesDB(value)
      setSuggestions(results)
      setShowSuggestions(results.length > 0)
      setSearching(false)
    }, 300)
  }

  function selectSuggestion(r: RemedyResult) {
    setRemedy(r.name_latin)
    setSuggestions([])
    setShowSuggestions(false)
    setActiveSuggestion(-1)
    setSearching(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveSuggestion(i => Math.max(i - 1, -1))
    } else if (e.key === 'Enter' && activeSuggestion >= 0) {
      e.preventDefault()
      selectSuggestion(suggestions[activeSuggestion])
    } else if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!suggestionsRef.current?.contains(e.target as Node) && e.target !== inputRef.current) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const finalPotency = potency || customPotency

  const doAutoSave = useCallback(async () => {
    if (!remedy.trim() || !finalPotency.trim()) return
    setSaveStatus('saving')
    try {
      await savePrescription(consultationId, remedy.trim(), finalPotency.trim(), pellets, dosage.trim())
      setSaveStatus('saved')
      onSaved?.(remedy.trim(), finalPotency.trim(), dosage.trim())
    } catch {
      setSaveStatus('idle')
    }
  }, [consultationId, remedy, finalPotency, pellets, dosage, onSaved])

  useEffect(() => {
    if (!remedy.trim() || !finalPotency.trim()) return
    clearTimeout(saveDebounceRef.current)
    saveDebounceRef.current = setTimeout(() => {
      doAutoSave()
    }, 2000)
    return () => clearTimeout(saveDebounceRef.current)
  }, [remedy, finalPotency, pellets, dosage, doAutoSave])

  /* ── Стили chips — Apple-subtle ── */
  const chipActive = {
    backgroundColor: 'rgba(45,106,79,0.08)',
    color: 'var(--sim-green)',
    borderColor: 'rgba(45,106,79,0.2)',
    fontWeight: 500,
  }
  const chipInactive = {
    backgroundColor: 'transparent',
    color: 'var(--sim-text-muted)',
    borderColor: 'var(--sim-border)',
    fontWeight: 400 as const,
  }

  return (
    <div data-tour="inline-rx" className="pt-5" style={{ borderTop: '1px solid var(--sim-border)' }}>
      {/* Заголовок — единообразный */}
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em]" style={{ color: 'var(--sim-text-muted)' }}>
          {L.title}
        </p>
        {/* Индикатор сохранения — дышащая точка */}
        {saveStatus === 'saved' && (
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--sim-green)' }} />
        )}
        {saveStatus === 'saving' && (
          <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--sim-text-muted)' }} />
        )}
      </div>

      <div className="space-y-3">
        {/* Строка 1: Препарат + Потенция + Гранулы */}
        <div className="flex flex-wrap items-start gap-3">
          {/* Препарат */}
          <div className="relative flex-1 min-w-[160px]">
            <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--sim-text-muted)' }}>{L.remedy}</label>
            <input
              ref={inputRef}
              type="text"
              value={remedy}
              onChange={e => handleRemedyChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Sulphur, Pulsatilla..."
              className="w-full px-3.5 py-2 text-sm rounded-xl border transition-all duration-200 focus:outline-none"
              style={{ backgroundColor: 'var(--sim-bg-card)', borderColor: 'var(--sim-border)', color: 'var(--sim-text)' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--sim-green)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,106,79,0.08)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--sim-border)'; e.currentTarget.style.boxShadow = 'none' }}
            />
            {searching && (
              <div className="absolute right-2.5 top-[30px]">
                <div className="w-3 h-3 border-2 border-[var(--sim-green)] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute top-full left-0 right-0 mt-1 rounded-xl z-10 overflow-hidden max-h-[200px] overflow-y-auto"
                style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
              >
                {suggestions.map((r, i) => (
                  <button
                    key={r.abbrev}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); selectSuggestion(r) }}
                    className="w-full text-left px-3.5 py-2 transition-colors duration-150"
                    style={{ backgroundColor: i === activeSuggestion ? 'rgba(45,106,79,0.04)' : undefined }}
                    onMouseEnter={e => { if (i !== activeSuggestion) e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.02)' }}
                    onMouseLeave={e => { if (i !== activeSuggestion) e.currentTarget.style.backgroundColor = '' }}
                  >
                    <span className="text-sm font-medium" style={{ color: 'var(--sim-text)' }}>{r.name_latin}</span>
                    {r.name_ru && <span className="text-[12px] ml-2" style={{ color: 'var(--sim-text-muted)' }}>{r.name_ru}</span>}
                    <span className="text-[11px] ml-1.5" style={{ color: 'var(--sim-text-muted)' }}>{r.abbrev}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Потенция */}
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--sim-text-muted)' }}>{L.potency}</label>
            <div className="flex flex-wrap gap-1">
              {POTENCY_CHIPS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => { setPotency(potency === p ? '' : p); setCustomPotency('') }}
                  className="text-[11px] px-2.5 py-1.5 rounded-full border transition-all duration-200"
                  style={potency === p ? chipActive : chipInactive}
                >
                  {p}
                </button>
              ))}
              <input
                type="text"
                value={customPotency}
                onChange={e => { setCustomPotency(e.target.value); setPotency('') }}
                placeholder={lang === 'ru' ? 'Другая' : 'Other'}
                title={lang === 'ru' ? 'LM12, Q5, 50M, 12X...' : 'LM12, Q5, 50M, 12X...'}
                className="w-16 text-center text-[11px] px-2 py-1.5 rounded-xl border transition-all duration-200 focus:outline-none"
                style={{ borderColor: customPotency ? 'rgba(45,106,79,0.2)' : 'var(--sim-border)', backgroundColor: customPotency ? 'rgba(45,106,79,0.04)' : 'transparent', color: 'var(--sim-text)' }}
                onFocus={e => { e.currentTarget.style.borderColor = 'var(--sim-green)' }}
                onBlur={e => { e.currentTarget.style.borderColor = customPotency ? 'rgba(45,106,79,0.2)' : 'var(--sim-border)' }}
              />
            </div>
          </div>

          {/* Гранулы */}
          <div>
            <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--sim-text-muted)' }}>{L.pellets}</label>
            <input
              type="number"
              min={1}
              max={10}
              value={pellets}
              onChange={e => setPellets(Number(e.target.value) || 3)}
              className="w-14 text-center text-sm px-2 py-1.5 rounded-xl border transition-all duration-200 focus:outline-none"
              style={{ borderColor: 'var(--sim-border)', color: 'var(--sim-text)' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--sim-green)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--sim-border)' }}
            />
          </div>
        </div>

        {/* Строка 2: Форма приёма */}
        <div>
          <label className="block text-[11px] font-medium mb-1.5" style={{ color: 'var(--sim-text-muted)' }}>
            {lang === 'ru' ? 'Форма приёма' : 'Administration'}
          </label>
          {/* Форма приёма — одна из трёх */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(lang === 'ru'
              ? ['Сухая доза', 'Раствор', 'Ольфакция']
              : ['Dry dose', 'Solution', 'Olfaction']
            ).map(chip => {
              const isActive = dosage.includes(chip)
              const siblings = lang === 'ru' ? ['Сухая доза', 'Раствор', 'Ольфакция'] : ['Dry dose', 'Solution', 'Olfaction']
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setDosage(prev => {
                    // Убираем другие из группы, ставим выбранный
                    let cleaned = prev
                    siblings.forEach(s => { cleaned = cleaned.replace(s, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim() })
                    return isActive ? cleaned : (cleaned ? cleaned + ', ' + chip : chip)
                  })}
                  className="px-2.5 py-1.5 text-[11px] rounded-full border transition-all duration-200"
                  style={isActive ? chipActive : chipInactive}
                >
                  {chip}
                </button>
              )
            })}
          </div>
          {/* Режим — один из трёх */}
          <div className="flex flex-wrap gap-1.5">
            {(lang === 'ru'
              ? ['Однократно', 'Ежедневно', 'По необходимости']
              : ['Single dose', 'Daily', 'As needed']
            ).map(chip => {
              const isActive = dosage.includes(chip)
              const siblings = lang === 'ru' ? ['Однократно', 'Ежедневно', 'По необходимости'] : ['Single dose', 'Daily', 'As needed']
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setDosage(prev => {
                    let cleaned = prev
                    siblings.forEach(s => { cleaned = cleaned.replace(s, '').replace(/,\s*,/g, ',').replace(/^,\s*|,\s*$/g, '').trim() })
                    return isActive ? cleaned : (cleaned ? cleaned + ', ' + chip : chip)
                  })}
                  className="px-2.5 py-1.5 text-[11px] rounded-full border transition-all duration-200"
                  style={isActive ? chipActive : chipInactive}
                >
                  {chip}
                </button>
              )
            })}
          </div>
        </div>

        {/* Строка 3: Дозировка */}
        <div>
          <label className="block text-[11px] font-medium mb-1" style={{ color: 'var(--sim-text-muted)' }}>{L.dosage}</label>
          <input
            type="text"
            value={dosage}
            onChange={e => setDosage(e.target.value)}
            placeholder={lang === 'ru' ? 'Раствор, 1 ч.л. 1 раз в день, 8 ударов' : 'Solution, 1 tsp once daily, 8 succussions'}
            className="w-full px-3.5 py-2 text-sm rounded-xl border transition-all duration-200 focus:outline-none"
            style={{ backgroundColor: 'var(--sim-bg-card)', borderColor: 'var(--sim-border)', color: 'var(--sim-text)' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--sim-green)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,106,79,0.08)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--sim-border)'; e.currentTarget.style.boxShadow = 'none' }}
          />
        </div>
      </div>
    </div>
  )
}
