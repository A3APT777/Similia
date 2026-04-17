'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/server-utils'
import { revalidatePath } from 'next/cache'
import { doctorScheduleSchema } from '@/lib/shared/validation'

export type DoctorSchedule = {
  session_duration: number
  break_duration: number
  working_days: string[]
  start_time: string
  end_time: string
  lunch_enabled: boolean
  lunch_start: string
  lunch_end: string
}

// Prisma-модель DoctorSchedule имеет per-day структуру (dayOfWeek, startTime, endTime).
// Таблица хранит всё в одной строке — используем $queryRaw для совместимости.

// Получить расписание врача
const SCHEDULE_DEFAULTS: DoctorSchedule = {
  session_duration: 45,
  break_duration: 15,
  working_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  start_time: '09:00',
  end_time: '18:00',
  lunch_enabled: true,
  lunch_start: '13:00',
  lunch_end: '14:00',
}

export async function getDoctorScheduleAuth(): Promise<DoctorSchedule> {
  const { userId } = await requireAuth()

  try {
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      SELECT session_duration, break_duration, working_days,
             start_time, end_time, lunch_enabled,
             lunch_start, lunch_end
      FROM doctor_schedules
      WHERE doctor_id = ${userId}::uuid
      LIMIT 1
    `

    const data = rows[0] ?? null
    if (!data) return SCHEDULE_DEFAULTS

    return {
      session_duration: (data.session_duration as number) ?? 45,
      break_duration: (data.break_duration as number) ?? 15,
      working_days: (data.working_days as string[]) ?? ['mon', 'tue', 'wed', 'thu', 'fri'],
      start_time: (data.start_time as string) ?? '09:00',
      end_time: (data.end_time as string) ?? '18:00',
      lunch_enabled: (data.lunch_enabled as boolean) ?? true,
      lunch_start: (data.lunch_start as string) ?? '13:00',
      lunch_end: (data.lunch_end as string) ?? '14:00',
    }
  } catch {
    return SCHEDULE_DEFAULTS
  }
}

// Сохранить расписание врача (upsert по doctor_id)
export async function saveDoctorSchedule(schedule: DoctorSchedule): Promise<void> {
  doctorScheduleSchema.parse(schedule)
  const { userId } = await requireAuth()

  await prisma.$executeRaw`
    INSERT INTO doctor_schedules (
      id, doctor_id, session_duration, break_duration, working_days,
      start_time, end_time, lunch_enabled, lunch_start, lunch_end, updated_at
    ) VALUES (
      gen_random_uuid(), ${userId}::uuid,
      ${schedule.session_duration}, ${schedule.break_duration},
      ${schedule.working_days}::text[],
      ${schedule.start_time}, ${schedule.end_time},
      ${schedule.lunch_enabled}, ${schedule.lunch_start}, ${schedule.lunch_end},
      NOW()
    )
    ON CONFLICT (doctor_id) DO UPDATE SET
      session_duration = EXCLUDED.session_duration,
      break_duration = EXCLUDED.break_duration,
      working_days = EXCLUDED.working_days,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      lunch_enabled = EXCLUDED.lunch_enabled,
      lunch_start = EXCLUDED.lunch_start,
      lunch_end = EXCLUDED.lunch_end,
      updated_at = NOW()
  `

  revalidatePath('/settings')
}
