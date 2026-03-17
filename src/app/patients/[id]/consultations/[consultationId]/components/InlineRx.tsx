'use client'

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import { savePrescription } from '@/lib/actions/consultations'
import { searchRemediesDB, RemedyResult } from '@/lib/actions/remedies'
import { useLanguage } from '@/hooks/useLanguage'

const POTENCY_CHIPS = ['6C', '12C', '30C', '200C', '1M', '10M']

const LABELS = {
  ru: { remedy: 'Препарат', potency: 'Потенция', pellets: 'Гранулы', dosage: 'Дозировка', title: 'НАЗНАЧЕНИЕ', saved: 'Сохранено' },
  en: { remedy: 'Remedy', potency: 'Potency', pellets: 'Pellets', dosage: 'Dosage', title: 'PRESCRIPTION', saved: 'Saved' },
}

type Props = {
  consultationId: string
  onSaved?: (remedy: string, potency: string, dosage: string) => void
  assignedRemedy?: string  // передаётся из репертория при нажатии «Назначить»
}

export default function InlineRx({ consultationId, onSaved, assignedRemedy }: Props) {
  const { lang } = useLanguage()
  const L = LABELS[lang] || LABELS.en

  const [remedy, setRemedy] = useState('')
  const [potency, setPotency] = useState('')
  const [customPotency, setCustomPotency] = useState('')
  const [pellets, setPellets] = useState(3)
  const [dosage, setDosage] = useState('')

  // Автодополнение
  const [suggestions, setSuggestions] = useState<RemedyResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Когда из репертория приходит abbrev — подставляем в поле препарата
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

  // Автосохранение
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Поиск препаратов с debounce 300мс
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

  // Закрываем dropdown при клике вне
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!suggestionsRef.current?.contains(e.target as Node) && e.target !== inputRef.current) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Финальная потенция: из chip или custom
  const finalPotency = potency || customPotency

  // Автосохранение: когда remedy + potency заполнены, сохраняем через 2с
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

  return (
    <div data-tour="inline-rx" className="space-y-2.5">
      <label className="block text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--sim-forest)' }}>
        {L.title}
        {saveStatus === 'saved' && (
          <span className="ml-2 text-[10px] font-normal" style={{ color: 'var(--sim-green)' }}>
            ✓ {L.saved}
          </span>
        )}
        {saveStatus === 'saving' && (
          <span className="ml-2 text-[10px] font-normal" style={{ color: 'var(--sim-text-hint)' }}>…</span>
        )}
      </label>

      {/* Строка 1: Препарат + Потенция chips + Гранулы */}
      <div className="flex flex-wrap items-start gap-3">
        {/* Препарат */}
        <div className="relative flex-1 min-w-[160px]">
          <label className="block text-[10px] font-medium mb-0.5" style={{ color: 'var(--sim-text-hint)' }}>{L.remedy}</label>
          <input
            ref={inputRef}
            type="text"
            value={remedy}
            onChange={e => handleRemedyChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Sulphur, Pulsatilla..."
            className="input input-sm"
          />
          {searching && (
            <div className="absolute right-2.5 top-[26px]">
              <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 rounded-xl z-10 overflow-hidden max-h-[200px] overflow-y-auto"
              style={{ backgroundColor: 'var(--sim-bg-card)', border: '1px solid var(--sim-border)', boxShadow: 'var(--sim-shadow-md)' }}
            >
              {suggestions.map((r, i) => (
                <button
                  key={r.abbrev}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); selectSuggestion(r) }}
                  className="w-full text-left px-3 py-2 transition-colors"
                  style={{ backgroundColor: i === activeSuggestion ? 'var(--sim-green-light)' : undefined }}
                  onMouseEnter={e => { if (i !== activeSuggestion) e.currentTarget.style.backgroundColor = 'var(--sim-bg-hover)' }}
                  onMouseLeave={e => { if (i !== activeSuggestion) e.currentTarget.style.backgroundColor = '' }}
                >
                  <span className="text-[13px] font-medium" style={{ color: 'var(--sim-text)' }}>{r.name_latin}</span>
                  {r.name_ru && <span className="text-[11px] ml-2" style={{ color: 'var(--sim-text-hint)' }}>{r.name_ru}</span>}
                  <span className="text-[10px] ml-1.5" style={{ color: 'var(--sim-border)' }}>{r.abbrev}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Потенция chips */}
        <div>
          <label className="block text-[10px] font-medium mb-0.5" style={{ color: 'var(--sim-text-hint)' }}>{L.potency}</label>
          <div className="flex flex-wrap gap-1">
            {POTENCY_CHIPS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => { setPotency(potency === p ? '' : p); setCustomPotency('') }}
                className="text-[11px] px-2 py-1.5 rounded-md border font-medium transition-all"
                style={potency === p
                  ? { backgroundColor: 'var(--sim-green)', color: '#fff', borderColor: 'var(--sim-green)' }
                  : { borderColor: 'var(--sim-border)', color: 'var(--sim-text-muted)' }}
              >
                {p}
              </button>
            ))}
            <input
              type="text"
              value={customPotency}
              onChange={e => { setCustomPotency(e.target.value); setPotency('') }}
              placeholder="..."
              className="input input-sm w-12 text-center"
            />
          </div>
        </div>

        {/* Гранулы */}
        <div>
          <label className="block text-[10px] font-medium mb-0.5" style={{ color: 'var(--sim-text-hint)' }}>{L.pellets}</label>
          <input
            type="number"
            min={1}
            max={10}
            value={pellets}
            onChange={e => setPellets(Number(e.target.value) || 3)}
            className="input input-sm w-14 text-center"
          />
        </div>
      </div>

      {/* Строка 2: Дозировка */}
      <div>
        <label className="block text-[10px] font-medium mb-0.5" style={{ color: 'var(--sim-text-hint)' }}>{L.dosage}</label>
        <input
          type="text"
          value={dosage}
          onChange={e => setDosage(e.target.value)}
          placeholder={lang === 'ru' ? '1 гранула 1 раз в день' : '1 pellet once daily'}
          className="input input-sm"
        />
      </div>
    </div>
  )
}
