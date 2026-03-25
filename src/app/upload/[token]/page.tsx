import { getPhotoUploadToken } from '@/lib/actions/photoUpload'
import PhotoUploadForm from './PhotoUploadForm'

export default async function PhotoUploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const tokenData = await getPhotoUploadToken(token)

  if (!tokenData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-800">Ссылка недействительна</h1>
          <p className="text-sm text-gray-500 mt-1">Попросите врача отправить новую ссылку</p>
        </div>
      </div>
    )
  }

  if (new Date(tokenData.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold text-gray-800">Срок действия истёк</h1>
          <p className="text-sm text-gray-500 mt-1">Попросите врача отправить новую ссылку</p>
        </div>
      </div>
    )
  }

  const patientName = (tokenData.patients as unknown as { name: string } | null)?.name || ''

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--sim-bg)' }}>
      <div className="max-w-lg mx-auto px-5 py-10">
        {/* Шапка */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'rgba(45,106,79,0.1)' }}>
            <svg className="w-7 h-7" style={{ color: 'var(--sim-green)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-normal" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-forest)' }}>Загрузка фото</h1>
          {patientName && (
            <p className="text-sm text-gray-500 mt-1">{patientName}</p>
          )}
          <p className="text-xs text-gray-400 mt-2">
            Выберите фото, укажите дату съёмки и нажмите «Отправить»
          </p>
        </div>

        <PhotoUploadForm token={token} />
      </div>
    </div>
  )
}
