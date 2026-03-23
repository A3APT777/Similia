'use client'

import { useState, useRef, useEffect } from 'react'
import { StructuredSymptom, SymptomCategory, SymptomDynamics } from '@/types'
import { useLanguage } from '@/hooks/useLanguage'

const SECTIONS = [
  {
    id: 'symptoms',
    ru: 'Симптомы',
    en: 'Symptoms',
    group: 'complaints' as const,
    category: 'chief_complaint' as SymptomCategory,
    placeholderRu: 'напр., мигрень, боль в спине',
    placeholderEn: 'e.g., migraine, back pain',
    filterCategories: ['chief_complaint', 'concomitant'] as SymptomCategory[],
  },
  {
    id: 'mental',
    ru: 'Психика',
    en: 'Mind',
    group: 'complaints' as const,
    category: 'mental' as SymptomCategory,
    placeholderRu: 'напр., тревога, раздражительность',
    placeholderEn: 'e.g., anxiety, irritability',
    filterCategories: ['mental'] as SymptomCategory[],
  },
  {
    id: 'general',
    ru: 'Общее',
    en: 'Generals',
    group: 'complaints' as const,
    category: 'general' as SymptomCategory,
    placeholderRu: 'напр., зябкость, жажда, сон',
    placeholderEn: 'e.g., chilliness, thirst, sleep',
    filterCategories: ['general', 'sleep', 'appetite'] as SymptomCategory[],
  },
  {
    id: 'worse',
    ru: 'Хуже от',
    en: 'Worse from',
    group: 'modalities' as const,
    category: 'modality_worse' as SymptomCategory,
    placeholderRu: 'напр., холод, ночью, движение',
    placeholderEn: 'e.g., cold, at night, motion',
    filterCategories: ['modality_worse'] as SymptomCategory[],
  },
  {
    id: 'better',
    ru: 'Лучше от',
    en: 'Better from',
    group: 'modalities' as const,
    category: 'modality_better' as SymptomCategory,
    placeholderRu: 'напр., тепло, покой, давление',
    placeholderEn: 'e.g., heat, rest, pressure',
    filterCategories: ['modality_better'] as SymptomCategory[],
  },
  {
    id: 'observations',
    ru: 'Наблюдения',
    en: 'Observations',
    group: null,
    category: 'observation' as SymptomCategory,
    placeholderRu: 'напр., бледность, беспокойство',
    placeholderEn: 'e.g., pale complexion, restlessness',
    filterCategories: ['observation', 'other'] as SymptomCategory[],
  },
]

const DYNAMICS_OPTIONS: { value: SymptomDynamics; icon: string; ru: string; en: string; color: string }[] = [
  { value: 'better',   icon: '↑', ru: 'Лучше',    en: 'Better',   color: '#16a34a' },
  { value: 'worse',    icon: '↓', ru: 'Хуже',     en: 'Worse',    color: '#dc2626' },
  { value: 'same',     icon: '=', ru: 'Как было',  en: 'Same',     color: '#9ca3af' },
  { value: 'resolved', icon: '✓', ru: 'Прошло',   en: 'Resolved', color: '#0d9488' },
  { value: 'new',      icon: '+', ru: 'Новое',    en: 'New',      color: '#2563eb' },
]

const SHORTCUT_MAP: Record<string, SymptomDynamics> = {
  '+': 'better',
  '-': 'worse',
  '=': 'same',
}

type Props = {
  symptoms: StructuredSymptom[]
  onChange: (symptoms: StructuredSymptom[]) => void
  previousSymptoms?: StructuredSymptom[]
  defaultCategory?: SymptomCategory
  autoFocus?: boolean
}

export default function SymptomInput({ symptoms, onChange, autoFocus = false }: Props) {
  const { lang } = useLanguage()
  const [inputs, setInputs] = useState<Record<string, string>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [lastCreatedId, setLastCreatedId] = useState<string | null>(null)
  const lastCreatedSection = useRef<string | null>(null)
  const lastCreatedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [hintSection, setHintSection] = useState<string | null>(null)
  const hintDismissed = useRef(
    typeof window !== 'undefined' && localStorage.getItem('hc-dyn-hint') === '1'
  )
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => inputRefs.current['chief']?.focus(), 80)
      return () => clearTimeout(timer)
    }
  }, [autoFocus])

  useEffect(() => {
    if (!expandedId) return
    function close() { setExpandedId(null) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [expandedId])

  function getSectionSymptoms(sectionId: string) {
    const sec = SECTIONS.find(s => s.id === sectionId)
    if (!sec) return []
    return symptoms.filter(s => (sec.filterCategories as string[]).includes(s.category))
  }

  function focusNext(sectionId: string) {
    const idx = SECTIONS.findIndex(s => s.id === sectionId)
    inputRefs.current[SECTIONS[(idx + 1) % SECTIONS.length].id]?.focus()
  }

  function addSymptom(sectionId: string) {
    const sec = SECTIONS.find(s => s.id === sectionId)
    if (!sec) return
    const label = (inputs[sectionId] || '').trim()
    if (!label) return

    const id = crypto.randomUUID()
    onChange([...symptoms, {
      id,
      label,
      category: sec.category,
      dynamics: undefined,
      createdAt: new Date().toISOString(),
    }])
    setInputs(prev => ({ ...prev, [sectionId]: '' }))

    clearTimeout(lastCreatedTimer.current)
    setLastCreatedId(id)
    lastCreatedSection.current = sectionId
    lastCreatedTimer.current = setTimeout(() => {
      setLastCreatedId(null)
      lastCreatedSection.current = null
    }, 3000)

    if (!hintDismissed.current) setHintSection(sectionId)
    inputRefs.current[sectionId]?.focus()
  }

  function applyShortcut(key: string) {
    const dynamics = SHORTCUT_MAP[key]
    if (!dynamics || !lastCreatedId) return
    onChange(symptoms.map(s => s.id === lastCreatedId ? { ...s, dynamics } : s))
    clearTimeout(lastCreatedTimer.current)
    setLastCreatedId(null)
    lastCreatedSection.current = null
    if (hintSection) {
      setHintSection(null)
      hintDismissed.current = true
      localStorage.setItem('hc-dyn-hint', '1')
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, sectionId: string) {
    const value = inputs[sectionId] || ''

    if (e.key === 'Enter') {
      e.preventDefault()
      addSymptom(sectionId)
      return
    }

    if (!value && lastCreatedId && lastCreatedSection.current === sectionId && SHORTCUT_MAP[e.key]) {
      e.preventDefault()
      applyShortcut(e.key)
      return
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      if (value) addSymptom(sectionId)
      focusNext(sectionId)
      return
    }

    if (e.key === 'Backspace' && !value) {
      const list = getSectionSymptoms(sectionId)
      if (list.length > 0) onChange(symptoms.filter(s => s.id !== list[list.length - 1].id))
    }
  }

  function updateDynamics(id: string, dynamics: SymptomDynamics) {
    onChange(symptoms.map(s => s.id === id ? { ...s, dynamics } : s))
    setExpandedId(null)
  }

  // Renders one input row (shared by all sections)
  function renderRow(section: typeof SECTIONS[number], sIdx: number) {
    const sectionSymptoms = getSectionSymptoms(section.id)
    const placeholder = lang === 'ru' ? section.placeholderRu : section.placeholderEn
    const isLastSection = sIdx === SECTIONS.length - 1
    const nextSection = SECTIONS[sIdx + 1]

    return (
      <div key={section.id}>
        {/* Row label + nav button */}
        <div className="flex items-center justify-between mb-2">
          <span style={{ fontSize: '13px', fontWeight: 500, color: '#5a4e44' }}>
            {section[lang]}
          </span>
          {!isLastSection && (
            <button
              type="button"
              onClick={() => {
                const value = inputs[section.id] || ''
                if (value) addSymptom(section.id)
                focusNext(section.id)
              }}
              className="flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors hover:bg-gray-100"
              style={{ fontSize: '11px', color: '#b8afa4' }}
            >
              {nextSection?.[lang]}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Tags */}
        {sectionSymptoms.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {sectionSymptoms.map(sym => {
              const dynCfg = DYNAMICS_OPTIONS.find(d => d.value === sym.dynamics)
              const isJustCreated = lastCreatedId === sym.id
              const isExpanded = expandedId === sym.id

              return (
                <div
                  key={sym.id}
                  className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg border transition-all"
                  style={{
                    fontSize: '13px',
                    backgroundColor: isJustCreated ? '#f0fdf4' : '#faf7f2',
                    borderColor: isJustCreated ? '#86efac' : '#e0dcd4',
                  }}
                >
                  {isExpanded ? (
                    <div className="flex items-center gap-0.5 mr-0.5" onMouseDown={e => e.stopPropagation()}>
                      {DYNAMICS_OPTIONS.map(d => (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => updateDynamics(sym.id, d.value)}
                          className="flex items-center justify-center w-6 h-6 rounded font-bold transition-all hover:scale-110"
                          style={{
                            fontSize: '11px',
                            color: sym.dynamics === d.value ? '#fff' : d.color,
                            backgroundColor: sym.dynamics === d.value ? d.color : d.color + '20',
                          }}
                        >
                          {d.icon}
                        </button>
                      ))}
                    </div>
                  ) : dynCfg ? (
                    <button
                      type="button"
                      onMouseDown={e => { e.stopPropagation(); setExpandedId(sym.id) }}
                      className="w-5 h-5 flex items-center justify-center rounded font-bold transition-all hover:opacity-80"
                      style={{ fontSize: '11px', color: dynCfg.color, backgroundColor: dynCfg.color + '20' }}
                    >
                      {dynCfg.icon}
                    </button>
                  ) : null}

                  <span style={{ color: '#374151' }}>{sym.label}</span>

                  <button
                    type="button"
                    onClick={() => onChange(symptoms.filter(s => s.id !== sym.id))}
                    className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                    style={{ opacity: 0.3 }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}
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

        {/* Input */}
        <input
          ref={el => { inputRefs.current[section.id] = el }}
          type="text"
          value={inputs[section.id] || ''}
          onChange={e => setInputs(prev => ({ ...prev, [section.id]: e.target.value }))}
          onKeyDown={e => handleKeyDown(e, section.id)}
          placeholder={placeholder}
          className="w-full px-3 py-2 bg-white rounded-lg border transition-all focus:outline-none placeholder-gray-300"
          style={{ fontSize: '15px', borderColor: 'rgba(0,0,0,0.08)' }}
          onFocus={e => { e.currentTarget.style.borderColor = '#6ee7b7'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(110,231,183,0.1)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; e.currentTarget.style.boxShadow = 'none' }}
        />

        {/* One-time shortcut hint */}
        {hintSection === section.id && (
          <div className="mt-1.5 px-0.5" style={{ fontSize: '12px', color: '#b8afa4' }}>
            + лучше &nbsp;·&nbsp; − хуже &nbsp;·&nbsp; = без изменений
          </div>
        )}
      </div>
    )
  }

  const GROUP_LABELS: Record<string, { ru: string; en: string }> = {
    complaints: { ru: 'Жалобы', en: 'Complaints' },
    modalities: { ru: 'Модальности', en: 'Modalities' },
  }

  // Group rendering: сгруппированные секции рендерятся под общим заголовком
  const rendered: React.ReactNode[] = []
  let i = 0
  while (i < SECTIONS.length) {
    const sec = SECTIONS[i]

    if (sec.group !== null) {
      const groupName = sec.group
      const groupRows: typeof SECTIONS[number][] = []
      while (i < SECTIONS.length && SECTIONS[i].group === groupName) {
        groupRows.push(SECTIONS[i])
        i++
      }
      const isGroupLast = i >= SECTIONS.length
      const groupLabel = GROUP_LABELS[groupName]
      rendered.push(
        <div
          key={`${groupName}-group`}
          className={isGroupLast ? '' : 'pb-6'}
          style={isGroupLast ? {} : { borderBottom: '1px solid #f0ece6' }}
        >
          <div className="mb-3">
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#3d342b' }}>
              {lang === 'ru' ? groupLabel.ru : groupLabel.en}
            </span>
          </div>
          <div className="space-y-4">
            {groupRows.map(s => renderRow(s, SECTIONS.findIndex(x => x.id === s.id)))}
          </div>
        </div>
      )
    } else {
      const sIdx = i
      const isBlockLast = sIdx === SECTIONS.length - 1 ||
        (SECTIONS[sIdx + 1]?.group === 'modalities' ? false : sIdx === SECTIONS.length - 1)
      // Is this the last rendered block?
      const isActualLast = sIdx === SECTIONS.length - 1
      rendered.push(
        <div
          key={sec.id}
          data-tour={sec.id === 'chief' ? 'complaints' : undefined}
          className={isActualLast ? '' : 'pb-6'}
          style={isActualLast ? {} : { borderBottom: '1px solid #f0ece6' }}
        >
          {/* Top-level section header */}
          {(() => {
            const nextSec = SECTIONS[sIdx + 1]
            const nextLabel = nextSec?.group
              ? (lang === 'ru' ? GROUP_LABELS[nextSec.group]?.ru : GROUP_LABELS[nextSec.group]?.en)
              : nextSec?.[lang]
            return (
              <div className="flex items-center justify-between mb-3">
                <span style={{ fontSize: '14px', fontWeight: 500, color: '#3d342b' }}>
                  {sec[lang]}
                </span>
                {!isActualLast && (
                  <button
                    type="button"
                    onClick={() => {
                      const value = inputs[sec.id] || ''
                      if (value) addSymptom(sec.id)
                      focusNext(sec.id)
                    }}
                    className="flex items-center gap-1 rounded-md px-2 py-0.5 transition-colors hover:bg-gray-100"
                    style={{ fontSize: '11px', color: '#b8afa4' }}
                  >
                    {nextLabel}
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                )}
              </div>
            )
          })()}

          {/* Tags */}
          {getSectionSymptoms(sec.id).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {getSectionSymptoms(sec.id).map(sym => {
                const dynCfg = DYNAMICS_OPTIONS.find(d => d.value === sym.dynamics)
                const isJustCreated = lastCreatedId === sym.id
                const isExpanded = expandedId === sym.id

                return (
                  <div
                    key={sym.id}
                    className="inline-flex items-center gap-1 pl-2 pr-1 py-1 rounded-lg border transition-all"
                    style={{
                      fontSize: '13px',
                      backgroundColor: isJustCreated ? '#f0fdf4' : '#faf7f2',
                      borderColor: isJustCreated ? '#86efac' : '#e0dcd4',
                    }}
                  >
                    {isExpanded ? (
                      <div className="flex items-center gap-0.5 mr-0.5" onMouseDown={e => e.stopPropagation()}>
                        {DYNAMICS_OPTIONS.map(d => (
                          <button
                            key={d.value}
                            type="button"
                            onClick={() => updateDynamics(sym.id, d.value)}
                            className="flex items-center justify-center w-6 h-6 rounded font-bold transition-all hover:scale-110"
                            style={{
                              fontSize: '11px',
                              color: sym.dynamics === d.value ? '#fff' : d.color,
                              backgroundColor: sym.dynamics === d.value ? d.color : d.color + '20',
                            }}
                          >
                            {d.icon}
                          </button>
                        ))}
                      </div>
                    ) : dynCfg ? (
                      <button
                        type="button"
                        onMouseDown={e => { e.stopPropagation(); setExpandedId(sym.id) }}
                        className="w-5 h-5 flex items-center justify-center rounded font-bold transition-all hover:opacity-80"
                        style={{ fontSize: '11px', color: dynCfg.color, backgroundColor: dynCfg.color + '20' }}
                      >
                        {dynCfg.icon}
                      </button>
                    ) : null}

                    <span style={{ color: '#374151' }}>{sym.label}</span>

                    <button
                      type="button"
                      onClick={() => onChange(symptoms.filter(s => s.id !== sym.id))}
                      className="w-5 h-5 flex items-center justify-center rounded transition-colors"
                      style={{ opacity: 0.3 }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '0.3')}
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

          {/* Input */}
          <input
            ref={el => { inputRefs.current[sec.id] = el }}
            type="text"
            value={inputs[sec.id] || ''}
            onChange={e => setInputs(prev => ({ ...prev, [sec.id]: e.target.value }))}
            onKeyDown={e => handleKeyDown(e, sec.id)}
            placeholder={lang === 'ru' ? sec.placeholderRu : sec.placeholderEn}
            className="w-full px-3 py-2.5 bg-white rounded-lg border transition-all focus:outline-none placeholder-gray-300"
            style={{ fontSize: '15px', borderColor: 'rgba(0,0,0,0.08)' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#6ee7b7'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(110,231,183,0.1)' }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,0,0,0.08)'; e.currentTarget.style.boxShadow = 'none' }}
          />

          {hintSection === sec.id && (
            <div className="mt-2 px-0.5" style={{ fontSize: '12px', color: '#b8afa4' }}>
              + лучше &nbsp;·&nbsp; − хуже &nbsp;·&nbsp; = без изменений
            </div>
          )}
        </div>
      )
      i++
    }
  }

  return <div className="space-y-6">{rendered}</div>
}
