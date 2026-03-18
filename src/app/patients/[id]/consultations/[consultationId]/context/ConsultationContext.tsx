'use client'

import { createContext, useContext, useReducer, useRef, useCallback, useMemo, useEffect } from 'react'
import { updateConsultationNotes, updateConsultationType, updateConsultationExtra, updateConsultationFields } from '@/lib/actions/consultations'
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
  updateField: (field: 'notes' | 'complaints' | 'observations' | 'recommendations' | 'rubrics' | 'reactionToPrev', value: string) => void
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

  // --- Автосохранение: единый таймер ---
  // При каждом изменении saveState на 'unsaved' — перезапускаем таймер
  useEffect(() => {
    if (state.saveState !== 'unsaved') return

    clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(async () => {
      const s = stateRef.current
      dispatch({ type: 'SET_SAVE_STATE', state: 'saving' })

      try {
        // Батч-сохранение всех полей одновременно
        const currentAssessment = assessmentRef.current
        await Promise.all([
          updateConsultationNotes(consultation.id, s.notes),
          updateConsultationFields(consultation.id, {
            complaints: s.complaints,
            observations: s.observations,
            recommendations: s.recommendations,
            structured_symptoms: s.symptoms,
            mode: s.mode,
            case_state: currentAssessment?.caseState ?? null,
            clinical_assessment: currentAssessment ?? null,
          }),
          updateConsultationExtra(consultation.id, s.rubrics, s.reactionToPrev),
        ])

        const now = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        dispatch({ type: 'SET_SAVE_STATE', state: 'saved', savedAt: now })
      } catch {
        dispatch({ type: 'SET_SAVE_STATE', state: 'unsaved' })
        toast(t(lang).consultation.saveError, 'error', {
          label: lang === 'ru' ? 'Повторить' : 'Retry',
          onClick: () => saveAllRef.current(),
        })
      }
    }, 1500)

    return () => clearTimeout(autosaveTimerRef.current)
  }, [state.saveState, state.notes, state.complaints, state.observations, state.recommendations, state.symptoms, state.rubrics, state.reactionToPrev, consultation.id, lang, toast])

  // --- Хелперы ---

  const updateField = useCallback((
    field: 'notes' | 'complaints' | 'observations' | 'recommendations' | 'rubrics' | 'reactionToPrev',
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

  const toggleType = useCallback(() => {
    const next: ConsultationType = stateRef.current.type === 'chronic' ? 'acute' : 'chronic'
    dispatch({ type: 'SET_FIELD', field: 'type', value: next })
    // Тип сохраняем сразу (отдельный API)
    updateConsultationType(consultation.id, next)
  }, [consultation.id])

  const saveAll = useCallback(async () => {
    clearTimeout(autosaveTimerRef.current)
    const s = stateRef.current
    if (s.saveState === 'saved') return

    dispatch({ type: 'SET_SAVE_STATE', state: 'saving' })

    try {
      const currentAssessment = assessmentRef.current
      await Promise.all([
        updateConsultationNotes(consultation.id, s.notes),
        updateConsultationFields(consultation.id, {
          complaints: s.complaints,
          observations: s.observations,
          recommendations: s.recommendations,
          structured_symptoms: s.symptoms,
          case_state: currentAssessment?.caseState ?? null,
          clinical_assessment: currentAssessment ?? null,
        }),
        updateConsultationExtra(consultation.id, s.rubrics, s.reactionToPrev),
      ])

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
