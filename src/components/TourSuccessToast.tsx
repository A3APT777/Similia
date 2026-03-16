'use client'

import { useEffect } from 'react'
import { useToast } from '@/components/ui/toast'

export default function TourSuccessToast() {
  const { toast } = useToast()

  useEffect(() => {
    if (localStorage.getItem('tour_success') !== 'true') return
    localStorage.removeItem('tour_success')
    // Небольшая задержка — дать странице полностью загрузиться
    const timer = setTimeout(() => {
      toast('🎉 Отлично! Пациент создан. Тур завершён.')
    }, 800)
    return () => clearTimeout(timer)
  }, [toast])

  return null
}
