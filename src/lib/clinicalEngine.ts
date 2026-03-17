// Rule-based clinical decision engine. Без AI.
// Вычисляет case_state и suggestedDecision из structured_symptoms.

import { StructuredSymptom, SymptomDynamics, CaseState, ClinicalDecision, ClinicalAssessment } from '@/types'

type DynamicsCounts = {
  better: number
  worse: number
  same: number
  new: number
  resolved: number
  total: number
}

// Подсчёт dynamics
function countDynamics(symptoms: StructuredSymptom[]): DynamicsCounts {
  const counts: DynamicsCounts = { better: 0, worse: 0, same: 0, new: 0, resolved: 0, total: 0 }
  for (const s of symptoms) {
    if (!s.dynamics) continue
    counts[s.dynamics]++
    counts.total++
  }
  return counts
}

// Определение case_state по правилам
function determineCaseState(
  counts: DynamicsCounts,
  previousCaseState?: CaseState | null,
  followupStatus?: string | null
): CaseState {
  const { better, worse, same, new: newCount, resolved, total } = counts

  // Недостаточно данных
  if (total < 2) return 'unclear'

  // Улучшение: есть better, нет worse и new
  if (better > 0 && worse === 0 && newCount === 0) return 'improving'
  // Улучшение: better преобладает
  if (better > worse + newCount && better > 0) return 'improving'
  // Followup подтверждает
  if (followupStatus === 'better' && worse === 0) return 'improving'

  // Обострение: старые уходят, но временно хуже
  if (worse > 0 && resolved > 0) return 'aggravation'

  // Рецидив: было улучшение, теперь worse
  if (previousCaseState === 'improving' && worse > 0) return 'relapse'

  // Нет эффекта: почти всё без изменений
  if (total > 0 && same / total > 0.7) return 'no_effect'

  // Ухудшение: worse преобладает, новые симптомы, ничего не ушло
  if (worse > better && newCount > 0 && resolved === 0) return 'deterioration'
  if (worse > 0 && better === 0 && resolved === 0) return 'deterioration'

  // Неясно
  return 'unclear'
}

// Определение suggestedDecision
function determineDecision(caseState: CaseState): ClinicalDecision {
  switch (caseState) {
    case 'improving': return 'continue'
    case 'aggravation': return 'wait'
    case 'no_effect': return 'change'
    case 'deterioration': return 'change'
    case 'relapse': return 'increase'
    case 'unclear': return 'wait'
  }
}

// Генерация summary текста
function buildSummary(counts: DynamicsCounts, caseState: CaseState, lang: 'ru' | 'en' = 'ru'): string {
  const parts: string[] = []

  if (lang === 'ru') {
    if (counts.total === 0) return 'Нет данных для анализа'
    parts.push(`${counts.total} симпт.`)
    if (counts.better > 0) parts.push(`${counts.better}↑`)
    if (counts.worse > 0) parts.push(`${counts.worse}↓`)
    if (counts.new > 0) parts.push(`${counts.new}+`)
    if (counts.resolved > 0) parts.push(`${counts.resolved}✓`)
    if (counts.same > 0) parts.push(`${counts.same}=`)
  } else {
    if (counts.total === 0) return 'No data for analysis'
    parts.push(`${counts.total} sympt.`)
    if (counts.better > 0) parts.push(`${counts.better}↑`)
    if (counts.worse > 0) parts.push(`${counts.worse}↓`)
    if (counts.new > 0) parts.push(`${counts.new}+`)
    if (counts.resolved > 0) parts.push(`${counts.resolved}✓`)
    if (counts.same > 0) parts.push(`${counts.same}=`)
  }

  return parts.join(' ')
}

// Главная функция
export function computeAssessment(
  currentSymptoms: StructuredSymptom[],
  previousSymptoms: StructuredSymptom[],
  previousCaseState?: CaseState | null,
  followupStatus?: string | null,
  lang: 'ru' | 'en' = 'ru'
): ClinicalAssessment {
  // Если нет текущих симптомов — unclear
  if (currentSymptoms.length === 0) {
    return {
      caseState: 'unclear',
      suggestedDecision: 'wait',
      decisionStatus: 'draft',
      summary: lang === 'ru' ? 'Нет симптомов' : 'No symptoms',
      reasoning: 'total: 0',
      computedAt: new Date().toISOString(),
    }
  }

  // Авто-определение dynamics если не задано (сравнение по ID с previous)
  const prevMap = new Map(previousSymptoms.map(s => [s.id, s]))
  const prevIds = new Set(previousSymptoms.map(s => s.id))
  const currIds = new Set(currentSymptoms.map(s => s.id))

  const enriched = currentSymptoms.map(s => {
    if (s.dynamics) return s // уже задано врачом
    // Авто-определение: есть в предыдущих → same, нет → new
    const inPrev = prevMap.has(s.id)
    return { ...s, dynamics: (inPrev ? 'same' : 'new') as SymptomDynamics }
  })

  // Добавляем resolved (были в prev, нет в current)
  const resolvedSymptoms: StructuredSymptom[] = previousSymptoms
    .filter(s => !currIds.has(s.id))
    .map(s => ({ ...s, dynamics: 'resolved' as SymptomDynamics }))

  const allForCounting = [...enriched, ...resolvedSymptoms]
  const counts = countDynamics(allForCounting)
  const caseState = determineCaseState(counts, previousCaseState, followupStatus)
  const suggestedDecision = determineDecision(caseState)
  const summary = buildSummary(counts, caseState, lang)
  const reasoning = `better: ${counts.better}, worse: ${counts.worse}, same: ${counts.same}, new: ${counts.new}, resolved: ${counts.resolved}`

  return {
    caseState,
    suggestedDecision,
    decisionStatus: 'draft',
    summary,
    reasoning,
    computedAt: new Date().toISOString(),
  }
}

// Локализация case_state
export const CASE_STATE_LABELS = {
  ru: {
    improving: 'Улучшение',
    aggravation: 'Обострение',
    no_effect: 'Нет эффекта',
    deterioration: 'Ухудшение',
    relapse: 'Рецидив',
    unclear: 'Неясно',
  },
  en: {
    improving: 'Improving',
    aggravation: 'Aggravation',
    no_effect: 'No effect',
    deterioration: 'Deterioration',
    relapse: 'Relapse',
    unclear: 'Unclear',
  },
} as const

export const CASE_STATE_COLORS: Record<CaseState, { color: string; bg: string; border: string }> = {
  improving: { color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  aggravation: { color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  no_effect: { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
  deterioration: { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  relapse: { color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  unclear: { color: '#9ca3af', bg: '#f9fafb', border: '#e5e7eb' },
}

// Локализация decision
export const DECISION_LABELS = {
  ru: {
    continue: 'Продолжить текущий препарат',
    wait: 'Подождать и наблюдать',
    increase: 'Повысить потенцию',
    change: 'Изменить препарат',
    antidote: 'Антидотировать',
    refer: 'Направить к специалисту',
  },
  en: {
    continue: 'Continue current remedy',
    wait: 'Wait and observe',
    increase: 'Increase potency',
    change: 'Change remedy',
    antidote: 'Antidote',
    refer: 'Refer to specialist',
  },
} as const
