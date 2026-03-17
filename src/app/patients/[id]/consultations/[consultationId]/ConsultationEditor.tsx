'use client'

import { useRef, useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { updateConsultationNotes, updateConsultationType, updateConsultationExtra, updateConsultationFields } from '@/lib/actions/consultations'
import { decrementPaidSession } from '@/lib/actions/payments'
import { Consultation, Patient, ConsultationType } from '@/types'
import { useToast } from '@/components/ui/toast'
import { formatDate } from '@/lib/utils'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import ComparisonPanel from './ComparisonPanel'
import TemplateMenu, { StructuredTemplate } from './TemplateMenu'
import PrescriptionModal from './PrescriptionModal'
import MiniRepertory from './MiniRepertory'

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
  const [showZeroWarning, setShowZeroWarning] = useState(false)
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'unsaved'>('saved')
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [rubrics, setRubrics] = useState(consultation.rubrics || '')
  const [reactionToPrev, setReactionToPrev] = useState(consultation.reaction_to_previous || '')
  const [showExtra, setShowExtra] = useState(
    !!(consultation.rubrics || consultation.reaction_to_previous)
  )
  const extraTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)
  const [rightTab, setRightTab] = useState<'prev' | 'compare' | 'repertory'>('compare')
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
      await updateConsultationFields(consultation.id, { complaints, observations, recommendations })
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

        {/* Тулбар: тип + шаблоны + счётчик */}
        <div className="px-5 py-2 flex items-center gap-3" style={{ borderBottom: '1px solid var(--color-border-light)', backgroundColor: 'var(--color-card)' }}>
          {/* Переключатель типа консультации */}
          <button
            type="button"
            onClick={toggleType}
            title={t(lang).consultation.changeTypeHint}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all"
            style={typeCfg.badgeStyle}
          >
            {type === 'chronic' ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            )}
            {typeCfg.label}
          </button>

          <div className="w-px h-4 bg-gray-200" />

          <TemplateMenu
            onInsertStructured={insertStructuredTemplate}
            onInsertText={insertTemplateText}
            consultationType={type}
            currentFields={{ complaints, observations, notes, recommendations }}
          />

          <div className="w-px h-4 bg-gray-200" />

          <button
            type="button"
            onClick={() => { setRightTab('repertory'); setMobileTab('compare') }}
            title="Открыть репертоий"
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
              rightTab === 'repertory'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                : 'border-gray-200 bg-[#ede7dd] text-gray-500 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            {t(lang).consultation.repertory}
          </button>

          <div className="w-px h-4 bg-gray-200" />

          <a
            href="/repertory"
            target="_blank"
            rel="noopener"
            title={lang === 'ru' ? 'Открыть полный реперторий' : 'Open full repertory'}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 bg-[#ede7dd] text-gray-500 hover:text-emerald-700 hover:border-emerald-200 hover:bg-emerald-50 transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            {lang === 'ru' ? 'Реперторий' : 'Repertory'}
            <svg className="w-3 h-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>

          <span className="text-xs text-gray-300 ml-auto">
            {wordCount > 0 ? t(lang).consultation.words(wordCount) : t(lang).consultation.emptyNote}
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

        {/* Структурированные секции приёма */}
        <div className="flex-1 overflow-y-auto bg-[#faf7f2] min-h-[60vh] lg:min-h-0">

          {/* Жалобы */}
          <div className="px-5 lg:px-7 pt-4 pb-2">
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9a8a6a' }}>
              {lang === 'ru' ? 'Жалобы' : 'Complaints'}
            </label>
            <textarea
              data-autoresize
              value={complaints}
              onChange={e => handleFieldChange('complaints', e.target.value)}
              onInput={e => autoResize(e.currentTarget)}
              autoFocus
              placeholder={lang === 'ru' ? 'Что беспокоит пациента...' : 'Patient complaints...'}
              rows={2}
              className="w-full text-[13.5px] text-gray-800 leading-[1.75] resize-none focus:outline-none bg-white border border-gray-200 rounded-lg px-3 py-2 placeholder-gray-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 transition-all"
              style={{ minHeight: '56px', overflow: 'hidden' }}
            />
          </div>

          {/* Наблюдения */}
          <div className="px-5 lg:px-7 py-2">
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9a8a6a' }}>
              {lang === 'ru' ? 'Наблюдения' : 'Observations'}
            </label>
            <textarea
              data-autoresize
              value={observations}
              onChange={e => handleFieldChange('observations', e.target.value)}
              onInput={e => autoResize(e.currentTarget)}
              placeholder={lang === 'ru' ? 'Ощущения, модальности, общие симптомы...' : 'Sensations, modalities, general symptoms...'}
              rows={2}
              className="w-full text-[13.5px] text-gray-800 leading-[1.75] resize-none focus:outline-none bg-white border border-gray-200 rounded-lg px-3 py-2 placeholder-gray-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 transition-all"
              style={{ minHeight: '56px', overflow: 'hidden' }}
            />
          </div>

          {/* Заметки (свободная форма — обратная совместимость) */}
          <div className="px-5 lg:px-7 py-2">
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9a8a6a' }}>
              {lang === 'ru' ? 'Заметки' : 'Notes'}
            </label>
            <textarea
              data-autoresize
              ref={textareaRef}
              value={notes}
              onChange={e => handleChange(e.target.value)}
              onInput={e => autoResize(e.currentTarget)}
              placeholder={
                type === 'acute'
                  ? t(lang).consultation.acutePlaceholder
                  : t(lang).consultation.chronicPlaceholder
              }
              rows={3}
              className="w-full text-[13.5px] text-gray-800 leading-[1.75] resize-none focus:outline-none bg-white border border-gray-200 rounded-lg px-3 py-2 placeholder-gray-300 font-mono focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 transition-all"
              style={{ minHeight: '80px', overflow: 'hidden' }}
            />
          </div>

          {/* Рекомендации */}
          <div className="px-5 lg:px-7 pt-2 pb-4">
            <label className="block text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: '#9a8a6a' }}>
              {lang === 'ru' ? 'Рекомендации' : 'Recommendations'}
            </label>
            <textarea
              data-autoresize
              value={recommendations}
              onChange={e => handleFieldChange('recommendations', e.target.value)}
              onInput={e => autoResize(e.currentTarget)}
              placeholder={lang === 'ru' ? 'Диета, режим, повторный приём...' : 'Diet, regimen, follow-up...'}
              rows={2}
              className="w-full text-[13.5px] text-gray-800 leading-[1.75] resize-none focus:outline-none bg-white border border-gray-200 rounded-lg px-3 py-2 placeholder-gray-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 transition-all"
              style={{ minHeight: '56px', overflow: 'hidden' }}
            />
          </div>

        </div>
      </div>

      {/* ══════════ Правая колонка ══════════ */}
      <div className={`${mobileTab === 'compare' ? 'flex' : 'hidden'} lg:flex flex-col bg-[#fafafa] min-h-0`}>
        <div className="px-5 py-2.5 border-b border-gray-100 bg-[#ede7dd] flex items-center justify-between">
          <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setRightTab('compare')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                rightTab === 'compare' ? 'bg-[#ede7dd] text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t(lang).consultation.comparison}
            </button>
            <button
              onClick={() => setRightTab('prev')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                rightTab === 'prev' ? 'bg-[#ede7dd] text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {t(lang).consultation.prevVisit}
            </button>
            <button
              onClick={() => setRightTab('repertory')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                rightTab === 'repertory' ? 'bg-[#ede7dd] text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
              </svg>
              {t(lang).consultation.repertory}
            </button>
          </div>
          {previousConsultation && rightTab !== 'repertory' && (
            <p className="text-xs text-gray-400">{formatDate(previousConsultation.date)}</p>
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
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </div>
              <p className="text-sm text-gray-400">{t(lang).consultation.firstConsultation}</p>
              <p className="text-xs text-gray-300 mt-1">{t(lang).consultation.nothingToCompare}</p>
            </div>
          ) : rightTab === 'compare' ? (
            <ComparisonPanel
              current={{ complaints, observations, notes, recommendations }}
              previous={{
                complaints: previousConsultation.complaints || '',
                observations: previousConsultation.observations || '',
                notes: previousConsultation.notes || '',
                recommendations: previousConsultation.recommendations || '',
              }}
            />
          ) : (
            <div className="px-6 py-5">
              {previousConsultation.notes ? (
                <pre className="text-sm text-gray-500 leading-relaxed whitespace-pre-wrap font-mono">
                  {previousConsultation.notes}
                </pre>
              ) : (
                <p className="text-sm text-gray-300 italic">{t(lang).consultation.noNotes}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}
