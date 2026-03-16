import BookingForm from './BookingForm'

export default async function BookingPage({ params }: { params: Promise<{ doctorId: string }> }) {
  const { doctorId } = await params

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: '#f7f3ed' }}>
      <div className="w-full max-w-md">

        {/* Шапка */}
        <div
          className="relative overflow-hidden rounded-2xl px-6 py-8 mb-4 text-white"
          style={{ background: 'linear-gradient(135deg, #1a3020 0%, #2d5a40 100%)' }}
        >
          <div
            className="absolute right-0 top-0 h-full w-36 opacity-15 bg-no-repeat bg-right bg-contain pointer-events-none"
            style={{ backgroundImage: 'url(/illustrations/chamomile.jpg)' }}
          />
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <h1
              className="text-2xl font-light mb-1"
              style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)' }}
            >
              Запись на приём
            </h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.55)' }}>
              Заполните форму — врач свяжется с вами для подтверждения
            </p>
          </div>
        </div>

        {/* Форма */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <BookingForm doctorId={doctorId} />
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-4">
          Similia · Профессиональная платформа для гомеопатов
        </p>
      </div>
    </div>
  )
}
