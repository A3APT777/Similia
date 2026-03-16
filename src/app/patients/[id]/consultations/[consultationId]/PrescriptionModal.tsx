'use client'

import { useState, useRef, useEffect } from 'react'
import { savePrescription } from '@/lib/actions/consultations'
import { useToast } from '@/components/ui/toast'
import { searchRemediesDB, RemedyResult } from '@/lib/actions/remedies'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

// Часто используемые потенции в гомеопатии
const POTENCY_CHIPS = ['6C', '12C', '30C', '200C', '1M', '10M', 'LM1', 'LM2', 'LM3']

type Props = {
  consultationId: string
  onSkip: () => void
  onSaved: () => void
  initialRemedy?: string
  initialPotency?: string
  initialDosage?: string
}

export default function PrescriptionModal({ consultationId, onSkip, onSaved, initialRemedy, initialPotency, initialDosage }: Props) {
  const { toast } = useToast()
  const { lang } = useLanguage()
  const [remedy, setRemedy] = useState(initialRemedy || '')
  const [potency, setPotency] = useState(initialPotency || '')
  const [pellets, setPellets] = useState<number | null>(null)
  const [dosage, setDosage] = useState(initialDosage || '')
  const [saving, setSaving] = useState(false)

  // Автодополнение из БД
  const [suggestions, setSuggestions] = useState<RemedyResult[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  function handleRemedyChange(value: string) {
    setRemedy(value)
    setActiveSuggestion(-1)
    clearTimeout(debounceRef.current)
    if (!value.trim()) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }
    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      const results = await searchRemediesDB(value)
      setSuggestions(results)
      setShowSuggestions(results.length > 0)
      setSearching(false)
    }, 250)
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

  async function handleSave() {
    if (!remedy.trim()) return
    setSaving(true)
    await savePrescription(consultationId, remedy.trim(), potency.trim(), pellets, dosage.trim())
    setSaving(false)
    toast(t(lang).prescription.prescribed(remedy.trim() + (potency ? ' ' + potency : '')))
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-[#ede7dd] rounded-2xl shadow-2xl shadow-black/20 w-full max-w-md mx-4 overflow-hidden">

        {/* Шапка */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <svg className="w-4.5 h-4.5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t(lang).prescription.title}</h2>
              <p className="text-xs text-gray-400">{t(lang).prescription.hint}</p>
            </div>
          </div>
        </div>

        {/* Форма */}
        <div className="px-6 py-5 space-y-4">

          {/* Препарат с автодополнением */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              {t(lang).prescription.remedy}
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                autoFocus
                type="text"
                value={remedy}
                onChange={e => handleRemedyChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Аконит, Sulphur, Pulsatilla, сера..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all"
              />
              {/* Индикатор поиска */}
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {/* Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-[#ede7dd] border border-gray-200 rounded-xl shadow-lg z-10 overflow-hidden"
                >
                  {suggestions.map((r, i) => (
                    <button
                      key={r.abbrev}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); selectSuggestion(r) }}
                      className={`w-full text-left px-4 py-2.5 transition-colors ${
                        i === activeSuggestion
                          ? 'bg-emerald-50'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-sm text-gray-900 font-medium">
                        {highlightMatch(r.name_latin, remedy)}
                      </span>
                      {r.name_ru && (
                        <span className="text-xs text-gray-400 ml-2">
                          {highlightMatch(r.name_ru, remedy)}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-300 ml-1.5">{r.abbrev}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Потенция */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              {t(lang).prescription.potency}
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {POTENCY_CHIPS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPotency(potency === p ? '' : p)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                    potency === p
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={potency}
              onChange={e => setPotency(e.target.value)}
              placeholder={t(lang).prescription.schemeManual}
              className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-900 placeholder-gray-300 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all"
            />
          </div>

          {/* Количество горошинок */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              {t(lang).prescription.pellets}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPellets(pellets === n ? null : n)}
                  className={`w-9 h-9 rounded-xl border text-sm font-semibold transition-all ${
                    pellets === n
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Схема приёма */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              {t(lang).prescription.scheme}
            </label>
            <textarea
              value={dosage}
              onChange={e => setDosage(e.target.value)}
              rows={2}
              placeholder={t(lang).prescription.schemePlaceholder}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-300 resize-none focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-500/10 transition-all"
            />
          </div>
        </div>

        {/* Кнопки */}
        <div className="px-6 pb-5 flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving || !remedy.trim()}
            className="flex-1 bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {saving ? t(lang).prescription.saving : t(lang).prescription.prescribeAndFinish}
          </button>
          <button
            onClick={onSkip}
            className="text-sm text-gray-400 hover:text-gray-700 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-all"
          >
            {t(lang).prescription.later}
          </button>
        </div>
      </div>
    </div>
  )
}

// Выделяем часть строки, совпавшую с запросом
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-emerald-700">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}
