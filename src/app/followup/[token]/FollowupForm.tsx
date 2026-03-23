'use client'

import { useState } from 'react'
import { respondFollowup } from '@/lib/actions/followups'

type Status = 'better' | 'same' | 'worse' | 'new_symptoms'

const options: { value: Status; label: string; emoji: string; color: string }[] = [
  { value: 'better', label: 'Лучше', emoji: '↑', color: 'border-green-200 bg-green-50 text-green-700 has-[:checked]:bg-green-100 has-[:checked]:border-green-400' },
  { value: 'same', label: 'Без изменений', emoji: '→', color: 'border-gray-200 bg-gray-50 text-gray-600 has-[:checked]:bg-gray-100 has-[:checked]:border-gray-400' },
  { value: 'worse', label: 'Хуже', emoji: '↓', color: 'border-red-100 bg-red-50 text-red-600 has-[:checked]:bg-red-100 has-[:checked]:border-red-400' },
  { value: 'new_symptoms', label: 'Появились новые симптомы', emoji: '!', color: 'border-orange-100 bg-orange-50 text-orange-600 has-[:checked]:bg-orange-100 has-[:checked]:border-orange-400' },
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
      <div className="text-center py-8">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'var(--sim-green)' }}>
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-lg font-normal" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-forest)' }}>Спасибо!</h2>
        <p className="text-gray-500 mt-2">Ваш врач получил ответ</p>
        <div className="mt-6">
          <a href="https://simillia.ru" className="text-xs hover:underline" style={{ color: 'var(--sim-text-hint)' }} target="_blank" rel="noopener noreferrer">
            Simillia.ru — цифровой кабинет гомеопата
          </a>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        {options.map(option => (
          <label
            key={option.value}
            className={`flex items-center gap-3 border rounded-2xl px-5 py-4 cursor-pointer transition-all ${option.color}`}
          >
            <input
              type="radio"
              name="status"
              value={option.value}
              checked={selected === option.value}
              onChange={() => setSelected(option.value)}
              className="sr-only"
            />
            <span className="text-lg w-6 text-center">{option.emoji}</span>
            <span className="font-medium">{option.label}</span>
          </label>
        ))}
      </div>

      {/* Пояснение при выборе "Новые симптомы" — закон Геринга */}
      {selected === 'new_symptoms' && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3.5 space-y-2">
          <p className="text-sm font-semibold text-orange-800">Уточните, пожалуйста</p>
          <p className="text-sm text-orange-700 leading-relaxed">
            Иногда после гомеопатического препарата симптомы появляются на коже или возвращаются
            старые болезни — это может быть признаком правильного исцеления (закон Геринга:
            болезнь уходит изнутри наружу).
          </p>
          <p className="text-sm text-orange-700 font-medium">Где появились симптомы?</p>
          <div className="space-y-1.5 pt-0.5">
            {[
              { value: 'skin', label: 'На коже, суставах или поверхности тела', hint: 'возможно, хороший знак' },
              { value: 'old', label: 'Вернулись старые симптомы, которые были раньше', hint: 'врач должен знать' },
              { value: 'new_internal', label: 'Новое, во внутренних органах (грудь, живот, голова)', hint: 'обязательно сообщите' },
              { value: 'other', label: 'Другое или не могу определить', hint: '' },
            ].map(item => (
              <label key={item.value} className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="new_symptoms_location"
                  value={item.value}
                  className="mt-0.5 accent-orange-500 shrink-0"
                />
                <span className="text-sm text-orange-800">
                  {item.label}
                  {item.hint && (
                    <span className="text-orange-500 ml-1 text-xs">— {item.hint}</span>
                  )}
                </span>
              </label>
            ))}
          </div>
          <p className="text-xs text-orange-500 pt-1">
            Ваши уточнения помогут врачу правильно оценить динамику лечения
          </p>
        </div>
      )}

      <div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          placeholder={selected === 'new_symptoms' ? 'Опишите подробнее, что именно появилось...' : 'Комментарий (необязательно)...'}
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/30"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={!selected || loading}
        className="w-full bg-[#2d6a4f] text-white rounded-full py-3.5 font-medium hover:bg-[#1a3020] disabled:opacity-40 transition-colors"
      >
        {loading ? 'Отправляю...' : 'Отправить'}
      </button>
    </form>
  )
}
