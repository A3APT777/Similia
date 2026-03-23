import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { notFound } from 'next/navigation'
import IntakeForm from './IntakeForm'
import type { ScheduleConfig } from '@/lib/slots'

export default async function IntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: intake } = await supabase
    .from('intake_forms')
    .select('*')
    .eq('token', token)
    .single()

  // Токен не найден или ссылка просрочена
  if (!intake || (intake.expires_at && new Date(intake.expires_at) < new Date())) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Ссылка недействительна</h1>
          <p className="text-gray-500 text-sm">Срок действия этой ссылки истёк. Попросите врача отправить новую.</p>
        </div>
      </div>
    )
  }

  if (intake.status === 'completed') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Анкета уже заполнена</h1>
          <p className="text-gray-500 text-sm">Спасибо! Ваши ответы получены. Врач ознакомится с ними перед консультацией.</p>
        </div>
      </div>
    )
  }

  // Предзаполнение данных если анкета привязана к существующему пациенту
  let prefilled: { name?: string; phone?: string; birth_date?: string; email?: string } | undefined
  if (intake.patient_id) {
    const { data: patient } = await supabase
      .from('patients')
      .select('name, phone, birth_date, email')
      .eq('id', intake.patient_id)
      .single()
    if (patient) {
      prefilled = {
        name: patient.name || undefined,
        phone: patient.phone || undefined,
        birth_date: patient.birth_date || undefined,
        email: patient.email || undefined,
      }
    }
  }

  // Расписание врача — для блока записи на приём в конце анкеты
  const serviceSupabase = createServiceClient()
  const { data: scheduleData } = await serviceSupabase
    .from('doctor_schedules')
    .select('*')
    .eq('doctor_id', intake.doctor_id)
    .single()
  const schedule: ScheduleConfig | null = scheduleData ?? null

  return (
    <IntakeForm
      token={token}
      patientName={intake.patient_name || ''}
      type={intake.type ?? 'primary'}
      prefilled={prefilled}
      schedule={schedule}
      doctorId={intake.doctor_id}
    />
  )
}
