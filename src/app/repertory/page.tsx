import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import RepertoryClient from './RepertoryClient'
import { searchRepertory } from '@/lib/actions/repertory'

export default async function RepertoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
