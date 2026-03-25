'use client'

import { useEffect } from 'react'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { lang } = useLanguage()

  useEffect(() => {
    // redirect() выбрасывает NEXT_REDIRECT — не логируем как ошибку
    if (error.message?.includes('NEXT_REDIRECT') || error.digest?.includes('NEXT_REDIRECT')) {
      return
    }
    console.error('[App Error]', error)
  }, [error])

  // Если это redirect — не показываем error page
  if (error.message?.includes('NEXT_REDIRECT') || error.digest?.includes('NEXT_REDIRECT')) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: 'var(--sim-bg, #faf8f5)' }}>
      <div className="text-center max-w-md">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: '#fef0f0' }}
        >
          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#c0392b" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
          </svg>
        </div>
        <h2
          className="text-3xl font-light mb-3"
          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: 'var(--sim-text)' }}
        >
          {t(lang).error.somethingWrong}
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--sim-text-hint)', lineHeight: 1.6 }}>
          {t(lang).error.unexpectedDesc}
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--sim-forest)' }}
          >
            {t(lang).error.tryAgain}
          </button>
          <a
            href="/dashboard"
            className="px-5 py-2.5 rounded-xl text-sm transition-colors hover:opacity-70"
            style={{ color: 'var(--sim-text-hint)', border: '1px solid var(--sim-border)' }}
          >
            {t(lang).error.goHome}
          </a>
        </div>
        {error.digest && (
          <p className="mt-4 text-xs" style={{ color: '#c4b89a' }}>
            {t(lang).error.errorCode}: {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
