'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/server-utils'
import { uuidSchema } from '@/lib/validation'
import { DEFAULT_PRESCRIPTION_RULES } from '@/lib/prescriptionDefaults'

// Создать ссылку на назначение
export async function createPrescriptionShare(
  consultationId: string,
  customNote?: string
): Promise<{ token: string }> {
  uuidSchema.parse(consultationId)
  const { userId } = await requireAuth()

  // Получаем consultation чтобы взять patientId
  const consultation = await prisma.consultation.findFirst({
    where: { id: consultationId, doctorId: userId },
    select: { patientId: true, remedy: true },
  })

  if (!consultation?.remedy) {
    throw new Error('Назначение не найдено')
  }

  const share = await prisma.prescriptionShare.create({
    data: {
      consultationId,
      patientId: consultation.patientId,
      doctorId: userId,
      customNote: customNote || null,
    },
    select: { token: true },
  })

  return { token: share.token }
}

// Получить назначение по токену (публичная)
export async function getPrescriptionShareByToken(token: string) {
  const share = await prisma.prescriptionShare.findUnique({
    where: { token },
    include: {
      consultation: {
        select: { remedy: true, potency: true, dosage: true, pellets: true, mode: true, createdAt: true },
      },
      patient: {
        select: { name: true },
      },
    },
  })

  if (!share) return null

  // Проверяем срок
  if (share.expiresAt && new Date(share.expiresAt) < new Date()) return null

  // Получаем правила врача
  const settings = await prisma.doctorSettings.findUnique({
    where: { doctorId: share.doctorId },
    select: { prescriptionRules: true },
  })

  // Подтянуть полное название препарата — пациент видит "Sulphur", не "Sulph."
  let remedyDisplay = share.consultation.remedy
  if (remedyDisplay) {
    const found = await prisma.$queryRawUnsafe<{ name_latin: string }[]>(
      `SELECT name_latin FROM homeo_remedies WHERE abbrev ILIKE $1 OR name_latin ILIKE $1 LIMIT 1`,
      remedyDisplay.replace(/[%_]/g, '')
    )
    if (found.length > 0) remedyDisplay = found[0].name_latin
  }

  return {
    share,
    consultation: {
      remedy: remedyDisplay,
      potency: share.consultation.potency,
      dosage: share.consultation.dosage,
      pellets: share.consultation.pellets,
      mode: share.consultation.mode,
      created_at: share.consultation.createdAt.toISOString(),
    },
    patientName: share.patient?.name || '',
    rules: settings?.prescriptionRules || DEFAULT_PRESCRIPTION_RULES,
  }
}

// Сохранить правила приёма (настройки врача)
export async function savePrescriptionRules(rules: string): Promise<void> {
  const { userId } = await requireAuth()

  await prisma.doctorSettings.upsert({
    where: { doctorId: userId },
    update: { prescriptionRules: rules.slice(0, 5000) },
    create: { doctorId: userId, prescriptionRules: rules.slice(0, 5000) },
  })
}

// Получить текущие правила
export async function getPrescriptionRules(): Promise<string> {
  const { userId } = await requireAuth()

  const settings = await prisma.doctorSettings.findUnique({
    where: { doctorId: userId },
    select: { prescriptionRules: true },
  })

  return settings?.prescriptionRules || DEFAULT_PRESCRIPTION_RULES
}
