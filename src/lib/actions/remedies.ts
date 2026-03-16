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
  const q = query.trim()

  const { data } = await supabase
    .from('homeo_remedies')
    .select('abbrev, name_latin, name_ru')
    .or(`name_latin.ilike.%${q}%,abbrev.ilike.%${q}%,name_ru.ilike.%${q}%`)
    .order('name_latin')
    .limit(12)

  return (data as RemedyResult[]) || []
}
