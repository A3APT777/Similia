'use client'

import { useRef, useEffect, useState } from 'react'
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
    chief: 'Острая жалоба',
    chiefPlaceholder: 'Что происходит сейчас — жар, рвота, боль в горле, кашель...',
    onset: 'Начало и причина',
    onsetPlaceholder: 'Когда началось, как быстро развилось, что предшествовало...',
    worse: 'Хуже от',
    worsePlaceholder: 'движение, тепло, ночью, прикосновение...',
    better: 'Лучше от',
    betterPlaceholder: 'покой, холод, давление, согревание...',
    general: 'Температура, озноб, жажда',
    generalPlaceholder: 'жар 38.5°, жаждет холодной воды, бьёт озноб, обильный пот...',
    mental: 'Поведение',
    mentalPlaceholder: 'беспокойный / спокойный, хочет внимания или быть один...',
    side: 'Сторона',
    sidePlaceholder: 'правая / левая / чередуется',
  },
  en: {
    chief: 'Acute complaint',
    chiefPlaceholder: 'What is happening now — fever, vomiting, sore throat, cough...',
    onset: 'Onset & cause',
    onsetPlaceholder: 'When it started, what preceded it (cold, stress, fright)...',
    worse: 'Worse from',
    worsePlaceholder: 'motion, heat, at night, touch...',
    better: 'Better from',
    betterPlaceholder: 'rest, cold, pressure, warmth...',
    general: 'Temperature, chills, thirst',
    generalPlaceholder: 'fever 38.5°, craves cold water, chills, profuse sweating...',
    mental: 'Behavior',
    mentalPlaceholder: 'restless / quiet, wants company or solitude...',
    side: 'Side',
    sidePlaceholder: 'right / left / alternating',
  },
}

// Типовые острые случаи с подсказками для врача
type AcutePreset = {
  id: string
  label: string
  labelEn: string
  icon: string
  chiefHint: string
  worseHint: string
  betterHint: string
  generalHint: string
  mentalHint: string
}

const ACUTE_PRESETS: AcutePreset[] = [
  {
    id: 'orvi', label: 'ОРВИ', labelEn: 'Cold/Flu', icon: '',
    chiefHint: 'Насморк, кашель, чихание, боль в горле...',
    worseHint: 'холод, сквозняк, ночью, утром...',
    betterHint: 'тепло, горячее питьё, покой...',
    generalHint: 'Озноб или жар? Жажда? Выделения из носа — цвет? Кашель сухой/влажный?',
    mentalHint: 'вялый или беспокойный, раздражительный, плаксивый...',
  },
  {
    id: 'angina', label: 'Ангина', labelEn: 'Tonsillitis', icon: '',
    chiefHint: 'Боль в горле, трудно глотать, налёт на миндалинах...',
    worseHint: 'глотание, холодное/тёплое питьё, ночью...',
    betterHint: 'тёплое/холодное питьё, покой...',
    generalHint: 'Какая сторона? Жар? Слюнотечение? Запах изо рта? Увеличены лимфоузлы?',
    mentalHint: 'раздражительный, капризный, хочет компанию или один...',
  },
  {
    id: 'otit', label: 'Отит', labelEn: 'Otitis', icon: '',
    chiefHint: 'Боль в ухе, стреляет, выделения...',
    worseHint: 'ночью, тепло, лёжа на больной стороне...',
    betterHint: 'холод, тепло, давление...',
    generalHint: 'Какое ухо? Температура? Выделения — цвет, запах?',
    mentalHint: 'кричит от боли, успокаивается когда носят...',
  },
  {
    id: 'colic', label: 'Колики', labelEn: 'Colic', icon: '',
    chiefHint: 'Боль в животе, спазмы, вздутие...',
    worseHint: 'после еды, движение, разгибание...',
    betterHint: 'сгибание, давление, тепло, горячая грелка...',
    generalHint: 'Сгибается от боли? Тошнота? Рвота? Понос? Газы?',
    mentalHint: 'злой от боли, хочет покоя, нетерпеливый...',
  },
  {
    id: 'trauma', label: 'Травма', labelEn: 'Injury', icon: '',
    chiefHint: 'Ушиб, удар, падение, растяжение...',
    worseHint: 'движение, прикосновение, сырость...',
    betterHint: 'покой, холод, возвышенное положение...',
    generalHint: 'Что произошло? Отёк? Синяк? Перелом? Кровотечение?',
    mentalHint: 'говорит что в порядке, боится прикосновения, шок...',
  },
]

type Props = {
  autoFocus?: boolean
}

export default function ComplaintsForm({ autoFocus = false }: Props) {
  const { state, updateField } = useConsultation()
  const { lang } = useLanguage()
  const isAcute = state.type === 'acute'
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const labels = isAcute
    ? (ACUTE_LABELS[lang] ?? ACUTE_LABELS.ru)
    : (CHRONIC_LABELS[lang] ?? CHRONIC_LABELS.ru)

  // Получить плейсхолдеры с учётом пресета
  const preset = ACUTE_PRESETS.find(p => p.id === activePreset)

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

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  const familyRef = useRef<HTMLTextAreaElement>(null)

  function handleChange(field: 'complaints' | 'observations' | 'modalityWorseText' | 'modalityBetterText' | 'mentalText' | 'generalText' | 'familyHistory') {
    return (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateField(field, e.target.value)
      autoResize(e.target)
    }
  }

  function handleTab(e: React.KeyboardEvent<HTMLTextAreaElement>, nextRef: React.RefObject<HTMLTextAreaElement | null>) {
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault()
      nextRef.current?.focus()
    }
  }

  // Стили
  const taBase = 'w-full resize-none rounded-xl border px-4 py-3 transition-all duration-200 focus:outline-none text-[15px] leading-relaxed max-h-[50vh] lg:max-h-none overflow-y-auto'
  const acuteAccent = '#b45309'
  const greenAccent = 'var(--sim-green)'
  const focusBorder = isAcute ? `rgba(180,83,9,0.4)` : greenAccent
  const focusShadow = isAcute ? '0 0 0 3px rgba(180,83,9,0.06)' : '0 0 0 3px rgba(45,106,79,0.08)'
  const acuteBg = '#fffbf0'
  const chronicBg = '#fff'

  function focusStyle(e: React.FocusEvent<HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = focusBorder
    e.currentTarget.style.boxShadow = focusShadow
  }
  function blurStyle(e: React.FocusEvent<HTMLTextAreaElement>) {
    e.currentTarget.style.borderColor = 'var(--sim-border)'
    e.currentTarget.style.boxShadow = 'none'
  }

  // Label компонент
  const Label = ({ text, color, htmlFor }: { text: string; color?: string; htmlFor?: string }) => (
    <label htmlFor={htmlFor} className="block mb-2" style={{ fontSize: '13px', fontWeight: 600, color: color || (isAcute ? acuteAccent : '#7a6e64'), textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>
      {text}
    </label>
  )

  return (
    <div data-tour="complaints" className="space-y-5">

      {/* Пресеты для острого случая — Apple/Linear pill chips */}
      {isAcute && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#6b7280] mb-2.5">
            {lang === 'ru' ? 'Тип случая' : 'Case type'}
          </p>
          <div className="flex flex-wrap gap-2">
            {ACUTE_PRESETS.map(p => {
              const isActive = activePreset === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePreset(isActive ? null : p.id)}
                  className={`text-[13px] font-medium px-5 py-2.5 rounded-full transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'bg-[#b45309] text-white shadow-[0_2px_8px_rgba(180,83,9,0.25)]'
                      : 'bg-white text-[#1a1a1a] border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.03)] hover:-translate-y-0.5 hover:shadow-[0_2px_6px_rgba(0,0,0,0.06),0_6px_16px_rgba(0,0,0,0.05)] hover:border-[#b45309]/20'
                  }`}
                >
                  {lang === 'ru' ? p.label : p.labelEn}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Основная жалоба — визуально крупнее */}
      <div className="rounded-xl p-4" style={{ backgroundColor: isAcute ? 'rgba(180,83,9,0.03)' : 'rgba(45,106,79,0.02)', border: `1px solid ${isAcute ? 'rgba(180,83,9,0.1)' : 'rgba(45,106,79,0.08)'}` }}>
        <label htmlFor="chief-complaint" className="block mb-2" style={{ fontSize: '15px', fontWeight: 600, color: isAcute ? acuteAccent : '#2d6a4f', letterSpacing: '0.02em' }}>
          {isAcute ? `⚡ ${labels.chief}` : labels.chief}
        </label>
        <textarea
          id="chief-complaint"
          ref={chiefRef}
          value={state.complaints}
          onChange={handleChange('complaints')}
          onInput={e => autoResize(e.currentTarget)}
          onKeyDown={e => handleTab(e, onsetRef)}
          placeholder={preset?.chiefHint || labels.chiefPlaceholder}
          rows={3}
          className={taBase}
          style={{ borderColor: 'transparent', backgroundColor: 'transparent', padding: '0' }}
          onFocus={e => { e.currentTarget.style.outline = 'none' }}
          onBlur={e => { e.currentTarget.style.outline = 'none' }}
        />
      </div>

      {/* Этиология (хронический) / Начало (острый) */}
      <div>
        <Label
          text={isAcute ? (labels as typeof ACUTE_LABELS.ru).onset : (labels as typeof CHRONIC_LABELS.ru).etiology}
          color={isAcute ? acuteAccent : undefined}
        />
        <textarea
          ref={onsetRef}
          value={state.observations}
          onChange={handleChange('observations')}
          onInput={e => autoResize(e.currentTarget)}
          onKeyDown={e => handleTab(e, worseRef)}
          placeholder={isAcute ? (labels as typeof ACUTE_LABELS.ru).onsetPlaceholder : (labels as typeof CHRONIC_LABELS.ru).etiologyPlaceholder}
          rows={2}
          className={taBase}
          style={{ borderColor: 'var(--sim-border)', backgroundColor: isAcute ? 'rgba(180,83,9,0.02)' : 'var(--sim-bg-card)' }}
          onFocus={focusStyle}
          onBlur={blurStyle}
        />
      </div>

      {/* Хуже / Лучше — всегда видны (НЕ в collapsible при остром) */}
      {isAcute ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label text={labels.worse} color="#dc2626" />
              <textarea
                ref={worseRef}
                value={state.modalityWorseText}
                onChange={handleChange('modalityWorseText')}
                onInput={e => autoResize(e.currentTarget)}
                onKeyDown={e => handleTab(e, betterRef)}
                placeholder={preset?.worseHint || labels.worsePlaceholder}
                rows={2}
                className={taBase}
                style={{ borderColor: 'var(--sim-border)', backgroundColor: acuteBg }}
                onFocus={e => { e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(252,165,165,0.15)' }}
                onBlur={blurStyle}
              />
            </div>
            <div>
              <Label text={labels.better} color="#2d6a4f" />
              <textarea
                ref={betterRef}
                value={state.modalityBetterText}
                onChange={handleChange('modalityBetterText')}
                onInput={e => autoResize(e.currentTarget)}
                onKeyDown={e => handleTab(e, generalRef)}
                placeholder={preset?.betterHint || labels.betterPlaceholder}
                rows={2}
                className={taBase}
                style={{ borderColor: 'var(--sim-border)', backgroundColor: acuteBg }}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>
          </div>

          {/* Температура, жажда */}
          <div>
            <Label text={labels.general} color={acuteAccent} />
            <textarea
              ref={generalRef}
              value={state.generalText}
              onChange={handleChange('generalText')}
              onInput={e => autoResize(e.currentTarget)}
              onKeyDown={e => handleTab(e, mentalRef)}
              placeholder={preset?.generalHint || labels.generalPlaceholder}
              rows={2}
              className={taBase}
              style={{ borderColor: 'var(--sim-border)', backgroundColor: 'rgba(180,83,9,0.02)' }}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>

          {/* Поведение */}
          <div>
            <Label text={labels.mental} color={acuteAccent} />
            <textarea
              ref={mentalRef}
              value={state.mentalText}
              onChange={handleChange('mentalText')}
              onInput={e => autoResize(e.currentTarget)}
              placeholder={preset?.mentalHint || labels.mentalPlaceholder}
              rows={2}
              className={taBase}
              style={{ borderColor: 'var(--sim-border)', backgroundColor: 'rgba(180,83,9,0.02)' }}
              onFocus={focusStyle}
              onBlur={blurStyle}
            />
          </div>
        </>
      ) : (
        /* Хронический — модальности/психика/общие в collapsible */
        <details
          className="group"
          open={!!(state.modalityWorseText || state.modalityBetterText || state.mentalText || state.generalText || (typeof localStorage !== 'undefined' && localStorage.getItem('complaints_expanded')))}
        >
          <summary
            className="cursor-pointer text-[13px] font-semibold uppercase tracking-wider py-2.5 flex items-center gap-2 select-none"
            style={{ color: 'var(--sim-text-muted)' }}
            onClick={() => typeof localStorage !== 'undefined' && localStorage.setItem('complaints_expanded', '1')}
          >
            <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {lang === 'ru' ? 'Модальности, психика, общие' : 'Modalities, mentals, generals'}
          </summary>
          <div className="space-y-5 pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label text={labels.worse} color="#dc2626" />
                <textarea
                  ref={worseRef}
                  value={state.modalityWorseText}
                  onChange={handleChange('modalityWorseText')}
                  onInput={e => autoResize(e.currentTarget)}
                  onKeyDown={e => handleTab(e, betterRef)}
                  placeholder={labels.worsePlaceholder}
                  rows={2}
                  className={taBase}
                  style={{ borderColor: 'var(--sim-border)', backgroundColor: chronicBg }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#fca5a5'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(252,165,165,0.15)' }}
                  onBlur={blurStyle}
                />
              </div>
              <div>
                <Label text={labels.better} color="#2d6a4f" />
                <textarea
                  ref={betterRef}
                  value={state.modalityBetterText}
                  onChange={handleChange('modalityBetterText')}
                  onInput={e => autoResize(e.currentTarget)}
                  onKeyDown={e => handleTab(e, mentalRef)}
                  placeholder={labels.betterPlaceholder}
                  rows={2}
                  className={taBase}
                  style={{ borderColor: 'var(--sim-border)', backgroundColor: chronicBg }}
                  onFocus={focusStyle}
                  onBlur={blurStyle}
                />
              </div>
            </div>

            <div>
              <Label text={labels.mental} />
              <textarea
                ref={mentalRef}
                value={state.mentalText}
                onChange={handleChange('mentalText')}
                onInput={e => autoResize(e.currentTarget)}
                onKeyDown={e => handleTab(e, generalRef)}
                placeholder={labels.mentalPlaceholder}
                rows={2}
                className={taBase}
                style={{ borderColor: 'var(--sim-border)', backgroundColor: 'var(--sim-bg-card)' }}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>

            <div>
              <Label text={labels.general} />
              <textarea
                ref={generalRef}
                value={state.generalText}
                onChange={handleChange('generalText')}
                onInput={e => autoResize(e.currentTarget)}
                onKeyDown={e => handleTab(e, familyRef)}
                placeholder={labels.generalPlaceholder}
                rows={2}
                className={taBase}
                style={{ borderColor: 'var(--sim-border)', backgroundColor: 'var(--sim-bg-card)' }}
                onFocus={focusStyle}
                onBlur={blurStyle}
              />
            </div>

            {/* Семейный анамнез — только хронический (миазм) */}
            <div>
              <Label text={lang === 'ru' ? 'Семейный анамнез' : 'Family history'} color="#c8a035" />
              <textarea
                ref={familyRef}
                value={state.familyHistory}
                onChange={handleChange('familyHistory')}
                onInput={e => autoResize(e.currentTarget)}
                placeholder={lang === 'ru'
                  ? 'Болезни родственников: туберкулёз, рак, диабет, астма, кожные болезни, алкоголизм...'
                  : 'Family diseases: tuberculosis, cancer, diabetes, asthma, skin diseases...'}
                rows={2}
                className={taBase}
                style={{ borderColor: 'var(--sim-border)', backgroundColor: 'var(--sim-bg-card)' }}
                onFocus={e => { e.currentTarget.style.borderColor = '#c8a035'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(200,160,53,0.08)' }}
                onBlur={blurStyle}
              />
            </div>
          </div>
        </details>
      )}
    </div>
  )
}
