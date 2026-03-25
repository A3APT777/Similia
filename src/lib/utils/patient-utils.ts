/**
 * Утилиты для вычисления состояния пациента.
 * Вынесены из page.tsx карточки пациента для читаемости.
 */

type Lang = 'ru' | 'en'

type StatusConfig = {
  label: string
  color: string
}

const STATE_CONFIG: Record<string, { label: { ru: string; en: string }; color: string }> = {
  improving:     { label: { ru: 'Улучшение',    en: 'Improving' },     color: '#059669' },
  aggravation:   { label: { ru: 'Обострение',   en: 'Aggravation' },   color: '#d97706' },
  no_effect:     { label: { ru: 'Нет эффекта',  en: 'No effect' },     color: '#6b7280' },
  deterioration: { label: { ru: 'Ухудшение',    en: 'Worsening' },     color: '#dc2626' },
  relapse:       { label: { ru: 'Рецидив',      en: 'Relapse' },       color: '#ea580c' },
  unclear:       { label: { ru: 'Наблюдение',   en: 'Monitoring' },    color: '#6b7280' },
}

export function getPatientStatus(
  lang: Lang,
  caseState: string | null | undefined,
  hasAcute: boolean,
  followupStatus: string | null | undefined,
  hasConsultations: boolean,
): StatusConfig {
  if (hasAcute) return { label: lang === 'ru' ? 'Острый случай' : 'Acute', color: '#dc2626' }
  if (caseState && STATE_CONFIG[caseState]) return { label: STATE_CONFIG[caseState].label[lang], color: STATE_CONFIG[caseState].color }
  if (followupStatus === 'better') return { label: lang === 'ru' ? 'Улучшение' : 'Improving', color: '#059669' }
  if (followupStatus === 'worse') return { label: lang === 'ru' ? 'Ухудшение' : 'Worsening', color: '#dc2626' }
  if (hasConsultations) return { label: lang === 'ru' ? 'Наблюдение' : 'Monitoring', color: '#6b7280' }
  return { label: lang === 'ru' ? 'Новый' : 'New', color: '#2563eb' }
}

export function getDynamicsInfo(
  lang: Lang,
  caseState: string | null | undefined,
  followupStatus: string | null | undefined,
): { arrow: string; text: string; color: string } | null {
  if (caseState === 'improving' || followupStatus === 'better')
    return { arrow: '↑', text: lang === 'ru' ? 'Улучшение' : 'Improvement', color: '#059669' }
  if (caseState === 'deterioration' || followupStatus === 'worse')
    return { arrow: '↓', text: lang === 'ru' ? 'Ухудшение' : 'Worsening', color: '#dc2626' }
  if (caseState === 'no_effect' || followupStatus === 'same')
    return { arrow: '→', text: lang === 'ru' ? 'Без изменений' : 'No change', color: '#ca8a04' }
  if (caseState === 'aggravation')
    return { arrow: '~', text: lang === 'ru' ? 'Обострение' : 'Aggravation', color: '#d97706' }
  return null
}

export function getClinicalSummary(
  lang: Lang,
  lastCompleted: { type?: string; complaints?: string } | null,
  followupStatus: string | null | undefined,
): string {
  if (!lastCompleted) return ''
  const rawComplaint = lastCompleted.complaints
    ? lastCompleted.complaints.split('\n').map(l => l.trim()).filter(l => l && !/^(ЖАЛОБЫ|COMPLAINTS|—)/i.test(l))[0]?.substring(0, 80) || ''
    : ''
  if (!rawComplaint) return ''

  const isAcute = lastCompleted.type === 'acute'
  if (isAcute) return lang === 'ru' ? `Острое состояние: ${rawComplaint.toLowerCase()}` : `Acute: ${rawComplaint.toLowerCase()}`
  if (followupStatus === 'better') return lang === 'ru' ? `${rawComplaint}. Положительная динамика` : `${rawComplaint}. Improving`
  if (followupStatus === 'worse') return lang === 'ru' ? `${rawComplaint}. Ухудшение` : `${rawComplaint}. Worsening`
  if (followupStatus === 'same') return lang === 'ru' ? `${rawComplaint}. Без динамики` : `${rawComplaint}. No change`
  return rawComplaint
}
