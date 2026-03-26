import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import { getReferralStats } from '@/lib/actions/referrals'
import ReferralClient from './ReferralClient'

export default async function ReferralPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const stats = await getReferralStats()

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h1 className="text-2xl font-normal mb-1" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-forest)' }}>
          Реферальная программа
        </h1>
        <p className="text-sm mb-8" style={{ color: 'var(--sim-text-hint)' }}>
          Пригласите коллегу — оба получите бонусные дни Стандарта
        </p>

        <ReferralClient stats={stats} />
      </div>
    </AppShell>
  )
}
