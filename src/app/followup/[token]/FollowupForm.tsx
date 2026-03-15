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
        <div className="text-4xl mb-4">✓</div>
        <h2 className="text-lg font-medium text-gray-900">Спасибо!</h2>
        <p className="text-gray-500 mt-2">Ваш врач получил ответ</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        {options.map(option => (
          <label
            key={option.value}
            className={`flex items-center gap-3 border rounded-xl px-5 py-4 cursor-pointer transition-all ${option.color}`}
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

      <div>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
          placeholder="Комментарий (необязательно)..."
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={!selected || loading}
        className="w-full bg-green-700 text-white rounded-xl py-3 font-medium hover:bg-green-800 disabled:opacity-40 transition-colors"
      >
        {loading ? 'Отправляю...' : 'Отправить'}
      </button>
    </form>
  )
}
