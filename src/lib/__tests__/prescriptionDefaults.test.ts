import { describe, it, expect } from 'vitest'
import { DEFAULT_PRESCRIPTION_RULES } from '../prescriptionDefaults'

describe('DEFAULT_PRESCRIPTION_RULES', () => {
  it('содержит правила приёма', () => {
    expect(DEFAULT_PRESCRIPTION_RULES).toContain('Рассасывать под языком')
  })

  it('содержит ограничения по кофе', () => {
    expect(DEFAULT_PRESCRIPTION_RULES).toContain('Кофе')
    expect(DEFAULT_PRESCRIPTION_RULES).toContain('антидотирует')
  })

  it('содержит ограничения по мяте', () => {
    expect(DEFAULT_PRESCRIPTION_RULES).toContain('Мята')
    expect(DEFAULT_PRESCRIPTION_RULES).toContain('ментол')
  })

  it('содержит ограничения по камфоре', () => {
    expect(DEFAULT_PRESCRIPTION_RULES).toContain('Камфора')
    expect(DEFAULT_PRESCRIPTION_RULES).toContain('Звёздочка')
  })

  it('содержит правила хранения', () => {
    expect(DEFAULT_PRESCRIPTION_RULES).toContain('Хранение')
    expect(DEFAULT_PRESCRIPTION_RULES).toContain('солнечных лучей')
  })

  it('содержит предупреждение про другие лекарства', () => {
    expect(DEFAULT_PRESCRIPTION_RULES).toContain('без согласования с врачом')
  })

  it('не пустая строка и > 500 символов', () => {
    expect(DEFAULT_PRESCRIPTION_RULES.length).toBeGreaterThan(500)
  })
})
