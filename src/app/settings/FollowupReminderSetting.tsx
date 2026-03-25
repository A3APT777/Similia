'use client'

import { useState } from 'react'
import { updateFollowupReminderDays } from '@/lib/actions/payments'

const PRESET_OPTIONS = [14, 21, 30, 45, 60, 90, 120, 180]

export default function FollowupReminderSetting({ initial }: { initial: number }) {
  const [days, setDays] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleChange(val: number) {
    const prev = days
    setDays(val)
    setSaving(true)
    setSaved(false)
    try {
      await updateFollowupReminderDays(val)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setDays(prev)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--sim-bg, #faf8f5)', border: '1px solid var(--sim-border)' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--sim-text)' }}>
            Отслеживание визитов
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#6b5f4f' }}>
            Пациенты без визита дольше указанного срока будут выделены в дашборде
          </p>
        </div>
        <span aria-live="polite" className="text-xs shrink-0 ml-4" style={{ color: saving ? '#6b5f4f' : saved ? 'var(--sim-green)' : 'transparent' }}>
          {saving ? 'Сохраняю...' : saved ? '✓ Сохранено' : '·'}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESET_OPTIONS.map(opt => (
          <button
            key={opt}
            onClick={() => handleChange(opt)}
            disabled={saving}
            aria-pressed={days === opt}
            aria-label={`Напоминание через ${opt} дней`}
            className="text-xs px-3 py-2 rounded-full border transition-all font-medium disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            style={{
              backgroundColor: days === opt ? 'var(--sim-forest)' : 'transparent',
              color: days === opt ? '#f7f3ed' : 'var(--sim-text-sec)',
              borderColor: days === opt ? 'var(--sim-forest)' : 'var(--sim-border)',
            }}
          >
            {opt} дн.
          </button>
        ))}
      </div>

      <p className="text-xs mt-3" style={{ color: '#6b5f4f' }}>
        Выбрано: <span className="font-semibold" style={{ color: 'var(--sim-text)' }}>{days} дней</span> — пациенты без визита более {days} дней будут выделены в дашборде
      </p>
    </div>
  )
}
