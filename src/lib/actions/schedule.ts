'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { doctorScheduleSchema } from '@/lib/validation'

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

export async function getDoctorScheduleAuth(): Promise<DoctorSchedule> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('doctor_schedules')
    .select('*')
    .eq('doctor_id', user.id)
    .single()

  return {
    session_duration: data?.session_duration ?? 45,
    break_duration: data?.break_duration ?? 15,
    working_days: data?.working_days ?? ['mon', 'tue', 'wed', 'thu', 'fri'],
    start_time: data?.start_time ?? '09:00',
    end_time: data?.end_time ?? '18:00',
    lunch_enabled: data?.lunch_enabled ?? true,
    lunch_start: data?.lunch_start ?? '13:00',
    lunch_end: data?.lunch_end ?? '14:00',
  }
}

export async function saveDoctorSchedule(schedule: DoctorSchedule): Promise<void> {
  doctorScheduleSchema.parse(schedule)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('doctor_schedules')
    .upsert(
      { doctor_id: user.id, ...schedule, updated_at: new Date().toISOString() },
      { onConflict: 'doctor_id' }
    )

  if (error) {
    console.error('[saveDoctorSchedule]', error)
    throw new Error('Не удалось сохранить расписание')
  }

  revalidatePath('/settings')
}
