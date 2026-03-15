'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { startConsultation } from '@/lib/actions/consultations'
import { Consultation, Patient } from '@/types'

type AppointmentWithPatient = Consultation & { patients: Pick<Patient, 'id' | 'name' | 'phone'> }

type Props = {
  appointments: AppointmentWithPatient[]
}

function getTimeLabel(scheduledAt: string): { label: string; variant: 'urgent' | 'soon' | 'past' | null } {
  const diffMin = Math.round((new Date(scheduledAt).getTime() - Date.now()) / 60000)
  if (diffMin < -30) return { label: '', variant: 'past' }
  if (diffMin < 0)   return { label: `${Math.abs(diffMin)} мин назад`, variant: 'past' }
  if (diffMin === 0) return { label: 'сейчас',          variant: 'urgent' }
  if (diffMin <= 10) return { label: `через ${diffMin} мин`, variant: 'urgent' }
  if (diffMin <= 45) return { label: `через ${diffMin} мин`, variant: 'soon' }
  return { label: '', variant: null }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' })
}

function toMskDateStr(iso: string) {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
}

function formatDayHeader(dateStr: string): string {
  const today   = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
  const tmrDate = new Date(); tmrDate.setDate(tmrDate.getDate() + 1)
  const tomorrow = tmrDate.toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })

  if (dateStr === today)    return 'Сегодня'
  if (dateStr === tomorrow) return 'Завтра'

  const [y, mo, d] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(y, mo - 1, d, 12)).toLocaleDateString('ru-RU', {
    timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long',
  })
}

function groupByDay(appts: AppointmentWithPatient[]) {
  const groups: Record<string, AppointmentWithPatient[]> = {}
  for (const a of appts) {
    const d = toMskDateStr(a.scheduled_at!)
    ;(groups[d] = groups[d] || []).push(a)
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
}

export default function AppointmentList({ appointments }: Props) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 60000)
    return () => clearInterval(t)
  }, [])

  const active = appointments.filter(a => a.status !== 'cancelled')
  if (!active.length) return null

  return (
    <div className="mb-7">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3">
        Расписание
      </p>

      <div className="space-y-4">
        {groupByDay(active).map(([day, dayAppts]) => (
          <div key={day}>
            <p className="text-[11px] font-medium text-gray-500 mb-1.5 capitalize">{formatDayHeader(day)}</p>

            <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] divide-y divide-gray-50">
              {dayAppts.map(appt => {
                const { label, variant } = getTimeLabel(appt.scheduled_at!)
                const done = appt.status === 'completed'
                const live = appt.status === 'in_progress'
                const isUrgent = variant === 'urgent'

                return (
                  <div
                    key={appt.id}
                    className={`flex items-center gap-3.5 px-4 py-3 transition-colors ${
                      isUrgent ? 'bg-amber-50/70' : done ? 'opacity-50' : 'hover:bg-gray-50/60'
                    }`}
                  >
                    {/* Полоска статуса */}
                    <div className={`w-[3px] h-8 rounded-full shrink-0 ${
                      isUrgent ? 'bg-amber-400' :
                      live     ? 'bg-emerald-500' :
                      done     ? 'bg-gray-100' :
                                 'bg-emerald-200'
                    }`} />

                    {/* Время */}
                    <div className="w-10 shrink-0">
                      <p className={`text-[13px] font-semibold tabular-nums leading-tight ${
                        isUrgent ? 'text-amber-600' : done ? 'text-gray-400' : 'text-gray-800'
                      }`}>
                        {formatTime(appt.scheduled_at!)}
                      </p>
                      {label && (
                        <p className={`text-[10px] mt-0.5 leading-none ${
                          variant === 'urgent' ? 'text-amber-500' :
                          variant === 'past'   ? 'text-red-400' :
                          'text-gray-400'
                        }`}>
                          {label}
                        </p>
                      )}
                    </div>

                    {/* Пациент */}
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/patients/${appt.patients.id}`}
                        className={`text-[13px] font-medium hover:text-emerald-700 transition-colors truncate block ${done ? 'text-gray-500' : 'text-gray-900'}`}
                      >
                        {appt.patients.name}
                      </Link>
                      {appt.patients.phone && (
                        <p className="text-[11px] text-gray-400 mt-0.5">{appt.patients.phone}</p>
                      )}
                    </div>

                    {/* Действие */}
                    <div className="shrink-0">
                      {done ? (
                        <Link
                          href={`/patients/${appt.patients.id}/consultations/${appt.id}`}
                          className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Открыть →
                        </Link>
                      ) : live ? (
                        <Link
                          href={`/patients/${appt.patients.id}/consultations/${appt.id}`}
                          className="text-[11px] bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors font-semibold shadow-sm"
                        >
                          Продолжить →
                        </Link>
                      ) : (
                        <form action={startConsultation.bind(null, appt.id, appt.patients.id)}>
                          <button
                            type="submit"
                            className={`text-[11px] px-3 py-1.5 rounded-lg font-medium transition-colors ${
                              isUrgent
                                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
                                : 'border border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
                            }`}
                          >
                            Начать →
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
