import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import LogoutButton from '@/components/LogoutButton'
import { getLang } from '@/lib/i18n-server'
import { t } from '@/lib/i18n'
import { getSubscription } from '@/lib/actions/subscription'
import { canUseAI } from '@/lib/subscription'
import AIConsultationClient from './AIConsultationClient'
import type { Consultation, IntakeForm } from '@/types'

export default async function AIConsultationPage({
  params,
}: {
  params: Promise<{ patientId: string }>
}) {
  const { patientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Проверка AI-доступа: нет подписки/кредитов → демо
  const sub = await getSubscription()
  const { data: aiSettings } = await supabase
    .from('doctor_settings')
    .select('ai_credits')
    .eq('doctor_id', user.id)
    .single()
  if (!canUseAI(sub, aiSettings?.ai_credits ?? 0)) {
    redirect('/demo')
  }

  const lang = await getLang()
  const s = t(lang)

  // Загрузить пациента
  const { data: patient } = await supabase
    .from('patients')
    .select('*')
    .eq('id', patientId)
    .eq('doctor_id', user.id)
    .single()

  if (!patient) notFound()

  // Параллельно: последние 5 консультаций, последняя intake-анкета (обычная + AI)
  const [
    { data: consultations },
    { data: intakeForms },
  ] = await Promise.all([
    supabase
      .from('consultations')
      .select('*')
      .eq('patient_id', patientId)
      .eq('doctor_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('intake_forms')
      .select('*')
      .eq('patient_id', patientId)
      .eq('doctor_id', user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(2),
  ])

  const name = user?.user_metadata?.name || user?.email || ''

  return (
    <div className="min-h-[100dvh] bg-[#ede7dd] flex flex-col">
      {/* Шапка */}
      <nav className="h-[54px] bg-[#ede7dd] border-b border-gray-100 px-5 flex items-center justify-between shrink-0 sticky top-0 z-10">
        <Link
          href={`/patients/${patientId}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors group"
        >
          <svg className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium truncate max-w-[140px] sm:max-w-none">{patient.name}</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-indigo-500 font-medium">{s.ai.consultation.title}</span>
          <span className="text-xs text-gray-300 hidden sm:block">{name.split(' ')[0]}</span>
          <LogoutButton dark={false} />
        </div>
      </nav>

      <AIConsultationClient
        patient={patient}
        consultations={(consultations ?? []) as Consultation[]}
        intakeForms={(intakeForms ?? []) as IntakeForm[]}
        lang={lang}
      />
    </div>
  )
}
