'use server'

import { requireAuth, generateToken } from '@/lib/server-utils'
import { prisma } from '@/lib/prisma'
import { ALLOWED_IMAGE_EXTENSIONS, ALLOWED_IMAGE_TYPES, MAX_PHOTO_SIZE_BYTES } from '@/lib/shared/utils'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Врач создаёт токен для загрузки фото пациентом
export async function createPhotoUploadToken(patientId: string): Promise<string> {
  const { userId } = await requireAuth()

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000)

  await prisma.photoUploadToken.create({
    data: {
      token,
      doctorId: userId,
      patientId,
      expiresAt,
    },
  })

  return token
}

// Публичная загрузка фото по токену
export async function submitPhotoUpload(
  token: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  const uploadToken = await prisma.photoUploadToken.findUnique({
    where: { token },
    select: { doctorId: true, patientId: true, expiresAt: true },
  })

  if (!uploadToken) return { success: false, error: 'Ссылка недействительна' }
  if (uploadToken.expiresAt && new Date(uploadToken.expiresAt) < new Date()) {
    return { success: false, error: 'Срок действия ссылки истёк' }
  }

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { success: false, error: 'Файл не выбран' }
  if (file.size > MAX_PHOTO_SIZE_BYTES) return { success: false, error: 'Файл слишком большой. Максимум 10 МБ.' }
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type.toLowerCase())) {
    return { success: false, error: 'Разрешены только фотографии (JPEG, PNG, WebP, HEIC)' }
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  if (!(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
    return { success: false, error: 'Неподдерживаемый формат файла' }
  }

  // Сохраняем файл в приватную директорию (не public/)
  const fileName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
  const uploadDir = path.join(process.cwd(), 'private-uploads', uploadToken.patientId)
  const filePath = path.join(uploadDir, fileName)

  try {
    await mkdir(uploadDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(filePath, buffer)
  } catch {
    return { success: false, error: 'Ошибка сохранения файла' }
  }

  // URL будет заполнен после создания записи (нужен id для API route)
  try {
    const photo = await prisma.patientPhoto.create({
      data: {
        patientId: uploadToken.patientId,
        doctorId: uploadToken.doctorId,
        url: '', // временно
        fileName,
      },
    })
    // Обновляем URL на приватный API route
    await prisma.patientPhoto.update({
      where: { id: photo.id },
      data: { url: `/api/photos/${photo.id}` },
    })
  } catch {
    return { success: false, error: 'Ошибка сохранения записи' }
  }

  return { success: true }
}

// Получить инфо о токене — публичная операция
export async function getPhotoUploadToken(token: string) {
  const data = await prisma.photoUploadToken.findUnique({
    where: { token },
    select: {
      patientId: true,
      expiresAt: true,
      patient: { select: { name: true } },
    },
  })

  if (!data) return null

  return {
    patientId: data.patientId,
    expiresAt: data.expiresAt,
    patient: data.patient,
    // Совместимость со старым форматом
    expires_at: data.expiresAt?.toISOString() ?? '',
    patients: data.patient,
  }
}
