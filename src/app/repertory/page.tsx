import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import RepertoryClient from './RepertoryClient'
import { searchRepertory } from '@/lib/actions/repertory'

export default async function RepertoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')

  const { q = '' } = await searchParams

  // По умолчанию загружаем главу Mind (Психика) для SSR
  const { rubrics, total } = await searchRepertory(q, ['Mind'], 'publicum', 0)

  return (
    <AppShell>
      <RepertoryClient
        initialRubrics={rubrics}
        initialTotal={total}
        initialQuery={q}
      />
    </AppShell>
  )
}
