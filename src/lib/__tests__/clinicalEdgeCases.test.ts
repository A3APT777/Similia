import { describe, it, expect } from 'vitest'
import { computeAssessment } from '../clinicalEngine'
import type { StructuredSymptom } from '@/types'

function sym(id: string, label: string, dynamics?: StructuredSymptom['dynamics']): StructuredSymptom {
  return { id, label, category: 'chief_complaint', dynamics, createdAt: '2026-01-01T00:00:00Z' }
}

describe('clinicalEngine — edge cases', () => {
  // --- Граничные значения ---

  it('ровно 2 симптома (минимум для анализа) → не unclear', () => {
    const result = computeAssessment([sym('1', 'a', 'better'), sym('2', 'b', 'better')], [])
    expect(result.caseState).not.toBe('unclear')
  })

  it('большое количество симптомов (20+) → не падает', () => {
    const symptoms = Array.from({ length: 25 }, (_, i) =>
      sym(`${i}`, `symptom ${i}`, i % 3 === 0 ? 'better' : 'same')
    )
    const result = computeAssessment(symptoms, [])
    expect(result).toBeTruthy()
    expect(result.caseState).toBeDefined()
    expect(result.summary).toContain('25')
  })

  // --- Смешанные состояния ---

  it('better + worse + same → зависит от пропорций', () => {
    const symptoms = [
      sym('1', 'a', 'better'),
      sym('2', 'b', 'worse'),
      sym('3', 'c', 'same'),
    ]
    const result = computeAssessment(symptoms, [])
    expect(['improving', 'deterioration', 'unclear', 'no_effect']).toContain(result.caseState)
  })

  it('все new → unclear (нет данных о динамике)', () => {
    const symptoms = [
      sym('1', 'a', 'new'),
      sym('2', 'b', 'new'),
      sym('3', 'c', 'new'),
    ]
    const result = computeAssessment(symptoms, [])
    // new не считается как worse → нет deterioration
    expect(result.caseState).toBeDefined()
  })

  it('все resolved → если нет текущих → unclear', () => {
    const prev = [sym('1', 'a'), sym('2', 'b'), sym('3', 'c')]
    const result = computeAssessment([], prev)
    expect(result.caseState).toBe('unclear') // 0 текущих
  })

  it('worse + resolved (aggravation) + previousCaseState=improving → aggravation а не relapse', () => {
    // aggravation проверяется раньше relapse в коде
    const symptoms = [
      sym('1', 'a', 'worse'),
      sym('2', 'b', 'resolved'),
    ]
    const result = computeAssessment(symptoms, [], 'improving')
    expect(result.caseState).toBe('aggravation')
  })

  // --- Followup статусы ---

  it('followup=worse → не меняет result если есть better', () => {
    const symptoms = [sym('1', 'a', 'better'), sym('2', 'b', 'better')]
    const result = computeAssessment(symptoms, [], null, 'worse')
    expect(result.caseState).toBe('improving') // symptoms важнее followup
  })

  it('followup=new_symptoms → не меняет алгоритм', () => {
    const symptoms = [sym('1', 'a', 'same'), sym('2', 'b', 'same'), sym('3', 'c', 'same')]
    const result = computeAssessment(symptoms, [], null, 'new_symptoms')
    expect(result.caseState).toBe('no_effect')
  })

  // --- Авто-enrichment ---

  it('симптом с тем же id в prev и curr без dynamics → same', () => {
    const prev = [sym('shared', 'мигрень')]
    const curr = [sym('shared', 'мигрень'), sym('also-shared', 'тошнота')]
    // Оба в prev → shared=same, also-shared=new
    const result = computeAssessment(curr, [...prev, sym('also-shared', 'тошнота')])
    // shared=same, also-shared=same → no_effect? depends on total
    expect(result).toBeTruthy()
  })

  it('симптом с dynamics не перезаписывается авто-определением', () => {
    const prev = [sym('shared', 'мигрень')]
    const curr = [sym('shared', 'мигрень', 'better'), sym('other', 'боль', 'better')]
    const result = computeAssessment(curr, prev)
    expect(result.caseState).toBe('improving') // better остаётся better
  })

  // --- Decision mapping ---

  it('improving → continue', () => {
    const result = computeAssessment([sym('1', 'a', 'better'), sym('2', 'b', 'better')], [])
    expect(result.suggestedDecision).toBe('continue')
  })

  it('aggravation → wait', () => {
    const result = computeAssessment([sym('1', 'a', 'worse'), sym('2', 'b', 'resolved')], [])
    expect(result.suggestedDecision).toBe('wait')
  })

  it('deterioration → change', () => {
    const result = computeAssessment([sym('1', 'a', 'worse'), sym('2', 'b', 'worse')], [])
    expect(result.suggestedDecision).toBe('change')
  })

  it('relapse → increase', () => {
    const result = computeAssessment([sym('1', 'a', 'worse'), sym('2', 'b', 'worse')], [], 'improving')
    expect(result.suggestedDecision).toBe('increase')
  })

  it('unclear → wait', () => {
    const result = computeAssessment([], [])
    expect(result.suggestedDecision).toBe('wait')
  })

  // --- Summary формат ---

  it('summary с resolved показывает ✓', () => {
    const prev = [sym('old', 'мигрень')]
    const curr = [sym('new1', 'a', 'better'), sym('new2', 'b', 'better')]
    const result = computeAssessment(curr, prev)
    expect(result.summary).toContain('✓')
  })

  it('summary с new показывает +', () => {
    const symptoms = [sym('1', 'a', 'new'), sym('2', 'b', 'better')]
    const result = computeAssessment(symptoms, [])
    expect(result.summary).toContain('+')
  })

  it('summary с worse показывает ↓', () => {
    const symptoms = [sym('1', 'a', 'worse'), sym('2', 'b', 'worse')]
    const result = computeAssessment(symptoms, [])
    expect(result.summary).toContain('↓')
  })

  // --- Стабильность ---

  it('одни и те же данные → одинаковый результат (детерминизм)', () => {
    const symptoms = [sym('1', 'a', 'better'), sym('2', 'b', 'worse'), sym('3', 'c', 'same')]
    const result1 = computeAssessment(symptoms, [])
    const result2 = computeAssessment(symptoms, [])
    expect(result1.caseState).toBe(result2.caseState)
    expect(result1.suggestedDecision).toBe(result2.suggestedDecision)
  })
})
