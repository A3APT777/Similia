/**
 * Общая логика подсчёта рейтинга препаратов для реперторизации.
 * Используется в MiniRepertory (консультация) и RepertoryClient (полный реперторий).
 */

// ── Типы ────────────────────────────────────────────────────────────

/** Минимальный интерфейс рубрики для scoring */
export type ScoringRubric = {
  remedies: Array<{ name: string; abbrev: string; grade: number }>
}

/** Запись анализа: рубрика + вес + флаг элиминации */
export type ScoringEntry = {
  rubric: ScoringRubric
  weight: 1 | 2 | 3
  eliminate?: boolean
}

/** Результат подсчёта для одного препарата */
export type RemedyScore = {
  name: string
  /** Суммарный балл (с учётом весов) */
  total: number
  /** Грейд препарата в каждой рубрике (0 = отсутствует) */
  coverage: number[]
  /** Количество рубрик, в которых присутствует препарат */
  coveredCount: number
}

/** Опции расчёта */
export type ScoringOptions = {
  /** Максимальное количество результатов (по умолчанию 20) */
  maxResults?: number
  /**
   * Преобразование грейда в баллы.
   * 'raw' — grade как есть (1, 2, 3, 4)
   * 'kent' — grade >= 3 → 3, grade 2 → 2, иначе 1
   * По умолчанию 'kent'
   */
  gradeMode?: 'raw' | 'kent'
  /** Показывать только препараты, присутствующие во всех рубриках */
  coverageOnly?: boolean
}

// ── Расчёт ──────────────────────────────────────────────────────────

/** Преобразование грейда в баллы по схеме Кента (потолок 3) */
function kentPoints(grade: number): number {
  return grade >= 3 ? 3 : grade === 2 ? 2 : 1
}

/**
 * Рассчитать рейтинг препаратов по набору рубрик анализа.
 *
 * Чистая функция без побочных эффектов.
 * Возвращает массив [abbrev, score], отсортированный по total desc, coveredCount desc.
 */
export function calculateRemedyScores(
  entries: ScoringEntry[],
  options: ScoringOptions = {},
): Array<[string, RemedyScore]> {
  const {
    maxResults = 20,
    gradeMode = 'kent',
    coverageOnly = false,
  } = options

  const n = entries.length
  if (n === 0) return []

  // Накопление баллов по каждому препарату
  const scores: Record<string, RemedyScore> = {}

  entries.forEach((ae, idx) => {
    ae.rubric.remedies.forEach(r => {
      if (!scores[r.abbrev]) {
        scores[r.abbrev] = { name: r.name, total: 0, coverage: new Array(n).fill(0), coveredCount: 0 }
      }
      const g = Number(r.grade)
      const pts = gradeMode === 'raw' ? g : kentPoints(g)
      scores[r.abbrev].total += pts * ae.weight
      scores[r.abbrev].coverage[idx] = g
      scores[r.abbrev].coveredCount++
    })
  })

  // Сортировка: по баллам, при равенстве — по покрытию
  let result = Object.entries(scores).sort((a, b) => {
    if (b[1].total !== a[1].total) return b[1].total - a[1].total
    return b[1].coveredCount - a[1].coveredCount
  })

  // Элиминация: убираем препараты, отсутствующие в рубриках с eliminate=true
  const eliminateIdxs = entries
    .map((ae, i) => (ae.eliminate ? i : -1))
    .filter(i => i >= 0)
  if (eliminateIdxs.length > 0) {
    result = result.filter(([, d]) => eliminateIdxs.every(idx => d.coverage[idx] > 0))
  }

  // Фильтр «только присутствующие во всех рубриках»
  if (coverageOnly && n > 1) {
    result = result.filter(([, d]) => d.coveredCount === n)
  }

  return result.slice(0, maxResults)
}
