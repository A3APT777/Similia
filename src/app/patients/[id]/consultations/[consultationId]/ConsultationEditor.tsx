'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter, useSearchParams } from 'next/navigation'
import { decrementPaidSession } from '@/lib/actions/payments'
import { completeConsultation } from '@/lib/actions/consultations'
import { Consultation, Patient } from '@/types'
import { useToast } from '@/components/ui/toast'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import { ConsultationProvider, useConsultation } from './context/ConsultationContext'
import EditorHeader from './components/EditorHeader'
import EditorToolbar from './components/EditorToolbar'
import ComplaintsForm from './components/ComplaintsForm'
import InlineRx from './components/InlineRx'
import PrescriptionModal from './PrescriptionModal'
import RightPanel from './right-panel/RightPanel'
import TourConsultStarter from '@/components/TourConsultStarter'
import DynamicsBlock from './components/DynamicsBlock'
import FirstTimeHint from '@/components/FirstTimeHint'

const MiniRepertory = dynamic(() => import('./MiniRepertory'), { ssr: false })

type Props = {
  consultation: Consultation
  patient: Patient
  previousConsultation: Consultation | null
  paidSessionsEnabled: boolean
  visitNumber: number
}

export default function ConsultationEditor({ consultation, patient, previousConsultation, paidSessionsEnabled, visitNumber }: Props) {
  return (
    <ConsultationProvider consultation={consultation} patient={patient} previousConsultation={previousConsultation}>
      <EditorInner paidSessionsEnabled={paidSessionsEnabled} visitNumber={visitNumber} />
    </ConsultationProvider>
  )
}

function EditorInner({ paidSessionsEnabled, visitNumber }: { paidSessionsEnabled: boolean; visitNumber: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { lang } = useLanguage()
  const { state, updateField, saveAll, consultation, patient, previousConsultation, dispatch } = useConsultation()

  const [showPrescription, setShowPrescription] = useState(false)
  const [showZeroWarning, setShowZeroWarning] = useState(false)
  const [pendingPrescription, setPendingPrescription] = useState<{ abbrev: string; potency: string; dosage: string } | null>(null)
  const [mobileTab, setMobileTab] = useState<'editor' | 'context'>('editor')
  const [repertoryData, setRepertoryData] = useState(consultation.repertory_data)
  const [repertoryAssignedRemedy, setRepertoryAssignedRemedy] = useState<string | undefined>()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savedRx, setSavedRx] = useState<{ remedy: string; potency: string; dosage: string } | null>(
    consultation.remedy ? { remedy: consultation.remedy, potency: consultation.potency || '', dosage: consultation.dosage || '' } : null
  )

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

    // Если препарат уже назначен — завершаем без модала
    if (savedRx?.remedy) {
      toast(lang === 'ru'
        ? `Приём завершён · ${savedRx.remedy}${savedRx.potency ? ' ' + savedRx.potency : ''} назначен`
        : `Consultation done · ${savedRx.remedy}${savedRx.potency ? ' ' + savedRx.potency : ''} prescribed`)
      await handleConsultationDone()
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
      else toast(lang === 'ru' ? 'Консультация завершена' : 'Consultation completed', 'success')
    } else {
      toast(lang === 'ru' ? 'Консультация завершена' : 'Consultation completed', 'success')
    }
    router.push(`/patients/${consultation.patient_id}`)
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

  return (
    <>
      <TourConsultStarter />

      {/* Zero sessions warning */}
      {showZeroWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" role="dialog" aria-modal="true" aria-label={lang === 'ru' ? 'Предупреждение об оплате' : 'Payment warning'}>
          <div className="relative rounded-2xl p-6 w-[calc(100%-2rem)] max-w-[340px] shadow-2xl" style={{ backgroundColor: '#f7f3ed', border: '1px solid #c8a035' }}>
            <div className="flex items-start gap-3 mb-4">
              <svg className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#c8a035' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
              <div>
                <p className="text-[15px] font-semibold" style={{ color: '#1a1a0a' }}>{t(lang).consultation.noPayment}</p>
                <p className="text-sm mt-1 leading-relaxed" style={{ color: '#5a5040' }}>{t(lang).consultation.noPaymentDesc}</p>
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
          onSkip={handleConsultationDone}
          onSaved={handleConsultationDone}
          initialRemedy={pendingPrescription?.abbrev ?? savedRx?.remedy}
          initialPotency={pendingPrescription?.potency ?? savedRx?.potency}
          initialDosage={pendingPrescription?.dosage ?? savedRx?.dosage}
        />
      )}

      {/* Mobile tab bar */}
      <div className="lg:hidden flex shrink-0" style={{ borderBottom: '1px solid var(--sim-border-light)', backgroundColor: 'var(--sim-bg-muted)' }}>
        <button onClick={() => setMobileTab('editor')} className="flex-1 py-3 text-xs font-semibold transition-colors border-b-2" style={{ color: mobileTab === 'editor' ? 'var(--sim-text)' : 'var(--sim-text-hint)', borderColor: mobileTab === 'editor' ? 'var(--sim-green)' : 'transparent' }}>
          {t(lang).consultation.editor}
        </button>
        <button onClick={() => setMobileTab('context')} className="flex-1 py-3 text-xs font-semibold transition-colors border-b-2" style={{ color: mobileTab === 'context' ? 'var(--sim-text)' : 'var(--sim-text-hint)', borderColor: mobileTab === 'context' ? 'var(--sim-green)' : 'transparent' }}>
          {state.showRepertory
            ? (lang === 'ru' ? 'Реперторий' : 'Repertory')
            : (lang === 'ru' ? 'Контекст' : 'Context')
          }
        </button>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-0 flex-1 lg:h-[calc(100dvh-54px)]">

        {/* ══ Left: editor ══ */}
        <div className={`${mobileTab === 'editor' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0`} style={{ borderRight: '1px solid var(--sim-border-light)' }}>

          <EditorHeader visitNumber={visitNumber} />
          <EditorToolbar onOpenRepertory={handleOpenRepertory} onStartMiniTour={handleStartMiniTour} />

          <div className="px-4">
            <FirstTimeHint id="consultation">
              {lang === 'ru'
                ? 'Заполните жалобы, модальности и психику. Для острого случая — переключите тип вверху. Кнопка «Реперторий» откроет мини-реперторий Кента прямо здесь. Кнопка «📚 Обучение» — пошаговый тур.'
                : 'Fill in complaints, modalities, mentals. For acute — switch type above. "Repertory" opens Kent\'s mini-repertory right here. "📚 Tutorial" — step-by-step tour.'}
            </FirstTimeHint>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto min-h-[60vh] lg:min-h-0" style={{ backgroundColor: '#f8f7f4' }}>
            <div className="px-6 lg:px-8 py-6 space-y-6">

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

              {/* Prescription */}
              <InlineRx
                consultationId={consultation.id}
                onSaved={(remedy, potency, dosage) => setSavedRx({ remedy, potency, dosage })}
                assignedRemedy={repertoryAssignedRemedy}
                initialRemedy={consultation.remedy}
                initialPotency={consultation.potency}
                initialDosage={consultation.dosage}
                initialPellets={consultation.pellets}
              />

              {/* Plan */}
              <section>
                <label className="block mb-2" style={{ fontSize: '14px', fontWeight: 500, color: '#3d342b' }}>
                  {lang === 'ru' ? 'Контроль и план' : 'Plan & follow-up'}
                </label>
                <input
                  type="text"
                  value={state.recommendations}
                  onChange={e => updateField('recommendations', e.target.value)}
                  placeholder={lang === 'ru' ? 'Контроль через 4 нед · Отправить опрос самочувствия' : 'Follow-up in 4 weeks · Send wellbeing survey'}
                  className="w-full px-3 py-2.5 bg-white rounded-lg border transition-all focus:outline-none placeholder-gray-300"
                  style={{ fontSize: '15px', borderColor: '#e5e0d8' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#6ee7b7'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(110,231,183,0.1)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e5e0d8'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </section>

              {/* Notes — optional free text */}
              <section>
                <label className="block mb-2" style={{ fontSize: '13px', color: '#a09080' }}>
                  {lang === 'ru' ? 'Заметки (необязательно)' : 'Notes (optional)'}
                </label>
                <textarea
                  value={state.notes}
                  onChange={e => updateField('notes', e.target.value)}
                  placeholder={lang === 'ru' ? 'DD: Sulphur vs Lycopodium · дополнительные наблюдения...' : 'DD: Sulphur vs Lycopodium · additional observations...'}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-white rounded-lg border transition-all focus:outline-none placeholder-gray-300 resize-none"
                  style={{ fontSize: '14px', borderColor: '#e5e0d8', lineHeight: '1.6' }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#6ee7b7'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(110,231,183,0.1)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#e5e0d8'; e.currentTarget.style.boxShadow = 'none' }}
                />
              </section>

              <div className="h-2" />
            </div>
          </div>

          {/* Footer: save status + finish button */}
          <div className="shrink-0 px-6 lg:px-8 py-3 flex items-center gap-3" style={{ borderTop: '1px solid #ede8e0', backgroundColor: '#f8f7f4' }}>
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
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
