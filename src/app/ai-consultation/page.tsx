import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { getLang } from '@/lib/i18n-server'
import AIConsultationDirect from './AIConsultationDirect'
import { getAIStatus } from '@/lib/actions/ai-consultation'

export default async function AIConsultationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const lang = await getLang()

  const [{ data: patients }, aiStatus] = await Promise.all([
    supabase
      .from('patients')
      .select('id, name, constitutional_type')
      .eq('doctor_id', user.id)
      .eq('is_demo', false)
      .order('updated_at', { ascending: false })
      .limit(50),
    getAIStatus(),
  ])

  return (
    <AppShell>
      <AIConsultationDirect patients={patients || []} lang={lang} aiStatus={aiStatus} />
    </AppShell>
  )
}
