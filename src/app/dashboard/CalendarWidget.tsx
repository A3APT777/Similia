'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getAppointmentsByMonth, scheduleConsultation, startConsultation } from '@/lib/actions/consultations'
import { t } from '@/lib/shared/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import { toMskDateStr, toMskTime, todayMsk, nowMsk, getUrgency } from '@/lib/shared/date-utils'

type CalendarAppt = {
  id: string
  scheduled_at: string
  status: string
  patient_id: string
  patients: { id: string; name: string } | null
}

import { generateSlots, type ScheduleConfig } from '@/lib/slots'
import type { PatientPreview } from '@/types'

// Дефолтное расписание если не передано
const DEFAULT_SCHEDULE: ScheduleConfig = {
  session_duration: 45, break_duration: 15,
  working_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  start_time: '09:00', end_time: '18:00',
  lunch_enabled: true, lunch_start: '13:00', lunch_end: '14:00',
}

export default function CalendarWidget({ patients, lastRemedyMap, schedule }: { patients: PatientPreview[]; lastRemedyMap?: Record<string, string>; schedule?: ScheduleConfig | null }) {
  const { lang } = useLanguage()
  const router = useRouter()
  const today = todayMsk()
  const initial = nowMsk()

  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [appointments, setAppointments] = useState<CalendarAppt[]>([])
  const [selectedDay, setSelectedDay] = useState<string>(today)
  const initializedRef = useRef(false)
  const [showCompleted, setShowCompleted] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [addPatientId, setAddPatientId] = useState('')
  const [addTime, setAddTime] = useState('10:00')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')
  const [patientDropdownOpen, setPatientDropdownOpen] = useState(false)

  useEffect(() => {
    getAppointmentsByMonth(year, month).then(setAppointments)
  }, [year, month])

  // При первой загрузке — переходим к ближайшему будущему приёму
  useEffect(() => {
    if (appointments.length === 0 || initializedRef.current) return
    initializedRef.current = true
    const now = new Date()
    const next = appointments
      .filter(a => a.status !== 'cancelled' && new Date(a.scheduled_at) > now)
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0]
    if (next) {
      const nextDate = toMskDateStr(next.scheduled_at)
      setSelectedDay(nextDate)
      const [y, m] = nextDate.split('-').map(Number)
      if (y !== initial.year || m !== initial.month) { setYear(y); setMonth(m) }
    }
  }, [appointments])

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const rawFirstDay = new Date(year, month - 1, 1).getDay()
  const offset = rawFirstDay === 0 ? 6 : rawFirstDay - 1

  const apptsByDay: Record<string, CalendarAppt[]> = {}
  for (const appt of appointments) {
    const d = toMskDateStr(appt.scheduled_at)
    if (!apptsByDay[d]) apptsByDay[d] = []
    apptsByDay[d].push(appt)
  }

  const now = new Date()
  const allDayAppts = (apptsByDay[selectedDay] || [])
    .filter(a => a.status !== 'cancelled')
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())

  const completedDayAppts = allDayAppts.filter(a => a.status === 'completed')
  const activeDayAppts = allDayAppts.filter(a => a.status !== 'completed')
  const visibleDayAppts = showCompleted ? allDayAppts : activeDayAppts

  // для формы записи — исключаем завершённые и приёмы > 1ч назад
  const selectedAppts = allDayAppts.filter(a =>
    a.status !== 'completed' &&
    new Date(a.scheduled_at) > new Date(now.getTime() - 60 * 60 * 1000)
  )

  // Занятые слоты — время уже записанных приёмов
  const bookedSlots = selectedAppts.map(a => toMskTime(a.scheduled_at))

  // Генерируем свободные слоты на основе расписания врача
  const activeSchedule = schedule || DEFAULT_SCHEDULE
  const freeSlots = generateSlots(activeSchedule, selectedDay, bookedSlots)

  function formatSelectedDay(dateStr: string) {
    const [y, mo, d] = dateStr.split('-').map(Number)
    return new Date(Date.UTC(y, mo - 1, d, 12)).toLocaleDateString('ru-RU', {
      timeZone: 'UTC',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  function handleDayClick(dateStr: string) {
    setSelectedDay(dateStr)
    setShowAdd(false)
    setShowCompleted(false)
    setPatientSearch('')
    setAddPatientId('')
    setAddError('')
  }

  async function handleAdd() {
    if (!addPatientId || !selectedDay) return
    setAddLoading(true)
    setAddError('')
    try {
      const [y, mo, d] = selectedDay.split('-').map(Number)
      const [h, mi] = addTime.split(':').map(Number)
      const utcIso = new Date(Date.UTC(y, mo - 1, d, h, mi) - 3 * 3600 * 1000).toISOString()
      await scheduleConsultation(addPatientId, utcIso)
      const data = await getAppointmentsByMonth(year, month)
      setAppointments(data)
      router.refresh()
      setShowAdd(false)
      setPatientSearch('')
      setAddPatientId('')
    } catch {
      setAddError(t(lang).calendar.saveFailed)
    } finally {
      setAddLoading(false)
    }
  }

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(patientSearch.toLowerCase())
  )

  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ backgroundColor: '#f5f0e8', border: '1px solid var(--sim-border)' }}>
      {/* Шапка: навигация по месяцам */}
      <div className="flex items-center justify-between px-4 py-2" style={{ borderBottom: '0.5px solid var(--sim-border)' }}>
        <button
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors text-base leading-none"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-gray-700">{t(lang).calendar.months[month - 1]} {year}</p>
        <button
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors text-base leading-none"
        >
          ›
        </button>
      </div>

      {/* Дни недели */}
      <div className="grid grid-cols-7 px-2 pt-2.5">
        {t(lang).calendar.weekdays.map(d => (
          <div key={d} className="text-center text-[12px] font-semibold text-gray-300 uppercase tracking-wide py-1">{d}</div>
        ))}
      </div>

      {/* Сетка дней */}
      <div className="grid grid-cols-7 px-2 pb-2 gap-y-0.5">
        {Array.from({ length: offset }).map((_, i) => <div key={`pad${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const isToday = dateStr === today
          const isSelected = dateStr === selectedDay
          const apptCount = (apptsByDay[dateStr] || []).length
          const isWeekend = ((offset + i) % 7) >= 5

          return (
            <button
              key={dateStr}
              onClick={() => handleDayClick(dateStr)}
              className={`flex flex-col items-center py-1 rounded-xl transition-all ${
                isSelected
                  ? 'bg-[#2d6a4f] text-white'
                  : isToday
                  ? 'bg-emerald-50 text-emerald-800 font-bold'
                  : isWeekend
                  ? 'text-gray-400 hover:bg-gray-50'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span className="text-xs leading-none">{day}</span>
              <span className={`w-1 h-1 rounded-full mt-1 ${
                apptCount > 0
                  ? isSelected ? 'bg-emerald-300' : 'bg-[#2d6a4f]'
                  : 'opacity-0'
              }`} />
            </button>
          )
        })}
      </div>

      {/* Панель выбранного дня */}
      <div className="px-3 py-2" style={{ borderTop: '0.5px solid var(--sim-border)' }}>
        <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide capitalize mb-2">
          {formatSelectedDay(selectedDay)}
        </p>

        {visibleDayAppts.length === 0 && !showAdd && (
          <p className="text-[12px] text-gray-300 italic mb-2">{t(lang).calendar.noAppointments}</p>
        )}

        <div className="space-y-0.5 mb-1.5">
          {visibleDayAppts.map(appt => {
            const urgency = getUrgency(appt.scheduled_at)
            const isUrgent = urgency === 'urgent'
            const done = appt.status === 'completed'
            const live = appt.status === 'in_progress'
            const remedy = lastRemedyMap?.[appt.patient_id]
            return (
              <div
                key={appt.id}
                className={`flex items-center gap-2 rounded-full px-2 py-1.5 ${isUrgent ? 'bg-amber-50' : ''} ${done ? 'opacity-50' : ''}`}
              >
                <span className={`text-[12px] font-mono font-semibold w-9 shrink-0 tabular-nums ${isUrgent ? 'text-amber-600' : 'text-gray-500'}`}>
                  {toMskTime(appt.scheduled_at)}
                </span>
                <Link href={`/patients/${appt.patient_id}`} className="flex-1 min-w-0">
                  <p className={`text-[12px] font-medium truncate transition-colors ${done ? 'text-gray-500' : 'text-gray-800 hover:text-emerald-700'}`}>
                    {appt.patients?.name}
                  </p>
                  {remedy && (
                    <p className="text-[12px] text-gray-400 truncate leading-tight">{remedy}</p>
                  )}
                </Link>
                {done ? (
                  <Link
                    href={`/patients/${appt.patient_id}`}
                    className="text-[12px] text-gray-400 hover:text-gray-600 shrink-0 transition-colors"
                  >→</Link>
                ) : live ? (
                  <Link
                    href={`/patients/${appt.patient_id}`}
                    className="text-[12px] bg-[#2d6a4f] text-white px-2 py-1 rounded-full font-semibold shrink-0"
                  >→</Link>
                ) : (
                  <form action={startConsultation.bind(null, appt.id, appt.patient_id)}>
                    <button
                      type="submit"
                      className={`text-[12px] px-2 py-1 rounded-full font-medium shrink-0 transition-colors ${isUrgent ? 'bg-amber-500 text-white' : 'border border-gray-200 text-gray-500 hover:border-emerald-300 hover:text-emerald-700'}`}
                    >→</button>
                  </form>
                )}
              </div>
            )
          })}
        </div>

        {completedDayAppts.length > 0 && (
          <button
            onClick={() => setShowCompleted(v => !v)}
            className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors mb-1.5 block"
          >
            {showCompleted
              ? (lang === 'ru' ? '↑ Скрыть завершённые' : '↑ Hide completed')
              : (lang === 'ru' ? `+ Завершённые (${completedDayAppts.length})` : `+ Completed (${completedDayAppts.length})`)}
          </button>
        )}

        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="text-[12px] text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
          >
            {t(lang).calendar.addAppointment}
          </button>
        )}

        {showAdd && (
          <div className="mt-3 space-y-2.5 border-t border-gray-50 pt-3">
            {/* Поиск пациента */}
            <div className="relative">
              <input
                type="text"
                placeholder={t(lang).calendar.patientName}
                value={patientSearch}
                onChange={e => { setPatientSearch(e.target.value); setAddPatientId(''); setPatientDropdownOpen(true) }}
                onFocus={() => setPatientDropdownOpen(true)}
                onBlur={() => setTimeout(() => setPatientDropdownOpen(false), 150)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-[#2d6a4f]/30/10"
                autoFocus
              />
              {patientDropdownOpen && !addPatientId && filteredPatients.length > 0 && (
                <div className="absolute z-10 w-full top-full mt-0.5 rounded-xl shadow-lg overflow-hidden" style={{ backgroundColor: '#f5f0e8', border: '1px solid var(--sim-border)' }}>
                  {filteredPatients.slice(0, 5).map(p => (
                    <button
                      key={p.id}
                      onClick={() => { setAddPatientId(p.id); setPatientSearch(p.name) }}
                      className="w-full text-left text-xs px-3 py-2 hover:bg-emerald-50 transition-colors"
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Слоты времени */}
            <div>
              <p className="text-[12px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t(lang).calendar.time}</p>
              {freeSlots.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {freeSlots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setAddTime(slot)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        addTime === slot
                          ? 'bg-[#2d6a4f] text-white border-[#2d6a4f] shadow-sm'
                          : 'border-gray-200 text-gray-600 hover:border-emerald-300 hover:text-emerald-700'
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-red-400">{t(lang).calendar.dayFull}</p>
              )}
            </div>

            {addError && <p className="text-xs text-red-500">{addError}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!addPatientId || addLoading || freeSlots.length === 0}
                className="flex-1 text-xs bg-[#2d6a4f] text-white py-2 rounded-xl hover:bg-(--sim-forest) disabled:opacity-40 transition-colors font-semibold shadow-sm"
              >
                {addLoading ? t(lang).calendar.saving : t(lang).calendar.save}
              </button>
              <button
                onClick={() => { setShowAdd(false); setPatientSearch(''); setAddPatientId(''); setPatientDropdownOpen(false) }}
                className="text-xs text-gray-400 hover:text-gray-600 px-3 transition-colors"
              >
                {t(lang).calendar.cancel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
