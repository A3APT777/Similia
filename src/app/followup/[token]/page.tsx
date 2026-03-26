import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import FollowupForm from './FollowupForm'

export default async function FollowupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Публичная страница — без auth, ищем followup по токену
  const followup = await prisma.followup.findUnique({
    where: { token },
  })

  if (!followup) notFound()

  // Уже ответили
  if (followup.respondedAt) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--sim-bg)' }}>
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: 'rgba(45,106,79,0.08)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--sim-green)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1
            className="text-[24px] font-light mb-2"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-text)' }}
          >
            Вы уже ответили
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--sim-text-muted)' }}>
            Спасибо, ваш врач видит ваш ответ
          </p>
        </div>
      </div>
    )
  }

  // Получаем имя пациента через consultation → patient
  let patientName = 'Пациент'
  if (followup.patientId) {
    const patient = await prisma.patient.findUnique({
      where: { id: followup.patientId },
      select: { name: true },
    })
    if (patient?.name) patientName = patient.name
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--sim-bg)' }}>
      {/* Green accent */}
      <div style={{ height: '2px', background: 'linear-gradient(to right, var(--sim-green), rgba(45,106,79,0.15))' }} />

      <div className="max-w-[460px] mx-auto px-5 sm:px-8 py-10 sm:py-16">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <svg width={22} height={22} viewBox="0 0 36 36" fill="none">
            <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="var(--sim-green)" opacity="0.9" />
            <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="var(--sim-bg)" opacity="0.5" />
          </svg>
          <span
            className="text-[17px] font-light"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-text)', letterSpacing: '0.03em' }}
          >
            Similia
          </span>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1
            className="text-[24px] sm:text-[28px] font-light mb-2"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-text)' }}
          >
            Как вы себя чувствуете?
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--sim-text-muted)' }}>
            {patientName}, ответьте вашему врачу
          </p>
        </div>

        <FollowupForm token={token} />

        {/* Footer */}
        <p className="text-center text-[11px] mt-8" style={{ color: 'var(--sim-text-muted)' }}>
          Ваш ответ конфиденциален и доступен только вашему врачу
        </p>
      </div>
    </div>
  )
}
