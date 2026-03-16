'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { startConsultation } from '@/lib/actions/consultations'
import { Consultation, Patient } from '@/types'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

type AppointmentWithPatient = Consultation & { patients: Pick<Patient, 'id' | 'name' | 'phone'> }

type Props = {
  appointments: AppointmentWithPatient[]
}

function getTimeLabel(scheduledAt: string, lang: 'ru' | 'en'): { label: string; variant: 'urgent' | 'soon' | 'past' | null } {
  const diffMin = Math.round((new Date(scheduledAt).getTime() - Date.now()) / 60000)
  if (diffMin < -30) return { label: '', variant: 'past' }
  if (diffMin < 0)   return { label: `${Math.abs(diffMin)} ${t(lang).appointments.minAgo}`, variant: 'past' }
  if (diffMin === 0) return { label: t(lang).appointments.now,          variant: 'urgent' }
  if (diffMin <= 10) return { label: t(lang).appointments.inMin(diffMin), variant: 'urgent' }
  if (diffMin <= 45) return { label: t(lang).appointments.inMin(diffMin), variant: 'soon' }
  return { label: '', variant: null }
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' })
}

function toMskDateStr(iso: string) {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
}

function formatDayHeader(dateStr: string, lang: 'ru' | 'en'): string {
  const today   = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
  const tmrDate = new Date(); tmrDate.setDate(tmrDate.getDate() + 1)
  const tomorrow = tmrDate.toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })

  if (dateStr === today)    return t(lang).appointments.today
  if (dateStr === tomorrow) return t(lang).appointments.tomorrow

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

function CopyReminderButton({ name, scheduledAt, lang }: { name: string; scheduledAt: string; lang: 'ru' | 'en' }) {
  const [copied, setCopied] = useState(false)

  const copy = useCallback(() => {
    const dateStr = new Date(scheduledAt).toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      day: 'numeric', month: 'long',
    })
    const timeStr = new Date(scheduledAt).toLocaleString('ru-RU', {
      timeZone: 'Europe/Moscow',
      hour: '2-digit', minute: '2-digit',
    })
    const text = t(lang).appointments.reminderText(name, dateStr, timeStr)
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [name, scheduledAt])

  return (
    <button
      onClick={copy}
      title={t(lang).appointments.copyReminder}
      className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-emerald-700 transition-colors px-1.5 py-1 rounded-lg hover:bg-emerald-50"
    >
      {copied ? (
        <>
          <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          <span className="text-emerald-600">{t(lang).appointments.copied}</span>
        </>
      ) : (
        <>
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5A3.375 3.375 0 006.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0015 4.5h-1.5a2.251 2.251 0 00-2.15 1.836m5.3 0H9.15" />
          </svg>
          <span className="hidden sm:inline">{t(lang).appointments.remind}</span>
        </>
      )}
    </button>
  )
}

export default function AppointmentList({ appointments }: Props) {
  const { lang } = useLanguage()
  const [, setTick] = useState(0)
  useEffect(() => {
    const iv = setInterval(() => setTick(n => n + 1), 60000)
    return () => clearInterval(iv)
  }, [])

  const active = appointments.filter(a => a.status !== 'cancelled')
  if (!active.length) return null

  return (
    <div className="mb-7">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3">
        {t(lang).appointments.schedule}
      </p>

      <div className="space-y-4">
        {groupByDay(active).map(([day, dayAppts]) => (
          <div key={day}>
            <p className="text-[11px] font-medium text-gray-500 mb-1.5 capitalize">{formatDayHeader(day, lang)}</p>

            <div className="rounded-xl overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] divide-y divide-[#d4c9b8]" style={{ backgroundColor: '#f0ebe3', border: '0.5px solid #d4c9b8' }}>
              {dayAppts.map(appt => {
                const { label, variant } = getTimeLabel(appt.scheduled_at!, lang)
                const done = appt.status === 'completed'
                const live = appt.status === 'in_progress'
                const isUrgent = variant === 'urgent'

                return (
                  <div
                    key={appt.id}
                    className={`flex items-center gap-3.5 px-4 py-3 transition-colors ${
                      isUrgent ? 'bg-amber-50/70' : done ? 'opacity-50' : 'hover:bg-[#e8e0d4]/60'
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

                    {/* Напоминание */}
                    {!done && (
                      <CopyReminderButton name={appt.patients.name} scheduledAt={appt.scheduled_at!} lang={lang} />
                    )}

                    {/* Действие */}
                    <div className="shrink-0">
                      {done ? (
                        <Link
                          href={`/patients/${appt.patients.id}/consultations/${appt.id}`}
                          className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {t(lang).appointments.open} →
                        </Link>
                      ) : live ? (
                        <Link
                          href={`/patients/${appt.patients.id}/consultations/${appt.id}`}
                          className="text-[11px] bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition-colors font-semibold shadow-sm"
                        >
                          {t(lang).appointments.continue} →
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
                            {t(lang).appointments.start} →
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
