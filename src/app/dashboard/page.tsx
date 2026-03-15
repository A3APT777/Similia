import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AppShell from '@/components/AppShell'
import PatientListClient from './PatientListClient'
import AppointmentList from './AppointmentList'
import MoscowClock from '@/components/MoscowClock'
import CalendarWidget from './CalendarWidget'
import SendIntakeButton from './SendIntakeButton'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const in30days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: appointments } = await supabase
    .from('consultations')
    .select('*, patients(id, name, phone)')
    .not('scheduled_at', 'is', null)
    .gte('scheduled_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .lte('scheduled_at', in30days)
    .neq('status', 'cancelled')
    .order('scheduled_at', { ascending: true })

  const { data: patients } = await supabase
    .from('patients')
    .select('*')
    .order('updated_at', { ascending: false })

  // Один запрос для всех последних консультаций вместо N+1
  const patientIds = (patients || []).map(p => p.id)
  const { data: allLastConsultations } = patientIds.length > 0
    ? await supabase
        .from('consultations')
        .select('patient_id, date, notes, remedy')
        .in('patient_id', patientIds)
        .eq('status', 'completed')
        .order('date', { ascending: false })
    : { data: [] }

  const lastConsultationMap = new Map<string, { date: string; notes: string | null; remedy: string | null }>()
  for (const c of (allLastConsultations || [])) {
    if (!lastConsultationMap.has(c.patient_id)) {
      lastConsultationMap.set(c.patient_id, c)
    }
  }

  const patientsWithConsultations = (patients || []).map(patient => {
    const last = lastConsultationMap.get(patient.id) || null
    return {
      ...patient,
      last_consultation_date: last?.date || null,
      last_consultation_preview: last?.notes || null,
      pending_prescription: last ? !last.remedy : false,
    }
  })

  const patientsList = (patients || []).map(p => ({ id: p.id, name: p.name }))
  const name = user?.user_metadata?.name || user?.email || ''
  const firstName = name.split(' ')[0] || name

  // Приёмы сегодня (по МСК)
  const todayMsk = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
  const todayAppointments = (appointments || []).filter(a => {
    const d = new Date(a.scheduled_at!).toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
    return d === todayMsk
  })

  return (
    <AppShell>
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-5 lg:py-7 flex flex-col lg:flex-row gap-5 lg:gap-7 items-start">

        {/* ─── Левая колонка ─── */}
        <div className="flex-1 min-w-0 w-full">

          {/* Приветствие */}
          <div className="mb-5 lg:mb-7">
            <h1 className="text-[20px] lg:text-[22px] font-semibold text-gray-900 tracking-tight leading-tight">
              Добрый день, {firstName}
            </h1>
            <p className="text-[13px] text-gray-400 mt-1">
              {todayAppointments.length > 0
                ? `Сегодня ${todayAppointments.length} ${todayAppointments.length === 1 ? 'приём' : todayAppointments.length < 5 ? 'приёма' : 'приёмов'} · ${(patients || []).length} пациентов`
                : `${(patients || []).length} пациентов · Сегодня нет приёмов`}
            </p>
          </div>

          <AppointmentList appointments={(appointments || []) as any} />

          {/* Заголовок списка пациентов */}
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3">
            Пациенты
          </p>

          {/* Анкеты для новых пациентов */}
          <div className="mb-3">
            <SendIntakeButton />
          </div>

          <PatientListClient patients={patientsWithConsultations} />
        </div>

        {/* ─── Правая колонка ─── */}
        <div className="w-full lg:w-[260px] lg:shrink-0 lg:sticky lg:top-7">
          <div className="hidden lg:block">
            <MoscowClock />
          </div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-3 lg:hidden">
            Календарь
          </p>
          <CalendarWidget patients={patientsList} />
        </div>

      </div>
    </AppShell>
  )
}
