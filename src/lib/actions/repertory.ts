'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

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

  const supabase = await createClient()

  let q = supabase
    .from('repertory_rubrics')
    .select('*', { count: 'exact' })
    .eq('source', src)
    .order('remedy_count', { ascending: false })
    .range(pg * PAGE_SIZE, (pg + 1) * PAGE_SIZE - 1)

  // Фильтр по главам
  if (Array.isArray(chapters)) {
    if (chapters.length === 1) q = q.eq('chapter', chapters[0])
    else if (chapters.length > 1) q = q.in('chapter', chapters)
    // пустой массив = без фильтра (все главы)
  } else if (chapters) {
    q = q.eq('chapter', chapters)
  }

  if (q0.trim()) {
    // Разбиваем по пробелам, ищем каждое слово отдельно (AND между словами)
    const words = q0.trim().replace(/[%_.,()\\[\]*]/g, '').split(/\s+/).filter(Boolean)
    for (const word of words) {
      // Простой стемминг: обрезаем русские окончания для лучшего поиска
      // «головная» → «голов», «слева» → «слев» / «лев», «давящая» → «давящ»
      const stem = stemRu(word)
      q = q.or(`fullpath.ilike.%${stem}%,fullpath_ru.ilike.%${stem}%`)
    }
  }

  const { data, count, error } = await q
  if (error) return { rubrics: [], total: 0 }
  return { rubrics: (data as RepertoryRubric[]) || [], total: count || 0 }
}

export async function getRubricsByIds(ids: number[]): Promise<RepertoryRubric[]> {
  const parsed = z.array(z.number().int().positive()).max(50).safeParse(ids)
  if (!parsed.success) return []
  if (!parsed.data.length) return []
  const supabase = await createClient()
  const { data } = await supabase
    .from('repertory_rubrics')
    .select('*')
    .in('id', parsed.data)
  return (data as RepertoryRubric[]) || []
}

export async function getPatientsSimple(): Promise<{ id: string; name: string; lastVisit: string | null }[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('patients')
    .select('id, name, updated_at')
    .eq('doctor_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(20)
  return (data || []).map((p: { id: string; name: string; updated_at: string | null }) => ({
    id: p.id,
    name: p.name,
    lastVisit: p.updated_at || null,
  }))
}

export async function getPatientConsultationsSimple(
  patientId: string
): Promise<{ id: string; date: string; status: string }[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('consultations')
    .select('id, date, status')
    .eq('patient_id', patientId)
    .eq('doctor_id', user.id)
    .neq('status', 'cancelled')
    .order('date', { ascending: false })
    .limit(15)
  return (data as { id: string; date: string; status: string }[]) || []
}

export async function searchRemedyNames(query: string): Promise<{ name: string; abbrev: string }[]> {
  if (!query || query.trim().length < 2) return []
  const supabase = await createClient()
  const clean = query.trim().replace(/[%_\\[\]*.,()]/g, '')

  const { data } = await supabase
    .from('repertory_rubrics')
    .select('remedies')
    .filter('remedies::text', 'ilike', `%${clean}%`)
    .limit(5)

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
  const supabase = await createClient()
  const ids = entries.map(e => e.rubricId)

  const { data } = await supabase
    .from('repertory_rubrics')
    .select('id, remedies')
    .in('id', ids)
  if (!data?.length) return []

  type RubricRow = { id: number; remedies: { name: string; abbrev: string; grade: number }[] }
  const entryMap = new Map(entries.map(e => [e.rubricId, e]))
  const eliminateIds = entries.filter(e => e.eliminate).map(e => e.rubricId)
  const eliminateRemedies = new Map<number, Set<string>>()
  const scores = new Map<string, { name: string; score: number }>()

  for (const rubric of data as RubricRow[]) {
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
