'use server'

import { createClient } from '@/lib/supabase/server'

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

export async function searchRepertory(
  query: string,
  chapters: string | string[], // '' или [] = все главы, string = одна, string[] = несколько
  source: string = 'publicum',
  page: number = 0
): Promise<{ rubrics: RepertoryRubric[]; total: number }> {
  const supabase = await createClient()

  let q = supabase
    .from('repertory_rubrics')
    .select('*', { count: 'exact' })
    .eq('source', source)
    .order('remedy_count', { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

  // Фильтр по главам
  if (Array.isArray(chapters)) {
    if (chapters.length === 1) q = q.eq('chapter', chapters[0])
    else if (chapters.length > 1) q = q.in('chapter', chapters)
    // пустой массив = без фильтра (все главы)
  } else if (chapters) {
    q = q.eq('chapter', chapters)
  }

  if (query.trim()) {
    // Экранируем спецсимволы LIKE для защиты от обхода паттерна
    const safeQuery = query.trim().replace(/[%_]/g, '')
    if (safeQuery) q = q.ilike('fullpath', `%${safeQuery}%`)
  }

  const { data, count, error } = await q
  if (error) return { rubrics: [], total: 0 }
  return { rubrics: (data as RepertoryRubric[]) || [], total: count || 0 }
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

export async function getRemedyRubrics(
  remedyAbbrev: string,
  source: string = 'publicum',
  chapter: string = ''
): Promise<RepertoryRubric[]> {
  const supabase = await createClient()
  let q = supabase
    .from('repertory_rubrics')
    .select('*')
    .eq('source', source)
    .order('chapter')
    .limit(300)

  if (chapter) q = q.eq('chapter', chapter)

  const { data } = await q
  const rubrics = (data as RepertoryRubric[]) || []
  return rubrics.filter(r =>
    r.remedies.some(rem => rem.abbrev === remedyAbbrev || rem.name.toLowerCase().includes(remedyAbbrev.toLowerCase()))
  )
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
