import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAdminStats, getAdminDoctors } from '@/lib/actions/admin'
import AdminDashboard from './AdminDashboard'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Проверка админа
  const { data: admin } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (!admin) redirect('/dashboard')

  const [stats, doctors] = await Promise.all([
    getAdminStats(),
    getAdminDoctors(),
  ])

  return <AdminDashboard stats={stats} doctors={doctors} />
}
