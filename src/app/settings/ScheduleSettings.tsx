'use client'

import { useState, useTransition } from 'react'
import { saveDoctorSchedule, type DoctorSchedule } from '@/lib/actions/schedule'
import { useToast } from '@/components/ui/toast'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

function timeOptions(from: number, to: number, step: number = 30): string[] {
  const opts = []
  for (let m = from * 60; m <= to * 60; m += step) {
    const h = Math.floor(m / 60)
    const min = m % 60
    opts.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`)
  }
  return opts
}

export default function ScheduleSettings({ initial }: { initial: DoctorSchedule }) {
  const { toast } = useToast()
  const { lang } = useLanguage()
  const [isPending, startTransition] = useTransition()
  const [data, setData] = useState<DoctorSchedule>(initial)

  function toggleDay(day: string) {
    setData(prev => ({
      ...prev,
      working_days: prev.working_days.includes(day)
        ? prev.working_days.filter(d => d !== day)
        : [...prev.working_days, day],
    }))
  }

  function handleSave() {
    startTransition(async () => {
      try {
        await saveDoctorSchedule(data)
        toast(t(lang).settings.scheduleSaved)
      } catch {
        toast(lang === 'ru' ? 'Ошибка сохранения расписания' : 'Schedule save error')
      }
    })
  }

  const selectStyle = {
    backgroundColor: '#faf7f2', border: '1px solid var(--sim-border)',
    borderRadius: '8px', padding: '8px 12px', fontSize: '14px',
    color: 'var(--sim-text)', outline: 'none',
  }
  const labelStyle = { fontSize: '13px', fontWeight: 600 as const, color: '#6b5f4f', textTransform: 'uppercase' as const, letterSpacing: '0.05em', display: 'block' as const, marginBottom: '8px' }

  return (
    <div className="space-y-5">
      {/* Длительность */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="sched-duration" style={labelStyle}>{t(lang).settings.consultationDuration}</label>
          <select id="sched-duration" style={selectStyle} value={data.session_duration} onChange={e => setData(p => ({ ...p, session_duration: Number(e.target.value) }))}>
            {[30, 45, 60, 90, 120, 150].map(v => <option key={v} value={v}>{v} {t(lang).settings.min}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="sched-break" style={labelStyle}>{t(lang).settings.breakBetween}</label>
          <select id="sched-break" style={selectStyle} value={data.break_duration} onChange={e => setData(p => ({ ...p, break_duration: Number(e.target.value) }))}>
            {[0, 10, 15, 20, 30, 45, 60].map(v => <option key={v} value={v}>{v} {t(lang).settings.min}</option>)}
          </select>
        </div>
      </div>

      {/* Рабочие дни */}
      <div>
        <label style={labelStyle}>{t(lang).settings.workDays}</label>
        <div className="flex gap-2 flex-wrap">
          {DAY_KEYS.map((key, i) => (
            <button
              key={key}
              type="button"
              aria-pressed={data.working_days.includes(key)}
              aria-label={`${t(lang).settings.days[i]}`}
              onClick={() => toggleDay(key)}
              className="px-3 py-2 rounded-full text-sm font-semibold transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
              style={data.working_days.includes(key)
                ? { backgroundColor: 'var(--sim-green)', color: '#fff', border: '1px solid #2d6a4f' }
                : { backgroundColor: 'var(--sim-bg, #faf8f5)', color: '#6b5f4f', border: '1px solid var(--sim-border)' }}
            >
              {t(lang).settings.days[i]}
            </button>
          ))}
        </div>
      </div>

      {/* Рабочее время */}
      <div>
        <label style={labelStyle}>{t(lang).settings.workHours}</label>
        <div className="flex items-center gap-3">
          <select id="sched-start" aria-label={lang === 'ru' ? 'Начало рабочего дня' : 'Work start time'} style={selectStyle} value={data.start_time} onChange={e => setData(p => ({ ...p, start_time: e.target.value }))}>
            {timeOptions(7, 12).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span style={{ color: '#6b5f4f', fontSize: '14px' }} aria-hidden="true">—</span>
          <select id="sched-end" aria-label={lang === 'ru' ? 'Конец рабочего дня' : 'Work end time'} style={selectStyle} value={data.end_time} onChange={e => setData(p => ({ ...p, end_time: e.target.value }))}>
            {timeOptions(14, 22).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Обед */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <label style={{ ...labelStyle, marginBottom: 0 }}>{t(lang).settings.lunchBreak}</label>
          <button
            type="button"
            role="switch"
            aria-checked={data.lunch_enabled}
            aria-label={lang === 'ru' ? 'Включить обеденный перерыв' : 'Enable lunch break'}
            onClick={() => setData(p => ({ ...p, lunch_enabled: !p.lunch_enabled }))}
            className="relative inline-flex items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            style={{ width: 40, height: 24, backgroundColor: data.lunch_enabled ? 'var(--sim-green)' : 'var(--sim-border)', padding: '2px' }}
          >
            <span
              className="inline-block rounded-full bg-white transition-transform"
              style={{ width: 18, height: 18, transform: data.lunch_enabled ? 'translateX(18px)' : 'translateX(0)' }}
            />
          </button>
        </div>
        {data.lunch_enabled && (
          <div className="flex items-center gap-3">
            <select id="sched-lunch-start" aria-label={lang === 'ru' ? 'Начало обеда' : 'Lunch start'} style={selectStyle} value={data.lunch_start} onChange={e => setData(p => ({ ...p, lunch_start: e.target.value }))}>
              {timeOptions(11, 15).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span style={{ color: '#6b5f4f', fontSize: '14px' }} aria-hidden="true">—</span>
            <select id="sched-lunch-end" aria-label={lang === 'ru' ? 'Конец обеда' : 'Lunch end'} style={selectStyle} value={data.lunch_end} onChange={e => setData(p => ({ ...p, lunch_end: e.target.value }))}>
              {timeOptions(12, 16).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="btn btn-primary w-full"
        style={{ backgroundColor: 'var(--sim-forest)' }}
      >
        {isPending ? t(lang).settings.saving : t(lang).settings.saveSchedule}
      </button>
    </div>
  )
}
