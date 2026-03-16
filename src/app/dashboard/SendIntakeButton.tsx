'use client'

import { useState } from 'react'
import { createIntakeLink } from '@/lib/actions/intake'
import { IntakeType } from '@/types'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

type LinkState = { type: IntakeType; url: string } | null

export default function SendIntakeButton() {
  const { lang } = useLanguage()
  const [link, setLink] = useState<LinkState>(null)
  const [loading, setLoading] = useState<IntakeType | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(type: IntakeType) {
    setLoading(type)
    setLink(null)
    setError(null)
    try {
      const token = await createIntakeLink(type)
      setLink({ type, url: `${window.location.origin}/intake/${token}` })
    } catch {
      setError(t(lang).sendIntake.linkError)
    } finally {
      setLoading(null)
    }
  }

  async function handleCopy() {
    if (!link) return
    await navigator.clipboard.writeText(link.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-2">
      {/* Кнопки создания */}
      <div className="flex gap-2">
        <button
          onClick={() => handleCreate('primary')}
          disabled={loading !== null}
          className="flex items-center gap-1.5 text-xs font-medium border border-violet-200 text-violet-700 px-3 py-2 rounded-lg hover:bg-violet-50 hover:border-violet-400 transition-all disabled:opacity-50"
        >
          {loading === 'primary' ? (
            <span className="w-3 h-3 border border-violet-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          )}
          {t(lang).sendIntake.primary}
        </button>

        <button
          onClick={() => handleCreate('acute')}
          disabled={loading !== null}
          className="flex items-center gap-1.5 text-xs font-medium border border-orange-200 text-orange-700 px-3 py-2 rounded-lg hover:bg-orange-50 hover:border-orange-400 transition-all disabled:opacity-50"
        >
          {loading === 'acute' ? (
            <span className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          )}
          {t(lang).sendIntake.acute}
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-600 px-1">{error}</p>
      )}

      {/* Ссылка */}
      {link && (
        <div className={`border rounded-xl px-4 py-3 space-y-2 ${link.type === 'acute' ? 'bg-orange-50 border-orange-200' : 'bg-violet-50 border-violet-200'}`}>
          <p className={`text-xs font-semibold ${link.type === 'acute' ? 'text-orange-700' : 'text-violet-700'}`}>
            {link.type === 'acute' ? `⚡ ${t(lang).sendIntake.acuteLink}` : `📋 ${t(lang).sendIntake.newLink}`}
          </p>
          <div className="flex items-center gap-2">
            <p className={`text-xs truncate flex-1 bg-white border rounded-lg px-3 py-1.5 font-mono ${link.type === 'acute' ? 'border-orange-200 text-orange-600' : 'border-violet-200 text-violet-600'}`}>
              {link.url}
            </p>
            <button
              onClick={handleCopy}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg text-white transition-all ${
                copied
                  ? 'bg-emerald-600'
                  : link.type === 'acute' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-violet-600 hover:bg-violet-700'
              }`}
            >
              {copied ? `✓ ${t(lang).sendIntake.copied}` : t(lang).sendIntake.copy}
            </button>
          </div>
          <p className={`text-[10px] ${link.type === 'acute' ? 'text-orange-400' : 'text-violet-400'}`}>
            {t(lang).sendIntake.linkValid}
          </p>
        </div>
      )}
    </div>
  )
}
