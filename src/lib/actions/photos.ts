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

  const { writeFile, mkdir } = await import('fs/promises')
  const path = await import('path')

  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext || 'jpg'}`
  const uploadDir = path.join(process.cwd(), 'private-uploads', patientId)
  const filePath = path.resolve(uploadDir, path.basename(fileName))
  // Защита от path traversal
  if (!filePath.startsWith(uploadDir)) throw new Error('Недопустимый путь файла')

  // Сохраняем файл в приватную директорию
  await mkdir(uploadDir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(filePath, buffer)

  // Создаём запись, затем обновляем URL с id
  const photo = await prisma.patientPhoto.create({
    data: {
      patientId,
      doctorId: userId,
      url: '', // временно
      fileName,
    },
  })
  await prisma.patientPhoto.update({
    where: { id: photo.id },
    data: { url: `/api/photos/${photo.id}` },
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

  // Удаляем файл с диска
  try {
    const path = await import('path')
    const { unlink } = await import('fs/promises')
    // Находим файл по patientId + fileName
    const fullPhoto = await prisma.patientPhoto.findFirst({
      where: { id: photo.id },
      select: { fileName: true, patientId: true },
    })
    if (fullPhoto) {
      const filePath = path.join(process.cwd(), 'private-uploads', fullPhoto.patientId, fullPhoto.fileName)
      await unlink(filePath).catch(() => {}) // Не блокируем если файл уже удалён
    }
  } catch {
    // Не блокируем удаление записи из-за ошибки файловой системы
  }

  await prisma.patientPhoto.delete({
    where: { id: photo.id },
  })
}
