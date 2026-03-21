'use client'

import dynamic from 'next/dynamic'
import type { Patient, Consultation, IntakeForm } from '@/types'
import type { Lang } from '@/hooks/useLanguage'

const AIConsultationClient = dynamic(() => import('./AIConsultationClient'), { ssr: false })

type Props = {
  patient: Patient
  consultations: Consultation[]
  intakeForms: IntakeForm[]
  lang: Lang
}

export default function AIConsultationWrapper(props: Props) {
  return <AIConsultationClient {...props} />
}
