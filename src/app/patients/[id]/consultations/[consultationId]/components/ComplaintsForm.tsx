'use client'

import { useRef, useEffect } from 'react'
import { useConsultation } from '../context/ConsultationContext'
import { useLanguage } from '@/hooks/useLanguage'

// Метки и плейсхолдеры для хронической консультации
const CHRONIC_LABELS = {
  ru: {
    chief: 'Основная жалоба',
    chiefPlaceholder: 'Что беспокоит пациента — своими словами...',
    etiology: 'С чего началось',
    etiologyPlaceholder: 'После горя, операции, стресса, подавления сыпи, вакцинации...',
    worse: 'Хуже от',
    worsePlaceholder: 'холод, стресс, ночью...',
    better: 'Лучше от',
    betterPlaceholder: 'тепло, покой, давление...',
    mental: 'Психика и эмоции',
    mentalPlaceholder: 'тревога, раздражительность, страхи, сновидения...',
    general: 'Общие симптомы',
    generalPlaceholder: 'сон, жажда, аппетит, зябкость, потливость...',
  },
  en: {
    chief: 'Chief complaint',
    chiefPlaceholder: 'What bothers the patient — in their own words...',
    etiology: 'Etiology / Never well since',
    etiologyPlaceholder: 'After grief, surgery, stress, suppression, vaccination...',
    worse: 'Worse from',
    worsePlaceholder: 'cold, stress, at night...',
    better: 'Better from',
    betterPlaceholder: 'heat, rest, pressure...',
    mental: 'Mind & emotions',
    mentalPlaceholder: 'anxiety, irritability, fears, dreams...',
    general: 'Generals',
    generalPlaceholder: 'sleep, thirst, appetite, chilliness, perspiration...',
  },
}

// Метки и плейсхолдеры для острого случая
const ACUTE_LABELS = {
  ru: {
    chief: '⚡ Острая жалоба',
    chiefPlaceholder: 'Что происходит сейчас — жар, рвота, боль в горле, кашель...',
    onset: 'Начало и причина',
    onsetPlaceholder: 'Когда началось, как быстро развилось, что предшествовало (переохлаждение, стресс, обида, испуг)...',
    worse: 'Хуже от',
    worsePlaceholder: 'движение, тепло, ночью, прикосновение...',
    better: 'Лучше от',
    betterPlaceholder: 'покой, холод, давление, согревание...',
    general: 'Температура, озноб, жажда, пот',
    generalPlaceholder: 'жар 38.5°, жаждет холодной воды, бьёт озноб, обильный пот...',
    mental: 'Поведение и сопутствующие симптомы',
    mentalPlaceholder: 'беспокойный / спокойный, хочет внимания или быть один, рвота, диарея, высыпания...',
  },
  en: {
    chief: '⚡ Acute complaint',
    chiefPlaceholder: 'What is happening now — fever, vomiting, sore throat, cough...',
    onset: 'Onset & cause',
    onsetPlaceholder: 'When it started, how fast it developed, what preceded it (cold, stress, fright, injury)...',
    worse: 'Worse from',
    worsePlaceholder: 'motion, heat, at night, touch...',
    better: 'Better from',
    betterPlaceholder: 'rest, cold, pressure, warmth...',
    general: 'Temperature, chills, thirst, sweat',
    generalPlaceholder: 'fever 38.5°, craves cold water, chills, profuse sweating...',
    mental: 'Behavior & concomitants',
    mentalPlaceholder: 'restless / quiet, wants company or solitude, vomiting, diarrhea, discharge...',
  },
}

type Props = {
  autoFocus?: boolean
}

export default function ComplaintsForm({ autoFocus = false }: Props) {
  const { state, updateField } = useConsultation()
  const { lang } = useLanguage()
  const isAcute = state.type === 'acute'

  const labels = isAcute
    ? (ACUTE_LABELS[lang] ?? ACUTE_LABELS.ru)
    : (CHRONIC_LABELS[lang] ?? CHRONIC_LABELS.ru)

  const chiefRef = useRef<HTMLTextAreaElement>(null)
  const onsetRef = useRef<HTMLTextAreaElement>(null)
  const worseRef = useRef<HTMLTextAreaElement>(null)
  const betterRef = useRef<HTMLTextAreaElement>(null)
  const mentalRef = useRef<HTMLTextAreaElement>(null)
  const generalRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => chiefRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
  }, [autoFocus])

  // Авто-высота textarea
  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  function handleChange(field: 'complaints' | 'observations' | 'modalityWorseText' | 'modalityBetterText' | 'mentalText' | 'generalText') {
    return (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateField(field, e.target.value)
      autoResize(e.target)
    }
  }

  // Tab между полями
  function handleTab(e: React.KeyboardEvent<HTMLTextAreaElement>, nextRef: React.RefObject<HTMLTextAreaElement | null>) {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      nextRef.current?.focus()
    }
  }

  // Стили textarea — Apple-level
  const taBase = 'w-full resize-none rounded-xl border px-3.5 py-2.5 transition-all duration-200 focus:outline-none text-sm leading-relaxed'
  const focusBorder = isAcute ? 'rgba(180,83,9,0.4)' : 'var(--sim-green)'
  const focusShadow = isAcute ? '0 0 0 3px rgba(180,83,9,0.06)' : '0 0 0 3px rgba(45,106,79,0.08)'

  function focusStyle(e: React.FocusEvent<HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = focusBorder
    e.currentTarget.style.boxShadow = focusShadow
  }
  function blurStyle(e: React.FocusEvent<HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = 'var(--sim-border)'
    e.currentTarget.style.boxShadow = 'none'
  }

  return (
    <div data-tour="complaints" className="space-y-4">

      {/* Основная жалоба / Острая жалоба */}
      <div>
        <label htmlFor="chief-complaint" className="block mb-1.5" style={{ fontSize: '12px', fontWeight: 600, color: isAcute ? '#b45309' : '#7a6e64', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {labels.chief}
        </label>
        <textarea
          id="chief-complaint"
          ref={chiefRef}
          value={state.complaints}
          onChange={handleChange('complaints')}
          onInput={e => autoResize(e.currentTarget)}
          onKeyDown={e => handleTab(e, onsetRef)}
          placeholder={labels.chiefPlaceholder}
          rows={3}
          className={taBase}
          style={{ lineHeight: '1.6', borderColor: 'var(--sim-border)', backgroundColor: isAcute ? '#fffbf0' : '#fff' }}
          onFocus={focusStyle}
          onBlur={blurStyle}
        />
      </div>

      {/* Этиология — для хронического случая */}
      {!isAcute && (
        <div>
          <label htmlFor="etiology" className="block mb-1.5" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--sim-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
            {(labels as typeof CHRONIC_LABELS.ru).etiology}
          </label>
          <textarea
            id="etiology"
            ref={onsetRef}
            value={state.observations}
            onChange={handleChange('observations')}
            onInput={e => autoResize(e.currentTarget)}
            onKeyDown={e => handleTab(e, worseRef)}
            placeholder={(labels as typeof CHRONIC_LABELS.ru).etiologyPlaceholder}
            rows={2}
            className={taBase}
            style={{ lineHeight: '1.6', borderColor: 'var(--sim-border)', backgroundColor: 'var(--sim-bg-card)' }}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </div>
      )}

      {/* Начало и причина — только для острого случая */}
      {isAcute && (
        <div>
          <label className="block mb-1.5" style={{ fontSize: '11px', fontWeight: 500, color: '#b45309', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
            {(labels as typeof ACUTE_LABELS.ru).onset}
          </label>
          <textarea
            ref={onsetRef}
            value={state.observations}
            onChange={handleChange('observations')}
            onInput={e => autoResize(e.currentTarget)}
            onKeyDown={e => handleTab(e, worseRef)}
            placeholder={(labels as typeof ACUTE_LABELS.ru).onsetPlaceholder}
            rows={2}
            className={taBase}
            style={{ lineHeight: '1.6', borderColor: 'var(--sim-border)', backgroundColor: 'rgba(180,83,9,0.02)' }}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </div>
      )}

      {/* Дополнительные поля — collapsible для новичков */}
      <details
        className="group"
        open={!!(state.modalityWorseText || state.modalityBetterText || state.mentalText || state.generalText || localStorage.getItem('complaints_expanded'))}
      >
        <summary
          className="cursor-pointer text-xs font-semibold uppercase tracking-wider py-2 flex items-center gap-2 select-none"
          style={{ color: 'var(--sim-text-muted)' }}
          onClick={() => localStorage.setItem('complaints_expanded', '1')}
        >
          <svg className="w-3 h-3 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {lang === 'ru' ? 'Модальности, психика, общие' : 'Modalities, mentals, generals'}
        </summary>
        <div className="space-y-4 pt-2">

      {/* Хуже / Лучше в одну строку */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="modality-worse" className="block mb-1.5" style={{ fontSize: '11px', fontWeight: 500, color: '#b91c1c', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
            {labels.worse}
          </label>
          <textarea
            id="modality-worse"
            ref={worseRef}
            value={state.modalityWorseText}
            onChange={handleChange('modalityWorseText')}
            onInput={e => autoResize(e.currentTarget)}
            onKeyDown={e => handleTab(e, betterRef)}
            placeholder={labels.worsePlaceholder}
            rows={2}
            className={taBase}
            style={{ lineHeight: '1.6', borderColor: 'var(--sim-border)', backgroundColor: isAcute ? '#fffbf0' : '#fff' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(252,165,165,0.15)' }}
            onBlur={blurStyle}
          />
        </div>
        <div>
          <label htmlFor="modality-better" className="block mb-1.5" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--sim-green)', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
            {labels.better}
          </label>
          <textarea
            id="modality-better"
            ref={betterRef}
            value={state.modalityBetterText}
            onChange={handleChange('modalityBetterText')}
            onInput={e => autoResize(e.currentTarget)}
            onKeyDown={e => handleTab(e, isAcute ? generalRef : mentalRef)}
            placeholder={labels.betterPlaceholder}
            rows={2}
            className={taBase}
            style={{ lineHeight: '1.6', borderColor: 'var(--sim-border)', backgroundColor: isAcute ? '#fffbf0' : '#fff' }}
            onFocus={focusStyle}
            onBlur={blurStyle}
          />
        </div>
      </div>

      {/* При остром: сначала температура/жажда, потом поведение */}
      {isAcute ? (
        <>
          {/* Температура, озноб, жажда, пот */}
          <div>
            <label className="block mb-1.5" style={{ fontSize: '11px', fontWeight: 500, color: '#b45309', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
              {labels.general}
            </label>
            <textarea
              ref={generalRef}
              value={state.generalText}
              onChange={handleChange('generalText')}
              onInput={e => autoResize(e.currentTarget)}
              onKeyDown={e => handleTab(e, mentalRef)}
              placeholder={labels.generalPlaceholder}
              rows={2}
              className={taBase}
              style={{ lineHeight: '1.6', borderColor: 'var(--sim-border)', backgroundColor: 'rgba(180,83,9,0.02)' }}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          {/* Поведение и сопутствующие симптомы */}
          <div>
            <label className="block mb-1.5" style={{ fontSize: '11px', fontWeight: 500, color: '#b45309', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
              {labels.mental}
            </label>
            <textarea
              ref={mentalRef}
              value={state.mentalText}
              onChange={handleChange('mentalText')}
              onInput={e => autoResize(e.currentTarget)}
              placeholder={labels.mentalPlaceholder}
              rows={2}
              className={taBase}
              style={{ lineHeight: '1.6', borderColor: 'var(--sim-border)', backgroundColor: 'rgba(180,83,9,0.02)' }}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>
        </>
      ) : (
        <>
          {/* Психика (хронический) */}
          <div>
            <label className="block mb-1.5" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--sim-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
              {labels.mental}
            </label>
            <textarea
              ref={mentalRef}
              value={state.mentalText}
              onChange={handleChange('mentalText')}
              onInput={e => autoResize(e.currentTarget)}
              onKeyDown={e => handleTab(e, generalRef)}
              placeholder={labels.mentalPlaceholder}
              rows={2}
              className={taBase}
              style={{ lineHeight: '1.6', borderColor: 'var(--sim-border)', backgroundColor: 'var(--sim-bg-card)' }}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          {/* Общее (хронический) */}
          <div>
            <label className="block mb-1.5" style={{ fontSize: '11px', fontWeight: 500, color: 'var(--sim-text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }}>
              {labels.general}
            </label>
            <textarea
              ref={generalRef}
              value={state.generalText}
              onChange={handleChange('generalText')}
              onInput={e => autoResize(e.currentTarget)}
              placeholder={labels.generalPlaceholder}
              rows={2}
              className={taBase}
              style={{ lineHeight: '1.6', borderColor: 'var(--sim-border)', backgroundColor: 'var(--sim-bg-card)' }}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>
        </>
      )}

        </div>
      </details>

    </div>
  )
}
