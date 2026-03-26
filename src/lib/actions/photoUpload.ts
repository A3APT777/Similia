'use server'

import { requireAuth, generateToken } from '@/lib/server-utils'
import { prisma } from '@/lib/prisma'
import { ALLOWED_IMAGE_EXTENSIONS, ALLOWED_IMAGE_TYPES, MAX_PHOTO_SIZE_BYTES } from '@/lib/utils'

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

// Публичная загрузка фото по токену (без авторизации — пациент с телефона)
export async function submitPhotoUpload(
  token: string,
  formData: FormData,
): Promise<{ success: boolean; error?: string }> {
  // Проверяем токен (публичная операция — prisma напрямую)
  const uploadToken = await prisma.photoUploadToken.findUnique({
    where: { token },
    select: { doctorId: true, patientId: true, expiresAt: true },
  })

  if (!uploadToken) {
    return { success: false, error: 'Ссылка недействительна' }
  }

  if (uploadToken.expiresAt && new Date(uploadToken.expiresAt) < new Date()) {
    return { success: false, error: 'Срок действия ссылки истёк' }
  }

  const file = formData.get('file') as File

  if (!file || file.size === 0) {
    return { success: false, error: 'Файл не выбран' }
  }

  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    return { success: false, error: 'Файл слишком большой. Максимум 10 МБ.' }
  }

  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type.toLowerCase())) {
    return { success: false, error: 'Разрешены только фотографии (JPEG, PNG, WebP, HEIC)' }
  }

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
  if (!(ALLOWED_IMAGE_EXTENSIONS as readonly string[]).includes(ext)) {
    return { success: false, error: 'Неподдерживаемый формат файла' }
  }

  // TODO: Заменить Supabase Storage на локальное хранение файлов
  // Нужно: сохранить file на диск, сгенерировать URL
  const fileName = `${Date.now()}.${ext}`
  const url = `/uploads/${uploadToken.doctorId}/${uploadToken.patientId}/${fileName}`

  try {
    await prisma.patientPhoto.create({
      data: {
        patientId: uploadToken.patientId,
        doctorId: uploadToken.doctorId,
        url,
        fileName,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
    return { success: false, error: `Ошибка сохранения: ${message}` }
  }

  return { success: true }
}

// Получить инфо о токене (для страницы загрузки) — публичная операция
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

  // Совместимость с прежним форматом: { patient_id, expires_at, patients: { name } }
  return {
    patientId: data.patientId,
    expiresAt: data.expiresAt,
    patient: data.patient,
  }
}
