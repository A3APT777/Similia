'use client'

import { useState, useTransition } from 'react'
import { submitBookingRequest } from '@/lib/actions/booking'

type Props = { doctorId: string }

export default function BookingForm({ doctorId }: Props) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [preferredDate, setPreferredDate] = useState('')
  const [message, setMessage] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim()) return
    setError(null)

    startTransition(async () => {
      try {
        await submitBookingRequest(doctorId, { name: name.trim(), phone: phone.trim(), preferredDate, message })
        setDone(true)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка')
      }
    })
  }

  if (done) {
    return (
      <div className="text-center py-8 px-4">
        <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h2 className="text-xl font-light mb-2" style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: '#1a3020' }}>
          Заявка отправлена
        </h2>
        <p className="text-sm text-gray-500">
          Врач рассмотрит вашу заявку и свяжется с вами по указанному номеру телефона.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Имя и фамилия <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          placeholder="Иван Иванов"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Телефон <span className="text-red-400">*</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          required
          placeholder="+7 999 000-00-00"
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Желаемая дата приёма
        </label>
        <input
          type="date"
          value={preferredDate}
          onChange={e => setPreferredDate(e.target.value)}
          min={new Date().toISOString().split('T')[0]}
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-colors"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          Комментарий / причина обращения
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={3}
          placeholder="Кратко опишите причину обращения..."
          className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-100 transition-colors resize-none"
        />
      </div>

      {/* Согласие (152-ФЗ) */}
      <p className="text-[11px] text-gray-400 leading-relaxed">
        Нажимая «Записаться», вы соглашаетесь на обработку персональных данных в соответствии с{' '}
        <a href="/privacy" target="_blank" className="underline hover:text-gray-600">
          политикой конфиденциальности
        </a>
        .
      </p>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending || !name.trim() || !phone.trim()}
        className="w-full py-3 rounded-xl text-sm font-medium text-white transition-all disabled:opacity-50"
        style={{ backgroundColor: 'var(--color-primary, #2d6a4f)' }}
      >
        {pending ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Отправка...
          </span>
        ) : 'Записаться на приём'}
      </button>
    </form>
  )
}
