import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import SidebarShell from './SidebarShell'
import { getSubscription } from '@/lib/actions/subscription'

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?'
}

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id
  const name = session.user.name || session.user.email || ''
  const initials = getInitials(name)
  const firstName = name.split(' ')[0] || name

  const [subscription, patientCount, realPatientCount, adminRecord] = await Promise.all([
    getSubscription(),
    prisma.patient.count({ where: { doctorId: userId } }),
    prisma.patient.count({ where: { doctorId: userId, isDemo: false } }),
    prisma.adminUser.findUnique({ where: { userId } }).catch(() => null),
  ])
  const isAdmin = !!adminRecord

  return (
    <SidebarShell firstName={firstName} initials={initials} subscription={subscription} patientCount={patientCount} realPatientCount={realPatientCount} isAdmin={isAdmin}>
      {children}
    </SidebarShell>
  )
}
