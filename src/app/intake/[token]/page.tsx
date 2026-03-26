import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import IntakeForm from './IntakeForm'
import type { ScheduleConfig } from '@/lib/slots'
import { getDefaultFields } from '@/lib/default-questionnaire-fields'
import type { TemplateField } from '@/lib/actions/questionnaire-templates'

export default async function IntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const intake = await prisma.intakeForm.findUnique({
    where: { token },
  })

  // Ссылка недействительна
  if (!intake || (intake.expiresAt && new Date(intake.expiresAt) < new Date())) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--sim-bg)' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(0,0,0,0.04)' }}>
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="var(--sim-text-hint)" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-text)' }} className="text-[24px] font-light mb-3">
            Ссылка недействительна
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--sim-text-muted)' }}>
            Срок действия этой ссылки истёк. Попросите врача отправить новую.
          </p>
        </div>
      </div>
    )
  }

  // Анкета уже заполнена
  if (intake.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--sim-bg)' }}>
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ backgroundColor: 'rgba(45,106,79,0.08)' }}>
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="var(--sim-green)" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-text)' }} className="text-[24px] font-light mb-3">
            Анкета заполнена
          </h1>
          <p className="text-[14px] leading-relaxed" style={{ color: 'var(--sim-text-muted)' }}>
            Спасибо! Ваши ответы получены. Врач ознакомится с ними перед консультацией.
          </p>
        </div>
      </div>
    )
  }

  // Предзаполнение данных
  let prefilled: { name?: string; phone?: string; birth_date?: string; email?: string } | undefined
  if (intake.patientId) {
    const patient = await prisma.patient.findUnique({
      where: { id: intake.patientId },
      select: { name: true, phone: true, birthDate: true, email: true },
    })
    if (patient) {
      prefilled = {
        name: patient.name || undefined,
        phone: patient.phone || undefined,
        birth_date: patient.birthDate || undefined,
        email: patient.email || undefined,
      }
    }
  }

  // Расписание + шаблон анкеты
  const [scheduleData, customTemplate] = await Promise.all([
    prisma.doctorSchedule.findFirst({
      where: { doctorId: intake.doctorId },
    }),
    prisma.questionnaireTemplate.findUnique({
      where: {
        doctorId_type: {
          doctorId: intake.doctorId,
          type: intake.type === 'acute' ? 'acute' : 'primary',
        },
      },
      select: { fields: true },
    }),
  ])

  const schedule: ScheduleConfig | null = scheduleData as unknown as ScheduleConfig | null
  const templateType = intake.type === 'acute' ? 'acute' : 'primary'
  const customFields: TemplateField[] | null = customTemplate?.fields as TemplateField[] | null

  return (
    <IntakeForm
      token={token}
      patientName={intake.patientName || ''}
      type={intake.type ?? 'primary'}
      prefilled={prefilled}
      schedule={schedule}
      doctorId={intake.doctorId}
      customFields={customFields || getDefaultFields(templateType)}
    />
  )
}
