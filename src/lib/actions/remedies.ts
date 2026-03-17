'use server'

import { createClient } from '@/lib/supabase/server'

export type RemedyResult = {
  abbrev: string
  name_latin: string
  name_ru: string | null
}

export async function searchRemediesDB(query: string): Promise<RemedyResult[]> {
  if (!query.trim()) return []
  const supabase = await createClient()
  // Экранируем спецсимволы PostgREST для защиты от filter injection
  const q = query.trim().replace(/[%_.*,()]/g, '')
  if (!q) return []

  const pattern = `%${q}%`
  const { data } = await supabase
    .from('homeo_remedies')
    .select('abbrev, name_latin, name_ru')
    .or(`name_latin.ilike.${pattern},abbrev.ilike.${pattern},name_ru.ilike.${pattern}`)
    .order('name_latin')
    .limit(12)

  return (data as RemedyResult[]) || []
}
