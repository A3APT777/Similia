'use client'

import { useTransition } from 'react'
import { cancelConsultation } from '@/lib/actions/consultations'

type Props = { consultationId: string; patientId: string }

export default function CancelAppointmentButton({ consultationId, patientId }: Props) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm('Отменить этот приём? Действие нельзя отменить.')) return
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
      {pending ? 'Отменяю...' : 'Отменить'}
    </button>
  )
}
