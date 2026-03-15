export type Patient = {
  id: string
  doctor_id: string
  name: string
  birth_date: string | null
  phone: string | null
  email: string | null
  notes: string | null
  first_visit_date: string
  created_at: string
  updated_at: string
}

export type ConsultationStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type ConsultationType = 'chronic' | 'acute'

export type Consultation = {
  id: string
  patient_id: string
  doctor_id: string
  date: string
  notes: string
  scheduled_at: string | null
  status: ConsultationStatus
  type: ConsultationType
  remedy: string | null
  potency: string | null
  pellets: number | null
  dosage: string | null
  created_at: string
  updated_at: string
}

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
