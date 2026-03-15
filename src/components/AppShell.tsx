import { createClient } from '@/lib/supabase/server'
import SidebarShell from './SidebarShell'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const name = user?.user_metadata?.name || user?.email || ''
  const initials = getInitials(name)
  const firstName = name.split(' ')[0] || name

  return (
    <SidebarShell firstName={firstName} initials={initials}>
      {children}
    </SidebarShell>
  )
}
