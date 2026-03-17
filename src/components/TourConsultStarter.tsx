'use client'

import { useEffect, useState } from 'react'
import { startConsultationTour, destroyActiveTour } from '@/lib/tour'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'
import 'driver.js/dist/driver.css'

export default function TourConsultStarter() {
  const { lang } = useLanguage()
  const [tourActive, setTourActive] = useState(false)

  useEffect(() => {
    if (localStorage.getItem('tour_consult_active') !== 'true') return
    setTourActive(true)
    const timer = setTimeout(() => {
      startConsultationTour(lang)
    }, 800)
    return () => clearTimeout(timer)
  }, [lang])

  if (!tourActive) return null

  return (
    <button
      onClick={() => {
        destroyActiveTour()
        localStorage.setItem('tour_consult_active', 'false')
        setTourActive(false)
      }}
      className="fixed bottom-6 right-6 z-[9999] text-sm font-medium px-4 py-2.5 rounded-xl shadow-lg transition-all hover:opacity-90"
      style={{ backgroundColor: '#1a3020', color: '#fff', border: '1px solid #2d6a4f' }}
    >
      {t(lang).tour.skipShort}
    </button>
  )
}
