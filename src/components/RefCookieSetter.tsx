'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function RefCookieSetter() {
  const searchParams = useSearchParams()

  useEffect(() => {
    const ref = searchParams.get('r')
    if (!ref) return

    // Валидация формата кода
    if (!/^[A-HJ-NP-Z0-9]{4}-[A-HJ-NP-Z0-9]{4}$/.test(ref)) return

    // Не перезаписываем если cookie уже есть
    if (document.cookie.includes('ref_code=')) return

    // Ставим cookie на 30 дней
    const expires = new Date()
    expires.setDate(expires.getDate() + 30)
    document.cookie = `ref_code=${encodeURIComponent(ref)}; path=/; expires=${expires.toUTCString()}; SameSite=Lax`
  }, [searchParams])

  return null
}
