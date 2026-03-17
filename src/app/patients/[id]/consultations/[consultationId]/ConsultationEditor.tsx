'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateConsultationNotes, updateConsultationType, updateConsultationExtra, updateConsultationFields } from '@/lib/actions/consultations'
import { decrementPaidSession } from '@/lib/actions/payments'
import { Consultation, Patient, ConsultationType, StructuredSymptom } from '@/types'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import ComparisonPanel from './ComparisonPanel'
import TemplateMenu, { StructuredTemplate } from './TemplateMenu'
import PrescriptionModal from './PrescriptionModal'
import MiniRepertory from './MiniRepertory'
import SymptomTags from './SymptomTags'

type Props = {
  consultation: Consultation
  patient: Patient
  previousConsultation: Consultation | null
  paidSessionsEnabled: boolean
}

const TYPE_STYLE = {
  chronic: {
    badgeStyle: { backgroundColor: 'rgba(45,106,79,0.08)', color: 'var(--color-primary)', borderColor: 'rgba(45,106,79,0.2)' },
    dotStyle: { backgroundColor: 'var(--color-primary)' },
  },
  acute: {
    badgeStyle: { backgroundColor: 'rgba(200,160,53,0.08)', color: 'var(--color-amber)', borderColor: 'rgba(200,160,53,0.3)' },
    dotStyle: { backgroundColor: 'var(--color-amber)' },
  },
}

export default function ConsultationEditor({ consultation, patient, previousConsultation, paidSessionsEnabled }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const { lang } = useLanguage()
  const [notes, setNotes] = useState(consultation.notes || '')
  const [complaints, setComplaints] = useState(consultation.complaints || '')
  const [observations, setObservations] = useState(consultation.observations || '')
  const [recommendations, setRecommendations] = useState(consultation.recommendations || '')
  const [symptoms, setSymptoms] = useState<StructuredSymptom[]>(consultation.structured_symptoms || [])
  const symptomsTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [showZeroWarning, setShowZeroWarning] = useState(false)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [rubrics, setRubrics] = useState(consultation.rubrics || '')
  const [reactionToPrev, setReactionToPrev] = useState(consultation.reaction_to_previous || '')
  const [showExtra, setShowExtra] = useState(
    !!(consultation.rubrics || consultation.reaction_to_previous)
  )
  const extraTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [rightTab, setRightTab] = useState<'prev' | 'compare' | 'both' | 'repertory'>('compare')
  const [mobileTab, setMobileTab] = useState<'editor' | 'compare'>('editor')
  const [type, setType] = useState<ConsultationType>(consultation.type ?? 'chronic')
  const [showPrescription, setShowPrescription] = useState(false)
  const [pendingPrescription, setPendingPrescription] = useState<{ abbrev: string; potency: string; dosage: string } | null>(null)
  const [, startTypeTransition] = useTransition()
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const fieldsTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Авто-растягивание textarea по содержимому
  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }
  useEffect(() => {
    // При первом рендере и при изменении данных — подогнать высоту всех textarea
    document.querySelectorAll<HTMLTextAreaElement>('[data-autoresize]').forEach(autoResize)
  }, [complaints, observations, notes, recommendations])

  // Автосохранение заметок (основное поле)
  function handleChange(value: string) {
    setNotes(value)
    setSaveState('unsaved')
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setSaveState('saving')
      try {
        await updateConsultationNotes(consultation.id, value)
        setSaveState('saved')
        setSavedAt(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }))
      } catch {
        setSaveState('unsaved')
        toast(t(lang).consultation.saveError)
      }
    }, 1500)
  }

  // Автосохранение структурированных полей (жалобы, наблюдения, рекомендации)
  function handleFieldChange(field: 'complaints' | 'observations' | 'recommendations', value: string) {
    if (field === 'complaints') setComplaints(value)
    else if (field === 'observations') setObservations(value)
    else setRecommendations(value)

    setSaveState('unsaved')
    clearTimeout(fieldsTimerRef.current)
    fieldsTimerRef.current = setTimeout(async () => {
      setSaveState('saving')
      try {
        const fields: Record<string, string> = {}
        fields[field] = value
        await updateConsultationFields(consultation.id, fields)
        setSaveState('saved')
        setSavedAt(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }))
      } catch {
        setSaveState('unsaved')
        toast(t(lang).consultation.saveError)
      }
    }, 1500)
  }

  async function doFinish() {
    if (saveState !== 'saved') {
      clearTimeout(timerRef.current)
      clearTimeout(fieldsTimerRef.current)
      await updateConsultationNotes(consultation.id, notes)
      await updateConsultationFields(consultation.id, { complaints, observations, recommendations, structured_symptoms: symptoms })
    }
    setShowPrescription(true)
  }

  async function handleFinish() {
    if (paidSessionsEnabled && (patient.paid_sessions ?? 0) === 0) {
      setShowZeroWarning(true)
      return
    }
    await doFinish()
  }

  async function handleConsultationDone() {
    setPendingPrescription(null)
    if (paidSessionsEnabled) {
      const { prevCount, newCount } = await decrementPaidSession(patient.id)
      if (prevCount === 1) {
        toast(t(lang).consultation.savedPaymentDone)
      } else if (prevCount > 1) {
        toast(t(lang).consultation.savedRemaining(newCount))
      }
    }
    router.push(`/patients/${consultation.patient_id}`)
  }

  function toggleType() {
    const next: ConsultationType = type === 'chronic' ? 'acute' : 'chronic'
    setType(next)
    startTypeTransition(() => {
      updateConsultationType(consultation.id, next)
    })
  }

  // Вставить структурированный шаблон во все поля разом
  function insertStructuredTemplate(template: StructuredTemplate) {
    // Обновляем локальный стейт
    setComplaints(template.complaints)
    setObservations(template.observations)
    setNotes(template.notes)
    setRecommendations(template.recommendations)

    // Сохраняем в БД
    setSaveState('saving')
    Promise.all([
      updateConsultationNotes(consultation.id, template.notes),
      updateConsultationFields(consultation.id, {
        complaints: template.complaints,
        observations: template.observations,
        recommendations: template.recommendations,
      }),
    ]).then(() => {
      setSaveState('saved')
      setSavedAt(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }))
    }).catch(() => {
      setSaveState('unsaved')
      toast(t(lang).consultation.saveError)
    })
  }

  // Вставить текст быстрой секции в notes (в позицию курсора или в конец)
  function insertTemplateText(templateText: string) {
    const textarea = textareaRef.current
    const current = notes

    let newValue: string
    let newCursorPos: number

    if (textarea) {
      const start = textarea.selectionStart
      const before = current.slice(0, start)
      const after = current.slice(textarea.selectionEnd)

      const prefix = before && !before.endsWith('\n\n')
        ? before.endsWith('\n') ? '\n' : '\n\n'
        : ''

      newValue = before + prefix + templateText + after
      newCursorPos = before.length + prefix.length + templateText.length
    } else {
      const prefix = current && !current.endsWith('\n\n')
        ? current.endsWith('\n') ? '\n' : '\n\n'
        : ''
      newValue = current + prefix + templateText
      newCursorPos = newValue.length
    }

    handleChange(newValue)

    requestAnimationFrame(() => {
      if (textarea) {
        textarea.focus()
        textarea.setSelectionRange(newCursorPos, newCursorPos)
      }
    })
  }

  function handleSymptomsChange(newSymptoms: StructuredSymptom[]) {
    setSymptoms(newSymptoms)
    clearTimeout(symptomsTimerRef.current)
    symptomsTimerRef.current = setTimeout(() => {
      updateConsultationFields(consultation.id, { structured_symptoms: newSymptoms })
    }, 1500)
  }

  function insertRubricFromRepertory(rubricPath: string) {
    const current = rubrics
    const separator = current.trim() ? ';\n' : ''
    const newValue = current + separator + rubricPath
    handleExtraChange(newValue, reactionToPrev)
    if (!showExtra) setShowExtra(true)
  }

  function handleExtraChange(newRubrics: string, newReaction: string) {
    setRubrics(newRubrics)
    setReactionToPrev(newReaction)
    clearTimeout(extraTimerRef.current)
    extraTimerRef.current = setTimeout(() => {
      updateConsultationExtra(consultation.id, newRubrics, newReaction)
    }, 1500)
  }

  // Сохраняем URL текущей консультации — кнопка "↗ В консультацию" в репертории
  useEffect(() => {
    localStorage.setItem('hc-last-consultation', window.location.href)

    // Проверяем, пришли ли мы из репертория с готовым назначением
    const raw = localStorage.getItem('hc-pending-prescription')
    if (raw) {
      try {
        const data = JSON.parse(raw) as { abbrev: string; potency: string; dosage: string }
        localStorage.removeItem('hc-pending-prescription')
        setPendingPrescription(data)
        setShowPrescription(true)
      } catch {}
    }
  }, [])

  const typeStyle = TYPE_STYLE[type]
  const typeCfg = {
    ...typeStyle,
    label: type === 'chronic' ? t(lang).consultation.chronic : t(lang).consultation.acute,
    short: type === 'chronic' ? t(lang).consultation.chronicShort : t(lang).consultation.acuteShort,
  }
  const allText = [complaints, observations, notes, recommendations].filter(Boolean).join(' ')
  const wordCount = allText.trim() ? allText.trim().split(/\s+/).length : 0

  return (
    <>
    {/* Предупреждение: 0 оплаченных консультаций */}
    {showZeroWarning && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="relative rounded-2xl p-6 w-[340px] mx-4 shadow-2xl" style={{ backgroundColor: '#f7f3ed', border: '1px solid #c8a035' }}>
          <div className="flex items-start gap-3 mb-4">
            <svg className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#c8a035' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
            <div>
              <p className="text-[15px] font-semibold" style={{ color: '#1a1a0a' }}>{t(lang).consultation.noPayment}</p>
              <p className="text-sm mt-1 leading-relaxed" style={{ color: '#5a5040' }}>
                {t(lang).consultation.noPaymentDesc}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowZeroWarning(false); doFinish() }}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#1a3020' }}
            >
              {t(lang).consultation.save}
            </button>
            <button
              onClick={() => setShowZeroWarning(false)}
              className="px-4 py-2.5 rounded-xl text-sm"
              style={{ color: '#9a8a6a' }}
            >
              {t(lang).consultation.cancel}
            </button>
          </div>
        </div>
      </div>
    )}

    {showPrescription && (
      <PrescriptionModal
        consultationId={consultation.id}
        onSkip={handleConsultationDone}
        onSaved={handleConsultationDone}
        initialRemedy={pendingPrescription?.abbrev}
        initialPotency={pendingPrescription?.potency}
        initialDosage={pendingPrescription?.dosage}
      />
    )}

    {/* Мобильный таб-бар (скрыт на desktop) */}
    <div className="lg:hidden flex shrink-0" style={{ borderBottom: '1px solid var(--color-border-light)', backgroundColor: 'var(--color-muted-bg)' }}>
      <button
        onClick={() => setMobileTab('editor')}
        className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
          mobileTab === 'editor'
            ? 'text-gray-900 border-emerald-500'
            : 'text-gray-400 border-transparent'
        }`}
      >
        {t(lang).consultation.editor}
      </button>
      <button
        onClick={() => setMobileTab('compare')}
        className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
          mobileTab === 'compare'
            ? 'text-gray-900 border-emerald-500'
            : 'text-gray-400 border-transparent'
        }`}
      >
        {previousConsultation ? t(lang).consultation.comparison : t(lang).consultation.prevVisit}
      </button>
    </div>

    <div className="flex flex-col lg:grid lg:grid-cols-2 gap-0 flex-1 lg:h-[calc(100vh-54px)]">

      {/* ══════════ Левая колонка: редактор ══════════ */}
      <div className={`${mobileTab === 'editor' ? 'flex' : 'hidden'} lg:flex flex-col border-r border-gray-100 min-h-0`}>

        {/* Шапка */}
        <div className="px-6 py-3.5" style={{ borderBottom: '1px solid var(--color-border-light)', backgroundColor: 'var(--color-card)' }}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={typeCfg.dotStyle} />
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-gray-900 tracking-tight truncate">{patient.name}</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs text-gray-400">{formatDate(consultation.date)}</span>
                  {patient.phone && <span className="text-gray-200 text-xs hidden sm:inline">·</span>}
                  {patient.phone && <span className="text-xs text-gray-400 hidden sm:inline">{patient.phone}</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-xs">
                {saveState === 'saved' && notes.trim().length > 0 && (
                  <span className="flex items-center gap-1 text-emerald-500">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {savedAt ? t(lang).consultation.savedAt(savedAt) : t(lang).consultation.save}
                  </span>
                )}
                {saveState === 'saving' && <span className="text-gray-400 animate-pulse">{t(lang).consultation.saving}</span>}
                {saveState === 'unsaved' && (
                  <span className="flex items-center gap-1 text-amber-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                    {t(lang).consultation.unsaved}
                  </span>
                )}
              </div>

              <button
                onClick={handleFinish}
                className="bg-emerald-600 text-white text-xs px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors font-semibold shadow-sm shadow-emerald-900/10"
              >
                {t(lang).consultation.finish}
              </button>
            </div>
          </div>
        </div>

        {/* Тулбар: минимальный — тип + шаблон + реперторий */}
        <div className="px-5 py-2 flex items-center gap-2" style={{ borderBottom: '1px solid var(--color-border-light)', backgroundColor: 'var(--color-card)' }}>
          <button
            type="button"
            onClick={toggleType}
            title={t(lang).consultation.changeTypeHint}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
            style={typeCfg.badgeStyle}
          >
            {type === 'acute' ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" /></svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
            )}
            {typeCfg.short}
          </button>

          <TemplateMenu
            onInsertStructured={insertStructuredTemplate}
            onInsertText={insertTemplateText}
            consultationType={type}
            currentFields={{ complaints, observations, notes, recommendations }}
          />

          <button
            type="button"
            onClick={() => {
              if (rightTab === 'repertory') {
                setRightTab('compare')
              } else {
                setRightTab('repertory')
                setMobileTab('compare')
              }
            }}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border transition-all ${
              rightTab === 'repertory'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 bg-[#ede7dd] text-gray-400 hover:text-emerald-700 hover:border-emerald-200'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" /></svg>
            {t(lang).consultation.repertory}
          </button>

          <span className="text-[10px] text-gray-300 ml-auto tabular-nums">
            {wordCount > 0 && t(lang).consultation.words(wordCount)}
          </span>
        </div>

        {/* Дополнительные поля — реакция и рубрики */}
        <div className="border-b border-gray-100 bg-[#ede7dd]">
          <button
            type="button"
            onClick={() => setShowExtra(v => !v)}
            className="w-full flex items-center justify-between px-5 py-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              {(rubrics || reactionToPrev) && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
              )}
              {t(lang).consultation.reactionHint}
            </span>
            <svg
              className={`w-3.5 h-3.5 transition-transform ${showExtra ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showExtra && (
            <div className="px-5 pb-3 pt-1 space-y-2 bg-gray-50/50">
              {previousConsultation?.remedy && (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    {t(lang).consultation.reactionTo} {previousConsultation.remedy}{previousConsultation.potency ? ` ${previousConsultation.potency}` : ''}
                  </label>
                  <textarea
                    value={reactionToPrev}
                    onChange={e => handleExtraChange(rubrics, e.target.value)}
                    rows={2}
                    placeholder={t(lang).consultation.reactionPlaceholder}
                    className="w-full text-xs text-gray-700 bg-[#faf7f2] border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder-gray-300"
                  />
                </div>
              )}
              {!previousConsultation?.remedy && reactionToPrev === '' && (
                <div>
                  <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    {t(lang).consultation.prevRemedyReaction}
                  </label>
                  <textarea
                    value={reactionToPrev}
                    onChange={e => handleExtraChange(rubrics, e.target.value)}
                    rows={2}
                    placeholder={t(lang).consultation.prevRemedyPlaceholder}
                    className="w-full text-xs text-gray-700 bg-[#faf7f2] border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder-gray-300"
                  />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  {t(lang).consultation.rubrics}
                </label>
                <textarea
                  value={rubrics}
                  onChange={e => handleExtraChange(e.target.value, reactionToPrev)}
                  rows={2}
                  placeholder="Mind: Fear of dark; Generals: Worse cold; Head: Pain, throbbing..."
                  className="w-full text-xs text-gray-700 bg-[#faf7f2] border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 transition-all placeholder-gray-300 font-mono"
                />
                <p className="text-[10px] text-gray-300 mt-0.5">{t(lang).consultation.rubricsSemicolon}</p>
              </div>
            </div>
          )}
        </div>

        {/* ═══ Клинический воркфлоу ═══ */}
        <div className="flex-1 overflow-y-auto bg-[#faf7f2] min-h-[60vh] lg:min-h-0">
          <div className="px-5 lg:px-7 py-4 space-y-5">

            {/* ШАГ 1 — Описание случая */}
            <div className="relative pl-8">
              <div className="absolute left-0 top-0 w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: complaints.trim() ? '#2d6a4f' : '#e0dcd4', color: complaints.trim() ? '#fff' : '#9a8a6a', width: '22px', height: '22px' }}>1</div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#1a3020' }}>
                {lang === 'ru' ? 'Описание случая' : 'Case description'}
              </label>
              <div className="flex flex-wrap gap-x-3 gap-y-0 mb-2">
                <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· что привело' : '· what brought'}</span>
                <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· когда началось' : '· when started'}</span>
                <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· динамика' : '· dynamics'}</span>
                <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· локализация' : '· location'}</span>
              </div>
              <textarea
                data-autoresize
                value={complaints}
                onChange={e => handleFieldChange('complaints', e.target.value)}
                onInput={e => autoResize(e.currentTarget)}
                autoFocus
                placeholder={lang === 'ru'
                  ? 'Обратился с... Началось... Сейчас...'
                  : 'Presents with... Started... Currently...'}
                rows={3}
                className="w-full text-[14px] text-gray-800 leading-[1.8] resize-none focus:outline-none bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 placeholder-gray-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                style={{ minHeight: '72px', overflow: 'hidden' }}
              />
              <SymptomTags section="complaints" symptoms={symptoms} onChange={handleSymptomsChange} previousSymptoms={previousConsultation?.structured_symptoms} />
            </div>

            {/* ШАГ 2 — Наблюдения */}
            <div className="relative pl-8">
              <div className="absolute left-0 top-0 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: observations.trim() ? '#2d6a4f' : '#e0dcd4', color: observations.trim() ? '#fff' : '#9a8a6a', width: '22px', height: '22px' }}>2</div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#1a3020' }}>
                {lang === 'ru' ? 'Наблюдения и симптомы' : 'Observations & symptoms'}
              </label>
              <div className="flex flex-wrap gap-x-3 gap-y-0 mb-2">
                <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· ощущения' : '· sensations'}</span>
                <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· хуже от' : '· worse from'}</span>
                <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· лучше от' : '· better from'}</span>
                <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· психика' : '· mind'}</span>
                <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· общие' : '· generals'}</span>
              </div>
              <textarea
                data-autoresize
                value={observations}
                onChange={e => handleFieldChange('observations', e.target.value)}
                onInput={e => autoResize(e.currentTarget)}
                placeholder={lang === 'ru'
                  ? 'Ощущения: ...\nХуже: ...\nЛучше: ...\nПсихика: ...'
                  : 'Sensations: ...\nWorse: ...\nBetter: ...\nMind: ...'}
                rows={4}
                className="w-full text-[14px] text-gray-800 leading-[1.8] resize-none focus:outline-none bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 placeholder-gray-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                style={{ minHeight: '88px', overflow: 'hidden' }}
              />
              <SymptomTags section="observations" symptoms={symptoms} onChange={handleSymptomsChange} previousSymptoms={previousConsultation?.structured_symptoms} />
            </div>

            {/* ШАГ 3 — Анализ */}
            <div className="relative pl-8">
              <div className="absolute left-0 top-0 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: notes.trim() ? '#2d6a4f' : '#e0dcd4', color: notes.trim() ? '#fff' : '#9a8a6a', width: '22px', height: '22px' }}>3</div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#1a3020' }}>
                {lang === 'ru' ? 'Анализ случая' : 'Case analysis'}
              </label>
              <div className="flex flex-wrap gap-x-3 gap-y-0 mb-2">
                <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· DD препаратов' : '· DD remedies'}</span>
                <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· аргументы выбора' : '· selection rationale'}</span>
                <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· ключевые рубрики' : '· key rubrics'}</span>
              </div>
              <textarea
                data-autoresize
                ref={textareaRef}
                value={notes}
                onChange={e => handleChange(e.target.value)}
                onInput={e => autoResize(e.currentTarget)}
                placeholder={lang === 'ru'
                  ? 'DD: ... vs ...\nВ пользу: ...\nПротив: ...\nВыбор: ...'
                  : 'DD: ... vs ...\nFor: ...\nAgainst: ...\nChoice: ...'}
                rows={3}
                className="w-full text-[14px] text-gray-800 leading-[1.8] resize-none focus:outline-none bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 placeholder-gray-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                style={{ minHeight: '72px', overflow: 'hidden' }}
              />
            </div>

            {/* ШАГ 4 — План лечения */}
            <div className="relative pl-8">
              <div className="absolute left-0 top-0 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: recommendations.trim() ? '#2d6a4f' : '#e0dcd4', color: recommendations.trim() ? '#fff' : '#9a8a6a', width: '22px', height: '22px' }}>4</div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#1a3020' }}>
                {lang === 'ru' ? 'План лечения' : 'Treatment plan'}
              </label>
              <div className="flex flex-wrap gap-x-3 gap-y-0 mb-2">
                <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· цель лечения' : '· treatment goal'}</span>
                <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· критерии улучшения' : '· improvement criteria'}</span>
                <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· срок контроля' : '· follow-up timing'}</span>
              </div>
              <textarea
                data-autoresize
                value={recommendations}
                onChange={e => handleFieldChange('recommendations', e.target.value)}
                onInput={e => autoResize(e.currentTarget)}
                placeholder={lang === 'ru'
                  ? 'Цель: ...\nУлучшение = ...\nКонтроль через ...'
                  : 'Goal: ...\nImprovement = ...\nFollow-up in ...'}
                rows={3}
                className="w-full text-[14px] text-gray-800 leading-[1.8] resize-none focus:outline-none bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 placeholder-gray-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                style={{ minHeight: '72px', overflow: 'hidden' }}
              />
            </div>

            {/* ═══ Клиническая формулировка — живой итог ═══ */}
            {(complaints.trim() || notes.trim()) && (
              <div className="ml-8 rounded-xl p-4" style={{ backgroundColor: '#e8f0e8', border: '1px solid rgba(45,106,79,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4" style={{ color: '#2d6a4f' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
                  <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: '#2d6a4f' }}>
                    {lang === 'ru' ? 'Формулировка случая' : 'Case formulation'}
                  </span>
                  <span className="text-[10px] ml-auto" style={{ color: '#6a9a6a' }}>
                    {[complaints.trim(), observations.trim(), notes.trim(), recommendations.trim()].filter(Boolean).length}/4
                  </span>
                </div>
                <div className="text-[13px] leading-[1.7] space-y-1.5" style={{ color: '#2a3a20' }}>
                  {complaints.trim() && (
                    <p><span className="font-bold">{lang === 'ru' ? 'Случай' : 'Case'}:</span> {complaints.trim().split('\n')[0].substring(0, 150)}</p>
                  )}
                  {observations.trim() && (
                    <p><span className="font-bold">{lang === 'ru' ? 'Ключевое' : 'Key'}:</span> {observations.trim().split('\n').slice(0, 2).join('; ').substring(0, 150)}</p>
                  )}
                  {notes.trim() && (
                    <p><span className="font-bold">{lang === 'ru' ? 'Анализ' : 'Analysis'}:</span> {notes.trim().split('\n')[0].substring(0, 150)}</p>
                  )}
                  {recommendations.trim() && (
                    <p><span className="font-bold" style={{ color: '#2d6a4f' }}>{lang === 'ru' ? 'Цель' : 'Goal'}:</span> {recommendations.trim().split('\n')[0].substring(0, 150)}</p>
                  )}
                </div>
              </div>
            )}

            <div className="h-6" />
          </div>
        </div>
      </div>

      {/* ══════════ Правая колонка ══════════ */}
      <div className={`${mobileTab === 'compare' ? 'flex' : 'hidden'} lg:flex flex-col bg-[#fafafa] min-h-0`}>

        {/* Табы */}
        <div className="px-5 py-2 border-b border-gray-100 bg-[#ede7dd] flex items-center justify-between">
          {rightTab === 'repertory' ? (
            <button
              onClick={() => setRightTab('compare')}
              className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-all flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              {lang === 'ru' ? 'Назад' : 'Back'}
            </button>
          ) : (
            <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
              {(['compare', 'prev', 'both'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                    rightTab === tab ? 'bg-[#ede7dd] text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {tab === 'compare' ? (lang === 'ru' ? 'Сравнение' : 'Compare')
                    : tab === 'prev' ? (lang === 'ru' ? 'Прошлый' : 'Previous')
                    : (lang === 'ru' ? 'Оба' : 'Both')}
                </button>
              ))}
            </div>
          )}
          {previousConsultation && rightTab !== 'repertory' && (
            <span className="text-[10px]" style={{ color: '#b0a090' }}>{formatDate(previousConsultation.date)}</span>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {rightTab === 'repertory' ? (
            <MiniRepertory
              onSelectRubric={insertRubricFromRepertory}
              onClose={() => setRightTab('compare')}
            />
          ) : !previousConsultation ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
              <p className="text-sm text-gray-400">{t(lang).consultation.firstConsultation}</p>
              <p className="text-xs text-gray-300 mt-1">{t(lang).consultation.nothingToCompare}</p>
            </div>
          ) : (
            <div>

              {/* Сравнение */}
              {(rightTab === 'compare' || rightTab === 'both') && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <ComparisonPanel
                    current={{ complaints, observations, notes, recommendations }}
                    previous={{
                      complaints: previousConsultation.complaints || '',
                      observations: previousConsultation.observations || '',
                      notes: previousConsultation.notes || '',
                      recommendations: previousConsultation.recommendations || '',
                    }}
                    currentSymptoms={symptoms}
                    previousSymptoms={previousConsultation.structured_symptoms || []}
                  />
                </div>
              )}

              {/* Прошлый приём */}
              {(rightTab === 'prev' || rightTab === 'both') && (
                <div className="px-5 py-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: '#9a8a6a' }}>
                    {t(lang).consultation.prevVisit} — {formatDate(previousConsultation.date)}
                  </p>
                  <div className="space-y-3">
                    {previousConsultation.remedy && (
                      <div className="rounded-lg p-2.5" style={{ backgroundColor: '#e8f0e8', border: '1px solid rgba(45,106,79,0.15)' }}>
                        <div className="flex items-baseline gap-2">
                          <span className="text-[15px] font-bold" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: '#1a3020' }}>
                            {previousConsultation.remedy}
                          </span>
                          <span className="text-[13px] font-semibold" style={{ color: '#2d6a4f' }}>{previousConsultation.potency}</span>
                        </div>
                        {previousConsultation.dosage && (
                          <p className="text-[11px] mt-0.5" style={{ color: '#5a5040' }}>{previousConsultation.dosage}</p>
                        )}
                      </div>
                    )}
                    {[
                      { label: lang === 'ru' ? 'Жалобы' : 'Complaints', text: previousConsultation.complaints },
                      { label: lang === 'ru' ? 'Наблюдения' : 'Observations', text: previousConsultation.observations },
                      { label: lang === 'ru' ? 'Анализ' : 'Analysis', text: previousConsultation.notes },
                      { label: lang === 'ru' ? 'План' : 'Plan', text: previousConsultation.recommendations },
                    ].filter(s => s.text?.trim()).map((section, i) => (
                      <div key={i}>
                        <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#b0a090' }}>{section.label}</p>
                        <p className="text-[12px] leading-relaxed whitespace-pre-wrap" style={{ color: '#6a6050' }}>{section.text}</p>
                      </div>
                    ))}
                    {!previousConsultation.complaints && !previousConsultation.notes && !previousConsultation.remedy && (
                      <p className="text-[12px] text-gray-300 italic">{t(lang).consultation.noNotes}</p>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
