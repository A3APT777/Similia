import { getPreVisitSurveyByToken } from '@/lib/actions/surveys'
import { prisma } from '@/lib/prisma'
import PreVisitSurveyForm from './PreVisitSurveyForm'

export default async function SurveyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const survey = await getPreVisitSurveyByToken(token)

  if (!survey) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--sim-bg)' }}>
        <div className="text-center max-w-sm p-8">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(45,106,79,0.06)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--sim-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h-14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
          </div>
          <h1 className="text-[24px] font-light mb-2" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-text)' }}>
            Опросник не найден
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--sim-text-muted)' }}>Ссылка недействительна или устарела.</p>
        </div>
      </div>
    )
  }

  if (survey.status === 'completed') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--sim-bg)' }}>
        <div className="text-center max-w-sm p-8">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(45,106,79,0.06)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--sim-green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-[24px] font-light mb-2" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-text)' }}>
            Спасибо!
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--sim-text-muted)' }}>Вы уже заполнили этот опросник. Врач получит ваши ответы перед приёмом.</p>
        </div>
      </div>
    )
  }

  // Получаем имя пациента + кастомный шаблон врача
  // Prisma возвращает camelCase, но тип PreVisitSurvey — snake_case (cast)
  const surveyAny = survey as any
  const consultationId = surveyAny.consultationId ?? surveyAny.consultation_id
  const patientId = surveyAny.patientId ?? surveyAny.patient_id

  // Найти doctor_id из consultation → doctor_id
  let doctorId: string | undefined
  if (consultationId) {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      select: { doctorId: true },
    })
    doctorId = consultation?.doctorId
  }

  const [patient, customTemplate] = await Promise.all([
    patientId
      ? prisma.patient.findUnique({
          where: { id: patientId },
          select: { name: true },
        })
      : Promise.resolve(null),
    doctorId
      ? prisma.questionnaireTemplate.findUnique({
          where: {
            doctorId_type: {
              doctorId,
              type: 'pre_visit',
            },
          },
          select: { fields: true },
        })
      : Promise.resolve(null),
  ])

  const customFields = customTemplate?.fields as import('@/lib/actions/questionnaire-templates').TemplateField[] | null

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--sim-bg)' }}>
      {/* Green accent */}
      <div style={{ height: '2px', background: 'linear-gradient(to right, var(--sim-green), rgba(45,106,79,0.15))' }} />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2.5 mb-4">
            <svg width={24} height={24} viewBox="0 0 36 36" fill="none">
              <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="var(--sim-green)" opacity="0.9" />
              <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="var(--sim-bg)" opacity="0.5" />
            </svg>
            <span className="text-[18px] font-light" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-text)', letterSpacing: '0.03em' }}>
              Similia
            </span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-light mb-2" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-text)' }}>
            Предконсультационный опросник
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--sim-text-muted)' }}>
            {patient?.name}, пожалуйста, заполните перед визитом
          </p>
        </div>

        <PreVisitSurveyForm token={token} patientName={patient?.name || ''} customFields={customFields || undefined} />
      </div>
    </div>
  )
}
