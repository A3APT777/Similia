'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
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
}

export default function InlineRx({ consultationId }: Props) {
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
    } catch {
      setSaveStatus('idle')
    }
  }, [consultationId, remedy, finalPotency, pellets, dosage])

  useEffect(() => {
    if (!remedy.trim() || !finalPotency.trim()) return
    clearTimeout(saveDebounceRef.current)
    saveDebounceRef.current = setTimeout(() => {
      doAutoSave()
    }, 2000)
    return () => clearTimeout(saveDebounceRef.current)
  }, [remedy, finalPotency, pellets, dosage, doAutoSave])

  return (
    <div className="space-y-2.5">
      <label className="block text-[11px] font-semibold uppercase tracking-wider" style={{ color: '#1a3020' }}>
        {L.title}
        {saveStatus === 'saved' && (
          <span className="ml-2 text-[10px] font-normal" style={{ color: '#2d6a4f' }}>
            ✓ {L.saved}
          </span>
        )}
        {saveStatus === 'saving' && (
          <span className="ml-2 text-[10px] font-normal" style={{ color: '#9a8a6a' }}>…</span>
        )}
      </label>

      {/* Строка 1: Препарат + Потенция chips + Гранулы */}
      <div className="flex flex-wrap items-start gap-3">
        {/* Препарат */}
        <div className="relative flex-1 min-w-[160px]">
          <label className="block text-[10px] font-medium mb-0.5" style={{ color: '#9a8a6a' }}>{L.remedy}</label>
          <input
            ref={inputRef}
            type="text"
            value={remedy}
            onChange={e => handleRemedyChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Sulphur, Pulsatilla..."
            className="w-full text-[13px] px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/10 transition-all placeholder-gray-300"
          />
          {searching && (
            <div className="absolute right-2.5 top-[26px]">
              <div className="w-3 h-3 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden max-h-[200px] overflow-y-auto"
            >
              {suggestions.map((r, i) => (
                <button
                  key={r.abbrev}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); selectSuggestion(r) }}
                  className={`w-full text-left px-3 py-2 transition-colors ${
                    i === activeSuggestion ? 'bg-emerald-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="text-[13px] text-gray-900 font-medium">{r.name_latin}</span>
                  {r.name_ru && <span className="text-[11px] text-gray-400 ml-2">{r.name_ru}</span>}
                  <span className="text-[10px] text-gray-300 ml-1.5">{r.abbrev}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Потенция chips */}
        <div>
          <label className="block text-[10px] font-medium mb-0.5" style={{ color: '#9a8a6a' }}>{L.potency}</label>
          <div className="flex flex-wrap gap-1">
            {POTENCY_CHIPS.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => { setPotency(potency === p ? '' : p); setCustomPotency('') }}
                className={`text-[11px] px-2 py-1 rounded-md border font-medium transition-all ${
                  potency === p
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-700'
                }`}
              >
                {p}
              </button>
            ))}
            <input
              type="text"
              value={customPotency}
              onChange={e => { setCustomPotency(e.target.value); setPotency('') }}
              placeholder="..."
              className="w-12 text-[11px] px-1.5 py-1 border border-gray-200 rounded-md text-center focus:outline-none focus:border-emerald-400 transition-all placeholder-gray-300"
            />
          </div>
        </div>

        {/* Гранулы */}
        <div>
          <label className="block text-[10px] font-medium mb-0.5" style={{ color: '#9a8a6a' }}>{L.pellets}</label>
          <input
            type="number"
            min={1}
            max={10}
            value={pellets}
            onChange={e => setPellets(Number(e.target.value) || 3)}
            className="w-14 text-[13px] px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-center focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/10 transition-all"
          />
        </div>
      </div>

      {/* Строка 2: Дозировка */}
      <div>
        <label className="block text-[10px] font-medium mb-0.5" style={{ color: '#9a8a6a' }}>{L.dosage}</label>
        <input
          type="text"
          value={dosage}
          onChange={e => setDosage(e.target.value)}
          placeholder={lang === 'ru' ? '1 гранула 1 раз в день' : '1 pellet once daily'}
          className="w-full text-[13px] px-3 py-1.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-500/10 transition-all placeholder-gray-300"
        />
      </div>
    </div>
  )
}
