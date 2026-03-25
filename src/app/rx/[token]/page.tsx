import { getPrescriptionShareByToken } from '@/lib/actions/prescriptionShare'

export default async function PrescriptionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getPrescriptionShareByToken(token)

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--sim-bg)' }}>
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(45,106,79,0.06)' }}>
            <svg className="w-5 h-5" style={{ color: 'var(--sim-text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h-14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
            </svg>
          </div>
          <h1
            className="text-[24px] font-light mb-2"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-text)' }}
          >
            Назначение не найдено
          </h1>
          <p className="text-[13px]" style={{ color: 'var(--sim-text-muted)' }}>
            Ссылка недействительна или срок действия истёк.
          </p>
        </div>
      </div>
    )
  }

  const { consultation, patientName, rules, share } = data
  const date = new Date(consultation.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const dosageParts: string[] = []
  if (consultation.pellets) {
    const p = consultation.pellets
    const word = p % 100 >= 11 && p % 100 <= 19 ? 'гранул'
      : p % 10 === 1 ? 'гранула'
      : p % 10 >= 2 && p % 10 <= 4 ? 'гранулы'
      : 'гранул'
    dosageParts.push(`${p} ${word}`)
  }
  if (consultation.dosage) dosageParts.push(consultation.dosage)

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--sim-bg)' }}>
      {/* Green accent */}
      <div style={{ height: '2px', background: 'linear-gradient(to right, var(--sim-green), rgba(45,106,79,0.15))' }} />

      <div className="max-w-[560px] mx-auto px-5 sm:px-8 py-10 sm:py-16">

        {/* Logo + Date */}
        <div className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-2.5">
            <svg width={24} height={24} viewBox="0 0 36 36" fill="none">
              <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="var(--sim-green)" opacity="0.9" />
              <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="var(--sim-bg)" opacity="0.5" />
            </svg>
            <span
              className="text-[18px] font-light"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-text)', letterSpacing: '0.03em' }}
            >
              Similia
            </span>
          </div>
          <span className="text-[12px]" style={{ color: 'var(--sim-text-muted)' }}>
            {date}
          </span>
        </div>

        {/* Prescription — the hero */}
        <div className="mb-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] mb-3" style={{ color: 'var(--sim-text-muted)' }}>
            Назначение
          </p>

          <div className="flex items-baseline gap-3 flex-wrap">
            <h1
              className="text-[42px] sm:text-[52px] font-light leading-[1] tracking-[-0.02em]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-text)' }}
            >
              {consultation.remedy}
            </h1>
            <span
              className="text-[20px] sm:text-[24px] font-light"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-green)' }}
            >
              {consultation.potency}
            </span>
          </div>

          {dosageParts.length > 0 && (
            <p className="text-[14px] mt-3 leading-relaxed" style={{ color: 'var(--sim-text)' }}>
              {dosageParts.join(' · ')}
            </p>
          )}

          {share.custom_note && (
            <p className="text-[13px] mt-3 italic leading-relaxed" style={{ color: 'var(--sim-text-muted)' }}>
              {share.custom_note}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="mb-8" style={{ height: '1px', background: 'var(--sim-border)' }} />

        {/* Rules */}
        <div className="mb-10">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] mb-4" style={{ color: 'var(--sim-text-muted)' }}>
            Правила приёма
          </p>
          <div
            className="text-[13px] leading-[1.8] whitespace-pre-line"
            style={{ color: 'var(--sim-text)' }}
          >
            {rules}
          </div>
        </div>

        {/* Patient + Doctor */}
        <div className="pt-6" style={{ borderTop: '1px solid var(--sim-border)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[12px]" style={{ color: 'var(--sim-text-muted)' }}>
              {patientName}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <a
            href="https://simillia.ru"
            className="text-[11px] transition-colors hover:underline"
            style={{ color: 'var(--sim-text-muted)' }}
            target="_blank"
            rel="noopener noreferrer"
          >
            Similia — цифровой кабинет гомеопата
          </a>
        </div>
      </div>
    </div>
  )
}
