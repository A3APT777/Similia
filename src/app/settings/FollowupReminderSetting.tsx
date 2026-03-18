'use client'

import { useState } from 'react'
import { updateFollowupReminderDays } from '@/lib/actions/payments'

const PRESET_OPTIONS = [14, 21, 30, 45, 60, 90]

export default function FollowupReminderSetting({ initial }: { initial: number }) {
  const [days, setDays] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleChange(val: number) {
    setDays(val)
    setSaving(true)
    setSaved(false)
    await updateFollowupReminderDays(val)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="rounded-2xl p-5" style={{ backgroundColor: '#f0ebe3', border: '1px solid #d4c9b8' }}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-sm font-semibold" style={{ color: '#1a1a0a' }}>
            Напоминание о пациентах
          </p>
          <p className="text-xs mt-0.5" style={{ color: '#9a8a6a' }}>
            Уведомлять, если пациент не приходил более указанного числа дней
          </p>
        </div>
        <span className="text-xs shrink-0 ml-4" style={{ color: saving ? '#9a8a6a' : saved ? '#2d6a4f' : 'transparent' }}>
          {saving ? 'Сохраняю...' : saved ? '✓ Сохранено' : '·'}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESET_OPTIONS.map(opt => (
          <button
            key={opt}
            onClick={() => handleChange(opt)}
            className="text-xs px-3 py-1.5 rounded-lg border transition-all font-medium"
            style={{
              backgroundColor: days === opt ? '#1a3020' : 'transparent',
              color: days === opt ? '#f7f3ed' : '#5a5040',
              borderColor: days === opt ? '#1a3020' : '#d4c9b8',
            }}
          >
            {opt} дн.
          </button>
        ))}
      </div>

      <p className="text-xs mt-3" style={{ color: '#9a8a6a' }}>
        Выбрано: <span className="font-semibold" style={{ color: '#1a1a0a' }}>{days} дней</span> — пациенты без визита более {days} дней будут выделены в дашборде
      </p>
    </div>
  )
}
