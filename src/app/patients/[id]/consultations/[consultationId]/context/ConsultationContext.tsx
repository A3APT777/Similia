'use client'

import { createContext, useContext, useReducer, useRef, useCallback, useMemo, useEffect } from 'react'
import { updateConsultationType, updateConsultationAll } from '@/lib/actions/consultations'
import { Consultation, Patient, ConsultationType, StructuredSymptom, ClinicalAssessment, ConsultationMode, SymptomDynamics, SymptomCategory } from '@/types'
import { computeAssessment } from '@/lib/clinicalEngine'
import { useLanguage } from '@/hooks/useLanguage'
import { t } from '@/lib/i18n'
import { useToast } from '@/components/ui/toast'

// === State ===

type State = {
  // Поля данных
  notes: string
  complaints: string
  observations: string
  recommendations: string
  symptoms: StructuredSymptom[]
  rubrics: string
  reactionToPrev: string
  modalityWorseText: string
  modalityBetterText: string
  mentalText: string
  generalText: string
  type: ConsultationType
  mode: ConsultationMode
  // Мета
  saveState: 'saved' | 'saving' | 'unsaved'
  savedAt: string | null
  showExtra: boolean
  showRepertory: boolean
  showDecision: boolean
}

// === Actions ===

type Action =
  | { type: 'SET_FIELD'; field: keyof State; value: any }
  | { type: 'SET_SYMPTOMS'; symptoms: StructuredSymptom[] }
  | { type: 'SET_SAVE_STATE'; state: 'saved' | 'saving' | 'unsaved'; savedAt?: string }
  | { type: 'TOGGLE'; field: 'showExtra' | 'showRepertory' | 'showDecision' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value, saveState: 'unsaved' }
    case 'SET_SYMPTOMS':
      return { ...state, symptoms: action.symptoms, saveState: 'unsaved' }
    case 'SET_SAVE_STATE':
      return { ...state, saveState: action.state, savedAt: action.savedAt ?? state.savedAt }
    case 'TOGGLE':
      return { ...state, [action.field]: !state[action.field] }
    default:
      return state
  }
}

// === Context type ===

type ConsultationContextValue = {
  state: State
  dispatch: React.Dispatch<Action>
  // Хелперы для обновления полей
  updateField: (field: 'notes' | 'complaints' | 'observations' | 'recommendations' | 'rubrics' | 'reactionToPrev' | 'modalityWorseText' | 'modalityBetterText' | 'mentalText' | 'generalText', value: string) => void
  addSymptom: (symptom: StructuredSymptom) => void
  removeSymptom: (id: string) => void
  updateSymptomDynamics: (id: string, dynamics: SymptomDynamics) => void
  toggleType: () => void
  saveAll: () => Promise<void>
  // Вычисляемое
  assessment: ClinicalAssessment
  // Данные из пропсов (неизменяемые)
  consultation: Consultation
  patient: Patient
  previousConsultation: Consultation | null
}

const ConsultationContext = createContext<ConsultationContextValue | null>(null)

// === Provider ===

type ProviderProps = {
  consultation: Consultation
  patient: Patient
  previousConsultation: Consultation | null
  children: React.ReactNode
}

export function ConsultationProvider({ consultation, patient, previousConsultation, children }: ProviderProps) {
  const { lang } = useLanguage()
  const { toast } = useToast()

  // Единый таймер автосохранения
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Ref для доступа к актуальному состоянию внутри таймера
  const stateRef = useRef<State>(null!)

  // Ref для доступа к актуальному assessment внутри таймера автосохранения
  const assessmentRef = useRef<ClinicalAssessment>(null!)

  // Ref для вызова saveAll из toast action (избегает проблем с замыканиями)
  const saveAllRef = useRef<() => Promise<void>>(async () => {})

  const initialState: State = {
    notes: consultation.notes || '',
    complaints: consultation.complaints || '',
    observations: consultation.observations || '',
    recommendations: consultation.recommendations || '',
    symptoms: consultation.structured_symptoms || [],
    rubrics: consultation.rubrics || '',
    reactionToPrev: consultation.reaction_to_previous || '',
    modalityWorseText: consultation.modality_worse_text || '',
    modalityBetterText: consultation.modality_better_text || '',
    mentalText: consultation.mental_text || '',
    generalText: consultation.general_text || '',
    type: consultation.type ?? 'chronic',
    mode: consultation.mode ?? 'quick',
    saveState: 'saved',
    savedAt: null,
    showExtra: !!(consultation.rubrics || consultation.reaction_to_previous),
    showRepertory: false,
    showDecision: false,
  }

  const [state, dispatch] = useReducer(reducer, initialState)
  stateRef.current = state

  // --- Автосохранение: единый таймер с backoff ---
  const errorCountRef = useRef(0)

  useEffect(() => {
    if (state.saveState !== 'unsaved') return

    // Экспоненциальный backoff: 1.5с, 3с, 6с, 12с, макс 30с
    const delay = Math.min(1500 * Math.pow(2, errorCountRef.current), 30000)

    clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(async () => {
      const s = stateRef.current
      dispatch({ type: 'SET_SAVE_STATE', state: 'saving' })

      try {
        const currentAssessment = assessmentRef.current
        // Один запрос вместо трёх параллельных
        await updateConsultationAll(consultation.id, {
          notes: s.notes,
          complaints: s.complaints,
          observations: s.observations,
          recommendations: s.recommendations,
          structured_symptoms: s.symptoms,
          mode: s.mode,
          case_state: currentAssessment?.caseState ?? null,
          clinical_assessment: currentAssessment ?? null,
          modality_worse_text: s.modalityWorseText,
          modality_better_text: s.modalityBetterText,
          mental_text: s.mentalText,
          general_text: s.generalText,
          rubrics: s.rubrics,
          reaction_to_previous: s.reactionToPrev,
        })

        errorCountRef.current = 0
        const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        dispatch({ type: 'SET_SAVE_STATE', state: 'saved', savedAt: now })
      } catch {
        errorCountRef.current++
        dispatch({ type: 'SET_SAVE_STATE', state: 'unsaved' })
        if (errorCountRef.current <= 3) return // тихий retry
        toast(t(lang).consultation.saveError, 'error', {
          label: lang === 'ru' ? 'Повторить' : 'Retry',
          onClick: () => { errorCountRef.current = 0; saveAllRef.current() },
        })
      }
    }, delay)

    return () => clearTimeout(autosaveTimerRef.current)
  }, [state.saveState, state.notes, state.complaints, state.observations, state.recommendations, state.symptoms, state.rubrics, state.reactionToPrev, state.modalityWorseText, state.modalityBetterText, state.mentalText, state.generalText, consultation.id, lang, toast])

  // --- Хелперы ---

  const updateField = useCallback((
    field: 'notes' | 'complaints' | 'observations' | 'recommendations' | 'rubrics' | 'reactionToPrev' | 'modalityWorseText' | 'modalityBetterText' | 'mentalText' | 'generalText',
    value: string,
  ) => {
    dispatch({ type: 'SET_FIELD', field, value })
  }, [])

  const addSymptom = useCallback((symptom: StructuredSymptom) => {
    dispatch({ type: 'SET_SYMPTOMS', symptoms: [...stateRef.current.symptoms, symptom] })
  }, [])

  const removeSymptom = useCallback((id: string) => {
    dispatch({ type: 'SET_SYMPTOMS', symptoms: stateRef.current.symptoms.filter(s => s.id !== id) })
  }, [])

  const updateSymptomDynamics = useCallback((id: string, dynamics: SymptomDynamics) => {
    dispatch({
      type: 'SET_SYMPTOMS',
      symptoms: stateRef.current.symptoms.map(s => s.id === id ? { ...s, dynamics } : s),
    })
  }, [])

  const toggleType = useCallback(async () => {
    const next: ConsultationType = stateRef.current.type === 'chronic' ? 'acute' : 'chronic'
    dispatch({ type: 'SET_FIELD', field: 'type', value: next })
    try {
      await updateConsultationType(consultation.id, next)
    } catch {
      // Откатываем UI при ошибке
      dispatch({ type: 'SET_FIELD', field: 'type', value: stateRef.current.type === 'chronic' ? 'acute' : 'chronic' })
    }
  }, [consultation.id])

  const saveAll = useCallback(async () => {
    clearTimeout(autosaveTimerRef.current)
    const s = stateRef.current
    if (s.saveState === 'saved') return

    dispatch({ type: 'SET_SAVE_STATE', state: 'saving' })

    try {
      const currentAssessment = assessmentRef.current
      // Один запрос вместо трёх параллельных
      await updateConsultationAll(consultation.id, {
        notes: s.notes,
        complaints: s.complaints,
        observations: s.observations,
        recommendations: s.recommendations,
        structured_symptoms: s.symptoms,
        case_state: currentAssessment?.caseState ?? null,
        clinical_assessment: currentAssessment ?? null,
        modality_worse_text: s.modalityWorseText,
        modality_better_text: s.modalityBetterText,
        mental_text: s.mentalText,
        general_text: s.generalText,
        rubrics: s.rubrics,
        reaction_to_previous: s.reactionToPrev,
      })

      const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      dispatch({ type: 'SET_SAVE_STATE', state: 'saved', savedAt: now })
    } catch {
      dispatch({ type: 'SET_SAVE_STATE', state: 'unsaved' })
      toast(t(lang).consultation.saveError, 'error', {
        label: lang === 'ru' ? 'Повторить' : 'Retry',
        onClick: () => saveAllRef.current(),
      })
    }
  }, [consultation.id, lang, toast])

  // Обновляем ref после определения saveAll
  saveAllRef.current = saveAll

  // --- Вычисляемое: клиническая оценка ---

  const assessment = useMemo(() => {
    return computeAssessment(
      state.symptoms,
      previousConsultation?.structured_symptoms || [],
      previousConsultation?.case_state,
      null,
      lang,
    )
  }, [state.symptoms, previousConsultation?.structured_symptoms, previousConsultation?.case_state, lang])

  // Обновляем ref при каждом пересчёте assessment
  assessmentRef.current = assessment

  // --- Значение контекста ---

  const value = useMemo<ConsultationContextValue>(() => ({
    state,
    dispatch,
    updateField,
    addSymptom,
    removeSymptom,
    updateSymptomDynamics,
    toggleType,
    saveAll,
    assessment,
    consultation,
    patient,
    previousConsultation,
  }), [state, updateField, addSymptom, removeSymptom, updateSymptomDynamics, toggleType, saveAll, assessment, consultation, patient, previousConsultation])

  return (
    <ConsultationContext.Provider value={value}>
      {children}
    </ConsultationContext.Provider>
  )
}

// === Hook ===

export function useConsultation() {
  const ctx = useContext(ConsultationContext)
  if (!ctx) {
    throw new Error('useConsultation must be used within ConsultationProvider')
  }
  return ctx
}
