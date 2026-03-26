'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/server-utils'
import { z } from 'zod'
import { Prisma } from '@prisma/client'

export type RepertoryRubric = {
  id: number
  source: string
  chapter: string
  fullpath: string
  fullpath_ru: string | null
  remedies: Array<{ name: string; abbrev: string; grade: number }>
  remedy_count: number
}

const PAGE_SIZE = 30

// Словарь синонимов: врач может написать «слева», а в БД «левый»
const SYNONYMS: Record<string, string> = {
  'слева': 'лев', 'справа': 'прав', 'сверху': 'верх', 'снизу': 'низ',
  'головная': 'голов', 'головной': 'голов', 'головные': 'голов',
  'ночью': 'ноч', 'ночная': 'ноч', 'ночной': 'ноч',
  'утром': 'утр', 'утренний': 'утр', 'утренняя': 'утр',
  'вечером': 'вечер', 'вечерний': 'вечер', 'вечерняя': 'вечер',
  'хуже': 'хуж', 'лучше': 'лучш',
  'жгучая': 'жгуч', 'жгучий': 'жгуч', 'жгучее': 'жгуч',
  'давящая': 'давящ', 'давящий': 'давящ', 'давящее': 'давящ',
  'стреляющая': 'стреляющ', 'стреляющий': 'стреляющ',
  'пульсирующая': 'пульсирующ', 'пульсирующий': 'пульсирующ',
  'тошнота': 'тошнот', 'тошнотой': 'тошнот',
  'желудок': 'желуд', 'желудка': 'желуд', 'желудке': 'желуд',
  'живот': 'живот', 'животе': 'живот', 'живота': 'живот',
  'кашель': 'кашл', 'кашля': 'кашл', 'кашлем': 'кашл',
  'горло': 'горл', 'горле': 'горл', 'горла': 'горл',
  'сон': 'сон', 'сна': 'сон', 'сне': 'сон', 'бессонница': 'сон',
  'страх': 'страх', 'страха': 'страх', 'страхом': 'страх', 'тревога': 'тревог',
}

// Простой русский стемминг — обрезаем типичные окончания
function stemRu(word: string): string {
  const lower = word.toLowerCase()
  // Сначала проверяем словарь синонимов
  if (SYNONYMS[lower]) return SYNONYMS[lower]
  // Для английских слов — без изменений
  if (/^[a-z]/i.test(word)) return word
  // Обрезаем русские окончания (от длинных к коротким)
  const suffixes = ['ающий', 'яющий', 'ующий', 'ящий', 'ение', 'ание', 'ость', 'ская', 'ский', 'ного', 'ному', 'ной', 'ная', 'ный', 'ное', 'ные', 'ных', 'ого', 'ому', 'ной', 'ием', 'ами', 'ями', 'ом', 'ем', 'ей', 'ой', 'ая', 'яя', 'ий', 'ые', 'ую', 'юю', 'ах', 'ях', 'ов', 'ев', 'ам', 'ям']
  for (const s of suffixes) {
    if (lower.endsWith(s) && lower.length - s.length >= 3) {
      return lower.slice(0, -s.length)
    }
  }
  // Если слово длиннее 4 букв — обрезаем последние 2 символа
  if (lower.length > 4) return lower.slice(0, -2)
  return lower
}

const searchSchema = z.object({
  query: z.string().max(200),
  source: z.string().max(50).default('publicum'),
  page: z.number().int().min(0).max(1000).default(0),
})

export async function searchRepertory(
  query: string,
  chapters: string | string[],
  source: string = 'publicum',
  page: number = 0
): Promise<{ rubrics: RepertoryRubric[]; total: number }> {
  const parsed = searchSchema.safeParse({ query, source, page })
  if (!parsed.success) return { rubrics: [], total: 0 }
  const { query: q0, source: src, page: pg } = parsed.data

  // Формируем условия WHERE
  const conditions: Prisma.Sql[] = [Prisma.sql`source = ${src}`]

  // Фильтр по главам
  if (Array.isArray(chapters)) {
    if (chapters.length === 1) {
      conditions.push(Prisma.sql`chapter = ${chapters[0]}`)
    } else if (chapters.length > 1) {
      conditions.push(Prisma.sql`chapter IN (${Prisma.join(chapters)})`)
    }
  } else if (chapters) {
    conditions.push(Prisma.sql`chapter = ${chapters}`)
  }

  // Поиск по словам с стеммингом
  if (q0.trim()) {
    const words = q0.trim().replace(/[%_.,()\\[\]*]/g, '').split(/\s+/).filter(Boolean)
    for (const word of words) {
      const stem = stemRu(word)
      const pattern = `%${stem}%`
      conditions.push(Prisma.sql`(fullpath ILIKE ${pattern} OR fullpath_ru ILIKE ${pattern})`)
    }
  }

  const whereClause = Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
  const offset = pg * PAGE_SIZE

  // Получаем общее количество и данные параллельно
  const [countResult, data] = await Promise.all([
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM repertory_rubrics ${whereClause}
    `,
    prisma.$queryRaw<Array<{
      id: number; source: string; chapter: string; fullpath: string;
      fullpath_ru: string | null; remedies: unknown; remedy_count: number
    }>>`
      SELECT id, source, chapter, fullpath, fullpath_ru, remedies, remedy_count
      FROM repertory_rubrics ${whereClause}
      ORDER BY remedy_count DESC
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `,
  ])

  const total = Number(countResult[0]?.count || 0)
  return { rubrics: (data as RepertoryRubric[]) || [], total }
}

export async function getRubricsByIds(ids: number[]): Promise<RepertoryRubric[]> {
  const parsed = z.array(z.number().int().positive()).max(50).safeParse(ids)
  if (!parsed.success) return []
  if (!parsed.data.length) return []

  const data = await prisma.repertoryRubric.findMany({
    where: { id: { in: parsed.data } },
  })

  // Маппим camelCase → snake_case для совместимости с типом
  return data.map(r => ({
    id: r.id,
    source: r.source || '',
    chapter: r.chapter || '',
    fullpath: r.fullpath || '',
    fullpath_ru: r.fullpathRu || null,
    remedies: (r.remedies as RepertoryRubric['remedies']) || [],
    remedy_count: r.remedyCount || 0,
  }))
}

export async function getPatientsSimple(): Promise<{ id: string; name: string; lastVisit: string | null }[]> {
  const { userId } = await requireAuth()

  const data = await prisma.patient.findMany({
    where: { doctorId: userId },
    select: { id: true, name: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 20,
  })

  return data.map(p => ({
    id: p.id,
    name: p.name,
    lastVisit: p.updatedAt?.toISOString() || null,
  }))
}

export async function getPatientConsultationsSimple(
  patientId: string
): Promise<{ id: string; date: string; status: string }[]> {
  const { userId } = await requireAuth()

  const data = await prisma.consultation.findMany({
    where: {
      patientId,
      doctorId: userId,
      NOT: { status: 'cancelled' },
    },
    select: { id: true, date: true, status: true },
    orderBy: { date: 'desc' },
    take: 15,
  })

  return data.map(c => ({
    id: c.id,
    date: c.date || '',
    status: c.status,
  }))
}

export async function searchRemedyNames(query: string): Promise<{ name: string; abbrev: string }[]> {
  if (!query || query.trim().length < 2) return []
  const clean = query.trim().replace(/[%_\\[\]*.,()]/g, '')

  // Ищем рубрики, в JSON-поле remedies содержится текст запроса
  const pattern = `%${clean}%`
  const data = await prisma.$queryRaw<Array<{ remedies: unknown }>>`
    SELECT remedies FROM repertory_rubrics
    WHERE remedies::text ILIKE ${pattern}
    LIMIT 5
  `

  if (!data?.length) return []

  const seen = new Set<string>()
  const results: { name: string; abbrev: string }[] = []
  const q = clean.toLowerCase()

  for (const row of data) {
    for (const r of (row.remedies as { name: string; abbrev: string; grade: number }[])) {
      if (r.name.toLowerCase().includes(q) && !seen.has(r.abbrev)) {
        seen.add(r.abbrev)
        results.push({ name: r.name, abbrev: r.abbrev })
        if (results.length >= 10) break
      }
    }
    if (results.length >= 10) break
  }

  return results
}

// Топ препаратов по рубрикам из repertory_data консультации
export async function getTopRemediesFromRubricIds(
  entries: { rubricId: number; weight: 1 | 2 | 3; eliminate?: boolean }[]
): Promise<{ abbrev: string; name: string; score: number }[]> {
  if (!entries.length) return []
  const ids = entries.map(e => e.rubricId)

  const data = await prisma.repertoryRubric.findMany({
    where: { id: { in: ids } },
    select: { id: true, remedies: true },
  })

  if (!data?.length) return []

  type RubricRow = { id: number; remedies: { name: string; abbrev: string; grade: number }[] }
  const entryMap = new Map(entries.map(e => [e.rubricId, e]))
  const eliminateIds = entries.filter(e => e.eliminate).map(e => e.rubricId)
  const eliminateRemedies = new Map<number, Set<string>>()
  const scores = new Map<string, { name: string; score: number }>()

  for (const rubric of data as unknown as RubricRow[]) {
    const entry = entryMap.get(rubric.id)
    if (!entry) continue
    if (entry.eliminate) {
      eliminateRemedies.set(rubric.id, new Set(rubric.remedies.map(r => r.abbrev)))
    }
    for (const remedy of rubric.remedies) {
      const prev = scores.get(remedy.abbrev) ?? { name: remedy.name, score: 0 }
      prev.score += remedy.grade * entry.weight
      scores.set(remedy.abbrev, prev)
    }
  }

  let results = Array.from(scores.entries()).map(([abbrev, d]) => ({ abbrev, name: d.name, score: d.score }))
  if (eliminateIds.length > 0) {
    results = results.filter(r =>
      eliminateIds.every(id => eliminateRemedies.get(id)?.has(r.abbrev) ?? false)
    )
  }
  return results.sort((a, b) => b.score - a.score).slice(0, 5)
}
