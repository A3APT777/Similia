import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAIAnalysisLogs } from '@/lib/actions/admin'
import AILogsView from './AILogsView'

export default async function AILogsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: admin } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (!admin) redirect('/dashboard')

  const logs = await getAIAnalysisLogs(100)

  return <AILogsView logs={logs} />
}
