'use client'

import { useTransition } from 'react'
import { cancelConsultation } from '@/lib/actions/consultations'
import { t } from '@/lib/shared/i18n'
import { useLanguage } from '@/hooks/useLanguage'

type Props = { consultationId: string; patientId: string }

export default function CancelAppointmentButton({ consultationId, patientId }: Props) {
  const [pending, startTransition] = useTransition()
  const { lang } = useLanguage()

  function handleClick() {
    if (!window.confirm(t(lang).cancelAppointment.confirm)) return
    startTransition(() => {
      cancelConsultation(consultationId, patientId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
    >
      {pending ? t(lang).cancelAppointment.cancelling : t(lang).cancelAppointment.cancel}
    </button>
  )
}
