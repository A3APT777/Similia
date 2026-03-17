'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { decrementPaidSession } from '@/lib/actions/payments'
import { Consultation, Patient } from '@/types'
import { useToast } from '@/components/ui/toast'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import { ConsultationProvider, useConsultation } from './context/ConsultationContext'
import EditorHeader from './components/EditorHeader'
import EditorToolbar from './components/EditorToolbar'
import SymptomInput from './components/SymptomInput'
import CaseFormulation from './components/CaseFormulation'
import InlineRx from './components/InlineRx'
import PrescriptionModal from './PrescriptionModal'
import MiniRepertory from './MiniRepertory'
import RightPanel from './right-panel/RightPanel'

type Props = {
  consultation: Consultation
  patient: Patient
  previousConsultation: Consultation | null
  paidSessionsEnabled: boolean
}

export default function ConsultationEditor({ consultation, patient, previousConsultation, paidSessionsEnabled }: Props) {
  return (
    <ConsultationProvider consultation={consultation} patient={patient} previousConsultation={previousConsultation}>
      <EditorInner paidSessionsEnabled={paidSessionsEnabled} />
    </ConsultationProvider>
  )
}

// Внутренний компонент с доступом к контексту
function EditorInner({ paidSessionsEnabled }: { paidSessionsEnabled: boolean }) {
  const router = useRouter()
  const { toast } = useToast()
  const { lang } = useLanguage()
  const { state, updateField, saveAll, assessment, consultation, patient, previousConsultation, dispatch } = useConsultation()

  const [showPrescription, setShowPrescription] = useState(false)
  const [showZeroWarning, setShowZeroWarning] = useState(false)
  const [pendingPrescription, setPendingPrescription] = useState<{ abbrev: string; potency: string; dosage: string } | null>(null)
  const [mobileTab, setMobileTab] = useState<'editor' | 'context'>('editor')

  // localStorage: сохраняем URL консультации + проверяем pending prescription из репертория
  useEffect(() => {
    localStorage.setItem('hc-last-consultation', window.location.href)
    const raw = localStorage.getItem('hc-pending-prescription')
    if (raw) {
      try {
        const data = JSON.parse(raw) as { abbrev: string; potency: string; dosage: string }
        localStorage.removeItem('hc-pending-prescription')
        setPendingPrescription(data)
        setShowPrescription(true)
      } catch { /* ignore */ }
    }
  }, [])

  // Авто-растягивание textarea
  useEffect(() => {
    document.querySelectorAll<HTMLTextAreaElement>('[data-autoresize]').forEach(el => {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    })
  }, [state.complaints, state.observations, state.notes, state.recommendations])

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  async function doFinish() {
    await saveAll()
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
      if (prevCount === 1) toast(t(lang).consultation.savedPaymentDone)
      else if (prevCount > 1) toast(t(lang).consultation.savedRemaining(newCount))
    }
    router.push(`/patients/${consultation.patient_id}`)
  }

  function handleOpenRepertory() {
    dispatch({ type: 'SET_FIELD', field: 'showRepertory', value: true })
    setMobileTab('context')
  }

  function handleCloseRepertory() {
    dispatch({ type: 'SET_FIELD', field: 'showRepertory', value: false })
  }

  return (
    <>
      {/* Модалка: 0 оплаченных */}
      {showZeroWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="relative rounded-2xl p-6 w-[340px] mx-4 shadow-2xl" style={{ backgroundColor: '#f7f3ed', border: '1px solid #c8a035' }}>
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
              <button onClick={() => { setShowZeroWarning(false); doFinish() }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: '#1a3020' }}>{t(lang).consultation.save}</button>
              <button onClick={() => setShowZeroWarning(false)} className="px-4 py-2.5 rounded-xl text-sm" style={{ color: '#9a8a6a' }}>{t(lang).consultation.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка: назначение */}
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

      {/* Мобильный таб-бар */}
      <div className="lg:hidden flex shrink-0" style={{ borderBottom: '1px solid var(--color-border-light)', backgroundColor: 'var(--color-muted-bg)' }}>
        <button onClick={() => setMobileTab('editor')} className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${mobileTab === 'editor' ? 'text-gray-900 border-emerald-500' : 'text-gray-400 border-transparent'}`}>
          {t(lang).consultation.editor}
        </button>
        <button onClick={() => setMobileTab('context')} className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${mobileTab === 'context' ? 'text-gray-900 border-emerald-500' : 'text-gray-400 border-transparent'}`}>
          {lang === 'ru' ? 'Контекст' : 'Context'}
        </button>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-0 flex-1 lg:h-[calc(100vh-54px)]">

        {/* ══════════ Левая колонка: редактор ══════════ */}
        <div className={`${mobileTab === 'editor' ? 'flex' : 'hidden'} lg:flex flex-col border-r border-gray-100 min-h-0`}>

          <EditorHeader onFinish={handleFinish} />
          <EditorToolbar onOpenRepertory={handleOpenRepertory} />

          {/* Рабочая область */}
          <div className="flex-1 overflow-y-auto bg-[#faf7f2] min-h-[60vh] lg:min-h-0">
            <div className="px-5 lg:px-7 py-4 space-y-5">

              {/* Жалобы */}
              <section>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#1a3020' }}>
                  {lang === 'ru' ? 'Жалобы' : 'Complaints'}
                </label>
                <div className="flex flex-wrap gap-x-3 gap-y-0 mb-1.5">
                  <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· что привело' : '· what brought'}</span>
                  <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· когда' : '· when'}</span>
                  <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· динамика' : '· dynamics'}</span>
                </div>
                <textarea
                  data-autoresize
                  value={state.complaints}
                  onChange={e => updateField('complaints', e.target.value)}
                  onInput={e => autoResize(e.currentTarget)}
                  autoFocus
                  placeholder={lang === 'ru' ? 'Обратился с... Началось... Сейчас...' : 'Presents with... Started... Currently...'}
                  rows={2}
                  className="w-full text-[14px] text-gray-800 leading-[1.8] resize-none focus:outline-none bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 placeholder-gray-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  style={{ minHeight: '56px', overflow: 'hidden' }}
                />
                <SymptomInput
                  symptoms={state.symptoms}
                  onChange={syms => dispatch({ type: 'SET_SYMPTOMS', symptoms: syms })}
                  previousSymptoms={previousConsultation?.structured_symptoms}
                  defaultCategory="chief_complaint"
                />
              </section>

              {/* Наблюдения */}
              <section>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#1a3020' }}>
                  {lang === 'ru' ? 'Наблюдения' : 'Observations'}
                </label>
                <div className="flex flex-wrap gap-x-3 gap-y-0 mb-1.5">
                  <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· ощущения' : '· sensations'}</span>
                  <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· хуже/лучше' : '· worse/better'}</span>
                  <span className="text-[10px]" style={{ color: '#b0a090' }}>{lang === 'ru' ? '· психика' : '· mind'}</span>
                </div>
                <textarea
                  data-autoresize
                  value={state.observations}
                  onChange={e => updateField('observations', e.target.value)}
                  onInput={e => autoResize(e.currentTarget)}
                  placeholder={lang === 'ru' ? 'Ощущения, модальности, общее...' : 'Sensations, modalities, generals...'}
                  rows={2}
                  className="w-full text-[14px] text-gray-800 leading-[1.8] resize-none focus:outline-none bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 placeholder-gray-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  style={{ minHeight: '56px', overflow: 'hidden' }}
                />
              </section>

              {/* InlineRx — только в Quick Mode */}
              {state.mode === 'quick' && <InlineRx consultationId={consultation.id} />}

              {/* Анализ — только в Deep Mode */}
              {state.mode === 'deep' && (
                <section>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#1a3020' }}>
                    {lang === 'ru' ? 'Анализ' : 'Analysis'}
                  </label>
                  <textarea
                    data-autoresize
                    value={state.notes}
                    onChange={e => updateField('notes', e.target.value)}
                    onInput={e => autoResize(e.currentTarget)}
                    placeholder={lang === 'ru' ? 'DD, обоснование выбора...' : 'DD, rationale...'}
                    rows={2}
                    className="w-full text-[14px] text-gray-800 leading-[1.8] resize-none focus:outline-none bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 placeholder-gray-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                    style={{ minHeight: '56px', overflow: 'hidden' }}
                  />
                </section>
              )}

              {/* План */}
              <section>
                <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#1a3020' }}>
                  {lang === 'ru' ? 'План' : 'Plan'}
                </label>
                <textarea
                  data-autoresize
                  value={state.recommendations}
                  onChange={e => updateField('recommendations', e.target.value)}
                  onInput={e => autoResize(e.currentTarget)}
                  placeholder={state.mode === 'quick'
                    ? (lang === 'ru' ? 'Контроль через...' : 'Follow-up in...')
                    : (lang === 'ru' ? 'Цель, контроль через...' : 'Goal, follow-up in...')}
                  rows={state.mode === 'quick' ? 1 : 3}
                  className="w-full text-[14px] text-gray-800 leading-[1.8] resize-none focus:outline-none bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 placeholder-gray-300 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/10 transition-all"
                  style={{ minHeight: state.mode === 'quick' ? '40px' : '56px', overflow: 'hidden' }}
                />
              </section>

              <CaseFormulation />
              <div className="h-4" />
            </div>
          </div>
        </div>

        {/* ══════════ Правая колонка: контекст ══════════ */}
        <div className={`${mobileTab === 'context' ? 'flex' : 'hidden'} lg:flex flex-col bg-[#fafafa] min-h-0`}>
          {state.showRepertory ? (
            <div className="flex flex-col h-full">
              <div className="px-5 py-2 border-b border-gray-100 bg-[#ede7dd]">
                <button onClick={handleCloseRepertory} className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-all flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                  {lang === 'ru' ? 'Назад' : 'Back'}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <MiniRepertory
                  onSelectRubric={(rubric: string) => {
                    const current = state.rubrics
                    const sep = current.trim() ? ';\n' : ''
                    updateField('rubrics', current + sep + rubric)
                  }}
                  onClose={handleCloseRepertory}
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <RightPanel
                previousConsultation={previousConsultation}
                symptoms={state.symptoms}
                previousSymptoms={previousConsultation?.structured_symptoms || []}
                assessment={state.symptoms.length > 0 ? assessment : null}
                onOpenRepertory={handleOpenRepertory}
                lang={lang}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
