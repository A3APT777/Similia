'use client'

import { useState, useRef, useEffect } from 'react'
import { savePrescription } from '@/lib/actions/consultations'
import { logDoctorChoice } from '@/lib/actions/ai-consultation'
import { useToast } from '@/components/ui/toast'
import { searchRemediesDB, RemedyResult } from '@/lib/actions/remedies'
import { t } from '@/lib/shared/i18n'
import { useLanguage } from '@/hooks/useLanguage'

const POTENCY_CHIPS = ['6C', '12C', '30C', '200C', '1M', '10M', 'LM1', 'LM2', 'LM3']

// Форма приёма
const FORM_CHIPS = [
  { id: 'dry', ru: 'Сухая доза', en: 'Dry dose' },
  { id: 'solution', ru: 'Раствор', en: 'Solution' },
  { id: 'olfaction', ru: 'Ольфакция', en: 'Olfaction' },
]

// Режим приёма
const REGIME_CHIPS = [
  { id: 'once', ru: 'Однократно', en: 'Single dose' },
  { id: 'daily', ru: 'Ежедневно', en: 'Daily' },
  { id: 'as_needed', ru: 'По необходимости', en: 'As needed' },
]

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
  const [form, setForm] = useState('')
  const [regime, setRegime] = useState('')
  const [dosage, setDosage] = useState(initialDosage || '')
  const [saving, setSaving] = useState(false)

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
    if (!value.trim()) { setSuggestions([]); setShowSuggestions(false); return }
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
    setSuggestions([]); setShowSuggestions(false); setActiveSuggestion(-1); setSearching(false)
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveSuggestion(i => Math.min(i + 1, suggestions.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveSuggestion(i => Math.max(i - 1, -1)) }
    else if (e.key === 'Enter' && activeSuggestion >= 0) { e.preventDefault(); selectSuggestion(suggestions[activeSuggestion]) }
    else if (e.key === 'Escape') setShowSuggestions(false)
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onSkip() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onSkip])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!suggestionsRef.current?.contains(e.target as Node) && e.target !== inputRef.current) setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Собрать полную схему приёма
  function buildDosage(): string {
    const parts: string[] = []
    if (form) { const f = FORM_CHIPS.find(c => c.id === form); if (f) parts.push(lang === 'ru' ? f.ru : f.en) }
    if (regime) { const r = REGIME_CHIPS.find(c => c.id === regime); if (r) parts.push(lang === 'ru' ? r.ru : r.en) }
    if (pellets) parts.push(`${pellets} ${lang === 'ru' ? 'гор.' : 'pellets'}`)
    if (dosage.trim()) parts.push(dosage.trim())
    return parts.join('. ')
  }

  async function handleSave() {
    if (!remedy.trim()) return
    setSaving(true)
    const fullDosage = buildDosage()
    await savePrescription(consultationId, remedy.trim(), potency.trim(), pellets, fullDosage)
    logDoctorChoice(consultationId, remedy.trim()).catch(() => {})
    setSaving(false)
    toast(t(lang).prescription.prescribed(remedy.trim() + (potency ? ' ' + potency : '')))
    onSaved()
  }

  const Label = ({ text }: { text: string }) => (
    <label className="block text-[13px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: '#6b7280' }}>
      {text}
    </label>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onSkip}>
      <div
        className="bg-white rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.15)] w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-6 pb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <h2
            className="text-[22px] font-light text-[#1a1a1a]"
            style={{ fontFamily: 'var(--font-cormorant, Cormorant Garamond, Georgia, serif)' }}
          >
            {t(lang).prescription.title}
          </h2>
          <p className="text-[13px] text-[#6b7280] mt-1">{t(lang).prescription.hint}</p>
        </div>

        {/* Form */}
        <div className="px-7 py-5 space-y-5 max-h-[60vh] overflow-y-auto">

          {/* Препарат */}
          <div>
            <Label text={t(lang).prescription.remedy} />
            <div className="relative">
              <input
                ref={inputRef}
                autoFocus
                type="text"
                value={remedy}
                onChange={e => handleRemedyChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={lang === 'ru' ? 'Аконит, Sulphur, Пульсатилла...' : 'Aconitum, Sulphur, Pulsatilla...'}
                className="w-full border rounded-xl px-4 py-3 text-[15px] focus:outline-none transition-all duration-200"
                style={{ borderColor: 'var(--sim-border)', color: '#1a1a1a', backgroundColor: '#fff' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#2d6a4f'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,106,79,0.08)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--sim-border)'; e.currentTarget.style.boxShadow = 'none' }}
              />
              {searching && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="w-4 h-4 border-2 border-[#2d6a4f] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {showSuggestions && suggestions.length > 0 && (
                <div ref={suggestionsRef} className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-100 rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.1)] z-10 overflow-hidden">
                  {suggestions.map((r, i) => (
                    <button
                      key={r.abbrev + i}
                      type="button"
                      onMouseDown={e => { e.preventDefault(); selectSuggestion(r) }}
                      className={`w-full text-left px-4 py-3 transition-colors ${i === activeSuggestion ? 'bg-[#2d6a4f]/4' : 'hover:bg-gray-50'}`}
                    >
                      <span className="text-[14px] text-[#1a1a1a] font-medium">{highlightMatch(r.name_latin, remedy)}</span>
                      {r.name_ru && <span className="text-[12px] text-[#6b7280] ml-2">{r.name_ru}</span>}
                      <span className="text-[11px] text-[#6b7280]/50 ml-1.5">{r.abbrev}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Потенция — pill chips */}
          <div>
            <Label text={t(lang).prescription.potency} />
            <div className="flex flex-wrap gap-2 mb-2.5">
              {POTENCY_CHIPS.map(p => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPotency(potency === p ? '' : p)}
                  className={`text-[13px] font-medium px-4 py-2 rounded-full transition-all duration-200 ${
                    potency === p
                      ? 'bg-[#2d6a4f] text-white shadow-sm'
                      : 'bg-white text-[#1a1a1a] border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-[#2d6a4f]/20'
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
              placeholder={lang === 'ru' ? 'Или введите другую...' : 'Or enter custom...'}
              className="w-full border rounded-xl px-4 py-2.5 text-[14px] text-[#1a1a1a] placeholder-[#6b7280]/40 focus:outline-none focus:border-[#2d6a4f] focus:ring-[3px] focus:ring-[#2d6a4f]/8 transition-all"
              style={{ borderColor: 'var(--sim-border)' }}
            />
          </div>

          {/* Форма приёма */}
          <div>
            <Label text={lang === 'ru' ? 'Форма приёма' : 'Dosage form'} />
            <div className="flex flex-wrap gap-2">
              {FORM_CHIPS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setForm(form === f.id ? '' : f.id)}
                  className={`text-[13px] font-medium px-4 py-2 rounded-full transition-all duration-200 ${
                    form === f.id
                      ? 'bg-[#2d6a4f] text-white shadow-sm'
                      : 'bg-white text-[#1a1a1a] border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:border-[#2d6a4f]/20'
                  }`}
                >
                  {lang === 'ru' ? f.ru : f.en}
                </button>
              ))}
            </div>
          </div>

          {/* Режим + Гранулы */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label text={lang === 'ru' ? 'Режим' : 'Regime'} />
              <div className="flex flex-wrap gap-1.5">
                {REGIME_CHIPS.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setRegime(regime === r.id ? '' : r.id)}
                    className={`text-[12px] font-medium px-3 py-1.5 rounded-full transition-all duration-200 ${
                      regime === r.id
                        ? 'bg-[#2d6a4f] text-white shadow-sm'
                        : 'bg-white text-[#1a1a1a] border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[#2d6a4f]/20'
                    }`}
                  >
                    {lang === 'ru' ? r.ru : r.en}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label text={t(lang).prescription.pellets} />
              <div className="flex gap-1.5">
                {[1, 2, 3, 5, 7].map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPellets(pellets === n ? null : n)}
                    className={`w-10 h-10 rounded-full text-[14px] font-semibold transition-all duration-200 ${
                      pellets === n
                        ? 'bg-[#2d6a4f] text-white shadow-sm'
                        : 'bg-white text-[#1a1a1a] border border-gray-100 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-[#2d6a4f]/20'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Дополнительные указания */}
          <div>
            <Label text={lang === 'ru' ? 'Дополнительно' : 'Additional notes'} />
            <textarea
              value={dosage}
              onChange={e => setDosage(e.target.value)}
              rows={2}
              placeholder={lang === 'ru' ? 'Растворить в воде, принимать натощак...' : 'Dissolve in water, take on empty stomach...'}
              className="w-full border rounded-xl px-4 py-3 text-[14px] text-[#1a1a1a] placeholder-[#6b7280]/40 resize-none focus:outline-none focus:border-[#2d6a4f] focus:ring-[3px] focus:ring-[#2d6a4f]/8 transition-all"
              style={{ borderColor: 'var(--sim-border)' }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-7 py-5 flex items-center gap-3" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
          <button
            onClick={handleSave}
            disabled={saving || !remedy.trim()}
            className="flex-1 py-3.5 text-[14px] font-semibold rounded-full bg-[#1e3a2f] text-white shadow-[0_4px_16px_rgba(30,58,47,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(30,58,47,0.35)] disabled:opacity-40 disabled:hover:translate-y-0"
          >
            {saving ? (lang === 'ru' ? 'Сохранение...' : 'Saving...') : t(lang).prescription.prescribeAndFinish}
          </button>
          <button
            onClick={onSkip}
            className="text-[13px] px-5 py-3 rounded-full text-[#6b7280] border border-gray-200 transition-all duration-200 hover:bg-black/2"
          >
            {t(lang).prescription.later}
          </button>
        </div>
      </div>
    </div>
  )
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-[#2d6a4f]">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  )
}
