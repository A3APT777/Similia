'use server'

import { prisma } from '@/lib/prisma'
import { searchQuerySchema } from '@/lib/validation'

export type RemedyResult = {
  abbrev: string
  name_latin: string
  name_ru: string | null
}

export async function searchRemediesDB(query: string): Promise<RemedyResult[]> {
  searchQuerySchema.parse(query)
  if (!query.trim()) return []
  // Экранируем спецсимволы для защиты от injection
  const q = query.trim().replace(/[%_.*,()]/g, '')
  if (!q) return []

  // homeo_remedies не в Prisma-схеме — используем raw query
  const results = await prisma.$queryRaw<RemedyResult[]>`
    SELECT abbrev, name_latin, name_ru
    FROM homeo_remedies
    WHERE name_latin ILIKE ${'%' + q + '%'}
       OR abbrev ILIKE ${'%' + q + '%'}
       OR name_ru ILIKE ${'%' + q + '%'}
    ORDER BY name_latin
    LIMIT 12
  `

  return results || []
}
