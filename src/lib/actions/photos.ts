'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function uploadPhoto(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const file = formData.get('file') as File
  const patientId = formData.get('patientId') as string
  const note = formData.get('note') as string
  const takenAt = formData.get('takenAt') as string

  if (!file || !patientId) return

  if (file.size > 10 * 1024 * 1024) throw new Error('Файл слишком большой. Максимум 10 МБ.')
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
  if (!allowedTypes.includes(file.type.toLowerCase())) throw new Error('Разрешены только фотографии (JPEG, PNG, WebP, HEIC).')

  const ext = file.name.split('.').pop() || 'jpg'
  const path = `${user.id}/${patientId}/${Date.now()}.${ext}`

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const { error } = await supabase.storage
    .from('patient-photos')
    .upload(path, buffer, { contentType: file.type })

  if (error) throw new Error(error.message)

  const { data: { publicUrl } } = supabase.storage
    .from('patient-photos')
    .getPublicUrl(path)

  await supabase.from('patient_photos').insert({
    patient_id: patientId,
    doctor_id: user.id,
    storage_path: path,
    url: publicUrl,
    note: note?.trim() || null,
    taken_at: takenAt || new Date().toISOString().split('T')[0],
  })
}

export async function deletePhoto(id: string): Promise<void> {
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

  await supabase.storage.from('patient-photos').remove([photo.storage_path])
  await supabase.from('patient_photos').delete().eq('id', id).eq('doctor_id', user.id)
}
