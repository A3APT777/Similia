'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { scheduleConsultation, getAppointmentsForDay } from '@/lib/actions/consultations'
import { ConsultationType } from '@/types'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

// Рабочие слоты — каждый час с 9:00 до 18:00 (время МСК)
const HOUR_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

// Извлечь московские часы:минуты из ISO строки → минуты от начала дня
function getMskMinutes(iso: string): number {
  const t = new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

// Московская дата YYYY-MM-DD → UTC границы дня (для запроса в БД)
function mskDayBounds(mskDate: string): { dayStart: string; dayEnd: string } {
  const [y, mo, d] = mskDate.split('-').map(Number)
  const MSK = 3 * 60 * 60 * 1000
  return {
    dayStart: new Date(Date.UTC(y, mo - 1, d, 0, 0, 0) - MSK).toISOString(),
    dayEnd: new Date(Date.UTC(y, mo - 1, d, 23, 59, 59) - MSK).toISOString(),
  }
}

// Московское время (дата + HH:MM) → UTC ISO
function mskToUtcIso(mskDate: string, mskTime: string): string {
  const [y, mo, d] = mskDate.split('-').map(Number)
  const [h, mi] = mskTime.split(':').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, h, mi) - 3 * 60 * 60 * 1000).toISOString()
}

export default function ScheduleButton({ patientId }: { patientId: string }) {
  const router = useRouter()
  const { lang } = useLanguage()

  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [apptType, setApptType] = useState<ConsultationType>('chronic')
  const [date, setDate] = useState(() => {
    // Завтра по МСК
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
  })
  const [time, setTime] = useState('10:00')
  const [conflictMsg, setConflictMsg] = useState('')
  const [freeSlots, setFreeSlots] = useState<string[] | null>(null)

  function resetConflict() {
    setConflictMsg('')
    setFreeSlots(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    resetConflict()

    try {
      // Границы выбранного дня (по МСК) в UTC — для запроса в БД
      const { dayStart, dayEnd } = mskDayBounds(date)
      const existing = await getAppointmentsForDay(dayStart, dayEnd)

      // Выбранное время в минутах (МСК)
      const [h, m] = time.split(':').map(Number)
      const selectedMin = h * 60 + m

      // Проверяем конфликт ±60 минут
      const hasConflict = existing.some(iso => {
        const existMin = getMskMinutes(iso)
        return Math.abs(existMin - selectedMin) < 60
      })

      if (hasConflict) {
        const free = HOUR_SLOTS.filter(slot => {
          const [sh, sm] = slot.split(':').map(Number)
          const slotMin = sh * 60 + sm
          return !existing.some(iso => Math.abs(getMskMinutes(iso) - slotMin) < 60)
        })
        setConflictMsg(t(lang).scheduleBtn.conflict)
        setFreeSlots(free)
        return
      }

      // Конфликтов нет — сохраняем (МСК → UTC)
      const scheduledAt = mskToUtcIso(date, time)
      await scheduleConsultation(patientId, scheduledAt, apptType)
      router.refresh()
      setOpen(false)
    } catch {
      setConflictMsg(t(lang).scheduleBtn.error)
    } finally {
      setLoading(false)
    }
  }

  function handleSlotClick(slot: string) {
    setTime(slot)
    resetConflict()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-2 px-4 py-3 rounded-full text-[13px] font-medium transition-all"
        style={{
          backgroundColor: 'var(--sim-bg-card)',
          border: '1px solid var(--sim-border)',
          color: 'var(--sim-text)',
        }}
      >
        <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--sim-green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        <span className="truncate">{t(lang).scheduleBtn.schedule}</span>
      </button>
    )
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 space-y-3">
      {/* Переключатель типа */}
      <div className="flex items-center gap-1 bg-[var(--sim-bg-card, #f5f0e8)] border border-gray-200 rounded-full p-0.5 w-fit">
        <button
          type="button"
          onClick={() => setApptType('chronic')}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
            apptType === 'chronic'
              ? 'bg-[#2d6a4f] text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {t(lang).scheduleBtn.chronic}
        </button>
        <button
          type="button"
          onClick={() => setApptType('acute')}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${
            apptType === 'acute'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          ⚡ {t(lang).scheduleBtn.acute}
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date" value={date}
            onChange={e => { setDate(e.target.value); resetConflict() }}
            required
            className="border border-green-200 rounded-full px-3 py-1.5 text-sm bg-[#faf7f2] focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/25"
          />
          <div className="flex items-center gap-1">
            <input
              type="time" value={time}
              onChange={e => { setTime(e.target.value); resetConflict() }}
              required
              className="border border-green-200 rounded-full px-3 py-1.5 text-sm bg-[#faf7f2] focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/25 w-24"
            />
            <span className="text-xs text-green-600 shrink-0">{t(lang).scheduleBtn.msk}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="submit" disabled={loading} className="bg-[#2d6a4f] text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-[var(--sim-forest)] disabled:opacity-50 transition-colors">
            {loading ? t(lang).scheduleBtn.checking : t(lang).scheduleBtn.book}
          </button>
          <button type="button" onClick={() => { setOpen(false); resetConflict() }} className="text-gray-400 hover:text-gray-600 text-sm px-2 py-2">
            {t(lang).scheduleBtn.cancel}
          </button>
        </div>
      </form>

      {conflictMsg && (
        <div className="space-y-2">
          <p className="text-sm text-red-600">{conflictMsg}</p>
          {freeSlots !== null && (
            freeSlots.length > 0 ? (
              <div>
                <p className="text-xs text-gray-500 mb-1.5">{t(lang).scheduleBtn.freeTime}</p>
                <div className="flex flex-wrap gap-1.5">
                  {freeSlots.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => handleSlotClick(slot)}
                      className="text-xs bg-[var(--sim-bg-card, #f5f0e8)] border border-green-300 text-green-700 px-3 py-1 rounded-full hover:bg-green-100 transition-colors"
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">{t(lang).scheduleBtn.noFreeTime}</p>
            )
          )}
        </div>
      )}
    </div>
  )
}
