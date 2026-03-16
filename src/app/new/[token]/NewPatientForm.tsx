'use client'

import { useState } from 'react'
import { getBookedSlots } from '@/lib/actions/newPatient'
import { generateSlots } from '@/lib/slots'
import { submitNewPatientBooking } from '@/lib/actions/newPatient'

type Schedule = {
  session_duration: number
  break_duration: number
  working_days: string[]
  start_time: string
  end_time: string
  lunch_enabled: boolean
  lunch_start: string
  lunch_end: string
}

type Props = {
  token: string
  doctorId: string
  schedule: Schedule | null
}

const DEFAULT_SCHEDULE: Schedule = {
  session_duration: 45,
  break_duration: 15,
  working_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  start_time: '09:00',
  end_time: '18:00',
  lunch_enabled: true,
  lunch_start: '13:00',
  lunch_end: '14:00',
}

const DURATION_OPTIONS = [
  { value: 'less_month', label: 'Менее месяца' },
  { value: '1_6_months', label: '1–6 месяцев' },
  { value: '6_12_months', label: '6–12 месяцев' },
  { value: 'more_year', label: 'Более года' },
  { value: 'long_time', label: 'Давно' },
]

const DAY_MAP: Record<number, string> = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' }

export default function NewPatientForm({ token, doctorId, schedule: scheduleProp }: Props) {
  const schedule = scheduleProp || DEFAULT_SCHEDULE
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Step 1 fields
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [complaints, setComplaints] = useState('')
  const [duration, setDuration] = useState('')
  const [prevTreatment, setPrevTreatment] = useState('')
  const [allergies, setAllergies] = useState('')
  const [medications, setMedications] = useState('no')
  const [medicationsList, setMedicationsList] = useState('')

  // Consent
  const [consent, setConsent] = useState(false)

  // Step 2 fields
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [slots, setSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  // Generate calendar days (30 days ahead)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const calendarDays = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    return d
  })

  function isWorkDay(date: Date): boolean {
    const day = DAY_MAP[date.getDay()]
    return schedule.working_days.includes(day)
  }

  async function handleSelectDate(dateStr: string) {
    setSelectedDate(dateStr)
    setSelectedTime(null)
    setLoadingSlots(true)
    const booked = await getBookedSlots(doctorId, dateStr)
    const available = generateSlots(schedule, dateStr, booked)
    setSlots(available)
    setLoadingSlots(false)
  }

  function handleStep1Submit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !phone.trim() || !complaints.trim() || !duration) {
      setError('Заполните все обязательные поля')
      return
    }
    if (!consent) {
      setError('Необходимо дать согласие на обработку персональных данных')
      return
    }
    setError(null)
    setStep(2)
  }

  async function handleSubmit() {
    if (!selectedDate || !selectedTime) return
    setSubmitting(true)
    setError(null)
    const result = await submitNewPatientBooking(token, {
      name, birth_date: birthDate, phone, email,
      complaints, duration, previous_treatment: prevTreatment,
      allergies, medications, medications_list: medicationsList,
      date: selectedDate, time: selectedTime,
    })
    if (result.success) {
      setSuccess(result.appointmentDate || '')
    } else {
      setError(result.error || 'Произошла ошибка')
    }
    setSubmitting(false)
  }

  const inputStyle = {
    width: '100%', backgroundColor: '#faf7f2',
    border: '1px solid #d4c9b8', borderRadius: '8px',
    padding: '12px 14px', fontSize: '16px', color: '#1a1a0a',
    outline: 'none', boxSizing: 'border-box' as const,
  }
  const labelStyle = { display: 'block', fontSize: '13px', fontWeight: 600, color: '#9a8a6a', marginBottom: '6px', textTransform: 'uppercase' as const, letterSpacing: '0.05em' }

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-6">🌿</div>
        <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '32px', fontWeight: 400, color: '#1a3020', marginBottom: '12px' }}>
          Вы записаны!
        </h2>
        <p style={{ fontSize: '18px', color: '#2d6a4f', fontWeight: 500, marginBottom: '16px' }}>{success}</p>
        <p style={{ fontSize: '15px', color: '#9a8a6a', lineHeight: 1.6 }}>
          Врач свяжется с вами для подтверждения перед приёмом.
        </p>
      </div>
    )
  }

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-8">
        <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#1a3020', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f7f3ed', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>1</div>
        <div style={{ flex: 1, height: '2px', backgroundColor: step >= 2 ? '#1a3020' : '#d4c9b8' }} />
        <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: step >= 2 ? '#1a3020' : '#f0ebe3', border: step >= 2 ? 'none' : '2px solid #d4c9b8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: step >= 2 ? '#f7f3ed' : '#9a8a6a', fontSize: '13px', fontWeight: 600, flexShrink: 0 }}>2</div>
        <p style={{ fontSize: '13px', color: '#9a8a6a', flexShrink: 0 }}>Шаг {step} из 2</p>
      </div>

      {step === 1 && (
        <form onSubmit={handleStep1Submit}>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '28px', fontWeight: 400, color: '#1a1a0a', marginBottom: '6px' }}>Первичная анкета</h2>
          <p style={{ fontSize: '15px', color: '#9a8a6a', marginBottom: '28px', lineHeight: 1.5 }}>
            Заполните до первого приёма — это сэкономит время на консультации
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={labelStyle}>Имя *</label>
              <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="Иванова Мария Петровна" required />
            </div>
            <div>
              <label style={labelStyle}>Дата рождения</label>
              <input type="date" style={inputStyle} value={birthDate} onChange={e => setBirthDate(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Телефон *</label>
              <input type="tel" style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} placeholder="+7 900 000 00 00" required />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input type="email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="example@mail.ru" />
            </div>
            <div>
              <label style={labelStyle}>Главные жалобы *</label>
              <textarea style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} value={complaints} onChange={e => setComplaints(e.target.value)} placeholder="Опишите, что вас беспокоит..." required />
            </div>
            <div>
              <label style={labelStyle}>Как давно беспокоит *</label>
              <select style={inputStyle} value={duration} onChange={e => setDuration(e.target.value)} required>
                <option value="">— выберите —</option>
                {DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Что пробовали лечить раньше</label>
              <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={prevTreatment} onChange={e => setPrevTreatment(e.target.value)} placeholder="Препараты, процедуры, врачи..." />
            </div>
            <div>
              <label style={labelStyle}>Аллергии и особые реакции</label>
              <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={allergies} onChange={e => setAllergies(e.target.value)} placeholder="На лекарства, продукты, другое..." />
            </div>
            <div>
              <label style={labelStyle}>Принимаете ли сейчас лекарства?</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                {['no', 'yes'].map(v => (
                  <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '16px', color: '#3a2e1a' }}>
                    <input type="radio" name="medications" value={v} checked={medications === v} onChange={() => setMedications(v)} style={{ width: 18, height: 18, accentColor: '#1a3020' }} />
                    {v === 'yes' ? 'Да' : 'Нет'}
                  </label>
                ))}
              </div>
              {medications === 'yes' && (
                <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', marginTop: '10px' }} value={medicationsList} onChange={e => setMedicationsList(e.target.value)} placeholder="Укажите какие препараты..." />
              )}
            </div>
          </div>

          {/* Согласие на обработку персональных данных (152-ФЗ) */}
          <div style={{ marginTop: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={consent}
                onChange={e => setConsent(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: '2px', accentColor: '#1a3020', flexShrink: 0 }}
              />
              <span style={{ fontSize: '13px', color: '#9a8a6a', lineHeight: 1.5 }}>
                Я согласен(на) на обработку моих персональных данных в соответствии с{' '}
                <a href="/privacy" target="_blank" style={{ color: '#2d6a4f', textDecoration: 'underline' }}>
                  политикой конфиденциальности
                </a>
                . Данные используются исключительно для организации консультации.
              </span>
            </label>
          </div>

          {error && <p style={{ color: '#c0392b', fontSize: '14px', marginTop: '16px' }}>{error}</p>}

          <button
            type="submit"
            disabled={!consent}
            style={{ width: '100%', marginTop: '28px', backgroundColor: consent ? '#1a3020' : '#d4c9b8', color: consent ? '#f7f3ed' : '#9a8a6a', border: 'none', borderRadius: '10px', padding: '14px', fontSize: '16px', fontWeight: 600, cursor: consent ? 'pointer' : 'default' }}
          >
            Далее — выбрать время →
          </button>
        </form>
      )}

      {step === 2 && (
        <div>
          <button onClick={() => setStep(1)} style={{ fontSize: '14px', color: '#9a8a6a', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '16px', padding: 0 }}>
            ← Вернуться к анкете
          </button>
          <h2 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '28px', fontWeight: 400, color: '#1a1a0a', marginBottom: '24px' }}>Выберите удобное время</h2>

          {/* Calendar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '24px' }}>
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: '12px', color: '#9a8a6a', fontWeight: 600, paddingBottom: '4px' }}>{d}</div>
            ))}
            {/* Пустые ячейки для выравнивания первой недели */}
            {Array.from({ length: (calendarDays[0].getDay() + 6) % 7 }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {calendarDays.map(date => {
              const dateStr = date.toISOString().split('T')[0]
              const isWork = isWorkDay(date)
              const isSelected = selectedDate === dateStr
              return (
                <button
                  key={dateStr}
                  onClick={() => isWork ? handleSelectDate(dateStr) : undefined}
                  disabled={!isWork}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #1a3020' : '1px solid transparent',
                    backgroundColor: isSelected ? '#1a3020' : isWork ? '#e8f0e8' : '#f0ebe3',
                    color: isSelected ? '#f7f3ed' : isWork ? '#1a3020' : '#c4b89a',
                    fontSize: '14px',
                    fontWeight: isSelected ? 600 : 400,
                    cursor: isWork ? 'pointer' : 'default',
                    textAlign: 'center',
                  }}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div style={{ marginBottom: '24px' }}>
              <p style={{ fontSize: '14px', color: '#9a8a6a', marginBottom: '12px', fontWeight: 600 }}>
                {new Date(selectedDate + 'T12:00:00').toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}
              </p>
              {loadingSlots ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9a8a6a', fontSize: '14px' }}>
                  <span style={{ width: 16, height: 16, border: '2px solid #d4c9b8', borderTopColor: '#2d6a4f', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                  Загружаю слоты...
                </div>
              ) : slots.length === 0 ? (
                <p style={{ color: '#9a8a6a', fontSize: '14px' }}>На этот день нет свободных слотов</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {slots.map(slot => (
                    <button
                      key={slot}
                      onClick={() => setSelectedTime(slot)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: selectedTime === slot ? '2px solid #1a3020' : '1px solid #d4c9b8',
                        backgroundColor: selectedTime === slot ? '#1a3020' : '#faf7f2',
                        color: selectedTime === slot ? '#f7f3ed' : '#3a2e1a',
                        fontSize: '15px',
                        fontWeight: selectedTime === slot ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p style={{ color: '#c0392b', fontSize: '14px', marginBottom: '16px' }}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!selectedDate || !selectedTime || submitting}
            style={{
              width: '100%',
              backgroundColor: selectedDate && selectedTime ? '#1a3020' : '#d4c9b8',
              color: selectedDate && selectedTime ? '#f7f3ed' : '#9a8a6a',
              border: 'none', borderRadius: '10px', padding: '14px',
              fontSize: '16px', fontWeight: 600,
              cursor: selectedDate && selectedTime ? 'pointer' : 'default',
            }}
          >
            {submitting ? 'Записываю...' : 'Записаться'}
          </button>
        </div>
      )}
    </div>
  )
}
