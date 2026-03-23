import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SidebarShell from './SidebarShell'
import { getSubscription } from '@/lib/actions/subscription'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const name = user.user_metadata?.name || user.email || ''
  const initials = getInitials(name)
  const firstName = name.split(' ')[0] || name

  const [subscription, patientCountResult, realPatientCountResult, adminCheck] = await Promise.all([
    getSubscription(),
    supabase.from('patients').select('id', { count: 'exact', head: true }).eq('doctor_id', user.id),
    supabase.from('patients').select('id', { count: 'exact', head: true }).eq('doctor_id', user.id).eq('is_demo', false),
    supabase.from('admin_users').select('user_id').eq('user_id', user.id).single(),
  ])
  const patientCount = patientCountResult.count ?? 0
  const realPatientCount = realPatientCountResult.count ?? 0
  const isAdmin = !!adminCheck.data

  return (
    <SidebarShell firstName={firstName} initials={initials} subscription={subscription} patientCount={patientCount} realPatientCount={realPatientCount} isAdmin={isAdmin}>
      {children}
    </SidebarShell>
  )
}
