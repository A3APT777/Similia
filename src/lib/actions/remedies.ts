'use server'

import { prisma } from '@/lib/prisma'
import { searchQuerySchema } from '@/lib/validation'

export type RemedyResult = {
  abbrev: string
  name_latin: string
  name_ru: string | null
}

// Транслитерация кириллицы → несколько латинских вариантов для поиска
const TRANSLIT: Record<string, string[]> = {
  а:['a'],б:['b'],в:['v','w'],г:['g'],д:['d'],е:['e'],ё:['e'],ж:['zh','j'],
  з:['z'],и:['i','y'],й:['y','i'],к:['k','c'],л:['l'],м:['m'],н:['n'],
  о:['o'],п:['p'],р:['r'],с:['s','c'],т:['t','th'],у:['u'],ф:['f','ph'],
  х:['h','ch'],ц:['c','ts'],ч:['ch'],ш:['sh'],щ:['sch'],ъ:[''],ы:['y','i'],
  ь:['','i'],э:['e'],ю:['u','yu'],я:['ya','ia'],
}

// Генерирует основной вариант транслитерации
function transliterate(text: string): string {
  return text.toLowerCase().split('').map(c => TRANSLIT[c]?.[0] || c).join('')
}

// Генерирует несколько вариантов транслитерации для нечёткого поиска
function transliterateVariants(text: string): string[] {
  const base = transliterate(text)
  const variants = new Set<string>([base])

  // Добавляем варианты с альтернативными заменами
  const chars = text.toLowerCase().split('')
  for (let i = 0; i < chars.length; i++) {
    const alts = TRANSLIT[chars[i]]
    if (alts && alts.length > 1) {
      for (let a = 1; a < alts.length; a++) {
        const variant = chars.map((c, j) => j === i ? alts[a] : (TRANSLIT[c]?.[0] || c)).join('')
        variants.add(variant)
      }
    }
  }

  // Специальные замены: кс→x, нукс→nux
  if (base.includes('ks')) variants.add(base.replace(/ks/g, 'x'))

  return Array.from(variants).slice(0, 5) // максимум 5 вариантов
}

export async function searchRemediesDB(query: string): Promise<RemedyResult[]> {
  searchQuerySchema.parse(query)
  if (!query.trim()) return []
  const q = query.trim().replace(/[%_.*,()]/g, '')
  if (!q) return []

  const hasRussian = /[а-яё]/i.test(q)
  const variants = hasRussian ? transliterateVariants(q) : [q]

  try {
    // Строим условия для всех вариантов транслитерации
    const conditions = variants
      .map(v => `name_latin ILIKE '%${v.replace(/'/g, "''")}%' OR abbrev ILIKE '%${v.replace(/'/g, "''")}%'`)
      .join(' OR ')

    const results = await prisma.$queryRawUnsafe<RemedyResult[]>(
      `SELECT DISTINCT abbrev, name_latin, name_ru FROM homeo_remedies WHERE ${conditions} OR name_ru ILIKE $1 ORDER BY name_latin LIMIT 12`,
      '%' + q + '%'
    )
    if (results && results.length > 0) return results
  } catch (err) {
    console.error('[searchRemediesDB] DB error:', err)
  }

  // Fallback на локальный список
  const { HOMEOPATHIC_REMEDIES } = await import('@/lib/remedies')
  return HOMEOPATHIC_REMEDIES
    .filter(r => {
      const rl = r.toLowerCase()
      return variants.some(v => rl.includes(v.toLowerCase()))
    })
    .slice(0, 12)
    .map(r => ({ abbrev: r.split(' ')[0]?.slice(0, 4) + '.', name_latin: r, name_ru: null }))
}
