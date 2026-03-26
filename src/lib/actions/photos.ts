'use server'

import { requireAuth } from '@/lib/server-utils'
import { prisma } from '@/lib/prisma'
import { uuidSchema } from '@/lib/validation'
import { ALLOWED_IMAGE_EXTENSIONS, ALLOWED_IMAGE_TYPES, MAX_PHOTO_SIZE_BYTES } from '@/lib/utils'

export async function uploadPhoto(formData: FormData): Promise<void> {
  const { userId } = await requireAuth()

  const file = formData.get('file') as File
  const patientId = formData.get('patientId') as string

  if (!file || !patientId) return

  uuidSchema.parse(patientId)
  const ext = file.name.split('.').pop()?.toLowerCase() || ''
  if (!(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) throw new Error('Недопустимое расширение файла. Разрешены: jpg, jpeg, png, webp, heic, heif')
  if (file.size > MAX_PHOTO_SIZE_BYTES) throw new Error('Файл слишком большой. Максимум 10 МБ.')
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type.toLowerCase())) throw new Error('Разрешены только фотографии (JPEG, PNG, WebP, HEIC).')

  // TODO: Заменить Supabase Storage на локальное хранение файлов
  // Нужно: сохранить file на диск, сгенерировать URL
  const fileName = `${Date.now()}.${ext || 'jpg'}`
  const url = `/uploads/${userId}/${patientId}/${fileName}`

  await prisma.patientPhoto.create({
    data: {
      patientId,
      doctorId: userId,
      url,
      fileName,
    },
  })
}

export async function deletePhoto(id: string): Promise<void> {
  uuidSchema.parse(id)
  const { userId } = await requireAuth()

  // Получаем фото из БД — защита от удаления чужих записей
  const photo = await prisma.patientPhoto.findFirst({
    where: { id, doctorId: userId },
    select: { id: true, url: true },
  })

  if (!photo) return

  // TODO: Удалить файл из локального хранилища по photo.url

  await prisma.patientPhoto.delete({
    where: { id: photo.id },
  })
}
