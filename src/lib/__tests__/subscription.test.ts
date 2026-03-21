import { describe, it, expect } from 'vitest'
import {
  FREE_PLAN,
  isFeatureAllowed,
  canAddPatient,
  isPatientAccessible,
  isSubscriptionActive,
  type SubscriptionInfo,
} from '../subscription'

// Фабрика для создания подписок
function makeSub(overrides: Partial<SubscriptionInfo> = {}): SubscriptionInfo {
  return {
    planId: 'standard',
    status: 'active',
    maxPatients: null,
    features: { online_booking: true, export: true, followup_reminders: true, ai_consultation: false },
    periodEnd: '2026-12-31T23:59:59Z',
    cancelAtPeriodEnd: false,
    ...overrides,
  }
}

// ═══════════════════════════════════════════════════════════
// FREE_PLAN
// ═══════════════════════════════════════════════════════════
describe('FREE_PLAN', () => {
  it('planId = free', () => {
    expect(FREE_PLAN.planId).toBe('free')
  })

  it('maxPatients = 5', () => {
    expect(FREE_PLAN.maxPatients).toBe(5)
  })

  it('все фичи отключены', () => {
    expect(FREE_PLAN.features.online_booking).toBe(false)
    expect(FREE_PLAN.features.export).toBe(false)
    expect(FREE_PLAN.features.followup_reminders).toBe(false)
  })

  it('status = active', () => {
    expect(FREE_PLAN.status).toBe('active')
  })
})

// ═══════════════════════════════════════════════════════════
// isFeatureAllowed
// ═══════════════════════════════════════════════════════════
describe('isFeatureAllowed', () => {
  it('Стандарт active → online_booking разрешён', () => {
    expect(isFeatureAllowed(makeSub(), 'online_booking')).toBe(true)
  })

  it('Стандарт active → export разрешён', () => {
    expect(isFeatureAllowed(makeSub(), 'export')).toBe(true)
  })

  it('Стандарт active → followup_reminders разрешён', () => {
    expect(isFeatureAllowed(makeSub(), 'followup_reminders')).toBe(true)
  })

  it('Free → online_booking запрещён', () => {
    expect(isFeatureAllowed(FREE_PLAN, 'online_booking')).toBe(false)
  })

  it('Free → export запрещён', () => {
    expect(isFeatureAllowed(FREE_PLAN, 'export')).toBe(false)
  })

  it('expired → всё запрещено даже если features=true', () => {
    const expired = makeSub({ status: 'expired' })
    expect(isFeatureAllowed(expired, 'online_booking')).toBe(false)
    expect(isFeatureAllowed(expired, 'export')).toBe(false)
  })

  it('cancelled → всё запрещено', () => {
    const cancelled = makeSub({ status: 'cancelled' })
    expect(isFeatureAllowed(cancelled, 'online_booking')).toBe(false)
  })

  it('past_due → фичи ещё работают', () => {
    const pastDue = makeSub({ status: 'past_due' })
    expect(isFeatureAllowed(pastDue, 'online_booking')).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════
// canAddPatient
// ═══════════════════════════════════════════════════════════
describe('canAddPatient', () => {
  it('Стандарт безлимит → всегда true', () => {
    expect(canAddPatient(makeSub(), 0)).toBe(true)
    expect(canAddPatient(makeSub(), 100)).toBe(true)
    expect(canAddPatient(makeSub(), 9999)).toBe(true)
  })

  it('Free → до 5 пациентов ok', () => {
    expect(canAddPatient(FREE_PLAN, 0)).toBe(true)
    expect(canAddPatient(FREE_PLAN, 4)).toBe(true)
  })

  it('Free → 5 и больше → нельзя', () => {
    expect(canAddPatient(FREE_PLAN, 5)).toBe(false)
    expect(canAddPatient(FREE_PLAN, 10)).toBe(false)
  })

  it('expired Standard → downgrade до 5', () => {
    const expired = makeSub({ status: 'expired' })
    expect(canAddPatient(expired, 4)).toBe(true)
    expect(canAddPatient(expired, 5)).toBe(false)
  })

  it('cancelled Standard → downgrade до 5', () => {
    const cancelled = makeSub({ status: 'cancelled' })
    expect(canAddPatient(cancelled, 3)).toBe(true)
    expect(canAddPatient(cancelled, 5)).toBe(false)
  })

  it('кастомный лимит maxPatients=10', () => {
    const custom = makeSub({ maxPatients: 10 })
    expect(canAddPatient(custom, 9)).toBe(true)
    expect(canAddPatient(custom, 10)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════
// isPatientAccessible
// ═══════════════════════════════════════════════════════════
describe('isPatientAccessible', () => {
  it('Стандарт active → любой индекс доступен', () => {
    expect(isPatientAccessible(makeSub(), 0)).toBe(true)
    expect(isPatientAccessible(makeSub(), 99)).toBe(true)
  })

  it('Free → первые 5 доступны (индексы 0-4)', () => {
    expect(isPatientAccessible(FREE_PLAN, 0)).toBe(true)
    expect(isPatientAccessible(FREE_PLAN, 4)).toBe(true)
  })

  it('Free → индекс 5+ недоступен', () => {
    expect(isPatientAccessible(FREE_PLAN, 5)).toBe(false)
    expect(isPatientAccessible(FREE_PLAN, 10)).toBe(false)
  })

  it('expired Standard → как Free (первые 5)', () => {
    const expired = makeSub({ status: 'expired' })
    expect(isPatientAccessible(expired, 4)).toBe(true)
    expect(isPatientAccessible(expired, 5)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════
// isSubscriptionActive
// ═══════════════════════════════════════════════════════════
describe('isSubscriptionActive', () => {
  it('active → true', () => {
    expect(isSubscriptionActive(makeSub())).toBe(true)
  })

  it('expired → false', () => {
    expect(isSubscriptionActive(makeSub({ status: 'expired' }))).toBe(false)
  })

  it('cancelled → false', () => {
    expect(isSubscriptionActive(makeSub({ status: 'cancelled' }))).toBe(false)
  })

  it('past_due → false', () => {
    expect(isSubscriptionActive(makeSub({ status: 'past_due' }))).toBe(false)
  })

  it('Free active → true', () => {
    expect(isSubscriptionActive(FREE_PLAN)).toBe(true)
  })
})
