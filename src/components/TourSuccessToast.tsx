'use client'

import { useEffect } from 'react'
import { useToast } from '@/components/ui/toast'
import { t } from '@/lib/i18n'
import { useLanguage } from '@/hooks/useLanguage'

export default function TourSuccessToast() {
  const { toast } = useToast()
  const { lang } = useLanguage()

  useEffect(() => {
    if (localStorage.getItem('tour_success') !== 'true') return
    localStorage.removeItem('tour_success')
    // Небольшая задержка — дать странице полностью загрузиться
    const timer = setTimeout(() => {
      toast(`🎉 ${t(lang).tour.success}`)
    }, 800)
    return () => clearTimeout(timer)
  }, [toast, lang])

  return null
}
