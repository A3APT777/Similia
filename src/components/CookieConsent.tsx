'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'cookie_consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Показываем баннер только если согласие ещё не дано
    const consent = localStorage.getItem(STORAGE_KEY)
    if (consent === 'true') {
      loadMetrika()
    } else {
      setVisible(true)
    }
  }, [])

  function accept() {
    localStorage.setItem(STORAGE_KEY, 'true')
    setVisible(false)
    loadMetrika()
  }

  function loadMetrika() {
    const id = process.env.NEXT_PUBLIC_METRIKA_ID
    if (!id || document.getElementById('ym-script')) return

    // Загружаем скрипт Яндекс.Метрики динамически
    const w = window as typeof window & { ym?: (...args: unknown[]) => void }
    w.ym = w.ym || function (...args: unknown[]) {
      (w.ym as unknown as { a: unknown[] }).a = (w.ym as unknown as { a: unknown[] }).a || []
      ;(w.ym as unknown as { a: unknown[] }).a.push(args)
    }
    ;(w.ym as unknown as { l: number }).l = Date.now()

    const script = document.createElement('script')
    script.id = 'ym-script'
    script.async = true
    script.src = 'https://mc.yandex.ru/metrika/tag.js'
    document.head.appendChild(script)

    w.ym!(Number(id), 'init', {
      clickmap: true,
      trackLinks: true,
      accurateTrackBounce: true,
      webvisor: true,
    })
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 sm:bottom-6 sm:left-auto sm:right-6 z-50 sm:px-0 px-0"
      role="dialog"
      aria-label="Согласие на использование cookies"
    >
      <div
        className="sm:max-w-md sm:rounded-xl rounded-none border-t sm:border shadow-lg px-4 py-2.5 sm:py-3 flex items-center gap-3"
        style={{
          backgroundColor: 'rgba(247, 243, 237, 0.97)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(0,0,0,0.08)',
        }}
      >
        <p className="text-xs sm:text-sm text-gray-700 leading-snug flex-1">
          Cookie и Метрика для улучшения сайта.{' '}
          <Link href="/privacy" className="text-emerald-700 underline underline-offset-2 inline-block py-1">
            Подробнее
          </Link>
        </p>
        <button
          onClick={accept}
          className="btn btn-primary btn-sm shrink-0"
        >
          Ок
        </button>
      </div>
    </div>
  )
}
