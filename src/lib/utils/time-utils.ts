/**
 * Утилиты для работы с датами и временем (МСК).
 */

export function toMskDateStr(iso: string): string {
  return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
}

export function toMskTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ru-RU', {
    timeZone: 'Europe/Moscow',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function todayMsk(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Moscow' })
}

export function nowMsk(): { year: number; month: number } {
  const d = todayMsk().split('-').map(Number)
  return { year: d[0], month: d[1] }
}

export function formatDateShort(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const months = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']
  return `${d} ${months[m - 1]}`
}
