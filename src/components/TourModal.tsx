'use client'

import { useEffect, useState } from 'react'
import { startTour } from '@/lib/tour'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import 'driver.js/dist/driver.css'

type Props = {
  show: boolean
  onClose: () => void
}

export default function TourModal({ show, onClose }: Props) {
  const { lang } = useLanguage()
  if (!show) return null

  function dismiss() {
    localStorage.setItem('tour_completed', 'true')
    onClose()
  }

  function handleStart() {
    localStorage.setItem('tour_completed', 'true')
    onClose()
    setTimeout(() => void startTour(lang), 150)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Затемнение */}
      <div className="absolute inset-0 bg-black/50" onClick={dismiss} />

      {/* Модальное окно */}
      <div
        className="relative rounded-2xl p-6 w-[320px] mx-4 shadow-2xl"
        style={{ backgroundColor: '#f7f3ed', border: '0.5px solid #d4c9b8' }}
      >
        {/* Крестик */}
        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Иконка */}
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'rgba(45,106,79,0.1)' }}
        >
          <span className="text-2xl">🌿</span>
        </div>

        {/* Заголовок */}
        <h2
          className="text-xl font-light mb-1"
          style={{ fontFamily: 'var(--font-cormorant, Georgia, serif)', color: '#1a1a0a' }}
        >
          {t(lang).tour.welcome}
        </h2>
        <p className="text-sm text-gray-400 mb-5 leading-relaxed">
          {t(lang).tour.tourDesc}
        </p>

        {/* Кнопки */}
        <div className="space-y-2">
          <button
            onClick={handleStart}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <span className="text-base">🌿</span>
            {t(lang).tour.startTour}
          </button>
          <button
            onClick={dismiss}
            className="w-full px-4 py-2.5 text-sm transition-colors text-center"
            style={{ color: '#9a8a6a' }}
          >
            ✕ {t(lang).tour.skip}
          </button>
        </div>
      </div>
    </div>
  )
}

// Хук: автоматически показывает модальное окно при первом входе
export function useTourAutoShow() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('tour_completed')) {
      // Небольшая задержка, чтобы страница успела отрисоваться
      const t = setTimeout(() => setShow(true), 800)
      return () => clearTimeout(t)
    }
  }, [])

  return { show, setShow }
}
