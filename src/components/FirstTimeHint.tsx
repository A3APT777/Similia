'use client'

import { useState, useEffect } from 'react'

type Props = {
  id: string           // уникальный ключ hint_<id>_shown в localStorage
  children: React.ReactNode
  position?: 'top' | 'bottom'
}

export default function FirstTimeHint({ id, children, position = 'bottom' }: Props) {
  const [visible, setVisible] = useState(false)
  const storageKey = `hint_${id}_shown`

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) {
        // Показываем с задержкой чтобы страница успела отрисоваться
        const timer = setTimeout(() => setVisible(true), 1200)
        return () => clearTimeout(timer)
      }
    } catch {}
  }, [storageKey])

  function dismiss() {
    setVisible(false)
    try { localStorage.setItem(storageKey, 'true') } catch {}
  }

  if (!visible) return null

  return (
    <div
      className="relative animate-in fade-in slide-in-from-bottom-2 duration-300"
      style={{
        marginTop: position === 'bottom' ? 8 : 0,
        marginBottom: position === 'top' ? 8 : 0,
      }}
    >
      <div
        className="flex items-start gap-2.5 px-4 py-3 rounded-2xl text-[13px] leading-relaxed"
        style={{
          backgroundColor: 'rgba(45,106,79,0.07)',
          border: '1px solid rgba(45,106,79,0.2)',
          color: 'var(--sim-green)',
        }}
      >
        <span className="shrink-0 text-base mt-0.5">💡</span>
        <div className="flex-1 min-w-0">{children}</div>
        <button
          onClick={dismiss}
          className="shrink-0 text-xs opacity-50 hover:opacity-100 transition-opacity mt-0.5"
          style={{ color: 'var(--sim-green)' }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}
