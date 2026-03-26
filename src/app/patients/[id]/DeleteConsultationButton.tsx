'use client'

import { useTransition } from 'react'
import { deleteConsultation } from '@/lib/actions/consultations'

type Props = { consultationId: string; patientId: string }

export default function DeleteConsultationButton({ consultationId, patientId }: Props) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    if (!window.confirm('Удалить эту консультацию? Действие необратимо.')) return
    startTransition(() => {
      deleteConsultation(consultationId, patientId)
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-50 transition-colors"
    >
      {pending ? 'Удаление...' : 'Удалить'}
    </button>
  )
}
