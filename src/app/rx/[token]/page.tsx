import { getPrescriptionShareByToken } from '@/lib/actions/prescriptionShare'

export default async function PrescriptionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const data = await getPrescriptionShareByToken(token)

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--sim-bg)' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Назначение не найдено</h1>
          <p className="text-gray-500">Ссылка недействительна или срок действия истёк.</p>
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
    <div className="min-h-screen p-4 sm:p-8" style={{ backgroundColor: 'var(--sim-bg)' }}>
      <div className="max-w-lg mx-auto">
        {/* Заголовок */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg width={28} height={28} viewBox="0 0 36 36" fill="none">
              <ellipse cx="13" cy="18" rx="7" ry="11" transform="rotate(-15 13 18)" fill="#2d6a4f" opacity="0.9" />
              <ellipse cx="23" cy="18" rx="7" ry="11" transform="rotate(15 23 18)" fill="#1a3020" opacity="0.65" />
            </svg>
            <span style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: '20px', fontWeight: 500, color: 'var(--sim-forest)' }}>
              Similia
            </span>
          </div>
          <p className="text-sm text-gray-500">Назначение от {date}</p>
        </div>

        {/* Карточка назначения */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4" style={{ border: '1px solid var(--sim-border)' }}>
          <div className="px-6 py-5" style={{ backgroundColor: 'var(--sim-forest)' }}>
            <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>Назначение</p>
            <h1 className="text-3xl font-light text-white" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              {consultation.remedy}
            </h1>
            <p className="text-lg mt-1" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {consultation.potency}
            </p>
          </div>

          <div className="px-6 py-4 space-y-3">
            {dosageParts.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--sim-text-hint)' }}>Схема приёма</p>
                <p className="text-sm text-gray-800">{dosageParts.join(' · ')}</p>
              </div>
            )}

            {share.custom_note && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--sim-text-hint)' }}>Комментарий врача</p>
                <p className="text-sm text-gray-800">{share.custom_note}</p>
              </div>
            )}

            <div className="pt-2" style={{ borderTop: '1px solid #eee' }}>
              <p className="text-xs" style={{ color: 'var(--sim-text-hint)' }}>
                Пациент: {patientName}
              </p>
            </div>
          </div>
        </div>

        {/* Правила приёма */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-4" style={{ border: '1px solid var(--sim-border)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--sim-green)' }}>
            Правила приёма
          </h2>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {rules}
          </div>
        </div>

        <div className="text-center pt-4">
          <a href="https://simillia.ru" className="text-xs hover:underline" style={{ color: 'var(--sim-text-hint)' }} target="_blank" rel="noopener noreferrer">
            Simillia.ru — цифровой кабинет гомеопата
          </a>
        </div>
      </div>
    </div>
  )
}
