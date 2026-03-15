'use client'

import { Patient } from '@/types'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

type Props = {
  patient?: Patient
  action: (formData: FormData) => Promise<void>
  submitLabel: string
}

const inputClass = "w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
const labelClass = "block text-sm font-medium text-gray-600 mb-1"

export default function PatientForm({ patient, action, submitLabel }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => { await action(formData) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className={labelClass}>Имя *</label>
        <input name="name" type="text" required defaultValue={patient?.name || ''} placeholder="Иванова Мария Петровна" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Дата рождения</label>
        <input name="birth_date" type="date" defaultValue={patient?.birth_date || ''} className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Телефон</label>
        <input name="phone" type="tel" defaultValue={patient?.phone || ''} placeholder="+7 999 000 00 00" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Email</label>
        <input name="email" type="email" defaultValue={patient?.email || ''} placeholder="patient@example.com" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>Заметка о пациенте</label>
        <textarea name="notes" rows={2} defaultValue={patient?.notes || ''} placeholder="Аллергии, особенности, важные детали..." className={inputClass + ' resize-none'} />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={pending} className="bg-green-700 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors">
          {pending ? 'Сохраняю...' : submitLabel}
        </button>
        <button type="button" onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-700 px-3 py-2">
          Отмена
        </button>
      </div>
    </form>
  )
}
