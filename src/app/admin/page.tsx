import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { getAdminStats, getAdminDoctors } from '@/lib/actions/admin'
import AdminDashboard from './AdminDashboard'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  // Проверка админа
  const admin = await prisma.adminUser.findUnique({
    where: { userId: session.user.id },
  })

  if (!admin) redirect('/dashboard')

  const [stats, doctors] = await Promise.all([
    getAdminStats(),
    getAdminDoctors(),
  ])

  return <AdminDashboard stats={stats} doctors={doctors} />
}
