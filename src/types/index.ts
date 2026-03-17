export type Patient = {
  id: string
  doctor_id: string
  name: string
  birth_date: string | null
  phone: string | null
  email: string | null
  notes: string | null
  constitutional_type: string | null
  first_visit_date: string
  paid_sessions: number
  created_at: string
  updated_at: string
}

export type ConsultationStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type ConsultationType = 'chronic' | 'acute'

export type RepertoryEntry = {
  rubricId: number
  fullpath: string
  weight: 1 | 2 | 3
}

export type Consultation = {
  id: string
  patient_id: string
  doctor_id: string
  date: string
  notes: string
  complaints: string
  observations: string
  recommendations: string
  repertory_data: RepertoryEntry[]
  structured_symptoms: StructuredSymptom[]
  mode: ConsultationMode
  case_state: CaseState | null
  clinical_assessment: ClinicalAssessment | null
  scheduled_at: string | null
  status: ConsultationStatus
  type: ConsultationType
  remedy: string | null
  potency: string | null
  pellets: number | null
  dosage: string | null
  rubrics: string | null
  reaction_to_previous: string | null
  created_at: string
  updated_at: string
}

// === Structured Symptoms ===

export type SymptomCategory =
  | 'chief_complaint'    // главная жалоба
  | 'concomitant'        // сопутствующее
  | 'modality_worse'     // хуже от
  | 'modality_better'    // лучше от
  | 'mental'             // психика
  | 'general'            // общее
  | 'sleep'              // сон
  | 'appetite'           // аппетит
  | 'observation'        // наблюдение врача
  | 'other'

export type SymptomDynamics = 'new' | 'better' | 'worse' | 'same' | 'resolved'

export type StructuredSymptom = {
  id: string              // crypto.randomUUID()
  label: string
  category: SymptomCategory
  section?: string        // legacy compat — будет удалено
  dynamics?: SymptomDynamics
  value?: string          // "7/10", "3 раза/мес"
  notes?: string
  createdAt: string       // ISO
}

// === Clinical Decision Layer ===

export type CaseState = 'improving' | 'aggravation' | 'no_effect' | 'deterioration' | 'relapse' | 'unclear'

export type ClinicalDecision = 'continue' | 'wait' | 'increase' | 'change' | 'antidote' | 'refer'

export type ClinicalAssessment = {
  caseState: CaseState
  suggestedDecision: ClinicalDecision
  confirmedDecision?: ClinicalDecision
  decisionStatus: 'draft' | 'confirmed'
  summary: string
  reasoning: string
  doctorNote?: string
  computedAt: string
}

export type ConsultationMode = 'quick' | 'deep'

export type IntakeAnswers = Record<string, string>

export type IntakeType = 'primary' | 'acute'

export type IntakeForm = {
  id: string
  token: string
  doctor_id: string
  patient_id: string | null
  patient_name: string | null
  type: IntakeType
  status: 'pending' | 'completed'
  answers: IntakeAnswers | null
  created_at: string
  completed_at: string | null
  expires_at: string | null
}

export type Followup = {
  id: string
  consultation_id: string
  patient_id: string
  token: string
  status: 'better' | 'same' | 'worse' | 'new_symptoms' | null
  comment: string | null
  sent_at: string | null
  responded_at: string | null
  created_at: string
}

export type PatientPhoto = {
  id: string
  patient_id: string
  doctor_id: string
  storage_path: string
  public_url: string
  taken_at: string
  notes: string | null
  created_at: string
}

export type PhotoUploadToken = {
  id: string
  patient_id: string
  doctor_id: string
  token: string
  expires_at: string
  used: boolean
  created_at: string
}
