'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { decrementPaidSession } from '@/lib/actions/payments'
import { completeConsultation } from '@/lib/actions/consultations'
import { Consultation, Patient, PreVisitSurvey } from '@/types'
import { useToast } from '@/components/ui/toast'
import { t } from '@/lib/shared/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import { ConsultationProvider, useConsultation } from './context/ConsultationContext'
import EditorHeader from './components/EditorHeader'
import EditorToolbar from './components/EditorToolbar'
import ComplaintsForm from './components/ComplaintsForm'
import InlineRx from './components/InlineRx'
import PrescriptionModal from './PrescriptionModal'
import { createFollowup } from '@/lib/actions/followups'
import RightPanel from './right-panel/RightPanel'
import SharePrescriptionButton from './SharePrescriptionButton'
import DynamicsBlock from './components/DynamicsBlock'
import FirstTimeHint from '@/components/FirstTimeHint'

const MiniRepertory = dynamic(() => import('./MiniRepertory'), { ssr: false })

type Props = {
  consultation: Consultation
  patient: Patient
  previousConsultation: Consultation | null
  paidSessionsEnabled: boolean
  visitNumber: number
  preVisitSurvey?: PreVisitSurvey | null
  primaryIntakeAnswers?: Record<string, unknown> | null
  showAI?: boolean
}

export default function ConsultationEditor({ consultation, patient, previousConsultation, paidSessionsEnabled, visitNumber, preVisitSurvey, primaryIntakeAnswers, showAI = true }: Props) {
  return (
    <ConsultationProvider consultation={consultation} patient={patient} previousConsultation={previousConsultation}>
      <EditorInner paidSessionsEnabled={paidSessionsEnabled} visitNumber={visitNumber} preVisitSurvey={preVisitSurvey} primaryIntakeAnswers={primaryIntakeAnswers} showAI={showAI} />
    </ConsultationProvider>
  )
}

function EditorInner({ paidSessionsEnabled, visitNumber, preVisitSurvey, primaryIntakeAnswers, showAI = true }: { paidSessionsEnabled: boolean; visitNumber: number; preVisitSurvey?: PreVisitSurvey | null; primaryIntakeAnswers?: Record<string, unknown> | null; showAI?: boolean }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { lang } = useLanguage()
  const { state, updateField, saveAll, consultation, patient, previousConsultation, dispatch } = useConsultation()

  const [showPrescription, setShowPrescription] = useState(false)
  const [showZeroWarning, setShowZeroWarning] = useState(false)
  const [showSharePrompt, setShowSharePrompt] = useState(false)
  const [followupCreated, setFollowupCreated] = useState(false)
  const [followupToken, setFollowupToken] = useState('')
  const [pendingPrescription, setPendingPrescription] = useState<{ abbrev: string; potency: string; dosage: string } | null>(null)
  const [mobileTab, setMobileTab] = useState<'editor' | 'context'>('editor')
  const [repertoryData, setRepertoryData] = useState(consultation.repertory_data)
  const [repertoryAssignedRemedy, setRepertoryAssignedRemedy] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCompleted, setIsCompleted] = useState(consultation.status === 'completed')
  const [savedRx, setSavedRx] = useState<{ remedy: string; potency: string; dosage: string } | null>(
    consultation.remedy ? { remedy: consultation.remedy, potency: consultation.potency || '', dosage: consultation.dosage || '' } : null
  )
  const [aiLoading, setAILoading] = useState(false)
  const [aiResult, setAIResult] = useState<import('@/lib/mdri/types').ConsensusResult | null>(
    consultation.ai_result as import('@/lib/mdri/types').ConsensusResult | null
  )
  const [suggestions, setSuggestions] = useState<import('@/lib/mdri/types').ParseSuggestionsResult | null>(null)
  const [analyzingConfirmed, setAnalyzingConfirmed] = useState(false)
  // Differential clarify flow
  const [clarifyQuestions, setClarifyQuestions] = useState<import('@/lib/mdri/differential').DifferentialQuestion[]>([])
  const [clarifyLoading, setClarifyLoading] = useState(false)
  const [clarifyUsed, setClarifyUsed] = useState(false)
  const [lastConfirmed, setLastConfirmed] = useState<import('@/lib/mdri/types').ParsedSuggestion[]>([])
  const [lastFamilyHistory, setLastFamilyHistory] = useState<string[]>([])
  const [clarifyMeta, setClarifyMeta] = useState<{ aiUsed: boolean; fallbackUsed: boolean; validCount: number }>({ aiUsed: false, fallbackUsed: false, validCount: 0 })

  useEffect(() => {
    localStorage.setItem('hc-last-consultation', window.location.pathname)
  }, [])

  useEffect(() => {
    const rx = searchParams.get('rx')
    const potency = searchParams.get('potency') ?? ''
    const dosage = searchParams.get('dosage') ?? ''
    if (rx) {
      setPendingPrescription({ abbrev: rx, potency, dosage })
      setShowPrescription(true)
      const url = new URL(window.location.href)
      url.searchParams.delete('rx')
      url.searchParams.delete('potency')
      url.searchParams.delete('dosage')
      window.history.replaceState({}, '', url.pathname)
    }
  }, [searchParams])

  async function handleRunAI() {
    // Собрать текст из всех полей консультации
    const parts = [
      state.complaints && `Жалобы: ${state.complaints}`,
      state.modalityWorseText && `Хуже от: ${state.modalityWorseText}`,
      state.modalityBetterText && `Лучше от: ${state.modalityBetterText}`,
      state.mentalText && `Психика: ${state.mentalText}`,
      state.generalText && `Общее: ${state.generalText}`,
      state.observations && `Наблюдения: ${state.observations}`,
      state.notes && `Заметки: ${state.notes}`,
    ].filter(Boolean)

    if (parts.length === 0) {
      toast(lang === 'ru' ? 'Заполните жалобы для AI-анализа' : 'Fill in complaints for AI analysis', 'error')
      return
    }

    setAILoading(true)
    setSuggestions(null)
    setAIResult(null)
    try {
      await saveAll()
      // Шаг 1: парсинг → suggestions
      const { parseAndSuggest } = await import('@/lib/actions/ai-consultation')
      const result = await parseAndSuggest({ text: parts.join('\n') })
      setSuggestions(result)
      setAILoading(false)
      toast(lang === 'ru'
        ? `Распознано ${result.suggestions.length} симптомов — проверьте`
        : `Found ${result.suggestions.length} symptoms — review`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : ''
      if (msg === 'NO_AI_ACCESS') {
        toast(lang === 'ru' ? 'Нет доступа к AI. Оформите подписку AI Pro или купите пакет.' : 'No AI access. Subscribe to AI Pro or buy a package.', 'error')
      } else {
        toast(lang === 'ru' ? 'Ошибка AI-анализа' : 'AI analysis error', 'error')
      }
      setAILoading(false)
    }
  }

  // Шаг 2: анализ с подтверждёнными symptoms
  async function handleConfirmSuggestions(
    confirmed: import('@/lib/mdri/types').ParsedSuggestion[],
    familyHistory: string[],
  ) {
    setAnalyzingConfirmed(true)
    setLastConfirmed(confirmed)
    setLastFamilyHistory(familyHistory)
    try {
      const { analyzeConfirmed, generateDifferentialClarifying } = await import('@/lib/actions/ai-consultation')
      const result = await analyzeConfirmed({
        consultationId: consultation.id,
        suggestions: confirmed,
        familyHistory,
      })
      setAIResult(result)
      setSuggestions(null)

      // Проверяем нужен ли clarify (максимум 1 раз)
      if (!clarifyUsed && result.productConfidence && (result.productConfidence.level === 'clarify' || result.productConfidence.showDiff)) {
        try {
          const confirmedSymptoms = confirmed.filter(s => s.confirmed && s.type !== 'modality').map(s => ({
            rubric: s.rubric, category: (s.type === 'mental' ? 'mental' : s.type === 'general' ? 'general' : 'particular') as import('@/lib/mdri/types').MDRISymptomCategory,
            present: true, weight: s.weight as 1 | 2 | 3,
          }))
          const confirmedModalities = confirmed.filter(s => s.confirmed && s.type === 'modality').map(s => {
            const [pairId, value] = s.rubric.split(':')
            return { pairId, value: value as 'agg' | 'amel' }
          })
          const { generateDifferentialClarifying } = await import('@/lib/actions/ai-consultation')
          const clarifyResult = await generateDifferentialClarifying({
            results: result.mdriResults,
            symptoms: confirmedSymptoms,
            modalities: confirmedModalities,
            clarifyUsed,
          })
          if (clarifyResult.questions.length > 0) {
            setClarifyQuestions(clarifyResult.questions)
            setClarifyMeta({
              aiUsed: clarifyResult.aiGenerated,
              fallbackUsed: !clarifyResult.aiGenerated,
              validCount: clarifyResult.validCount,
            })
          }
        } catch { /* clarify не критичен */ }
      }

      toast(lang === 'ru'
        ? `AI: ${result.finalRemedy.toUpperCase()}`
        : `AI: ${result.finalRemedy.toUpperCase()}`)
    } catch {
      toast(lang === 'ru' ? 'Ошибка анализа' : 'Analysis error', 'error')
    } finally {
      setAnalyzingConfirmed(false)
    }
  }

  // Обработка ответов на clarify вопросы → rerun engine (максимум 1 раз)
  async function handleClarifySubmit(answers: Record<string, string>) {
    setClarifyLoading(true)
    try {
      const { rerunWithClarifications } = await import('@/lib/actions/ai-consultation')
      const result = await rerunWithClarifications({
        consultationId: consultation.id,
        originalSuggestions: lastConfirmed,
        familyHistory: lastFamilyHistory,
        clarifyAnswers: answers,
        clarifyQuestions: clarifyQuestions,
        // Before state для измерения эффективности
        beforeResults: aiResult?.mdriResults,
        beforeConfidence: aiResult?.productConfidence?.level,
        beforeConflict: undefined, // conflict level не хранится в ConsensusResult
        clarifyMeta,
      })
      setAIResult(result)
      setClarifyQuestions([])
      setClarifyUsed(true) // Блокируем повторный clarify
      toast(lang === 'ru'
        ? `AI (уточнено): ${result.finalRemedy.toUpperCase()}`
        : `AI (clarified): ${result.finalRemedy.toUpperCase()}`)
    } catch {
      toast(lang === 'ru' ? 'Ошибка пересчёта' : 'Rerun error', 'error')
    } finally {
      setClarifyLoading(false)
    }
  }

  function handleClarifySkip() {
    setClarifyQuestions([])
  }

  async function doFinish() {
    const hasContent = state.complaints.trim() || state.modalityWorseText.trim() ||
      state.modalityBetterText.trim() || state.mentalText.trim() || state.generalText.trim() ||
      state.observations.trim() || state.notes.trim() || state.recommendations.trim()
    if (!hasContent) {
      toast(lang === 'ru'
        ? 'Заполните хотя бы одно поле перед завершением'
        : 'Fill in at least one field before finishing', 'error')
      return
    }

    await saveAll()
    // Подождать чтобы InlineRx autosave успел отработать
    await new Promise(r => setTimeout(r, 500))

    // Проверяем препарат из state или из начальных данных
    const hasRemedy = savedRx?.remedy || consultation.remedy
    if (hasRemedy) {
      await handleConsultationDone()
      setShowSharePrompt(true)
      return
    }

    setShowPrescription(true)
  }

  async function handleFinish() {
    if (isSubmitting) return
    if (paidSessionsEnabled && (patient.paid_sessions ?? 0) === 0) {
      setShowZeroWarning(true)
      return
    }
    setIsSubmitting(true)
    try {
      await doFinish()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleConsultationDone() {
    setPendingPrescription(null)
    await completeConsultation(consultation.id)
    if (paidSessionsEnabled) {
      const { prevCount, newCount } = await decrementPaidSession(patient.id)
      if (prevCount === 1) toast(t(lang).consultation.savedPaymentDone)
      else if (prevCount > 1) toast(t(lang).consultation.savedRemaining(newCount))
    }
    setIsCompleted(true)
  }

  function handleOpenRepertory() {
    dispatch({ type: 'SET_FIELD', field: 'showRepertory', value: true })
    setMobileTab('context')
  }

  const [miniTutorialPending, setMiniTutorialPending] = useState(false)

  function handleStartMiniTour() {
    handleOpenRepertory()
    setMiniTutorialPending(true)
  }

  function handleCloseRepertory() {
    dispatch({ type: 'SET_FIELD', field: 'showRepertory', value: false })
  }

  // Ctrl+Enter → finish
  const handleFinishRef = useRef(handleFinish)
  handleFinishRef.current = handleFinish

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        handleFinishRef.current()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  // Предупреждение при закрытии вкладки с несохранёнными данными
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (state.saveState === 'unsaved') {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [state.saveState])

  // Финальный экран после завершения консультации
  // Если консультация завершена И есть назначение — показать финальный экран
  // Если завершена но БЕЗ назначения — показать редактор (чтобы можно было выписать)
  if (isCompleted && !consultation.status?.startsWith('in') && consultation.remedy) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: 'rgba(45,106,79,0.08)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--sim-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-[28px] font-light mb-1" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: 'var(--sim-text)' }}>
            {lang === 'ru' ? 'Приём завершён' : 'Consultation completed'}
          </h2>
          {savedRx?.remedy && (
            <p className="text-sm mb-8" style={{ color: 'var(--sim-text-muted)' }}>
              {savedRx.remedy} {savedRx.potency}
            </p>
          )}

          <div className="space-y-2.5">
            {savedRx?.remedy && (
              <SharePrescriptionButton consultationId={consultation.id} />
            )}
            <button
              onClick={() => router.push(`/patients/${consultation.patient_id}`)}
              className="w-full px-5 py-3 rounded-xl text-sm font-medium transition-all duration-200 hover:bg-black/3"
              style={{ border: '1px solid var(--sim-border)', color: 'var(--sim-text)' }}
            >
              {lang === 'ru' ? 'К пациенту' : 'Back to patient'}
            </button>
            {patient.is_demo && (
              <button
                onClick={() => router.push('/patients/new')}
                className="btn btn-primary w-full py-3"
              >
                {lang === 'ru' ? 'Добавить своего пациента →' : 'Add your patient →'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>

      {/* Zero sessions warning */}
      {showZeroWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-label={lang === 'ru' ? 'Предупреждение об оплате' : 'Payment warning'}>
          <div className="relative rounded-xl p-6 w-[calc(100%-2rem)] max-w-[340px] shadow-2xl" style={{ backgroundColor: 'var(--sim-bg)', border: '1px solid #c8a035' }}>
            <div className="flex items-start gap-3 mb-4">
              <svg className="w-5 h-5 shrink-0 mt-0.5" style={{ color: 'var(--sim-amber)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
              <div>
                <p className="text-[15px] font-semibold" style={{ color: 'var(--sim-text)' }}>{t(lang).consultation.noPayment}</p>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--sim-text-sec)' }}>{t(lang).consultation.noPaymentDesc}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowZeroWarning(false); doFinish() }} className="btn btn-primary flex-1">{t(lang).consultation.save}</button>
              <button onClick={() => setShowZeroWarning(false)} className="btn btn-ghost">{t(lang).consultation.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* Prescription modal */}
      {showPrescription && (
        <PrescriptionModal
          consultationId={consultation.id}
          onSkip={async () => { await handleConsultationDone(); window.location.href = `/patients/${patient.id}` }}
          onSaved={async () => { await handleConsultationDone(); setShowPrescription(false); setShowSharePrompt(true) }}
          initialRemedy={pendingPrescription?.abbrev ?? savedRx?.remedy}
          initialPotency={pendingPrescription?.potency ?? savedRx?.potency}
          initialDosage={pendingPrescription?.dosage ?? savedRx?.dosage}
        />
      )}

      {/* Приём завершён + follow-up напоминание */}
      {showSharePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true">
          <div className="relative rounded-2xl p-6 w-[calc(100%-2rem)] max-w-[420px] shadow-2xl" style={{ backgroundColor: 'var(--sim-bg)', border: '1px solid var(--sim-border)' }}>
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: 'rgba(45,106,79,0.08)' }}>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="var(--sim-green)" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-[17px] font-medium mb-1" style={{ color: 'var(--sim-text)' }}>
                {lang === 'ru' ? 'Приём завершён' : 'Consultation done'}
              </p>
              <p className="text-[14px]" style={{ color: 'var(--sim-text-muted)' }}>
                {savedRx?.remedy || consultation.remedy}{' '}
                {savedRx?.potency || consultation.potency}
              </p>
            </div>

            {/* Follow-up напоминание */}
            {!followupCreated ? (
              <div className="mb-5 rounded-xl p-4" style={{ backgroundColor: 'rgba(200,160,53,0.06)', border: '1px solid rgba(200,160,53,0.15)' }}>
                <p className="text-[13px] font-medium text-[#92780a] mb-3">
                  {lang === 'ru' ? 'Создать опросник самочувствия?' : 'Create follow-up survey?'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { days: 7, ru: '7 дней', en: '7 days' },
                    { days: 14, ru: '14 дней', en: '14 days' },
                    { days: 21, ru: '21 день', en: '21 days' },
                    { days: 30, ru: '30 дней', en: '30 days' },
                  ].map(opt => (
                    <button
                      key={opt.days}
                      onClick={async () => {
                        try {
                          const result = await createFollowup(consultation.id, patient.id)
                          setFollowupToken(result.token)
                          setFollowupCreated(true)
                          toast(lang === 'ru' ? `Опросник создан (через ${opt.days} дн.)` : `Survey created (in ${opt.days} days)`)
                        } catch { /* silent */ }
                      }}
                      className="text-[13px] font-medium px-4 py-2 rounded-full bg-white text-[#1a1a1a] border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#c8a035]/30 hover:shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                    >
                      {lang === 'ru' ? opt.ru : opt.en}
                    </button>
                  ))}
                  <button
                    onClick={() => setFollowupCreated(true)}
                    className="text-[12px] px-3 py-2 rounded-full text-[#6b7280] hover:underline"
                  >
                    {lang === 'ru' ? 'Не нужно' : 'Skip'}
                  </button>
                </div>
              </div>
            ) : followupToken ? (
              <div className="mb-5 rounded-xl p-4" style={{ backgroundColor: 'rgba(45,106,79,0.04)', border: '1px solid rgba(45,106,79,0.12)' }}>
                <p className="text-[12px] text-[#2d6a4f] mb-2">
                  {lang === 'ru' ? 'Опросник создан. Отправьте ссылку пациенту:' : 'Survey created. Send the link:'}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/followup/${followupToken}`}
                    className="flex-1 text-[12px] px-3 py-2 rounded-lg bg-white border border-gray-200 text-[#1a1a1a]"
                    onFocus={e => e.target.select()}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/followup/${followupToken}`)
                      toast(lang === 'ru' ? 'Ссылка скопирована' : 'Link copied')
                    }}
                    className="text-[12px] px-3 py-2 rounded-lg bg-[#2d6a4f] text-white font-medium shrink-0"
                  >
                    {lang === 'ru' ? 'Копировать' : 'Copy'}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <Link
                href={`/patients/${patient.id}`}
                className="block w-full text-center py-3 rounded-full text-[14px] font-medium text-white transition-all hover:-translate-y-px hover:shadow-lg"
                style={{ backgroundColor: 'var(--sim-green)' }}
              >
                {lang === 'ru' ? 'Перейти в карточку пациента' : 'Go to patient card'}
              </Link>
              <button
                onClick={() => setShowSharePrompt(false)}
                className="w-full text-center py-3 rounded-full text-[14px] font-medium transition-colors"
                style={{ color: 'var(--sim-text-muted)' }}
              >
                {lang === 'ru' ? 'Остаться в консультации' : 'Stay in consultation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sticky finish — всегда доступна кнопка завершения */}
      {!isCompleted && mobileTab === 'editor' && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-20 px-4 py-2.5" style={{ backgroundColor: 'rgba(247,243,237,0.95)', backdropFilter: 'blur(8px)', borderTop: '1px solid var(--sim-border)', paddingBottom: 'calc(0.625rem + env(safe-area-inset-bottom, 0px))' }}>
          <button
            onClick={handleFinish}
            disabled={isSubmitting}
            className="btn btn-primary w-full py-3 rounded-xl text-[14px] font-medium disabled:opacity-60"
          >
            {isSubmitting ? (lang === 'ru' ? 'Сохраняю...' : 'Saving...') : t(lang).consultation.finish}
          </button>
        </div>
      )}

      {/* Mobile tab bar — sticky, крупнее для 50+ */}
      <div className="lg:hidden flex shrink-0 sticky top-0 z-10" style={{ borderBottom: '1px solid var(--sim-border-light)', backgroundColor: 'rgba(242,236,228,0.95)', backdropFilter: 'blur(8px)' }}>
        <button
          onClick={() => setMobileTab('editor')}
          className="flex-1 py-3.5 text-[14px] font-semibold transition-colors border-b-2"
          style={{ color: mobileTab === 'editor' ? '#1a1a1a' : '#6b7280', borderColor: mobileTab === 'editor' ? '#2d6a4f' : 'transparent' }}
        >
          {t(lang).consultation.editor}
        </button>
        <button
          onClick={() => setMobileTab('context')}
          className="flex-1 py-3.5 text-[14px] font-semibold transition-colors border-b-2 relative"
          style={{ color: mobileTab === 'context' ? '#1a1a1a' : '#6b7280', borderColor: mobileTab === 'context' ? '#2d6a4f' : 'transparent' }}
        >
          {state.showRepertory
            ? (lang === 'ru' ? 'Реперторий' : 'Repertory')
            : (lang === 'ru' ? 'Контекст' : 'Context')
          }
          {mobileTab !== 'context' && (aiResult || preVisitSurvey || previousConsultation) && (
            <span className="absolute top-2.5 right-[calc(50%-28px)] w-2 h-2 rounded-full bg-[#2d6a4f]" />
          )}
        </button>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-0 flex-1 lg:h-[calc(100dvh-54px)]">

        {/* ══ Left: editor ══ */}
        <div className={`${mobileTab === 'editor' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0`} style={{ borderRight: '1px solid var(--sim-border-light)' }}>

          <EditorHeader visitNumber={visitNumber} />
          <EditorToolbar onOpenRepertory={handleOpenRepertory} onRunAI={showAI ? handleRunAI : undefined} aiLoading={aiLoading} hasAIResult={!!aiResult} />

          {/* Подсказка — скрыта на мобиле */}
          <div className="hidden sm:block px-4">
            <FirstTimeHint id="consultation">
              {lang === 'ru'
                ? <>Запишите жалобы пациента. Раскройте «Модальности, психика» для подробностей. Реперторий — кнопка справа. Назначение — внизу.</>
                : <>Record patient complaints. Expand "Modalities, mentals" for details. Repertory — button on the right. Prescription — below.</>}
            </FirstTimeHint>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto min-h-[60vh] lg:min-h-0" style={{ backgroundColor: 'var(--sim-bg, #faf8f5)' }}>
            <div className="px-3 sm:px-5 lg:px-7 py-4 pb-20 lg:pb-5 space-y-4 sm:space-y-5">

              {/* Dynamics from previous visit */}
              {previousConsultation && (
                <DynamicsBlock
                  consultationId={consultation.id}
                  initial={consultation.doctor_dynamics ?? null}
                  lang={lang}
                />
              )}

              {/* Жалобы — основная графа */}
              <ComplaintsForm autoFocus />

              {/* Prescription — collapsible на мобиле */}
              <div className="sm:contents">
                <details className="sm:hidden group" open={!!consultation.remedy}>
                  <summary className="flex items-center gap-2 cursor-pointer select-none py-2 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: '#2d6a4f' }}>
                    <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    {lang === 'ru' ? 'Назначение' : 'Prescription'}
                    {savedRx?.remedy && (
                      <span className="text-[12px] font-normal normal-case tracking-normal text-[#6b7280] ml-1">
                        — {savedRx.remedy}
                      </span>
                    )}
                  </summary>
                  <div className="pt-1">
                    <InlineRx
                      consultationId={consultation.id}
                      onSaved={(remedy, potency, dosage) => setSavedRx({ remedy, potency, dosage })}
                      assignedRemedy={repertoryAssignedRemedy}
                      initialRemedy={consultation.remedy}
                      initialPotency={consultation.potency}
                      initialDosage={consultation.dosage}
                      initialPellets={consultation.pellets}
                    />
                  </div>
                </details>
                <div className="hidden sm:block">
                  <InlineRx
                    consultationId={consultation.id}
                    onSaved={(remedy, potency, dosage) => setSavedRx({ remedy, potency, dosage })}
                    assignedRemedy={repertoryAssignedRemedy}
                    initialRemedy={consultation.remedy}
                    initialPotency={consultation.potency}
                    initialDosage={consultation.dosage}
                    initialPellets={consultation.pellets}
                  />
                </div>
              </div>

              {/* Заметки и план (объединение notes + recommendations) */}
              <section>
                <label className="block mb-2 text-[13px] font-semibold uppercase tracking-[0.06em]" style={{ color: 'var(--sim-text-muted)' }}>
                  {lang === 'ru' ? 'Заметки и план' : 'Notes & plan'}
                </label>
                <textarea
                  value={state.notes}
                  onChange={e => updateField('notes', e.target.value)}
                  placeholder={lang === 'ru'
                    ? 'DD: Sulphur vs Lycopodium · Контроль через 4 нед · Наблюдения...'
                    : 'DD: Sulphur vs Lycopodium · Follow-up in 4 weeks · Observations...'}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border transition-all duration-200 focus:outline-none text-[15px] resize-none leading-relaxed"
                  style={{ backgroundColor: 'var(--sim-bg-card)', borderColor: 'var(--sim-border)', color: 'var(--sim-text)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--sim-green)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,106,79,0.08)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--sim-border)'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </section>

              <div className="h-2" />
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 px-5 lg:px-7 py-3 flex items-center gap-3" style={{ borderTop: '1px solid var(--sim-border)', backgroundColor: 'var(--sim-bg, #faf8f5)' }}>
            <button
              data-tour="finish-btn"
              onClick={handleFinish}
              disabled={isSubmitting}
              className="btn btn-primary btn-lg flex-1 disabled:opacity-60"
            >
              {isSubmitting ? (lang === 'ru' ? 'Сохраняю...' : 'Saving...') : t(lang).consultation.finish}
              {!isSubmitting && <span className="hidden sm:inline ml-2 opacity-50 text-xs font-normal">Ctrl+Enter</span>}
            </button>
            <div className="text-xs shrink-0">
              {state.saveState === 'saved' && (
                <span className="flex items-center gap-1" style={{ color: 'var(--sim-green)' }}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  {t(lang).consultation.save}
                </span>
              )}
              {state.saveState === 'saving' && <span className="animate-pulse" style={{ color: 'var(--sim-text-hint)' }}>{t(lang).consultation.saving}</span>}
              {state.saveState === 'unsaved' && (
                <span className="flex items-center gap-1" style={{ color: 'var(--sim-amber)' }}>
                  <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: 'var(--sim-amber)' }} />
                  {t(lang).consultation.unsaved}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ══ Right: context ══ */}
        <div className={`${mobileTab === 'context' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0`} style={{ backgroundColor: 'var(--sim-bg)' }}>
          {state.showRepertory ? (
            <div className="flex flex-col h-full">
              <div className="px-5 py-2" style={{ borderBottom: '1px solid var(--sim-border-light)', backgroundColor: 'var(--sim-bg-muted)' }}>
                <button onClick={handleCloseRepertory} className="btn btn-ghost btn-sm flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                  {lang === 'ru' ? 'Назад' : 'Back'}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <MiniRepertory
                  consultationId={consultation.id}
                  initialRepertoryData={repertoryData}
                  onRepertoryDataChange={setRepertoryData}
                  initialQuery={patient.constitutional_type || ''}
                  onSelectRubric={(rubric: string) => {
                    const current = state.rubrics
                    const sep = current.trim() ? ';\n' : ''
                    updateField('rubrics', current + sep + rubric)
                  }}
                  onClose={handleCloseRepertory}
                  onAssignRemedy={(abbrev: string) => {
                    setRepertoryAssignedRemedy(abbrev)
                    handleCloseRepertory()
                    setMobileTab('editor')
                  }}
                  startTutorial={miniTutorialPending}
                  onTutorialStarted={() => setMiniTutorialPending(false)}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto" data-tour="right-panel">
              <RightPanel
                previousConsultation={previousConsultation}
                patient={patient}
                lang={lang}
                preVisitSurvey={preVisitSurvey}
                primaryIntakeAnswers={primaryIntakeAnswers}
                aiResult={aiResult}
                suggestions={suggestions}
                onConfirmSuggestions={handleConfirmSuggestions}
                onCancelSuggestions={() => setSuggestions(null)}
                analyzingConfirmed={analyzingConfirmed}
                clarifyQuestions={clarifyQuestions}
                onClarifySubmit={handleClarifySubmit}
                onClarifySkip={handleClarifySkip}
                clarifyLoading={clarifyLoading}
                onAssignRemedy={(abbrev) => {
                  setRepertoryAssignedRemedy(abbrev)
                  setPendingPrescription({ abbrev, potency: '30C', dosage: '' })
                  setShowPrescription(true)
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
