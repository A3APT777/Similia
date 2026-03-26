'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'demo_banner_dismissed'

// Баннер для новых пользователей — ссылка на демо-пациента
export default function DemoBanner({ demoPatientId, demoPatientName }: { demoPatientId: string; demoPatientName: string }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [])

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="rounded-2xl p-5 sm:p-6 mb-5 relative overflow-hidden" style={{ backgroundColor: 'rgba(45,106,79,0.04)', border: '1px solid rgba(45,106,79,0.1)' }}>
      {/* Закрыть */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full transition-colors hover:bg-black/5"
        style={{ color: 'var(--sim-text-hint)' }}
        aria-label="Закрыть"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-4">
        {/* Иконка */}
        <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center" style={{ backgroundColor: 'rgba(45,106,79,0.08)' }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="var(--sim-green)" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-medium mb-1" style={{ color: 'var(--sim-text)' }}>
            Мы создали демо-пациента — {demoPatientName}
          </p>
          <p className="text-[13px] leading-relaxed mb-3" style={{ color: 'var(--sim-text-muted)' }}>
            Заполненная анкета, 3 консультации с назначениями, опросы самочувствия. Откройте карточку чтобы увидеть как работает система.
          </p>
          <Link
            href={`/patients/${demoPatientId}`}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium transition-colors hover:underline underline-offset-2"
            style={{ color: 'var(--sim-green)' }}
          >
            Открыть карточку →
          </Link>
        </div>
      </div>
    </div>
  )
}
