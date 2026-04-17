import { describe, it, expect } from 'vitest'
import { t } from '../shared/i18n'

describe('i18n — русский', () => {
  const ru = t('ru')

  // Навигация
  it('nav.workbench определён', () => expect(ru.nav.workbench).toBeTruthy())
  it('nav.repertory определён', () => expect(ru.nav.repertory).toBeTruthy())
  it('nav.patients определён', () => expect(ru.nav.patients).toBeTruthy())
  it('nav.settings определён', () => expect(ru.nav.settings).toBeTruthy())
  it('nav.logout определён', () => expect(ru.nav.logout).toBeTruthy())

  // Dashboard
  it('dashboard.greeting определён', () => expect(ru.dashboard.greeting).toBeTruthy())
  it('dashboard.todayAppointments — функция', () => {
    expect(typeof ru.dashboard.todayAppointments).toBe('function')
    expect(ru.dashboard.todayAppointments(0)).toBeTruthy()
    expect(ru.dashboard.todayAppointments(3)).toBeTruthy()
  })

  // Consultation
  it('consultation.save определён', () => expect(ru.consultation.save).toBeTruthy())

  // PatientForm
  it('patientForm.name определён', () => expect(ru.patientForm.name).toBeTruthy())
  it('patientForm.cancel определён', () => expect(ru.patientForm.cancel).toBeTruthy())

  // Settings
  it('settings.payment определён', () => expect(ru.settings.payment).toBeTruthy())
  it('settings.schedule определён', () => expect(ru.settings.schedule).toBeTruthy())
})

describe('i18n — английский', () => {
  const en = t('en')

  it('nav.workbench определён', () => expect(en.nav.workbench).toBeTruthy())
  it('nav.repertory определён', () => expect(en.nav.repertory).toBeTruthy())
  it('dashboard.greeting определён', () => expect(en.dashboard.greeting).toBeTruthy())
  it('consultation.save определён', () => expect(en.consultation.save).toBeTruthy())
  it('patientForm.name определён', () => expect(en.patientForm.name).toBeTruthy())
})

describe('i18n — консистентность ключей', () => {
  const ru = t('ru')
  const en = t('en')

  it('одинаковые ключи верхнего уровня', () => {
    const ruKeys = Object.keys(ru).sort()
    const enKeys = Object.keys(en).sort()
    expect(ruKeys).toEqual(enKeys)
  })

  it('nav имеет одинаковые ключи', () => {
    expect(Object.keys(ru.nav).sort()).toEqual(Object.keys(en.nav).sort())
  })

  it('dashboard имеет одинаковые ключи', () => {
    expect(Object.keys(ru.dashboard).sort()).toEqual(Object.keys(en.dashboard).sort())
  })

  it('patientForm имеет одинаковые ключи', () => {
    expect(Object.keys(ru.patientForm).sort()).toEqual(Object.keys(en.patientForm).sort())
  })

  it('settings имеет одинаковые ключи', () => {
    expect(Object.keys(ru.settings).sort()).toEqual(Object.keys(en.settings).sort())
  })
})
