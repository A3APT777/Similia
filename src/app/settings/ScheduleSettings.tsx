'use client'

import { useState, useTransition } from 'react'
import { saveDoctorSchedule, type DoctorSchedule } from '@/lib/actions/schedule'
import { useToast } from '@/components/ui/toast'

const DAYS = [
  { key: 'mon', label: 'Пн' },
  { key: 'tue', label: 'Вт' },
  { key: 'wed', label: 'Ср' },
  { key: 'thu', label: 'Чт' },
  { key: 'fri', label: 'Пт' },
  { key: 'sat', label: 'Сб' },
  { key: 'sun', label: 'Вс' },
]

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
      await saveDoctorSchedule(data)
      toast('Расписание сохранено')
    })
  }

  const selectStyle = {
    backgroundColor: '#faf7f2', border: '1px solid #d4c9b8',
    borderRadius: '8px', padding: '8px 12px', fontSize: '14px',
    color: '#1a1a0a', outline: 'none',
  }
  const labelStyle = { fontSize: '13px', fontWeight: 600 as const, color: '#9a8a6a', textTransform: 'uppercase' as const, letterSpacing: '0.05em', display: 'block' as const, marginBottom: '8px' }

  return (
    <div className="space-y-5">
      {/* Длительность */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label style={labelStyle}>Длительность консультации</label>
          <select style={selectStyle} value={data.session_duration} onChange={e => setData(p => ({ ...p, session_duration: Number(e.target.value) }))}>
            {[30, 45, 60, 90].map(v => <option key={v} value={v}>{v} мин</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Перерыв между приёмами</label>
          <select style={selectStyle} value={data.break_duration} onChange={e => setData(p => ({ ...p, break_duration: Number(e.target.value) }))}>
            {[0, 10, 15, 20, 30].map(v => <option key={v} value={v}>{v} мин</option>)}
          </select>
        </div>
      </div>

      {/* Рабочие дни */}
      <div>
        <label style={labelStyle}>Рабочие дни</label>
        <div className="flex gap-2 flex-wrap">
          {DAYS.map(day => (
            <button
              key={day.key}
              type="button"
              onClick={() => toggleDay(day.key)}
              className="px-3 py-2 rounded-lg text-sm font-semibold transition-all"
              style={data.working_days.includes(day.key)
                ? { backgroundColor: '#2d6a4f', color: '#fff', border: '1px solid #2d6a4f' }
                : { backgroundColor: '#f0ebe3', color: '#9a8a6a', border: '1px solid #d4c9b8' }}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Рабочее время */}
      <div>
        <label style={labelStyle}>Рабочее время</label>
        <div className="flex items-center gap-3">
          <select style={selectStyle} value={data.start_time} onChange={e => setData(p => ({ ...p, start_time: e.target.value }))}>
            {timeOptions(7, 12).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span style={{ color: '#9a8a6a', fontSize: '14px' }}>—</span>
          <select style={selectStyle} value={data.end_time} onChange={e => setData(p => ({ ...p, end_time: e.target.value }))}>
            {timeOptions(14, 22).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Обед */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <label style={{ ...labelStyle, marginBottom: 0 }}>Обеденный перерыв</label>
          <button
            type="button"
            onClick={() => setData(p => ({ ...p, lunch_enabled: !p.lunch_enabled }))}
            className="relative inline-flex items-center rounded-full transition-colors"
            style={{ width: 40, height: 22, backgroundColor: data.lunch_enabled ? '#2d6a4f' : '#d4c9b8', padding: '2px' }}
          >
            <span
              className="inline-block rounded-full bg-white transition-transform"
              style={{ width: 18, height: 18, transform: data.lunch_enabled ? 'translateX(18px)' : 'translateX(0)' }}
            />
          </button>
        </div>
        {data.lunch_enabled && (
          <div className="flex items-center gap-3">
            <select style={selectStyle} value={data.lunch_start} onChange={e => setData(p => ({ ...p, lunch_start: e.target.value }))}>
              {timeOptions(11, 15).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span style={{ color: '#9a8a6a', fontSize: '14px' }}>—</span>
            <select style={selectStyle} value={data.lunch_end} onChange={e => setData(p => ({ ...p, lunch_end: e.target.value }))}>
              {timeOptions(12, 16).map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: '#1a3020' }}
      >
        {isPending ? 'Сохраняю...' : 'Сохранить расписание'}
      </button>
    </div>
  )
}
