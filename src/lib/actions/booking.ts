'use server'

import { createServiceClient } from '@/lib/supabase/service'
import { randomUUID } from 'crypto'

export async function submitBookingRequest(
  doctorId: string,
  data: {
    name: string
    phone: string
    preferredDate: string
    message: string
  }
): Promise<void> {
  const supabase = createServiceClient()

  const phone = data.phone.trim()
  const name = data.name.trim()

  // Защита от спама: не более 1 заявки с одного номера телефона за 24 часа
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: existing } = await supabase
    .from('intake_forms')
    .select('id')
    .eq('doctor_id', doctorId)
    .eq('status', 'pending')
    .eq('answers->>patient_phone', phone)
    .gte('created_at', since)
    .limit(1)

  if (existing && existing.length > 0) {
    throw new Error('Заявка от этого номера уже отправлена. Врач свяжется с вами в ближайшее время.')
  }

  const token = randomUUID().replace(/-/g, '')

  const { error } = await supabase.from('intake_forms').insert({
    token,
    doctor_id: doctorId,
    type: 'primary',
    status: 'pending',
    patient_name: name,
    answers: {
      _booking: 'true',
      patient_name: name,
      patient_phone: phone,
      preferred_date: data.preferredDate,
      message: data.message,
    },
    // Запросы на запись действительны 30 дней
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  })

  if (error) throw new Error('Не удалось отправить заявку. Попробуйте ещё раз.')
}
