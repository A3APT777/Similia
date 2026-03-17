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
