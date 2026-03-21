'use client'

import { useState } from 'react'
import Link from 'next/link'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

type Props = {
  open: boolean
  onClose: () => void
  credits?: number
}

export default function AIPaywall({ open, onClose, credits = 0 }: Props) {
  const { lang } = useLanguage()
  const [closing, setClosing] = useState(false)

  if (!open) return null

  function handleClose() {
    setClosing(true)
    setTimeout(() => {
      setClosing(false)
      onClose()
    }, 200)
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 ${closing ? 'opacity-0' : 'ai-fade-in'}`}
      style={{ backgroundColor: 'rgba(30,27,75,0.85)', backdropFilter: 'blur(8px)', transition: 'opacity 0.2s' }}
      onClick={handleClose}
    >
      <div
        className="ai-card-dark max-w-sm w-full p-6 ai-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Иконка */}
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center ai-pulse" style={{ backgroundColor: 'rgba(99,102,241,0.3)' }}>
            <svg className="w-7 h-7 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
        </div>

        {/* Заголовок */}
        <h2 className="text-lg font-semibold text-white text-center mb-1">
          {t(lang).ai.noAccess}
        </h2>
        <p className="text-sm text-center mb-5" style={{ color: 'rgba(165,160,255,0.6)' }}>
          {t(lang).ai.noAccessDesc}
        </p>

        {/* Кредиты */}
        {credits > 0 && (
          <div className="text-center text-xs mb-4" style={{ color: 'rgba(165,160,255,0.5)' }}>
            {t(lang).ai.creditsRemaining(credits)}
          </div>
        )}

        {/* Кнопки */}
        <div className="space-y-2">
          <Link
            href="/pricing"
            className="btn btn-ai btn-lg w-full justify-center"
            onClick={handleClose}
          >
            {t(lang).ai.buyPro}
          </Link>
          <Link
            href="/pricing#packages"
            className="btn btn-ai-outline btn-lg w-full justify-center"
            onClick={handleClose}
          >
            {t(lang).ai.buyPack}
          </Link>
        </div>

        {/* Демо */}
        <div className="mt-4 text-center">
          <Link
            href="/demo"
            className="text-xs underline transition-colors"
            style={{ color: 'rgba(165,160,255,0.5)' }}
            onClick={handleClose}
          >
            {t(lang).ai.tryDemo}
          </Link>
        </div>

        {/* Закрыть */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 text-white/30 hover:text-white/60 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
