/**
 * Утилиты для работы с датами и временем в московском часовом поясе (MSK).
 * Используются в календаре, списке приёмов и других виджетах дашборда.
 */

/** Преобразовать ISO-строку в дату формата YYYY-MM-DD по МСК */
export function toMskDateStr(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
}

/** Преобразовать ISO-строку во время ЧЧ:ММ по МСК */
export function toMskTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Сегодняшняя дата по МСК в формате YYYY-MM-DD */
export function todayMsk(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
}

/** Текущий год и месяц по МСК */
export function nowMsk(): { year: number; month: number } {
  const d = todayMsk().split('-').map(Number)
  return { year: d[0], month: d[1] }
}

/** Определить срочность приёма: urgent (идёт сейчас), soon (скоро), null (далеко) */
export function getUrgency(scheduledAt: string): 'urgent' | 'soon' | null {
  const diffMin = Math.round((new Date(scheduledAt).getTime() - Date.now()) / 60000)
  if (diffMin >= -30 && diffMin <= 10) return 'urgent'
  if (diffMin > 10 && diffMin <= 45) return 'soon'
  return null
}
