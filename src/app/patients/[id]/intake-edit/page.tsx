import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import AppShell from '@/components/AppShell'
import IntakeForm from '@/app/intake/[token]/IntakeForm'
import { IntakeAnswers } from '@/types'

export default async function IntakeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: patient } = await supabase
    .from('patients')
    .select('id, name')
    .eq('id', id)
    .eq('doctor_id', user.id)
    .single()

  if (!patient) notFound()

  const { data: existingIntake } = await supabase
    .from('intake_forms')
    .select('answers, type')
    .eq('patient_id', id)
    .eq('status', 'completed')
    .eq('type', 'primary')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return (
    <AppShell>
      <IntakeForm
        token=""
        patientName={patient.name}
        type="primary"
        doctorPatientId={id}
        initialAnswers={(existingIntake?.answers as IntakeAnswers) || undefined}
      />
    </AppShell>
  )
}
