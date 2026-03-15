'use server'

import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { redirect } from 'next/navigation'
import { randomUUID } from 'crypto'

// Врач создаёт токен для загрузки фото пациентом
export async function createPhotoUploadToken(patientId: string): Promise<string> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const token = randomUUID().replace(/-/g, '')
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  await supabase.from('photo_upload_tokens').insert({
    token,
    doctor_id: user.id,
    patient_id: patientId,
    expires_at: expiresAt,
  })

  return token
}

// Публичная загрузка фото по токену (без авторизации — пациент с телефона)
export async function submitPhotoUpload(
  token: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const supabase = createServiceClient()

  // Проверяем токен
  const { data: uploadToken } = await supabase
    .from('photo_upload_tokens')
    .select('doctor_id, patient_id, expires_at')
    .eq('token', token)
    .single()

  if (!uploadToken) {
    return { success: false, error: 'Ссылка недействительна' }
  }

  if (new Date(uploadToken.expires_at) < new Date()) {
    return { success: false, error: 'Срок действия ссылки истёк' }
  }

  const file = formData.get('file') as File
  const takenAt = formData.get('takenAt') as string
  const note = formData.get('note') as string

  if (!file || file.size === 0) {
    return { success: false, error: 'Файл не выбран' }
  }

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${uploadToken.doctor_id}/${uploadToken.patient_id}/${Date.now()}.${ext}`

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error: storageError } = await supabase.storage
    .from('patient-photos')
    .upload(path, buffer, { contentType: file.type })

  if (storageError) {
    return { success: false, error: 'Ошибка загрузки файла' }
  }

  const { data: { publicUrl } } = supabase.storage
    .from('patient-photos')
    .getPublicUrl(path)

  await supabase.from('patient_photos').insert({
    patient_id: uploadToken.patient_id,
    doctor_id: uploadToken.doctor_id,
    storage_path: path,
    url: publicUrl,
    note: note?.trim() || null,
    taken_at: takenAt || new Date().toISOString().split('T')[0],
  })

  return { success: true }
}

// Получить инфо о токене (для страницы загрузки)
export async function getPhotoUploadToken(token: string) {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('photo_upload_tokens')
    .select('patient_id, expires_at, patients(name)')
    .eq('token', token)
    .single()

  return data
}
