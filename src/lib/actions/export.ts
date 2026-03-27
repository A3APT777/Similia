'use server'

import { requireAuth } from '@/lib/server-utils'
import { prisma } from '@/lib/prisma'

export async function exportAllData() {
  const { userId } = await requireAuth()

  try {
    const [patients, consultations, intakeForms, followups, surveys] = await Promise.all([
      prisma.patient.findMany({
        where: { doctorId: userId, isDemo: false },
        select: {
          name: true,
          birthDate: true,
          phone: true,
          email: true,
          constitutionalType: true,
          gender: true,
          notes: true,
          firstVisitDate: true,
          createdAt: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.consultation.findMany({
        where: { doctorId: userId },
        select: {
          patientId: true,
          type: true,
          status: true,
          notes: true,
          scheduledAt: true,
          createdAt: true,
          completedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.intakeForm.findMany({
        where: { doctorId: userId },
        select: {
          patientId: true,
          type: true,
          status: true,
          answers: true,
          completedAt: true,
          createdAt: true,
        },
      }),
      prisma.followup.findMany({
        where: { consultation: { doctorId: userId } },
        select: {
          consultationId: true,
          status: true,
          comment: true,
          createdAt: true,
          respondedAt: true,
        },
      }),
      prisma.preVisitSurvey.findMany({
        where: { doctorId: userId },
        select: {
          consultationId: true,
          patientId: true,
          status: true,
          answers: true,
          createdAt: true,
          completedAt: true,
        },
      }),
    ])

    return {
      success: true,
      data: {
        exported_at: new Date().toISOString(),
        patients,
        consultations,
        intake_forms: intakeForms,
        followups,
        pre_visit_surveys: surveys,
      },
    }
  } catch {
    return { success: false, data: null }
  }
}
