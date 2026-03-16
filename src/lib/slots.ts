export type ScheduleConfig = {
  session_duration: number
  break_duration: number
  working_days: string[]
  start_time: string
  end_time: string
  lunch_enabled: boolean
  lunch_start: string
  lunch_end: string
}

const DAY_MAP: Record<number, string> = { 0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat' }

export function generateSlots(schedule: ScheduleConfig, date: string, bookedSlots: string[]): string[] {
  const dayOfWeek = DAY_MAP[new Date(date).getDay()]
  if (!schedule.working_days.includes(dayOfWeek)) return []

  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }
  const toTime = (mins: number) => {
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const step = schedule.session_duration + schedule.break_duration
  const startMins = toMinutes(schedule.start_time)
  const endMins = toMinutes(schedule.end_time)
  const lunchStart = schedule.lunch_enabled ? toMinutes(schedule.lunch_start) : null
  const lunchEnd = schedule.lunch_enabled ? toMinutes(schedule.lunch_end) : null

  const slots: string[] = []
  let cur = startMins
  while (cur + schedule.session_duration <= endMins) {
    const slotEnd = cur + schedule.session_duration
    const overlapLunch = lunchStart !== null && lunchEnd !== null &&
      cur < lunchEnd && slotEnd > lunchStart
    if (!overlapLunch) {
      const timeStr = toTime(cur)
      if (!bookedSlots.includes(timeStr)) {
        slots.push(timeStr)
      }
    }
    cur += step
  }
  return slots
}
