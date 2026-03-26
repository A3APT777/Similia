import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import AppShell from '@/components/AppShell'
import IntakeForm from '@/app/intake/[token]/IntakeForm'
import { IntakeAnswers } from '@/types'

export default async function IntakeEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Авторизация через NextAuth
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect('/login')
  const userId = session.user.id

  const patient = await prisma.patient.findFirst({
    where: { id, doctorId: userId },
    select: { id: true, name: true },
  })

  if (!patient) notFound()

  // Ищем существующую заполненную анкету
  const existingIntake = await prisma.intakeForm.findFirst({
    where: { patientId: id, status: 'completed', type: 'primary' },
    select: { answers: true, type: true },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <AppShell>
      <IntakeForm
        token=""
        patientName={patient.name}
        type="primary"
        doctorPatientId={id}
        initialAnswers={(existingIntake?.answers as IntakeAnswers) || undefined}
      />
    </AppShell>
  )
}
