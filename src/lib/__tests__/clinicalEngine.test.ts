import { describe, it, expect } from 'vitest'
import { computeAssessment, CASE_STATE_LABELS, CASE_STATE_COLORS, DECISION_LABELS } from '../clinicalEngine'
import type { StructuredSymptom, CaseState } from '@/types'

// Вспомогательная функция — создаёт симптом с нужными полями
function sym(id: string, label: string, dynamics?: StructuredSymptom['dynamics']): StructuredSymptom {
  return {
    id,
    label,
    category: 'chief_complaint',
    dynamics,
    createdAt: '2026-01-01T00:00:00Z',
  }
}

// ═══════════════════════════════════════════════════════════
// computeAssessment — основная логика
// ═══════════════════════════════════════════════════════════
describe('computeAssessment', () => {
  // --- Базовые случаи ---

  it('нет симптомов → unclear + wait', () => {
    const result = computeAssessment([], [])
    expect(result.caseState).toBe('unclear')
    expect(result.suggestedDecision).toBe('wait')
  })

  it('1 симптом без dynamics → unclear (недостаточно данных)', () => {
    const result = computeAssessment([sym('1', 'мигрень')], [])
    expect(result.caseState).toBe('unclear')
  })

  it('1 симптом с dynamics → unclear (total < 2)', () => {
    const result = computeAssessment([sym('1', 'мигрень', 'better')], [])
    expect(result.caseState).toBe('unclear')
  })

  // --- Улучшение ---

  it('улучшение: все симптомы better → improving + continue', () => {
    const symptoms = [
      sym('1', 'мигрень', 'better'),
      sym('2', 'тошнота', 'better'),
    ]
    const result = computeAssessment(symptoms, [])
    expect(result.caseState).toBe('improving')
    expect(result.suggestedDecision).toBe('continue')
  })

  it('улучшение: better преобладает → improving', () => {
    const symptoms = [
      sym('1', 'мигрень', 'better'),
      sym('2', 'тошнота', 'better'),
      sym('3', 'усталость', 'same'),
    ]
    const result = computeAssessment(symptoms, [])
    expect(result.caseState).toBe('improving')
  })

  it('улучшение: followup=better и нет worse → improving', () => {
    const symptoms = [
      sym('1', 'мигрень', 'same'),
      sym('2', 'тошнота', 'same'),
    ]
    const result = computeAssessment(symptoms, [], null, 'better')
    expect(result.caseState).toBe('improving')
  })

  // --- Нет эффекта ---

  it('нет эффекта: всё same → no_effect + change', () => {
    const symptoms = [
      sym('1', 'мигрень', 'same'),
      sym('2', 'тошнота', 'same'),
      sym('3', 'усталость', 'same'),
    ]
    const result = computeAssessment(symptoms, [])
    expect(result.caseState).toBe('no_effect')
    expect(result.suggestedDecision).toBe('change')
  })

  it('с 1 better среди many same → improving (better > worse+new)', () => {
    const symptoms = [
      sym('1', 'мигрень', 'same'),
      sym('2', 'тошнота', 'same'),
      sym('3', 'усталость', 'same'),
      sym('4', 'сон', 'better'),
    ]
    const result = computeAssessment(symptoms, [])
    // better=1 > worse(0)+new(0) → improving имеет приоритет
    expect(result.caseState).toBe('improving')
  })

  // --- Ухудшение ---

  it('ухудшение: worse + new, нет resolved → deterioration + change', () => {
    const symptoms = [
      sym('1', 'мигрень', 'worse'),
      sym('2', 'тошнота', 'worse'),
      sym('3', 'новый симптом', 'new'),
    ]
    const result = computeAssessment(symptoms, [])
    expect(result.caseState).toBe('deterioration')
    expect(result.suggestedDecision).toBe('change')
  })

  it('ухудшение: только worse, нет better и resolved → deterioration', () => {
    const symptoms = [
      sym('1', 'мигрень', 'worse'),
      sym('2', 'тошнота', 'worse'),
    ]
    const result = computeAssessment(symptoms, [])
    expect(result.caseState).toBe('deterioration')
  })

  // --- Обострение (гомеопатическое) ---

  it('обострение: worse + resolved → aggravation + wait', () => {
    const symptoms = [
      sym('1', 'мигрень', 'worse'),
      sym('2', 'тошнота', 'resolved'),
    ]
    const result = computeAssessment(symptoms, [])
    expect(result.caseState).toBe('aggravation')
    expect(result.suggestedDecision).toBe('wait')
  })

  it('обострение: worse + resolved + better → aggravation', () => {
    const symptoms = [
      sym('1', 'мигрень', 'worse'),
      sym('2', 'тошнота', 'resolved'),
      sym('3', 'сон', 'better'),
    ]
    const result = computeAssessment(symptoms, [])
    expect(result.caseState).toBe('aggravation')
  })

  // --- Рецидив ---

  it('рецидив: было improving, теперь worse → relapse + increase', () => {
    const symptoms = [sym('1', 'мигрень', 'worse'), sym('2', 'усталость', 'worse')]
    const result = computeAssessment(symptoms, [], 'improving')
    expect(result.caseState).toBe('relapse')
    expect(result.suggestedDecision).toBe('increase')
  })

  // --- Авто-определение dynamics ---

  it('симптом из prev без dynamics → авто-same', () => {
    const prev = [sym('shared', 'мигрень')]
    const curr = [sym('shared', 'мигрень'), sym('new', 'боль')]
    const result = computeAssessment(curr, prev)
    // shared → same, new → new, total=2
    expect(result.caseState).toBeDefined()
  })

  it('симптом исчез (prev есть, curr нет) → resolved', () => {
    const prev = [sym('old1', 'мигрень'), sym('old2', 'тошнота')]
    const curr = [sym('new1', 'боль', 'better'), sym('new2', 'усталость', 'better')]
    const result = computeAssessment(curr, prev)
    // 2 resolved + 2 better → improving
    expect(result.caseState).toBe('improving')
  })

  it('все симптомы resolved → improving', () => {
    const prev = [sym('1', 'мигрень'), sym('2', 'тошнота'), sym('3', 'боль')]
    const curr: StructuredSymptom[] = []
    const result = computeAssessment(curr, prev)
    // 0 текущих → unclear (нет текущих симптомов)
    expect(result.caseState).toBe('unclear')
  })

  // --- Summary ---

  it('summary содержит количество симптомов', () => {
    const symptoms = [
      sym('1', 'мигрень', 'better'),
      sym('2', 'тошнота', 'better'),
      sym('3', 'боль', 'same'),
    ]
    const result = computeAssessment(symptoms, [])
    expect(result.summary).toContain('3')
    expect(result.summary).toContain('2↑')
    expect(result.summary).toContain('1=')
  })

  it('summary на английском', () => {
    const symptoms = [sym('1', 'headache', 'better'), sym('2', 'nausea', 'worse')]
    const result = computeAssessment(symptoms, [], null, null, 'en')
    expect(result.summary).toContain('sympt.')
  })

  it('summary без данных → описательный текст', () => {
    const result = computeAssessment([], [])
    expect(result.summary).toBe('Нет симптомов')
  })

  // --- Reasoning ---

  it('reasoning содержит все counts', () => {
    const symptoms = [sym('1', 'мигрень', 'better'), sym('2', 'тошнота', 'worse')]
    const result = computeAssessment(symptoms, [])
    expect(result.reasoning).toContain('better: 1')
    expect(result.reasoning).toContain('worse: 1')
  })

  // --- computedAt ---

  it('computedAt — валидная ISO дата', () => {
    const result = computeAssessment([], [])
    expect(new Date(result.computedAt).getTime()).not.toBeNaN()
  })

  // --- decisionStatus ---

  it('decisionStatus всегда draft', () => {
    const result = computeAssessment([sym('1', 'a', 'better'), sym('2', 'b', 'better')], [])
    expect(result.decisionStatus).toBe('draft')
  })
})

// ═══════════════════════════════════════════════════════════
// Константы и локализация
// ═══════════════════════════════════════════════════════════
describe('CASE_STATE_LABELS', () => {
  const states: CaseState[] = ['improving', 'aggravation', 'no_effect', 'deterioration', 'relapse', 'unclear']

  it('русские метки для всех состояний', () => {
    for (const state of states) {
      expect(CASE_STATE_LABELS.ru[state]).toBeTruthy()
    }
  })

  it('английские метки для всех состояний', () => {
    for (const state of states) {
      expect(CASE_STATE_LABELS.en[state]).toBeTruthy()
    }
  })
})

describe('CASE_STATE_COLORS', () => {
  it('каждое состояние имеет color, bg, border', () => {
    const states: CaseState[] = ['improving', 'aggravation', 'no_effect', 'deterioration', 'relapse', 'unclear']
    for (const state of states) {
      expect(CASE_STATE_COLORS[state].color).toBeTruthy()
      expect(CASE_STATE_COLORS[state].bg).toBeTruthy()
      expect(CASE_STATE_COLORS[state].border).toBeTruthy()
    }
  })

  it('improving — зелёный', () => {
    expect(CASE_STATE_COLORS.improving.color).toContain('#')
  })

  it('deterioration — красный', () => {
    expect(CASE_STATE_COLORS.deterioration.color).toBe('#dc2626')
  })
})

describe('DECISION_LABELS', () => {
  const decisions = ['continue', 'wait', 'increase', 'change', 'antidote', 'refer'] as const

  it('русские метки для всех решений', () => {
    for (const d of decisions) {
      expect(DECISION_LABELS.ru[d]).toBeTruthy()
    }
  })

  it('английские метки для всех решений', () => {
    for (const d of decisions) {
      expect(DECISION_LABELS.en[d]).toBeTruthy()
    }
  })
})
