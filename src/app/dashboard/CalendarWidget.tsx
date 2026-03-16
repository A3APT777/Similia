'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAppointmentsByMonth, scheduleConsultation } from '@/lib/actions/consultations'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

type CalendarAppt = {
  id: string
  scheduled_at: string
  status: string
  patient_id: string
  patients: { id: string; name: string } | null
}

type Patient = { id: string; name: string }

const HOUR_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00']

function toMskDateStr(iso: string) {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
}

function toMskTime(iso: string) {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function todayMsk() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
}

function nowMsk() {
  const d = todayMsk().split('-').map(Number)
  return { year: d[0], month: d[1] }
}

export default function CalendarWidget({ patients }: { patients: Patient[] }) {
  const { lang } = useLanguage()
  const router = useRouter()
  const today = todayMsk()
  const initial = nowMsk()

  const [year, setYear] = useState(initial.year)
  const [month, setMonth] = useState(initial.month)
  const [appointments, setAppointments] = useState<CalendarAppt[]>([])
  const [selectedDay, setSelectedDay] = useState<string>(today)
  const [showAdd, setShowAdd] = useState(false)
  const [patientSearch, setPatientSearch] = useState('')
  const [addPatientId, setAddPatientId] = useState('')
  const [addTime, setAddTime] = useState('10:00')
  const [addLoading, setAddLoading] = useState(false)
  const [addError, setAddError] = useState('')

  useEffect(() => {
    getAppointmentsByMonth(year, month).then(setAppointments)
  }, [year, month])

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

  const selectedAppts = apptsByDay[selectedDay] || []

  const busyMins = selectedAppts.map(a => {
    const t = toMskTime(a.scheduled_at)
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  })

  const freeSlots = HOUR_SLOTS.filter(slot => {
    const [h, m] = slot.split(':').map(Number)
    return !busyMins.some(b => Math.abs(b - h * 60 + m) < 60)
  })

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
    <div className="rounded-2xl overflow-hidden shadow-sm" style={{ backgroundColor: '#f5f0e8', border: '1px solid #d4c9b8' }}>
      {/* Шапка: навигация по месяцам */}
      <div className="flex items-center justify-between px-4 py-3.5" style={{ borderBottom: '0.5px solid #d4c9b8' }}>
        <button
          onClick={prevMonth}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-base leading-none"
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-gray-700">{t(lang).calendar.months[month - 1]} {year}</p>
        <button
          onClick={nextMonth}
          className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-base leading-none"
        >
          ›
        </button>
      </div>

      {/* Дни недели */}
      <div className="grid grid-cols-7 px-2 pt-2.5">
        {t(lang).calendar.weekdays.map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-gray-300 uppercase tracking-wide py-1">{d}</div>
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
              className={`flex flex-col items-center py-1.5 rounded-xl transition-all ${
                isSelected
                  ? 'bg-emerald-600 text-white'
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
                  ? isSelected ? 'bg-emerald-300' : 'bg-emerald-500'
                  : 'opacity-0'
              }`} />
            </button>
          )
        })}
      </div>

      {/* Панель выбранного дня */}
      <div className="px-4 py-3" style={{ borderTop: '0.5px solid #d4c9b8' }}>
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-xs font-semibold text-gray-500 capitalize">
            {formatSelectedDay(selectedDay)}
          </p>
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold transition-colors"
            >
              {t(lang).calendar.addAppointment}
            </button>
          )}
        </div>

        {selectedAppts.length === 0 && !showAdd && (
          <p className="text-xs text-gray-300 italic">{t(lang).calendar.noAppointments}</p>
        )}

        <div className="space-y-1 mb-2">
          {selectedAppts.map(appt => (
            <div key={appt.id} className="flex items-center gap-2.5">
              <span className="text-xs font-mono font-medium text-gray-500 w-10 shrink-0 tabular-nums">
                {toMskTime(appt.scheduled_at)}
              </span>
              <div className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
              <span className="text-xs text-gray-700 truncate">{appt.patients?.name}</span>
            </div>
          ))}
        </div>

        {showAdd && (
          <div className="mt-3 space-y-2.5 border-t border-gray-50 pt-3">
            {/* Поиск пациента */}
            <div className="relative">
              <input
                type="text"
                placeholder={t(lang).calendar.patientName}
                value={patientSearch}
                onChange={e => { setPatientSearch(e.target.value); setAddPatientId('') }}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
                autoFocus
              />
              {patientSearch.length > 0 && !addPatientId && filteredPatients.length > 0 && (
                <div className="absolute z-10 w-full top-full mt-0.5 rounded-xl shadow-lg overflow-hidden" style={{ backgroundColor: '#f5f0e8', border: '1px solid #d4c9b8' }}>
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
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{t(lang).calendar.time}</p>
              {freeSlots.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {freeSlots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setAddTime(slot)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                        addTime === slot
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
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
                className="flex-1 text-xs bg-emerald-600 text-white py-2 rounded-xl hover:bg-emerald-700 disabled:opacity-40 transition-colors font-semibold shadow-sm"
              >
                {addLoading ? t(lang).calendar.saving : t(lang).calendar.save}
              </button>
              <button
                onClick={() => { setShowAdd(false); setPatientSearch(''); setAddPatientId('') }}
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
