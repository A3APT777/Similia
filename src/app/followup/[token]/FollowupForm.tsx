'use client'

import { useState } from 'react'
import { respondFollowup } from '@/lib/actions/followups'

type Status = 'better' | 'same' | 'worse' | 'new_symptoms'

const options: { value: Status; label: string; color: string }[] = [
  { value: 'better',       label: 'Лучше',                    color: 'var(--sim-green)' },
  { value: 'same',         label: 'Без изменений',            color: '#6b7280' },
  { value: 'worse',        label: 'Хуже',                     color: '#dc2626' },
  { value: 'new_symptoms', label: 'Появились новые симптомы',  color: '#ea580c' },
]

export default function FollowupForm({ token }: { token: string }) {
  const [selected, setSelected] = useState<Status | null>(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setLoading(true)
    setError('')
    try {
      await respondFollowup(token, selected, comment)
      setDone(true)
    } catch {
      setError('Не удалось отправить ответ. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: 'rgba(45,106,79,0.08)' }}>
          <svg className="w-5 h-5" style={{ color: 'var(--sim-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2
          className="text-[24px] font-light mb-2"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-text)' }}
        >
          Спасибо!
        </h2>
        <p className="text-[13px]" style={{ color: 'var(--sim-text-muted)' }}>
          Ваш врач получил ответ
        </p>
        <div className="mt-8">
          <a
            href="https://simillia.ru"
            className="text-[11px] transition-colors hover:underline"
            style={{ color: 'var(--sim-text-muted)' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Similia — цифровой кабинет гомеопата
          </a>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Статус — выбор */}
      <div className="space-y-2">
        {options.map(option => {
          const isActive = selected === option.value
          return (
            <label
              key={option.value}
              className="flex items-center gap-3 rounded-xl px-5 py-4 cursor-pointer transition-all duration-200"
              style={{
                backgroundColor: isActive ? `color-mix(in srgb, ${option.color} 6%, transparent)` : 'var(--sim-bg-card)',
                border: `1px solid ${isActive ? `color-mix(in srgb, ${option.color} 20%, transparent)` : 'var(--sim-border)'}`,
              }}
            >
              <input
                type="radio"
                name="status"
                value={option.value}
                checked={isActive}
                onChange={() => setSelected(option.value)}
                className="sr-only"
              />
              <span
                className="w-2 h-2 rounded-full shrink-0 transition-all duration-200"
                style={{ backgroundColor: option.color, opacity: isActive ? 1 : 0.3 }}
              />
              <span
                className="text-[14px] font-medium transition-colors duration-200"
                style={{ color: isActive ? option.color : 'var(--sim-text)' }}
              >
                {option.label}
              </span>
            </label>
          )
        })}
      </div>

      {/* Пояснение при "Новые симптомы" — закон Геринга */}
      {selected === 'new_symptoms' && (
        <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(234,88,12,0.04)', border: '1px solid rgba(234,88,12,0.12)' }}>
          <p className="text-[13px] font-medium mb-2" style={{ color: '#ea580c' }}>Уточните, пожалуйста</p>
          <p className="text-[12px] leading-relaxed mb-3" style={{ color: 'var(--sim-text-muted)' }}>
            Иногда после препарата симптомы появляются на коже или возвращаются старые болезни — это может быть признаком правильного исцеления (закон Геринга).
          </p>
          <div className="space-y-2">
            {[
              { value: 'skin', label: 'На коже, суставах или поверхности тела' },
              { value: 'old', label: 'Вернулись старые симптомы' },
              { value: 'new_internal', label: 'Новое, во внутренних органах' },
              { value: 'other', label: 'Другое' },
            ].map(item => (
              <label key={item.value} className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="new_symptoms_location"
                  value={item.value}
                  className="shrink-0"
                  style={{ accentColor: 'var(--sim-green)' }}
                />
                <span className="text-[13px]" style={{ color: 'var(--sim-text)' }}>{item.label}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Комментарий */}
      <div>
        <label className="block text-[11px] font-medium uppercase tracking-[0.1em] mb-1.5" style={{ color: 'var(--sim-text-muted)' }}>
          {selected === 'new_symptoms' ? 'Подробности' : 'Комментарий'}
        </label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          placeholder={selected === 'new_symptoms' ? 'Опишите что именно появилось...' : 'Необязательно...'}
          className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none transition-all duration-200 leading-relaxed"
          style={{ borderColor: 'var(--sim-border)', color: 'var(--sim-text)', backgroundColor: 'var(--sim-bg-card)' }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--sim-green)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(45,106,79,0.08)' }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--sim-border)'; e.currentTarget.style.boxShadow = 'none' }}
        />
      </div>

      {error && <p className="text-[13px]" style={{ color: '#dc2626' }}>{error}</p>}

      <button
        type="submit"
        disabled={!selected || loading}
        className="btn btn-primary w-full py-3.5"
      >
        {loading ? 'Отправляю...' : 'Отправить'}
      </button>
    </form>
  )
}
