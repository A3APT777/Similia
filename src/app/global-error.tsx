'use client'

import { useEffect } from 'react'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { lang } = useLanguage()

  useEffect(() => {
    console.error('[Global Error]', error)
  }, [error])

  return (
    <html lang={lang}>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', backgroundColor: '#f0ebe3' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ textAlign: 'center', maxWidth: '400px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 16, backgroundColor: '#fef0f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
            }}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#c0392b" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
              </svg>
            </div>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontSize: '32px', fontWeight: 400, color: '#1a1a0a', marginBottom: '12px',
            }}>
              {t(lang).error.criticalError}
            </h2>
            <p style={{ fontSize: '14px', color: '#9a8a6a', lineHeight: 1.6, marginBottom: '24px' }}>
              {t(lang).error.criticalDesc}
            </p>
            <button
              onClick={reset}
              style={{
                backgroundColor: '#1a3020', color: '#f7f3ed',
                border: 'none', borderRadius: '12px',
                padding: '12px 24px', fontSize: '15px', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t(lang).error.reload}
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
