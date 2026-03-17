'use client'

import { useState, useEffect } from 'react'
import { createNewPatientToken } from '@/lib/actions/newPatient'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

export default function NewPatientButton() {
  const { lang } = useLanguage()
  const [link, setLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  // Закрытие модалки по Escape
  useEffect(() => {
    if (!link) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { setLink(null); setCopied(false) } }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [link])

  async function handleCreate() {
    setLoading(true)
    try {
      const token = await createNewPatientToken()
      setLink(`${window.location.origin}/new/${token}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <button
        onClick={handleCreate}
        disabled={loading}
        className="flex items-center gap-2 text-sm font-medium px-4 py-2.5 rounded-xl transition-all hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: '#1a3020', color: '#f7f3ed' }}
      >
        {loading ? (
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        )}
        {t(lang).newPatient.title}
      </button>

      {link && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={(e) => { if (e.target === e.currentTarget) { setLink(null); setCopied(false) } }}>
          <div
            className="w-full rounded-2xl p-6 shadow-2xl"
            style={{ maxWidth: 420, backgroundColor: '#f7f3ed', border: '0.5px solid #d4c9b8' }}
          >
            <h2
              className="text-xl font-light mb-2"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", color: '#1a1a0a' }}
            >
              {t(lang).newPatient.title}
            </h2>
            <p className="text-sm mb-5" style={{ color: '#9a8a6a' }}>
              {t(lang).newPatient.copyLink}
            </p>

            <div
              className="flex items-center gap-2 rounded-xl px-3 py-2.5 mb-3 text-sm font-mono break-all"
              style={{ backgroundColor: '#f0ebe3', border: '1px solid #d4c9b8', color: '#5a5040' }}
            >
              {link}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                style={{ backgroundColor: copied ? '#2d6a4f' : '#1a3020', color: '#f7f3ed' }}
              >
                {copied ? `✓ ${t(lang).newPatient.copied}` : `📋 ${t(lang).newPatient.copyBtn}`}
              </button>
              <button
                onClick={() => { setLink(null); setCopied(false) }}
                className="px-4 py-2.5 rounded-xl text-sm transition-colors hover:opacity-70"
                style={{ color: '#9a8a6a' }}
              >
                {t(lang).newPatient.close}
              </button>
            </div>

            <p className="text-xs mt-3 text-center" style={{ color: '#b8a898' }}>
              {t(lang).newPatient.linkValid}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
