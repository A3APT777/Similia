'use client'

import { useState, useEffect } from 'react'
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
import SymptomInput from './components/SymptomInput'
import CaseFormulation from './components/CaseFormulation'
import InlineRx from './components/InlineRx'
import PrescriptionModal from './PrescriptionModal'
import MiniRepertory from './MiniRepertory'
import RightPanel from './right-panel/RightPanel'
import TourConsultStarter from '@/components/TourConsultStarter'
import DynamicsBlock from './components/DynamicsBlock'

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

// Внутренний компонент с доступом к контексту
function EditorInner({ paidSessionsEnabled, visitNumber }: { paidSessionsEnabled: boolean; visitNumber: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { lang } = useLanguage()
  const { state, updateField, saveAll, assessment, consultation, patient, previousConsultation, dispatch } = useConsultation()

  const [showPrescription, setShowPrescription] = useState(false)
  const [showZeroWarning, setShowZeroWarning] = useState(false)
  const [pendingPrescription, setPendingPrescription] = useState<{ abbrev: string; potency: string; dosage: string } | null>(null)
  const [mobileTab, setMobileTab] = useState<'editor' | 'context'>('editor')
  // Препарат, назначенный из репертория → передаётся в InlineRx
  const [repertoryAssignedRemedy, setRepertoryAssignedRemedy] = useState<string | undefined>()

  // Отслеживаем сохранённое назначение из InlineRx:
  // инициализируем из существующего consultation.remedy (если врач уже сохранял ранее)
  const [savedRx, setSavedRx] = useState<{ remedy: string; potency: string; dosage: string } | null>(
    consultation.remedy ? { remedy: consultation.remedy, potency: consultation.potency || '', dosage: consultation.dosage || '' } : null
  )

  // localStorage: сохраняем URL консультации (без rx-параметров, чтобы не дублировать при возврате)
  useEffect(() => {
    const cleanUrl = window.location.pathname
    localStorage.setItem('hc-last-consultation', cleanUrl)
  }, [])

  // Читаем rx-параметры из URL (переданы из репертория) — надёжнее localStorage
  useEffect(() => {
    const rx = searchParams.get('rx')
    const potency = searchParams.get('potency') ?? ''
    const dosage = searchParams.get('dosage') ?? ''
    if (rx) {
      setPendingPrescription({ abbrev: rx, potency, dosage })
      setShowPrescription(true)
      // Убираем параметры из URL без перезагрузки страницы
      const url = new URL(window.location.href)
      url.searchParams.delete('rx')
      url.searchParams.delete('potency')
      url.searchParams.delete('dosage')
      window.history.replaceState({}, '', url.pathname)
    }
  }, [searchParams])

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
    // Проверяем что консультация не пустая
    const hasContent = state.complaints.trim() || state.observations.trim() ||
      state.notes.trim() || state.recommendations.trim() || state.symptoms.length > 0
    if (!hasContent) {
      toast(lang === 'ru'
        ? 'Заполните хотя бы одно поле перед завершением'
        : 'Fill in at least one field before finishing', 'error')
      return
    }

    await saveAll()

    // Quick mode + препарат уже назначен во время приёма → сразу завершаем без модала
    if (state.mode === 'quick' && savedRx?.remedy) {
      toast(lang === 'ru'
        ? `Приём завершён · ${savedRx.remedy}${savedRx.potency ? ' ' + savedRx.potency : ''} назначен`
        : `Consultation done · ${savedRx.remedy}${savedRx.potency ? ' ' + savedRx.potency : ''} prescribed`)
      await handleConsultationDone()
      return
    }

    // Deep mode или препарат не заполнен → открываем модал
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

  function handleCloseRepertory() {
    dispatch({ type: 'SET_FIELD', field: 'showRepertory', value: false })
  }

  return (
    <>
      <TourConsultStarter />
      {/* Модалка: 0 оплаченных */}
      {showZeroWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
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

      {/* Модалка: назначение (только Deep mode или Quick без препарата) */}
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

      {/* Мобильный таб-бар */}
      <div className="lg:hidden flex shrink-0" style={{ borderBottom: '1px solid var(--sim-border-light)', backgroundColor: 'var(--sim-bg-muted)' }}>
        <button onClick={() => setMobileTab('editor')} className="flex-1 py-3 text-xs font-semibold transition-colors border-b-2" style={{ color: mobileTab === 'editor' ? 'var(--sim-text)' : 'var(--sim-text-hint)', borderColor: mobileTab === 'editor' ? 'var(--sim-green)' : 'transparent' }}>
          {t(lang).consultation.editor}
        </button>
        <button onClick={() => setMobileTab('context')} className="flex-1 py-3 text-xs font-semibold transition-colors border-b-2" style={{ color: mobileTab === 'context' ? 'var(--sim-text)' : 'var(--sim-text-hint)', borderColor: mobileTab === 'context' ? 'var(--sim-green)' : 'transparent' }}>
          {lang === 'ru' ? 'Контекст' : 'Context'}
        </button>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-0 flex-1 lg:h-[calc(100dvh-54px)]">

        {/* ══════════ Левая колонка: редактор ══════════ */}
        <div className={`${mobileTab === 'editor' ? 'flex' : 'hidden'} lg:flex flex-col min-h-0`} style={{ borderRight: '1px solid var(--sim-border-light)' }}>

          <EditorHeader visitNumber={visitNumber} />
          <EditorToolbar onOpenRepertory={handleOpenRepertory} />

          {/* Рабочая область */}
          <div className="flex-1 overflow-y-auto min-h-[60vh] lg:min-h-0" style={{ backgroundColor: 'var(--sim-bg-input)' }}>
            <div className="px-5 lg:px-7 py-4 space-y-4">

              {/* Динамика с прошлого приёма — только для повторных */}
              {previousConsultation && (
                <DynamicsBlock
                  consultationId={consultation.id}
                  initial={consultation.doctor_dynamics ?? null}
                  lang={lang}
                />
              )}

              {state.mode === 'quick' ? (
                /* ── БЫСТРЫЙ РЕЖИМ: единый поток ── */
                <>
                  {/* Один блок записи — без разделения жалобы/наблюдения */}
                  <section>
                    <textarea
                      data-tour="complaints"
                      data-autoresize
                      value={state.complaints}
                      onChange={e => updateField('complaints', e.target.value)}
                      onInput={e => autoResize(e.currentTarget)}
                      autoFocus
                      placeholder={previousConsultation
                        ? (lang === 'ru'
                            ? 'Что изменилось с прошлого раза? Как реагирует на препарат? Что лучше, что хуже, что новое...'
                            : 'What changed since last visit? How does the remedy work? Better, worse, new symptoms...')
                        : (lang === 'ru'
                            ? 'Что беспокоит пациента? С какого времени? Что ухудшает и улучшает? Общие и психические симптомы...'
                            : 'Main complaints? Since when? What makes it worse or better? General and mental symptoms...')}
                      rows={4}
                      className="input"
                      style={{ minHeight: '100px', overflow: 'hidden' }}
                    />

                    {/* Структурированные симптомы — необязательный слой */}
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--sim-border)' }}>
                          {lang === 'ru' ? 'Ключевые симптомы' : 'Key symptoms'}
                        </span>
                        <span className="text-[10px]" style={{ color: '#d0c8bc' }}>
                          {lang === 'ru' ? '· для отслеживания динамики между приёмами' : '· for tracking dynamics between visits'}
                        </span>
                      </div>
                      <SymptomInput
                        symptoms={state.symptoms}
                        onChange={syms => dispatch({ type: 'SET_SYMPTOMS', symptoms: syms })}
                        previousSymptoms={previousConsultation?.structured_symptoms}
                        defaultCategory="chief_complaint"
                      />
                    </div>
                  </section>

                  {/* Назначение */}
                  <InlineRx
                    consultationId={consultation.id}
                    onSaved={(remedy, potency, dosage) => setSavedRx({ remedy, potency, dosage })}
                    assignedRemedy={repertoryAssignedRemedy}
                  />

                  {/* Контроль — одна строка */}
                  <section>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--sim-text-hint)' }}>
                      {lang === 'ru' ? 'Рекомендации и план' : 'Plan & follow-up'}
                    </label>
                    <input
                      type="text"
                      value={state.recommendations}
                      onChange={e => updateField('recommendations', e.target.value)}
                      placeholder={lang === 'ru' ? 'Контроль через 4 нед · Отправить опрос самочувствия' : 'Follow-up in 4 weeks · Send wellbeing survey'}
                      className="input"
                    />
                  </section>
                </>
              ) : (
                /* ── ГЛУБОКИЙ РЕЖИМ: структурированный ── */
                <>
                  {/* Жалобы */}
                  <section>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--sim-text-hint)' }}>
                      {lang === 'ru' ? 'Жалобы — что привело, когда началось, как менялось' : 'Complaints — what brought, onset, course'}
                    </label>
                    <textarea
                      data-tour="complaints"
                      data-autoresize
                      value={state.complaints}
                      onChange={e => updateField('complaints', e.target.value)}
                      onInput={e => autoResize(e.currentTarget)}
                      autoFocus
                      placeholder={lang === 'ru' ? 'Главные жалобы, хронология, интенсивность...' : 'Main complaints, timeline, intensity...'}
                      rows={3}
                      className="input"
                      style={{ minHeight: '72px', overflow: 'hidden' }}
                    />
                  </section>

                  {/* Наблюдения */}
                  <section>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--sim-text-hint)' }}>
                      {lang === 'ru' ? 'Наблюдения — модальности, ощущения, психика, общее' : 'Observations — modalities, sensations, mind, generals'}
                    </label>
                    <textarea
                      data-autoresize
                      value={state.observations}
                      onChange={e => updateField('observations', e.target.value)}
                      onInput={e => autoResize(e.currentTarget)}
                      placeholder={lang === 'ru' ? 'Хуже от... Лучше от... Общие симптомы... Психика...' : 'Worse from... Better from... Generals... Mind...'}
                      rows={3}
                      className="input"
                      style={{ minHeight: '72px', overflow: 'hidden' }}
                    />
                  </section>

                  {/* Структурированные симптомы */}
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[11px] font-semibold" style={{ color: 'var(--sim-text-hint)' }}>
                        {lang === 'ru' ? 'Ключевые симптомы' : 'Key symptoms'}
                      </span>
                      <span className="text-[10px]" style={{ color: '#d0c8bc' }}>
                        {lang === 'ru' ? '· отслеживание динамики' : '· track dynamics'}
                      </span>
                    </div>
                    <SymptomInput
                      symptoms={state.symptoms}
                      onChange={syms => dispatch({ type: 'SET_SYMPTOMS', symptoms: syms })}
                      previousSymptoms={previousConsultation?.structured_symptoms}
                      defaultCategory="chief_complaint"
                    />
                  </section>

                  {/* Анализ */}
                  <section>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--sim-text-hint)' }}>
                      {lang === 'ru' ? 'Дифференциальный диагноз и обоснование' : 'Differential diagnosis & rationale'}
                    </label>
                    <textarea
                      data-autoresize
                      value={state.notes}
                      onChange={e => updateField('notes', e.target.value)}
                      onInput={e => autoResize(e.currentTarget)}
                      placeholder={lang === 'ru' ? 'DD: Sulphur vs Lycopodium... Выбор обоснован...' : 'DD: Sulphur vs Lycopodium... Rationale...'}
                      rows={3}
                      className="input"
                      style={{ minHeight: '72px', overflow: 'hidden' }}
                    />
                  </section>

                  {/* Рубрики репертория (сохранены из Репертория) */}
                  {consultation.repertory_data && consultation.repertory_data.length > 0 && (
                    <section>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--sim-text-hint)' }}>
                          {lang === 'ru' ? 'Рубрики репертория' : 'Repertory rubrics'}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold text-white" style={{ backgroundColor: 'var(--sim-green)' }}>
                          {consultation.repertory_data.length}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {consultation.repertory_data.map((entry, i) => (
                          <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded text-[12px]" style={{ backgroundColor: 'rgba(45,106,79,0.05)', borderLeft: `2px solid ${(entry as any).eliminate ? '#dc2626' : 'var(--sim-green)'}` }}>
                            <span className="font-mono text-[10px] font-bold shrink-0 w-4 text-center" style={{ color: 'var(--sim-green)' }}>{(entry as any).weight ?? 1}</span>
                            <span className="flex-1 truncate" style={{ color: 'var(--sim-text)' }}>
                              {(entry as any).fullpath_ru || entry.fullpath}
                            </span>
                            {(entry as any).eliminate && (
                              <span className="text-[9px] font-bold shrink-0" style={{ color: '#dc2626' }}>E</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Назначение */}
                  <InlineRx
                    consultationId={consultation.id}
                    onSaved={(remedy, potency, dosage) => setSavedRx({ remedy, potency, dosage })}
                    assignedRemedy={repertoryAssignedRemedy}
                  />

                  {/* План */}
                  <section>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--sim-text-hint)' }}>
                      {lang === 'ru' ? 'План и цель лечения' : 'Plan & treatment goal'}
                    </label>
                    <textarea
                      data-autoresize
                      value={state.recommendations}
                      onChange={e => updateField('recommendations', e.target.value)}
                      onInput={e => autoResize(e.currentTarget)}
                      placeholder={lang === 'ru' ? 'Цель: снизить частоту до... Контроль через 4 нед...' : 'Goal: reduce frequency to... Follow-up in 4 weeks...'}
                      rows={2}
                      className="input"
                      style={{ minHeight: '56px', overflow: 'hidden' }}
                    />
                  </section>
                </>
              )}

              <div className="h-4" />
            </div>
          </div>

          {/* Sticky footer: кнопка завершения внизу рабочей зоны */}
          <div className="shrink-0 px-5 lg:px-7 py-3 flex items-center gap-3" style={{ borderTop: '1px solid var(--sim-border-light)', backgroundColor: 'var(--sim-bg-input)' }}>
            <button data-tour="finish-btn" onClick={handleFinish} className="btn btn-primary btn-lg flex-1">
              {t(lang).consultation.finish}
            </button>
            {/* Save status — рядом с кнопкой */}
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

        {/* ══════════ Правая колонка: контекст ══════════ */}
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
                  initialRepertoryData={consultation.repertory_data}
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
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto" data-tour="right-panel">
              <RightPanel
                previousConsultation={previousConsultation}
                patient={patient}
                symptoms={state.symptoms}
                previousSymptoms={previousConsultation?.structured_symptoms || []}
                assessment={state.symptoms.length > 0 ? assessment : null}
                onOpenRepertory={handleOpenRepertory}
                onAssignRemedy={(abbrev) => {
                  setRepertoryAssignedRemedy(abbrev)
                  setMobileTab('editor')
                }}
                lang={lang}
              />
            </div>
          )}
        </div>
      </div>
    </>
  )
}
