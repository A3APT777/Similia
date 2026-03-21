'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { uuidSchema } from '@/lib/validation'
import { ALLOWED_IMAGE_EXTENSIONS, ALLOWED_IMAGE_TYPES, MAX_PHOTO_SIZE_BYTES } from '@/lib/utils'

export async function uploadPhoto(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const file = formData.get('file') as File
  const patientId = formData.get('patientId') as string
  const note = formData.get('note') as string
  const takenAt = formData.get('takenAt') as string

  if (!file || !patientId) return

  uuidSchema.parse(patientId)
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) throw new Error('Недопустимое расширение файла. Разрешены: jpg, jpeg, png, webp, heic, heif')
  if (file.size > MAX_PHOTO_SIZE_BYTES) throw new Error('Файл слишком большой. Максимум 10 МБ.')
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type.toLowerCase())) throw new Error('Разрешены только фотографии (JPEG, PNG, WebP, HEIC).')

  const path = `${user.id}/${patientId}/${Date.now()}.${ext || 'jpg'}`

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error } = await supabase.storage
    .from('patient-photos')
    .upload(path, buffer, { contentType: file.type })

  if (error) throw new Error(error.message)

  const { data: { publicUrl } } = supabase.storage
    .from('patient-photos')
    .getPublicUrl(path)

  const { error: insertError } = await supabase.from('patient_photos').insert({
    patient_id: patientId,
    doctor_id: user.id,
    storage_path: path,
    url: publicUrl,
    note: note?.trim() || null,
    taken_at: takenAt || new Date().toISOString().split('T')[0],
  })

  if (insertError) throw new Error(insertError.message)
}

export async function deletePhoto(id: string): Promise<void> {
  uuidSchema.parse(id)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Получаем storagePath из БД, а не от клиента — защита от path traversal
  const { data: photo } = await supabase
    .from('patient_photos')
    .select('storage_path')
    .eq('id', id)
    .eq('doctor_id', user.id)
    .single()

  if (!photo) return

  const { error: storageErr } = await supabase.storage.from('patient-photos').remove([photo.storage_path])
  if (storageErr) console.error('[deletePhoto] storage:', storageErr)
  const { error: dbErr } = await supabase.from('patient_photos').delete().eq('id', id).eq('doctor_id', user.id)
  if (dbErr) { console.error('[deletePhoto] db:', dbErr); throw new Error('Не удалось удалить фото') }
}
