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
      className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-0"
      role="dialog"
      aria-label="Согласие на использование cookies"
    >
      <div
        className="max-w-xl mx-auto sm:mb-6 rounded-2xl border shadow-lg px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3"
        style={{
          backgroundColor: 'rgba(247, 243, 237, 0.97)',
          backdropFilter: 'blur(12px)',
          borderColor: 'rgba(0,0,0,0.08)',
        }}
      >
        <p className="text-sm text-gray-700 leading-relaxed flex-1">
          Мы используем файлы cookie и Яндекс.Метрику для улучшения работы сайта.{' '}
          <Link href="/privacy" className="text-emerald-700 underline underline-offset-2 hover:text-emerald-800">
            Подробнее
          </Link>
        </p>
        <button
          onClick={accept}
          className="shrink-0 px-5 py-2 rounded-xl text-sm font-medium text-white transition-colors cursor-pointer"
          style={{ backgroundColor: 'var(--sim-green)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#245a42')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#2d6a4f')}
        >
          Принять
        </button>
      </div>
    </div>
  )
}
